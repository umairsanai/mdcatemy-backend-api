import express from "express";
import multer from "multer";
import { signup, login, logout, protect, restrictTo, isPaymentVerified } from "../controllers/auth.js";
import { getDashboardStats, getSavedMCQs, getWrongMCQs, deleteSavedMCQ, deleteWrongMCQ, uploadPaymentReceipt } from "../controllers/user.js";

const router = express.Router();

const upload = multer({storage: multer.diskStorage({
    filename: (req, file, cb) => {
        cb(null, `${req.user.email}.jpg`);
    },
    destination: (req, file, cb) => {
        cb(null, `receipts`);
    }
}), fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image"))
        return cb(null, false);
    cb(null, true);
}, limits: {
    fields: 0,
    fileSize: 100 * 1024,
    files: 1,
    parts: 2
}});


// Student functions
router.get("/stats", protect, isPaymentVerified, /* restrictTo("student"), */ getDashboardStats);
router.get("/bookmarks", protect, isPaymentVerified, /* restrictTo("student"), */ getSavedMCQs);
router.delete("/bookmarks/:mcq_id", protect, isPaymentVerified, /* restrictTo("student"), */ deleteSavedMCQ);
router.get("/mistakes", protect, isPaymentVerified, /* restrictTo("student"), */ getWrongMCQs);
router.delete("/mistakes/:mcq_id", protect, isPaymentVerified, /* restrictTo("student"), */ deleteWrongMCQ);

router.post("/signup", signup);
router.post("/receipt", protect, upload.single("receipt"), uploadPaymentReceipt);

// Both student and admin functions
router.post("/login", login);
router.post("/logout", protect, isPaymentVerified, logout);

export default router;