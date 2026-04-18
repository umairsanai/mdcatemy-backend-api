import express from "express";
import { protect, restrictTo } from "../controllers/auth.js";
import { getMcqDistributionPerTopic, uploadMCQs, getAllTopics } from "../controllers/mcq.js";
import { excelFileUpload } from "../helpers.js";

const router = express.Router();


// Admin functions.
router.post("/upload", protect, /* restrictTo("admin"), */ excelFileUpload.single("file"), uploadMCQs);

// Both student and admin functions.
router.get("/distribution-per-topic", protect, getMcqDistributionPerTopic);
router.get("/topics", protect, getAllTopics);


export default router;