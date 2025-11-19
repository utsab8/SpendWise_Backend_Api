// transactionController.js - FIXED with better error handling and logging
import Transaction from "../models/transaction.js";
import Budget from "../models/budget.js";
import mongoose from "mongoose";

// ==================== HELPER FUNCTIONS ====================

// Helper to ensure budget exists
async function ensureBudgetExists(userId) {
  let budget = await Budget.findOne({ userId });
  
  if (!budget) {
    console.log('⚠️ No budget found, creating new budget for user:', userId);
    budget = new Budget({
      userId,
      totalBudget: 0,
      totalSpent: 0,
      categoryBudgets: [],
    });
    await budget.save();
    console.log('✅ New budget created');
  }
  
  return budget;
}

// ==================== CREATE TRANSACTION ====================
export const createTransaction = async (req, res) => {
  console.log('🔵 CREATE TRANSACTION REQUEST');
  console.log('User ID:', req.user.id);
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  const session = await mongoose.startSession();
  
  try {
    const userId = req.user.id;
    const { category, amount, description, type, date } = req.body;

    // ✅ Validation with detailed logging
    if (!category || !category.trim()) {
      console.log('❌ Validation failed: No category');
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    if (!amount || amount <= 0) {
      console.log('❌ Validation failed: Invalid amount:', amount);
      return res.status(400).json({
        success: false,
        message: "Valid amount (greater than 0) is required",
      });
    }

    const transactionType = type || "expense";
    
    if (!["expense", "income"].includes(transactionType)) {
      console.log('❌ Validation failed: Invalid type:', transactionType);
      return res.status(400).json({
        success: false,
        message: "Type must be either 'expense' or 'income'",
      });
    }

    console.log('✅ Validation passed');

    // Start transaction
    await session.startTransaction();
    console.log('🔄 Database transaction started');

    // Ensure budget exists
    await ensureBudgetExists(userId);

    // Create transaction
    const transactionDoc = new Transaction({
      userId,
      category: category.trim(),
      amount: parseFloat(amount),
      description: description?.trim() || "",
      type: transactionType,
      date: date ? new Date(date) : new Date(),
    });

    console.log('📝 Saving transaction:', transactionDoc);
    await transactionDoc.save({ session });
    console.log('✅ Transaction saved to database');

    // Update budget ONLY for expenses
    if (transactionType === "expense") {
      console.log('💰 Updating budget for expense...');
      const budget = await Budget.findOne({ userId }).session(session);
      
      if (!budget) {
        throw new Error("Budget not found after creation");
      }

      budget.totalSpent += parseFloat(amount);
      console.log('Updated total spent:', budget.totalSpent);

      // Find or create category budget
      const categoryBudget = budget.categoryBudgets.find(
        (cat) => cat.category === category.trim()
      );

      if (categoryBudget) {
        categoryBudget.spentAmount += parseFloat(amount);
        console.log(`Updated ${category} spent:`, categoryBudget.spentAmount);
      } else {
        console.log(`Creating new category budget for: ${category}`);
        budget.categoryBudgets.push({
          category: category.trim(),
          budgetAmount: 0,
          spentAmount: parseFloat(amount),
          icon: "category",
          color: "#2196F3",
        });
      }

      await budget.save({ session });
      console.log('✅ Budget updated');
    }

    // Commit transaction
    await session.commitTransaction();
    console.log('✅ Database transaction committed');

    // Verify transaction was saved
    const savedTransaction = await Transaction.findById(transactionDoc._id);
    console.log('🔍 Verification - Transaction exists in DB:', !!savedTransaction);

    res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      transaction: transactionDoc,
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("❌ CREATE TRANSACTION ERROR:", error);
    console.error("Error stack:", error.stack);
    
    res.status(500).json({
      success: false,
      message: "Failed to create transaction",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  } finally {
    session.endSession();
    console.log('🔵 Transaction request completed\n');
  }
};

// ==================== GET ALL TRANSACTIONS ====================
export const getTransactions = async (req, res) => {
  console.log('📋 GET TRANSACTIONS REQUEST');
  console.log('User ID:', req.user.id);
  console.log('Query params:', req.query);

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

    console.log('Query:', JSON.stringify(query));

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const allowedSortFields = ["date", "amount", "category", "createdAt"];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "date";

    const transactions = await Transaction.find(query)
      .sort({ [sortField]: sortOrder === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Transaction.countDocuments(query);

    console.log(`✅ Found ${transactions.length} transactions (total: ${total})`);

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
    console.error("❌ GET TRANSACTIONS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get transactions",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

// ==================== GET SINGLE TRANSACTION ====================
export const getTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const transaction = await Transaction.findOne({ _id: id, userId }).lean();

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
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

// ==================== UPDATE TRANSACTION ====================
export const updateTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { category, amount, description, type, date } = req.body;

    await session.startTransaction();

    const transaction = await Transaction.findOne({ _id: id, userId }).session(session);

    if (!transaction) {
      await session.abortTransaction();
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
      const budget = await Budget.findOne({ userId }).session(session);
      
      if (budget) {
        budget.totalSpent = Math.max(0, budget.totalSpent - oldAmount);

        const categoryBudget = budget.categoryBudgets.find(
          (cat) => cat.category === oldCategory
        );

        if (categoryBudget) {
          categoryBudget.spentAmount = Math.max(0, categoryBudget.spentAmount - oldAmount);
        }

        await budget.save({ session });
      }
    }

    // Update transaction fields
    if (category && category.trim()) transaction.category = category.trim();
    if (amount && amount > 0) transaction.amount = parseFloat(amount);
    if (description !== undefined) transaction.description = description?.trim() || "";
    if (type && ["expense", "income"].includes(type)) transaction.type = type;
    if (date) transaction.date = new Date(date);

    await transaction.save({ session });

    // Add new expense to budget
    if (transaction.type === "expense") {
      const budget = await Budget.findOne({ userId }).session(session);
      
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
            icon: "category",
            color: "#2196F3",
          });
        }

        await budget.save({ session });
      }
    }

    await session.commitTransaction();

    res.json({
      success: true,
      message: "Transaction updated successfully",
      transaction,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Update Transaction Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update transaction",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  } finally {
    session.endSession();
  }
};

// ==================== DELETE TRANSACTION ====================
export const deleteTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await session.startTransaction();

    const transaction = await Transaction.findOne({ _id: id, userId }).session(session);

    if (!transaction) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // Remove expense from budget
    if (transaction.type === "expense") {
      const budget = await Budget.findOne({ userId }).session(session);
      
      if (budget) {
        budget.totalSpent = Math.max(0, budget.totalSpent - transaction.amount);

        const categoryBudget = budget.categoryBudgets.find(
          (cat) => cat.category === transaction.category
        );

        if (categoryBudget) {
          categoryBudget.spentAmount = Math.max(0, categoryBudget.spentAmount - transaction.amount);
        }

        await budget.save({ session });
      }
    }

    await Transaction.deleteOne({ _id: id, userId }).session(session);

    await session.commitTransaction();

    res.json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Delete Transaction Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete transaction",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  } finally {
    session.endSession();
  }
};

// ==================== GET SPENDING SUMMARY ====================
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

    const transactions = await Transaction.find(dateQuery).lean();

    let totalIncome = 0;
    let totalExpenses = 0;
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
        totalExpenses,
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
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

// ==================== GET RECENT ACTIVITIES ====================
export const getRecentActivities = async (req, res) => {
  console.log('📋 GET RECENT ACTIVITIES REQUEST');
  console.log('User ID:', req.user.id);
  console.log('Limit:', req.query.limit);

  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const transactions = await Transaction.find({ userId })
      .sort({ date: -1 })
      .limit(limit)
      .lean();

    console.log(`✅ Found ${transactions.length} recent transactions`);

    res.json({
      success: true,
      activities: transactions,
    });
  } catch (error) {
    console.error("❌ GET RECENT ACTIVITIES ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get recent activities",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

// ==================== GET TRANSACTIONS GROUPED BY DATE ====================
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

    const transactions = await Transaction.find(query).sort({ date: -1 }).lean();

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
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

// ==================== GET TRANSACTIONS BY CATEGORY ====================
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

    const transactions = await Transaction.find(query).lean();

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
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};