import { AppError, handleAsyncError } from "../error.js";
import jwt from "jsonwebtoken";
import pool from "../database.js";
import { unlink } from "node:fs/promises";

export const getUnverifiedUsers = handleAsyncError(async (req, res, next) => {
    const data = (await pool.query(" SELECT name, age, email, role, academic_status FROM users INNER JOIN students ON students.student_id=users.user_id WHERE payment_status='PENDING' ORDER BY user_id ASC")).rows;
    res.status(200).json({
        status: "success",
        data
    });
});
export const rejectPayment = handleAsyncError(async (req, res, next) => {
    if (!req.body?.email)
        return next(new AppError("Please provide the user's email to verify his/her payment", 400));
    await pool.query("UPDATE students SET payment_status='REJECTED' WHERE student_id = (SELECT user_id FROM users WHERE email=$1)", [req.body.email]);
    await unlink(`receipts/${req.body.email}.jpg`);
    res.status(200).json({
        status: "success",
        message: "Payment Rejected"
    });
});

export const verifyPayment = handleAsyncError(async (req, res, next) => {
    if (!req.body?.email)
        return next(new AppError("Please provide the user's email to verify his/her payment", 400));
    await pool.query("UPDATE students SET payment_status='VERIFIED' WHERE student_id = (SELECT user_id FROM users WHERE email=$1)", [req.body.email]);
    await unlink(`receipts/${req.body.email}.jpg`);
    res.status(200).json({
        status: "success",
        message: "Payment Verified"
    });
});
export const getPendingPaymentReceipt = (req, res, next) => {
    res.sendFile(`${req.params.email}.jpg`, {root: "receipts"}); 
};

export const getPaymentStatus = (req, res, next) => {    
    res.status(200).json({
        status: "success",
        payment_status: req.user.payment_status
    });
};