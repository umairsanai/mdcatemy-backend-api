import express from "express";
import { signup, login, logout, protect, restrictTo } from "../controllers/auth.js";
import { getDashboardStats, getSavedMCQs, getWrongMCQs, submitQuiz } from "../controllers/user.js";

const router = express.Router();

router.get("/dashboard-stats", protect, restrictTo("student"), getDashboardStats);
router.get("/saved-mcqs", protect, restrictTo("student"), getSavedMCQs);
router.get("/wrong-mcqs", protect, restrictTo("student"), getWrongMCQs);
router.post("/submit-quiz", protect, restrictTo("student"), submitQuiz);

router.get("/signup", signup);
router.get("/login", login);
router.get("/logout", protect, logout);

export default router;