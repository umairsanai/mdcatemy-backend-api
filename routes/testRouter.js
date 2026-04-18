import express from "express";
import { protect, restrictTo } from "../controllers/auth.js";
import { getAllTests, createTest, editTest, getUpcomingTest, addToTest, getTestInfo, getAllTestStats, submitTest } from "../controllers/test.js";
import { excelFileUpload } from "../helpers.js";

const router = express.Router();

// Admin functions
router.get("/names", protect, /* restrictTo("admin"), */ getAllTests);
router.post("/create", protect, /* restrictTo("admin"), */ excelFileUpload.single("file"), createTest);
router.post("/edit", protect, /* restrictTo("admin"), */ editTest);
router.post("/add-mcq", protect, /* restrictTo("admin"), */ addToTest);


// Student functions
router.get("/upcoming", protect, /* restrictTo("student"), */ getUpcomingTest);
router.get("/all", protect, /* restrictTo("student"), */ getAllTestStats);
router.get("/:slug", protect, /* restrictTo("student"), */ getTestInfo);
router.post("/submit", protect, /* restrictTo("student"), */ submitTest);

export default router;