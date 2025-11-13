import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getUserBudget,
  updateTotalBudget,
  updateCategoryBudgets,
  updateFullBudget,
  addExpense,
  resetBudget,
} from "../controllers/budgetController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET user budget
router.get("/", getUserBudget);

// UPDATE total budget only
router.put("/total", updateTotalBudget);

// UPDATE category budgets only
router.put("/categories", updateCategoryBudgets);

// UPDATE full budget (total + categories)
router.put("/", updateFullBudget);

// ADD expense
router.post("/expense", addExpense);

// RESET budget (for new month)
router.post("/reset", resetBudget);

export default router;