import express from "express";
import { protect, restrictTo } from "../controllers/auth.js";
import { getAllTestsNames, getUpcomingTest, addToTest, getTestInfo, getAllTestStats, submitTest } from "../controllers/test.js";

const router = express.Router();

// Admin functions
router.get("/names", protect, /* restrictTo("admin"), */ getAllTestsNames);
router.post("/add", protect, /* restrictTo("admin"), */ addToTest);

// Student functions
router.get("/upcoming", protect, /* restrictTo("student"), */ getUpcomingTest);
router.get("/all", protect, /* restrictTo("student"), */ getAllTestStats);
router.get("/:slug", protect, /* restrictTo("student"), */ getTestInfo);
router.post("/submit", protect, /* restrictTo("student"), */ submitTest);

export default router;