import express from "express";
import { registerUser, loginUser } from "../controllers/authController.js"; // ✅ Changed to authController (capital C)

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

export default router;