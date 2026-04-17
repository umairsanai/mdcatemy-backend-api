import express from "express";
import multer from "multer";
import { protect, restrictTo } from "../controllers/auth.js";
import { submitQuiz, generateQuiz, getAllQuizNamesForUser } from "../controllers/quiz.js";

const router = express.Router();

// Student functions
router.post("/submit", protect, /* restrictTo("student"), */ submitQuiz);
router.post("/generate", protect, /* restrictTo("student"), */ generateQuiz);
router.get("/names", protect, /* restrictTo("student"), */ getAllQuizNamesForUser);

export default router;