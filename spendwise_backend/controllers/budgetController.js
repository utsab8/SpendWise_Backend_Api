// budgetController.js - FIXED VERSION
import Budget from "../models/budget.js";

// GET USER BUDGET
export const getUserBudget = async (req, res) => {
  try {
    const userId = req.user.id;
    
    let budget = await Budget.findOne({ userId });
    
    // If no budget exists, create minimal one (user must set it up)
    if (!budget) {
      budget = new Budget({
        userId,
        totalBudget: 0,  // ✅ Fixed: Start with 0, not 40000
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
    console.error("Get Budget Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to get budget", 
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// UPDATE TOTAL BUDGET
export const updateTotalBudget = async (req, res) => {
  try {
    const userId = req.user.id;
    const { totalBudget } = req.body;

    if (totalBudget === undefined || totalBudget === null || totalBudget < 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Valid total budget is required (must be >= 0)" 
      });
    }

    let budget = await Budget.findOne({ userId });
    
    if (!budget) {
      budget = new Budget({ 
        userId, 
        totalBudget: parseFloat(totalBudget), 
        totalSpent: 0 
      });
    } else {
      budget.totalBudget = parseFloat(totalBudget);
    }

    await budget.save();

    res.json({
      success: true,
      message: "Total budget updated successfully",
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
    console.error("Update Total Budget Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update budget", 
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
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

    // Update category budgets - preserve existing spent amounts
    const updatedCategories = categoryBudgets.map(cat => {
      const existing = budget.categoryBudgets.find(
        existing => existing.category === cat.category
      );

      return {
        category: cat.category,
        budgetAmount: parseFloat(cat.budgetAmount) || 0,
        // ✅ Preserve existing spent amount if updating budget allocation
        spentAmount: existing ? existing.spentAmount : 0,
      };
    });

    budget.categoryBudgets = updatedCategories;
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
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// UPDATE FULL BUDGET (Total + Categories)
export const updateFullBudget = async (req, res) => {
  try {
    const userId = req.user.id;
    const { totalBudget, categoryBudgets } = req.body;

    if (totalBudget === undefined || totalBudget === null || totalBudget < 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Valid total budget is required (must be >= 0)" 
      });
    }

    let budget = await Budget.findOne({ userId });
    
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

    // Update category budgets if provided
    if (categoryBudgets && Array.isArray(categoryBudgets)) {
      const updatedCategories = categoryBudgets.map(cat => {
        const existing = budget.categoryBudgets.find(
          existing => existing.category === cat.category
        );

        return {
          category: cat.category,
          budgetAmount: parseFloat(cat.budgetAmount) || 0,
          // ✅ Preserve existing spent amount
          spentAmount: existing ? existing.spentAmount : (parseFloat(cat.spentAmount) || 0),
        };
      });

      budget.categoryBudgets = updatedCategories;
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
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ADD EXPENSE (Legacy - prefer using transaction API)
export const addExpense = async (req, res) => {
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

    let budget = await Budget.findOne({ userId });
    
    if (!budget) {
      return res.status(404).json({ 
        success: false, 
        message: "Budget not found. Please set up your budget first." 
      });
    }

    const expenseAmount = parseFloat(amount);

    // Update total spent
    budget.totalSpent += expenseAmount;

    // Update category spent
    const categoryBudget = budget.categoryBudgets.find(
      cat => cat.category === category.trim()
    );

    if (categoryBudget) {
      categoryBudget.spentAmount += expenseAmount;
    } else {
      // Category doesn't exist in budget - create it with 0 allocation
      budget.categoryBudgets.push({
        category: category.trim(),
        budgetAmount: 0,
        spentAmount: expenseAmount,
      });
    }

    await budget.save();

    res.json({
      success: true,
      message: "Expense added successfully",
      expense: {
        category: category.trim(),
        amount: expenseAmount,
        description: description || "",
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
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
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

    // ✅ Optional: Save history before reset (implement BudgetHistory model)
    // await BudgetHistory.create({
    //   userId,
    //   totalBudget: budget.totalBudget,
    //   totalSpent: budget.totalSpent,
    //   categoryBudgets: budget.categoryBudgets,
    //   month: budget.month,
    // });

    // Reset spent amounts but keep budget allocations
    budget.totalSpent = 0;
    budget.categoryBudgets.forEach(cat => {
      cat.spentAmount = 0;
    });
    
    // Update month to current
    const currentMonth = new Date().toISOString().slice(0, 7);
    budget.month = currentMonth;

    await budget.save();

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
    console.error("Reset Budget Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to reset budget", 
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};