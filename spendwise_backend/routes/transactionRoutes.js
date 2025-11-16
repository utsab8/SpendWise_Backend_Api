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

const router = express.Router();

// All routes require authentication
router.use(protect);

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