import express from "express";
import { signup, login, logout, protect, restrictTo } from "../controllers/auth.js";
import { getDashboardStats, getSavedMCQs, getWrongMCQs, submitQuiz, deleteSavedMCQ, deleteWrongMCQ } from "../controllers/user.js";

const router = express.Router();

router.get("/dashboard-stats", protect, restrictTo("student"), getDashboardStats);
router.get("/saved-mcqs", protect, restrictTo("student"), getSavedMCQs);
router.delete("/saved-mcq/:mcq_id", protect, restrictTo("student"), deleteSavedMCQ);
router.get("/wrong-mcqs", protect, restrictTo("student"), getWrongMCQs);
router.delete("/wrong-mcq/:mcq_id", protect, restrictTo("student"), deleteWrongMCQ);
router.post("/submit-quiz", protect, restrictTo("student"), submitQuiz);

router.get("/signup", signup);
router.get("/login", login);
router.get("/logout", protect, logout);

export default router;