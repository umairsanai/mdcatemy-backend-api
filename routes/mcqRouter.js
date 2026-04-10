import express from "express";
import pool from "../database.js";
import { protect } from "../controllers/auth.js";
import { getMcqDistributionPerTopic, generateQuiz } from "../controllers/mcq.js";
import { AppError, handleAsyncError } from "../error.js";

const router = express.Router();

router.get("/distribution-per-topic", getMcqDistributionPerTopic);
router.get("/quiz", protect, generateQuiz);

export default router;