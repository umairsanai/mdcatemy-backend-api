import express from "express";
import { login, logout, protect } from "../controllers/auth.js";
import { getDashboardStats, getSavedMCQs, getWrongMCQs } from "../controllers/user.js";

const router = express.Router();

router.get("/dashboard-stats", protect, getDashboardStats);
router.get("/saved-mcqs", protect, getSavedMCQs);
router.get("/wrong-mcqs", protect, getWrongMCQs);

router.get("/login", login)
router.get("/logout", logout);

export default router;