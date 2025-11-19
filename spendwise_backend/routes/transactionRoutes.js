import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  getSpendingSummary,
  getRecentActivities,
  getTransactionsGroupedByDate,
  getTransactionsByCategory,
} from "../controllers/transactionController.js";
import Transaction from "../models/transaction.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// ⚠️ DEBUG ENDPOINT - Remove after testing
router.get("/debug/count", async (req, res) => {
  try {
    const count = await Transaction.countDocuments({ userId: req.user.id });
    const transactions = await Transaction.find({ userId: req.user.id })
      .sort({ date: -1 })
      .limit(10);
    
    res.json({
      success: true,
      totalTransactions: count,
      recentTransactions: transactions,
      message: count === 0 
        ? "No transactions found for this user" 
        : `Found ${count} transactions`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ⚠️ IMPORTANT: Summary routes MUST come BEFORE /:id routes
// Analytics & Reports
router.get("/summary/overview", getSpendingSummary);
router.get("/summary/recent", getRecentActivities);
router.get("/summary/grouped", getTransactionsGroupedByDate);
router.get("/summary/category", getTransactionsByCategory);

// Basic CRUD operations
router.post("/", createTransaction);
router.get("/", getTransactions);
router.get("/:id", getTransaction);
router.put("/:id", updateTransaction);
router.delete("/:id", deleteTransaction);

export default router;