// transactionController.js - COMPLETE UPDATED VERSION
import Transaction from "../models/transaction.js";
import Budget from "../models/budget.js";

// ==================== HELPER FUNCTIONS ====================

// Helper function to get or create budget
async function getOrCreateBudget(userId) {
  let budget = await Budget.findOne({ userId });
  
  if (!budget) {
    // Create minimal budget - user must set it up properly later
    budget = new Budget({
      userId,
      totalBudget: 0,  // Start with 0, force user to set budget
      totalSpent: 0,
      categoryBudgets: [],
    });
    await budget.save();
  }
  
  return budget;
}

// Helper function to update budget for expense
async function updateBudgetForExpense(userId, category, amount) {
  const budget = await getOrCreateBudget(userId);
  
  budget.totalSpent += amount;

  const categoryBudget = budget.categoryBudgets.find(
    (cat) => cat.category === category
  );

  if (categoryBudget) {
    categoryBudget.spentAmount += amount;
  } else {
    // Warn: Category not in budget plan, but still track spending
    budget.categoryBudgets.push({
      category,
      budgetAmount: 0,  // Not allocated, but track it
      spentAmount: amount,
    });
  }

  await budget.save();
  return budget;
}

// Helper function to remove expense from budget
async function removeBudgetExpense(userId, category, amount) {
  const budget = await Budget.findOne({ userId });
  
  if (!budget) return null;
  
  budget.totalSpent = Math.max(0, budget.totalSpent - amount);

  const categoryBudget = budget.categoryBudgets.find(
    (cat) => cat.category === category
  );

  if (categoryBudget) {
    categoryBudget.spentAmount = Math.max(0, categoryBudget.spentAmount - amount);
  }

  await budget.save();
  return budget;
}

// ==================== MAIN CONTROLLERS ====================

// CREATE TRANSACTION
export const createTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, amount, description, type, date } = req.body;

    // Validation
    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount (greater than 0) is required",
      });
    }

    const transactionType = type || "expense";
    
    if (!["expense", "income"].includes(transactionType)) {
      return res.status(400).json({
        success: false,
        message: "Type must be either 'expense' or 'income'",
      });
    }

    // Create transaction
    const transaction = new Transaction({
      userId,
      category: category.trim(),
      amount: parseFloat(amount),
      description: description?.trim() || "",
      type: transactionType,
      date: date ? new Date(date) : new Date(),
    });

    await transaction.save();

    // Update budget ONLY for expenses (not income)
    if (transactionType === "expense") {
      await updateBudgetForExpense(userId, transaction.category, transaction.amount);
    }

    res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      transaction,
    });
  } catch (error) {
    console.error("Create Transaction Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create transaction",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// GET ALL TRANSACTIONS (with filters)
export const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      category,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sortBy = "date",
      sortOrder = "desc",
    } = req.query;

    const query = { userId };

    if (category) query.category = category;
    if (type && ["expense", "income"].includes(type)) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const allowedSortFields = ["date", "amount", "category", "createdAt"];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "date";

    const transactions = await Transaction.find(query)
      .sort({ [sortField]: sortOrder === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get Transactions Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get transactions",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// GET SINGLE TRANSACTION
export const getTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const transaction = await Transaction.findOne({ _id: id, userId });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    res.json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error("Get Transaction Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get transaction",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// UPDATE TRANSACTION
export const updateTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { category, amount, description, type, date } = req.body;

    const transaction = await Transaction.findOne({ _id: id, userId });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // Store old values for budget adjustment
    const oldAmount = transaction.amount;
    const oldCategory = transaction.category;
    const oldType = transaction.type;

    // Remove old expense from budget
    if (oldType === "expense") {
      await removeBudgetExpense(userId, oldCategory, oldAmount);
    }

    // Update transaction fields
    if (category && category.trim()) transaction.category = category.trim();
    if (amount && amount > 0) transaction.amount = parseFloat(amount);
    if (description !== undefined) transaction.description = description?.trim() || "";
    if (type && ["expense", "income"].includes(type)) transaction.type = type;
    if (date) transaction.date = new Date(date);

    await transaction.save();

    // Add new expense to budget
    if (transaction.type === "expense") {
      await updateBudgetForExpense(userId, transaction.category, transaction.amount);
    }

    res.json({
      success: true,
      message: "Transaction updated successfully",
      transaction,
    });
  } catch (error) {
    console.error("Update Transaction Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update transaction",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// DELETE TRANSACTION
export const deleteTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const transaction = await Transaction.findOne({ _id: id, userId });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // Remove expense from budget
    if (transaction.type === "expense") {
      await removeBudgetExpense(userId, transaction.category, transaction.amount);
    }

    await Transaction.deleteOne({ _id: id, userId });

    res.json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    console.error("Delete Transaction Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete transaction",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// GET SPENDING SUMMARY
export const getSpendingSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const dateQuery = { userId };
    if (startDate || endDate) {
      dateQuery.date = {};
      if (startDate) dateQuery.date.$gte = new Date(startDate);
      if (endDate) dateQuery.date.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(dateQuery);

    let totalIncome = 0;
    let totalExpenses = 0;  // Changed from totalExpense for consistency
    const categoryBreakdown = {};

    transactions.forEach((transaction) => {
      if (transaction.type === "income") {
        totalIncome += transaction.amount;
      } else {
        totalExpenses += transaction.amount;

        if (!categoryBreakdown[transaction.category]) {
          categoryBreakdown[transaction.category] = 0;
        }
        categoryBreakdown[transaction.category] += transaction.amount;
      }
    });

    res.json({
      success: true,
      summary: {
        totalIncome,
        totalExpenses,  // Consistent naming
        netAmount: totalIncome - totalExpenses,
        categoryBreakdown,
        transactionCount: transactions.length,
      },
    });
  } catch (error) {
    console.error("Get Summary Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get spending summary",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// GET RECENT ACTIVITIES
export const getRecentActivities = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50); // Max 50

    const transactions = await Transaction.find({ userId })
      .sort({ date: -1 })
      .limit(limit);

    res.json({
      success: true,
      activities: transactions,
    });
  } catch (error) {
    console.error("Get Recent Activities Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get recent activities",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// GET TRANSACTIONS GROUPED BY DATE
export const getTransactionsGroupedByDate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const query = { userId };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query).sort({ date: -1 });

    const grouped = {};
    transactions.forEach((transaction) => {
      const dateKey = transaction.date.toISOString().split("T")[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(transaction);
    });

    res.json({
      success: true,
      groupedTransactions: grouped,
    });
  } catch (error) {
    console.error("Get Grouped Transactions Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get grouped transactions",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// GET TRANSACTIONS BY CATEGORY
export const getTransactionsByCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const query = { userId, type: "expense" };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query);

    const categoryData = {};
    transactions.forEach((transaction) => {
      if (!categoryData[transaction.category]) {
        categoryData[transaction.category] = {
          total: 0,
          count: 0,
          transactions: [],
        };
      }
      categoryData[transaction.category].total += transaction.amount;
      categoryData[transaction.category].count += 1;
      categoryData[transaction.category].transactions.push(transaction);
    });

    res.json({
      success: true,
      categoryData,
    });
  } catch (error) {
    console.error("Get Category Transactions Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get category transactions",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};