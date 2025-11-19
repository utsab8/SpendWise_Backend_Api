// routes/reportsRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getReportsData,
  getCategoryComparison,
} from "../controllers/reportsController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/reports?period=month
// period can be: day, week, month, year, custom
// For custom: also pass startDate and endDate
router.get("/", getReportsData);

// GET /api/reports/comparison?period1Start=...&period1End=...&period2Start=...&period2End=...
router.get("/comparison", getCategoryComparison);

export default router;