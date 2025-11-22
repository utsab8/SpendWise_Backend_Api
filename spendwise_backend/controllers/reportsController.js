// controllers/reportsController.js - COMPLETE VERSION
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
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
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

    console.log('Date Range:', dateRange.start, 'to', dateRange.end);

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

    // Generate time series data - FIXED
    const timeSeriesData = generateTimeSeriesData(transactions, period, dateRange);

    // Sort categories by amount (descending)
    const sortedCategories = Object.entries(combinedCategoryBreakdown)
      .sort(([, a], [, b]) => b.total - a.total)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});

    console.log('✅ Reports data prepared with budget integration');
    console.log('📊 Time series data:', timeSeriesData);

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
  let labels = [];
  let intervals = [];

  switch (period) {
    case 'day':
      // Hourly breakdown (6 AM to 9 PM) - 3 hour intervals
      for (let hour = 6; hour <= 21; hour += 3) {
        const endHour = hour + 3;
        const label = `${hour.toString().padStart(2, '0')}:00`;
        labels.push(label);
        
        const startTime = new Date(dateRange.start);
        startTime.setHours(hour, 0, 0, 0);
        const endTime = new Date(dateRange.start);
        endTime.setHours(endHour, 0, 0, 0);
        
        intervals.push({ start: startTime, end: endTime, label });
      }
      break;

    case 'week':
      // Daily breakdown (Sun - Sat)
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 0; i < 7; i++) {
        const dayStart = new Date(dateRange.start);
        dayStart.setDate(dateRange.start.getDate() + i);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        
        labels.push(days[i]);
        intervals.push({ start: dayStart, end: dayEnd, label: days[i] });
      }
      break;

    case 'month':
      // Weekly breakdown (Week 1-4)
      for (let week = 0; week < 4; week++) {
        const weekStart = new Date(dateRange.start);
        weekStart.setDate(dateRange.start.getDate() + week * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        labels.push(`W${week + 1}`);
        intervals.push({ start: weekStart, end: weekEnd, label: `W${week + 1}` });
      }
      break;

    case 'year':
      // Monthly breakdown (Jan - Dec)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(dateRange.start.getFullYear(), month, 1);
        const monthEnd = new Date(dateRange.start.getFullYear(), month + 1, 0, 23, 59, 59, 999);
        
        labels.push(months[month]);
        intervals.push({ start: monthStart, end: monthEnd, label: months[month] });
      }
      break;

    default:
      // Default: Weekly breakdown
      for (let week = 0; week < 4; week++) {
        const weekStart = new Date(dateRange.start);
        weekStart.setDate(dateRange.start.getDate() + week * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        labels.push(`W${week + 1}`);
        intervals.push({ start: weekStart, end: weekEnd, label: `W${week + 1}` });
      }
  }

  // Calculate amounts for each interval
  intervals.forEach(interval => {
    const amount = transactions
      .filter(t => {
        const txDate = new Date(t.date);
        return txDate >= interval.start && 
               txDate <= interval.end && 
               t.type === 'expense';
      })
      .reduce((sum, t) => sum + t.amount, 0);

    timeSeriesData.push({
      label: interval.label,
      amount: amount,
    });
  });

  // Normalize data for chart (0-1 scale) - FIXED with better handling
  const amounts = timeSeriesData.map(d => d.amount);
  const maxAmount = Math.max(...amounts, 1); // Ensure at least 1 to avoid division by zero
  
  console.log('📊 Time series raw data:', timeSeriesData);
  console.log('📊 Max amount for normalization:', maxAmount);

  const normalizedData = timeSeriesData.map(d => ({
    label: d.label,
    amount: d.amount,
    height: maxAmount > 0 ? (d.amount / maxAmount) : 0,
  }));

  console.log('📊 Normalized time series data:', normalizedData);
  
  return normalizedData;
}

// ==================== GET CATEGORY COMPARISON ====================
export const getCategoryComparison = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period1Start, period1End, period2Start, period2End } = req.query;

    console.log('📊 GET CATEGORY COMPARISON');
    console.log('User ID:', userId);

    // Validate dates
    if (!period1Start || !period1End || !period2Start || !period2End) {
      return res.status(400).json({
        success: false,
        message: 'All date parameters are required: period1Start, period1End, period2Start, period2End',
      });
    }

    // Get transactions for period 1
    const period1Transactions = await Transaction.find({
      userId,
      type: 'expense',
      date: {
        $gte: new Date(period1Start),
        $lte: new Date(period1End),
      },
    });

    // Get transactions for period 2
    const period2Transactions = await Transaction.find({
      userId,
      type: 'expense',
      date: {
        $gte: new Date(period2Start),
        $lte: new Date(period2End),
      },
    });

    console.log(`📋 Period 1: ${period1Transactions.length} transactions`);
    console.log(`📋 Period 2: ${period2Transactions.length} transactions`);

    // Calculate category totals for period 1
    const period1Categories = {};
    let period1Total = 0;
    period1Transactions.forEach((transaction) => {
      if (!period1Categories[transaction.category]) {
        period1Categories[transaction.category] = 0;
      }
      period1Categories[transaction.category] += transaction.amount;
      period1Total += transaction.amount;
    });

    // Calculate category totals for period 2
    const period2Categories = {};
    let period2Total = 0;
    period2Transactions.forEach((transaction) => {
      if (!period2Categories[transaction.category]) {
        period2Categories[transaction.category] = 0;
      }
      period2Categories[transaction.category] += transaction.amount;
      period2Total += transaction.amount;
    });

    // Get all unique categories
    const allCategories = new Set([
      ...Object.keys(period1Categories),
      ...Object.keys(period2Categories),
    ]);

    // Build comparison data
    const comparison = {};
    allCategories.forEach((category) => {
      const period1Amount = period1Categories[category] || 0;
      const period2Amount = period2Categories[category] || 0;
      const difference = period2Amount - period1Amount;
      const percentageChange = period1Amount > 0 
        ? Math.round((difference / period1Amount) * 100) 
        : (period2Amount > 0 ? 100 : 0);

      comparison[category] = {
        period1: period1Amount,
        period2: period2Amount,
        difference: difference,
        percentageChange: percentageChange,
        trend: difference > 0 ? 'increased' : difference < 0 ? 'decreased' : 'unchanged',
      };
    });

    // Overall comparison
    const overallDifference = period2Total - period1Total;
    const overallPercentageChange = period1Total > 0 
      ? Math.round((overallDifference / period1Total) * 100) 
      : (period2Total > 0 ? 100 : 0);

    console.log('✅ Category comparison prepared');

    res.json({
      success: true,
      data: {
        period1: {
          start: period1Start,
          end: period1End,
          total: period1Total,
          transactionCount: period1Transactions.length,
        },
        period2: {
          start: period2Start,
          end: period2End,
          total: period2Total,
          transactionCount: period2Transactions.length,
        },
        overall: {
          difference: overallDifference,
          percentageChange: overallPercentageChange,
          trend: overallDifference > 0 ? 'increased' : overallDifference < 0 ? 'decreased' : 'unchanged',
        },
        categoryComparison: comparison,
      },
    });
  } catch (error) {
    console.error('❌ GET CATEGORY COMPARISON ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get category comparison',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};