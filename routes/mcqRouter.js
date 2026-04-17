import express from "express";
import multer from "multer";
import { protect, restrictTo } from "../controllers/auth.js";
import { getMcqDistributionPerTopic, uploadMCQs } from "../controllers/mcq.js";

const router = express.Router();
const upload = multer({storage: multer.memoryStorage(), fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        return cb(null, false);
    cb(null, true);
}});

// Admin functions.
router.post("/upload", protect, restrictTo("admin"), upload.single("file"), uploadMCQs);

// Both student and admin functions.
router.get("/distribution-per-topic", protect, getMcqDistributionPerTopic);


export default router;