import Transaction from "../models/transaction.js";
import Budget from "../models/budget.js";

// CREATE TRANSACTION
export const createTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, amount, description, type, date } = req.body;

    // Validation
    if (!category || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Category and valid amount are required",
      });
    }

    // Create transaction
    const transaction = new Transaction({
      userId,
      category,
      amount,
      description: description || "",
      type: type || "expense",
      date: date || new Date(),
    });

    await transaction.save();

    // Update budget if it's an expense
    if (type === "expense" || !type) {
      let budget = await Budget.findOne({ userId });

      if (!budget) {
        // Create default budget if not exists
        budget = new Budget({
          userId,
          totalBudget: 40000,
          totalSpent: 0,
          categoryBudgets: [],
        });
      }

      // Update total spent
      budget.totalSpent += amount;

      // Update category spent
      const categoryBudget = budget.categoryBudgets.find(
        (cat) => cat.category === category
      );

      if (categoryBudget) {
        categoryBudget.spentAmount += amount;
      } else {
        // If category doesn't exist, create it
        budget.categoryBudgets.push({
          category,
          budgetAmount: 0,
          spentAmount: amount,
        });
      }

      await budget.save();
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
      error: error.message,
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

    // Build query
    const query = { userId };

    if (category) {
      query.category = category;
    }

    if (type) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get transactions
    const transactions = await Transaction.find(query)
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
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
      error: error.message,
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
      error: error.message,
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

    // Store old values for budget update
    const oldAmount = transaction.amount;
    const oldCategory = transaction.category;
    const oldType = transaction.type;

    // Update budget - remove old expense
    if (oldType === "expense") {
      let budget = await Budget.findOne({ userId });
      if (budget) {
        budget.totalSpent -= oldAmount;

        const categoryBudget = budget.categoryBudgets.find(
          (cat) => cat.category === oldCategory
        );
        if (categoryBudget) {
          categoryBudget.spentAmount -= oldAmount;
        }

        await budget.save();
      }
    }

    // Update transaction
    if (category) transaction.category = category;
    if (amount) transaction.amount = amount;
    if (description !== undefined) transaction.description = description;
    if (type) transaction.type = type;
    if (date) transaction.date = date;

    await transaction.save();

    // Update budget - add new expense
    if (transaction.type === "expense") {
      let budget = await Budget.findOne({ userId });
      if (budget) {
        budget.totalSpent += transaction.amount;

        const categoryBudget = budget.categoryBudgets.find(
          (cat) => cat.category === transaction.category
        );

        if (categoryBudget) {
          categoryBudget.spentAmount += transaction.amount;
        } else {
          budget.categoryBudgets.push({
            category: transaction.category,
            budgetAmount: 0,
            spentAmount: transaction.amount,
          });
        }

        await budget.save();
      }
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
      error: error.message,
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

    // Update budget if it's an expense
    if (transaction.type === "expense") {
      let budget = await Budget.findOne({ userId });
      if (budget) {
        budget.totalSpent -= transaction.amount;

        const categoryBudget = budget.categoryBudgets.find(
          (cat) => cat.category === transaction.category
        );

        if (categoryBudget) {
          categoryBudget.spentAmount -= transaction.amount;
        }

        await budget.save();
      }
    }

    // Delete transaction
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
      error: error.message,
    });
  }
};

// GET SPENDING SUMMARY
export const getSpendingSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    // Build date query
    const dateQuery = { userId };
    if (startDate || endDate) {
      dateQuery.date = {};
      if (startDate) {
        dateQuery.date.$gte = new Date(startDate);
      }
      if (endDate) {
        dateQuery.date.$lte = new Date(endDate);
      }
    }

    // Get all transactions
    const transactions = await Transaction.find(dateQuery);

    // Calculate totals
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryBreakdown = {};

    transactions.forEach((transaction) => {
      if (transaction.type === "income") {
        totalIncome += transaction.amount;
      } else {
        totalExpense += transaction.amount;

        // Category breakdown
        if (!categoryBreakdown[transaction.category]) {
          categoryBreakdown[transaction.category] = 0;
        }
        categoryBreakdown[transaction.category] += transaction.amount;
      }
    });

    // Get recent transactions (last 10)
    const recentTransactions = await Transaction.find({ userId })
      .sort({ date: -1 })
      .limit(10);

    res.json({
      success: true,
      summary: {
        totalIncome,
        totalExpense,
        netAmount: totalIncome - totalExpense,
        categoryBreakdown,
        transactionCount: transactions.length,
        recentTransactions,
      },
    });
  } catch (error) {
    console.error("Get Summary Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get spending summary",
      error: error.message,
    });
  }
};

// GET RECENT ACTIVITIES
export const getRecentActivities = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    const transactions = await Transaction.find({ userId })
      .sort({ date: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      activities: transactions,
    });
  } catch (error) {
    console.error("Get Recent Activities Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get recent activities",
      error: error.message,
    });
  }
};

// GET TRANSACTIONS GROUPED BY DATE
export const getTransactionsGroupedByDate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    // Build query
    const query = { userId };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    const transactions = await Transaction.find(query).sort({ date: -1 });

    // Group by date
    const grouped = {};
    transactions.forEach((transaction) => {
      const dateKey = transaction.date.toISOString().split("T")[0]; // YYYY-MM-DD
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
      error: error.message,
    });
  }
};

// GET TRANSACTIONS BY CATEGORY
export const getTransactionsByCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    // Build query
    const query = { userId, type: "expense" };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    const transactions = await Transaction.find(query);

    // Group by category
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
      error: error.message,
    });
  }
};