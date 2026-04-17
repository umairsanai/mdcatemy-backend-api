import express from "express";
import { signup, login, logout, protect, restrictTo } from "../controllers/auth.js";
import { getDashboardStats, getSavedMCQs, getWrongMCQs, deleteSavedMCQ, deleteWrongMCQ } from "../controllers/user.js";

const router = express.Router();


// Student functions
router.get("/stats", protect, /* restrictTo("student"), */ getDashboardStats);
router.get("/bookmarks", protect, /* restrictTo("student"), */ getSavedMCQs);
router.delete("/bookmarks/:mcq_id", protect, /* restrictTo("student"), */ deleteSavedMCQ);
router.get("/mistakes", protect, /* restrictTo("student"), */ getWrongMCQs);
router.delete("/mistakes/:mcq_id", protect, /* restrictTo("student"), */ deleteWrongMCQ);

// Both student and admin functions
router.get("/signup", signup);
router.get("/login", login);
router.get("/logout", protect, logout);

export default router;