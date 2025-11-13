import Budget from "../models/budget.js";

// GET USER BUDGET
export const getUserBudget = async (req, res) => {
  try {
    const userId = req.user.id;
    
    let budget = await Budget.findOne({ userId });
    
    // If no budget exists, create default one
    if (!budget) {
      budget = new Budget({
        userId,
        totalBudget: 40000,
        totalSpent: 0,
        categoryBudgets: [
          { category: "Food", budgetAmount: 14000, spentAmount: 0 },
          { category: "Transport", budgetAmount: 10000, spentAmount: 0 },
          { category: "Shopping", budgetAmount: 8000, spentAmount: 0 },
          { category: "Education", budgetAmount: 4800, spentAmount: 0 },
          { category: "Health", budgetAmount: 3200, spentAmount: 0 },
        ],
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
    console.error("Get Budget Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to get budget", 
      error: error.message 
    });
  }
};

// UPDATE TOTAL BUDGET
export const updateTotalBudget = async (req, res) => {
  try {
    const userId = req.user.id;
    const { totalBudget } = req.body;

    if (!totalBudget || totalBudget < 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Valid total budget is required" 
      });
    }

    let budget = await Budget.findOne({ userId });
    
    if (!budget) {
      budget = new Budget({ userId, totalBudget, totalSpent: 0 });
    } else {
      budget.totalBudget = totalBudget;
    }

    await budget.save();

    res.json({
      success: true,
      message: "Total budget updated successfully",
      budget: {
        totalBudget: budget.totalBudget,
        totalSpent: budget.totalSpent,
        budgetLeft: budget.totalBudget - budget.totalSpent,
      },
    });
  } catch (error) {
    console.error("Update Total Budget Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update budget", 
      error: error.message 
    });
  }
};

// UPDATE CATEGORY BUDGETS
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

    // Update category budgets
    budget.categoryBudgets = categoryBudgets.map(cat => ({
      category: cat.category,
      budgetAmount: cat.budgetAmount || 0,
      spentAmount: cat.spentAmount || 0,
    }));

    await budget.save();

    res.json({
      success: true,
      message: "Category budgets updated successfully",
      categoryBudgets: budget.categoryBudgets,
    });
  } catch (error) {
    console.error("Update Category Budgets Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update category budgets", 
      error: error.message 
    });
  }
};

// UPDATE FULL BUDGET (Total + Categories)
export const updateFullBudget = async (req, res) => {
  try {
    const userId = req.user.id;
    const { totalBudget, categoryBudgets } = req.body;

    if (!totalBudget || totalBudget < 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Valid total budget is required" 
      });
    }

    let budget = await Budget.findOne({ userId });
    
    if (!budget) {
      budget = new Budget({ 
        userId, 
        totalBudget, 
        totalSpent: 0,
        categoryBudgets: [] 
      });
    } else {
      budget.totalBudget = totalBudget;
    }

    // Update category budgets if provided
    if (categoryBudgets && Array.isArray(categoryBudgets)) {
      budget.categoryBudgets = categoryBudgets.map(cat => ({
        category: cat.category,
        budgetAmount: cat.budgetAmount || 0,
        spentAmount: cat.spentAmount || 0,
      }));
    }

    await budget.save();

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
    console.error("Update Full Budget Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update budget", 
      error: error.message 
    });
  }
};

// ADD EXPENSE
export const addExpense = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, amount, description } = req.body;

    if (!category || !amount || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Category and valid amount are required" 
      });
    }

    let budget = await Budget.findOne({ userId });
    
    if (!budget) {
      return res.status(404).json({ 
        success: false, 
        message: "Budget not found. Please set up your budget first." 
      });
    }

    // Update total spent
    budget.totalSpent += amount;

    // Update category spent
    const categoryBudget = budget.categoryBudgets.find(
      cat => cat.category === category
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

    res.json({
      success: true,
      message: "Expense added successfully",
      expense: {
        category,
        amount,
        description,
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
    console.error("Add Expense Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to add expense", 
      error: error.message 
    });
  }
};

// RESET BUDGET (for new month)
export const resetBudget = async (req, res) => {
  try {
    const userId = req.user.id;

    let budget = await Budget.findOne({ userId });
    
    if (!budget) {
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
    budget.month = new Date().toISOString().slice(0, 7);

    await budget.save();

    res.json({
      success: true,
      message: "Budget reset successfully",
      budget: {
        totalBudget: budget.totalBudget,
        totalSpent: budget.totalSpent,
        categoryBudgets: budget.categoryBudgets,
        month: budget.month,
      },
    });
  } catch (error) {
    console.error("Reset Budget Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to reset budget", 
      error: error.message 
    });
  }
};