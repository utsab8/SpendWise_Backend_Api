// controllers/reportsController.js - FIXED with proper exports
import Transaction from "../models/transaction.js";
import Budget from "../models/budget.js";

// ==================== GET REPORTS DATA ====================
export const getReportsData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period, startDate, endDate } = req.query;

    console.log('📊 GET REPORTS DATA');
    console.log('User ID:', userId);
    console.log('Period:', period);

    // Determine date range based on period
    let dateRange = {};
    const now = new Date();

    switch (period) {
      case 'day':
        dateRange = {
          start: new Date(now.setHours(0, 0, 0, 0)),
          end: new Date(now.setHours(23, 59, 59, 999)),
        };
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        dateRange = { start: weekStart, end: weekEnd };
        break;
      case 'month':
        dateRange = {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
        };
        break;
      case 'year':
        dateRange = {
          start: new Date(now.getFullYear(), 0, 1),
          end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
        };
        break;
      default:
        dateRange = {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
        };
    }

    console.log('Date Range:', dateRange);

    // ✅ GET BUDGET DATA FIRST
    const budget = await Budget.findOne({ userId });
    console.log('💰 Budget found:', !!budget);
    
    if (budget) {
      console.log('📊 Budget categories:', budget.categoryBudgets.length);
      console.log('💰 Total Budget:', budget.totalBudget);
      console.log('💰 Total Spent:', budget.totalSpent);
    }

    // Get transactions for the period
    const transactions = await Transaction.find({
      userId,
      date: {
        $gte: dateRange.start,
        $lte: dateRange.end,
      },
    }).sort({ date: -1 });

    console.log(`📋 Found ${transactions.length} transactions`);

    // Calculate totals from transactions
    let totalIncome = 0;
    let totalExpenses = 0;
    const categoryBreakdown = {};

    transactions.forEach((transaction) => {
      if (transaction.type === 'income') {
        totalIncome += transaction.amount;
      } else {
        totalExpenses += transaction.amount;

        // Category breakdown from transactions
        if (!categoryBreakdown[transaction.category]) {
          categoryBreakdown[transaction.category] = {
            total: 0,
            count: 0,
            percentage: 0,
          };
        }
        categoryBreakdown[transaction.category].total += transaction.amount;
        categoryBreakdown[transaction.category].count += 1;
      }
    });

    // ✅ USE BUDGET DATA FOR TOTALS (not just transactions)
    const finalTotalBudget = budget?.totalBudget || 0;
    const finalTotalSpent = budget?.totalSpent || totalExpenses;
    
    // Calculate percentages based on budget data
    const budgetUsedPercentage = finalTotalBudget > 0 
      ? Math.round((finalTotalSpent / finalTotalBudget) * 100) 
      : 0;

    console.log('💰 Final Totals - Budget:', finalTotalBudget, 'Spent:', finalTotalSpent);

    // ✅ COMBINE BUDGET CATEGORIES WITH TRANSACTION DATA
    const combinedCategoryBreakdown = {};

    // First, add all budget categories
    if (budget && budget.categoryBudgets) {
      budget.categoryBudgets.forEach(catBudget => {
        combinedCategoryBreakdown[catBudget.category] = {
          total: catBudget.spentAmount || 0,
          budgetAmount: catBudget.budgetAmount || 0,
          count: 0,
          percentage: 0,
          fromBudget: true,
          icon: catBudget.icon,
          color: catBudget.color
        };
      });
    }

    // Then, add/update with transaction data
    Object.keys(categoryBreakdown).forEach(category => {
      if (combinedCategoryBreakdown[category]) {
        // Update existing budget category with transaction data
        combinedCategoryBreakdown[category].total = categoryBreakdown[category].total;
        combinedCategoryBreakdown[category].count = categoryBreakdown[category].count;
      } else {
        // Add transaction-only category
        combinedCategoryBreakdown[category] = {
          ...categoryBreakdown[category],
          budgetAmount: 0,
          fromBudget: false
        };
      }
    });

    // Calculate percentages for combined data
    Object.keys(combinedCategoryBreakdown).forEach((category) => {
      const catData = combinedCategoryBreakdown[category];
      const percentage = finalTotalSpent > 0 
        ? Math.round((catData.total / finalTotalSpent) * 100) 
        : 0;
      catData.percentage = percentage;
    });

    // Generate time series data
    const timeSeriesData = generateTimeSeriesData(transactions, period, dateRange);

    // Sort categories by amount (descending)
    const sortedCategories = Object.entries(combinedCategoryBreakdown)
      .sort(([, a], [, b]) => b.total - a.total)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});

    console.log('✅ Reports data prepared with budget integration');

    res.json({
      success: true,
      data: {
        period,
        dateRange: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString(),
        },
        summary: {
          totalIncome,
          totalExpenses,
          totalSpent: finalTotalSpent, // ✅ Use budget's total spent
          totalBudget: finalTotalBudget, // ✅ Use budget's total budget
          budgetUsedPercentage,
          netAmount: totalIncome - totalExpenses,
          transactionCount: transactions.length,
        },
        categoryBreakdown: sortedCategories,
        timeSeriesData,
        // ✅ ADD BUDGET METADATA
        budgetData: budget ? {
          hasBudget: true,
          totalBudget: budget.totalBudget,
          totalSpent: budget.totalSpent,
          month: budget.month
        } : {
          hasBudget: false,
          totalBudget: 0,
          totalSpent: 0
        }
      },
    });
  } catch (error) {
    console.error('❌ GET REPORTS ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reports data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

// ==================== HELPER: Generate Time Series Data ====================
function generateTimeSeriesData(transactions, period, dateRange) {
  const timeSeriesData = [];

  switch (period) {
    case 'day':
      // Hourly breakdown (6 AM to 9 PM)
      for (let hour = 6; hour <= 21; hour += 3) {
        const label = `${hour.toString().padStart(2, '0')}:00`;
        const amount = transactions
          .filter((t) => {
            const txHour = new Date(t.date).getHours();
            return txHour >= hour && txHour < hour + 3 && t.type === 'expense';
          })
          .reduce((sum, t) => sum + t.amount, 0);

        timeSeriesData.push({ label, amount });
      }
      break;

    case 'week':
      // Daily breakdown (Sun - Sat)
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 0; i < 7; i++) {
        const dayStart = new Date(dateRange.start);
        dayStart.setDate(dateRange.start.getDate() + i);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const amount = transactions
          .filter((t) => {
            const txDate = new Date(t.date);
            return txDate >= dayStart && txDate <= dayEnd && t.type === 'expense';
          })
          .reduce((sum, t) => sum + t.amount, 0);

        timeSeriesData.push({ label: days[i], amount });
      }
      break;

    case 'month':
      // Weekly breakdown (Week 1-4)
      for (let week = 0; week < 4; week++) {
        const weekStart = new Date(dateRange.start);
        weekStart.setDate(dateRange.start.getDate() + week * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const amount = transactions
          .filter((t) => {
            const txDate = new Date(t.date);
            return txDate >= weekStart && txDate <= weekEnd && t.type === 'expense';
          })
          .reduce((sum, t) => sum + t.amount, 0);

        timeSeriesData.push({ label: `W${week + 1}`, amount });
      }
      break;

    case 'year':
      // Monthly breakdown (Jan - Dec)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(dateRange.start.getFullYear(), month, 1);
        const monthEnd = new Date(dateRange.start.getFullYear(), month + 1, 0, 23, 59, 59, 999);

        const amount = transactions
          .filter((t) => {
            const txDate = new Date(t.date);
            return txDate >= monthStart && txDate <= monthEnd && t.type === 'expense';
          })
          .reduce((sum, t) => sum + t.amount, 0);

        timeSeriesData.push({ label: months[month], amount });
      }
      break;

    default:
      // Default: Weekly breakdown
      for (let week = 0; week < 4; week++) {
        const weekStart = new Date(dateRange.start);
        weekStart.setDate(dateRange.start.getDate() + week * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const amount = transactions
          .filter((t) => {
            const txDate = new Date(t.date);
            return txDate >= weekStart && txDate <= weekEnd && t.type === 'expense';
          })
          .reduce((sum, t) => sum + t.amount, 0);

        timeSeriesData.push({ label: `W${week + 1}`, amount });
      }
  }

  // Normalize data for chart (0-1 scale)
  const maxAmount = Math.max(...timeSeriesData.map((d) => d.amount), 1);
  return timeSeriesData.map((d) => ({
    label: d.label,
    amount: d.amount,
    height: d.amount / maxAmount, // Normalized for chart display
  }));
}

// ==================== GET CATEGORY COMPARISON ====================
export const getCategoryComparison = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period1Start, period1End, period2Start, period2End } = req.query;

    console.log('📊 GET CATEGORY COMPARISON');
    console.log('Period 1:', period1Start, 'to', period1End);
    console.log('Period 2:', period2Start, 'to', period2End);

    // Get transactions for both periods
    const period1Transactions = await Transaction.find({
      userId,
      type: 'expense',
      date: {
        $gte: new Date(period1Start),
        $lte: new Date(period1End),
      },
    });

    const period2Transactions = await Transaction.find({
      userId,
      type: 'expense',
      date: {
        $gte: new Date(period2Start),
        $lte: new Date(period2End),
      },
    });

    console.log(`Period 1 transactions: ${period1Transactions.length}`);
    console.log(`Period 2 transactions: ${period2Transactions.length}`);

    // Calculate category totals for both periods
    const period1Categories = {};
    const period2Categories = {};

    period1Transactions.forEach((t) => {
      period1Categories[t.category] = (period1Categories[t.category] || 0) + t.amount;
    });

    period2Transactions.forEach((t) => {
      period2Categories[t.category] = (period2Categories[t.category] || 0) + t.amount;
    });

    // Compare and calculate changes
    const allCategories = new Set([
      ...Object.keys(period1Categories),
      ...Object.keys(period2Categories),
    ]);

    const comparison = Array.from(allCategories).map((category) => {
      const period1Amount = period1Categories[category] || 0;
      const period2Amount = period2Categories[category] || 0;
      const change = period2Amount - period1Amount;
      const percentageChange = period1Amount > 0 
        ? Math.round((change / period1Amount) * 100) 
        : period2Amount > 0 ? 100 : 0;

      return {
        category,
        period1Amount,
        period2Amount,
        change,
        percentageChange,
      };
    });

    console.log('✅ Category comparison prepared');

    res.json({
      success: true,
      comparison: comparison.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)),
    });
  } catch (error) {
    console.error('❌ Category Comparison Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get category comparison',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};