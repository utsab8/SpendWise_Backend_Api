// budgetController.js - COMPLETE FIXED VERSION with Transaction integration
import Budget from "../models/budget.js";
import Transaction from "../models/transaction.js"; // ✅ ADDED
import mongoose from "mongoose";

// ==================== GET USER BUDGET ====================
export const getUserBudget = async (req, res) => {
  try {
    const userId = req.user.id;
    
    let budget = await Budget.findOne({ userId });
    
    // If no budget exists, create minimal one
    if (!budget) {
      budget = new Budget({
        userId,
        totalBudget: 0,
        totalSpent: 0,
        categoryBudgets: [],
      });
      await budget.save();
    }

    res.json({
      success: true,
      budget: {
        totalBudget: budget.totalBudget,
        totalSpent: budget.totalSpent,
        budgetLeft: budget.totalBudget - budget.totalSpent,
        budgetUsedPercentage: budget.totalBudget > 0 
          ? Math.round((budget.totalSpent / budget.totalBudget) * 100) 
          : 0,
        categoryBudgets: budget.categoryBudgets,
        month: budget.month,
      },
    });
  } catch (error) {
    console.error("❌ Get Budget Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to get budget", 
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

// ==================== UPDATE CATEGORY BUDGETS ====================
export const updateCategoryBudgets = async (req, res) => {
  try {
    const userId = req.user.id;
    const { categoryBudgets } = req.body;

    if (!categoryBudgets || !Array.isArray(categoryBudgets)) {
      return res.status(400).json({ 
        success: false, 
        message: "Category budgets array is required" 
      });
    }

    let budget = await Budget.findOne({ userId });
    
    if (!budget) {
      budget = new Budget({ 
        userId, 
        totalBudget: 0, 
        totalSpent: 0,
        categoryBudgets: [] 
      });
    }

    // ✅ FIXED: Update category budgets - UPDATE spent amounts from frontend
    const updatedCategories = categoryBudgets.map(cat => {
      const existing = budget.categoryBudgets.find(
        existing => existing.category === cat.category
      );

      return {
        category: cat.category,
        budgetAmount: parseFloat(cat.budgetAmount) || 0,
        // ✅ CRITICAL FIX: Use spentAmount from frontend (not preserve existing)
        spentAmount: parseFloat(cat.spentAmount) || 0,
        icon: cat.icon || (existing ? existing.icon : "category"),
        color: cat.color || (existing ? existing.color : "#2196F3"),
      };
    });

    // ✅ FIXED: Recalculate total spent from all categories
    const newTotalSpent = updatedCategories.reduce((total, cat) => total + (cat.spentAmount || 0), 0);

    budget.categoryBudgets = updatedCategories;
    budget.totalSpent = newTotalSpent;

    await budget.save();

    console.log(`✅ Category budgets updated: Total spent = ${newTotalSpent}`);
    console.log('📊 Category details:');
    updatedCategories.forEach(cat => {
      console.log(`   ${cat.category}: Budget=${cat.budgetAmount}, Spent=${cat.spentAmount}`);
    });

    res.json({
      success: true,
      message: "Category budgets updated successfully",
      categoryBudgets: budget.categoryBudgets,
    });
  } catch (error) {
    console.error("❌ Update Category Budgets Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update category budgets", 
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

// ==================== UPDATE FULL BUDGET ====================
export const updateFullBudget = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    const userId = req.user.id;
    const { totalBudget, categoryBudgets } = req.body;

    if (totalBudget === undefined || totalBudget === null || totalBudget < 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Valid total budget is required (must be >= 0)" 
      });
    }

    await session.startTransaction();

    let budget = await Budget.findOne({ userId }).session(session);
    
    if (!budget) {
      budget = new Budget({ 
        userId, 
        totalBudget: parseFloat(totalBudget), 
        totalSpent: 0,
        categoryBudgets: [] 
      });
    } else {
      budget.totalBudget = parseFloat(totalBudget);
    }

    // ✅ Update category budgets if provided
    if (categoryBudgets && Array.isArray(categoryBudgets)) {
      const updatedCategories = categoryBudgets.map(cat => {
        const existing = budget.categoryBudgets.find(
          existing => existing.category === cat.category
        );

        return {
          category: cat.category,
          budgetAmount: parseFloat(cat.budgetAmount) || 0,
          // ✅ FIXED: Use spentAmount from frontend
          spentAmount: parseFloat(cat.spentAmount) || 0,
          icon: cat.icon || (existing ? existing.icon : "category"),
          color: cat.color || (existing ? existing.color : "#2196F3"),
        };
      });

      // ✅ FIXED: Recalculate total spent
      const newTotalSpent = updatedCategories.reduce((total, cat) => total + (cat.spentAmount || 0), 0);
      
      budget.categoryBudgets = updatedCategories;
      budget.totalSpent = newTotalSpent;
    }

    await budget.save({ session });
    await session.commitTransaction();

    console.log(`✅ Budget updated for user ${userId}: Total=${budget.totalBudget}, Spent=${budget.totalSpent}, Categories=${budget.categoryBudgets.length}`);

    res.json({
      success: true,
      message: "Budget updated successfully",
      budget: {
        totalBudget: budget.totalBudget,
        totalSpent: budget.totalSpent,
        budgetLeft: budget.totalBudget - budget.totalSpent,
        budgetUsedPercentage: budget.totalBudget > 0 
          ? Math.round((budget.totalSpent / budget.totalBudget) * 100) 
          : 0,
        categoryBudgets: budget.categoryBudgets,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Update Full Budget Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update budget", 
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  } finally {
    session.endSession();
  }
};

// ==================== ADD EXPENSE ====================
export const addExpense = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    const userId = req.user.id;
    const { category, amount, description } = req.body;

    if (!category || !category.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: "Category is required" 
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Valid amount (greater than 0) is required" 
      });
    }

    await session.startTransaction();

    let budget = await Budget.findOne({ userId }).session(session);
    
    if (!budget) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        message: "Budget not found. Please set up your budget first." 
      });
    }

    const expenseAmount = parseFloat(amount);

    // ✅ CREATE TRANSACTION RECORD (NEW!)
    const transaction = new Transaction({
      userId,
      category: category.trim(),
      amount: expenseAmount,
      description: description || "",
      type: "expense",
      date: new Date(),
    });

    await transaction.save({ session });
    console.log(`✅ Transaction created: ${transaction._id}`);

    // Update total spent in budget
    budget.totalSpent += expenseAmount;

    // Update category spent
    const categoryBudget = budget.categoryBudgets.find(
      cat => cat.category === category.trim()
    );

    if (categoryBudget) {
      categoryBudget.spentAmount += expenseAmount;
    } else {
      // Create new category with expense
      budget.categoryBudgets.push({
        category: category.trim(),
        budgetAmount: 0,
        spentAmount: expenseAmount,
        icon: "category",
        color: "#2196F3",
      });
    }

    await budget.save({ session });
    await session.commitTransaction();

    console.log(`✅ Expense added: ${category} - NPR ${expenseAmount}`);
    console.log(`✅ Transaction ID: ${transaction._id}`);

    res.json({
      success: true,
      message: "Expense added successfully",
      expense: {
        category: category.trim(),
        amount: expenseAmount,
        description: description || "",
        transactionId: transaction._id, // ✅ Return transaction ID
      },
      budget: {
        totalBudget: budget.totalBudget,
        totalSpent: budget.totalSpent,
        budgetLeft: budget.totalBudget - budget.totalSpent,
        budgetUsedPercentage: budget.totalBudget > 0 
          ? Math.round((budget.totalSpent / budget.totalBudget) * 100) 
          : 0,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Add Expense Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to add expense", 
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  } finally {
    session.endSession();
  }
};

// ==================== RESET BUDGET ====================
export const resetBudget = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    const userId = req.user.id;

    await session.startTransaction();

    let budget = await Budget.findOne({ userId }).session(session);
    
    if (!budget) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        message: "Budget not found" 
      });
    }

    // Reset spent amounts but keep budget allocations
    budget.totalSpent = 0;
    budget.categoryBudgets.forEach(cat => {
      cat.spentAmount = 0;
    });
    
    // Update month to current
    const currentMonth = new Date().toISOString().slice(0, 7);
    budget.month = currentMonth;

    await budget.save({ session });
    await session.commitTransaction();

    console.log(`✅ Budget reset for user ${userId} - Month: ${currentMonth}`);

    res.json({
      success: true,
      message: "Budget reset successfully for new month",
      budget: {
        totalBudget: budget.totalBudget,
        totalSpent: budget.totalSpent,
        budgetLeft: budget.totalBudget,
        categoryBudgets: budget.categoryBudgets,
        month: budget.month,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Reset Budget Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to reset budget", 
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  } finally {
    session.endSession();
  }
};