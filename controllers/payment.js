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

export const getPaymentStatus = handleAsyncError(async (req, res, next) => {
    const token = req.cookies["mdcatemy-login-token"];

    if (!token) 
        return next(new AppError("You're not logged in!", 401));

    const payload = jwt.verify(token, process.env.JWT_SIGN_SECRET);
    let user = (await pool.query("SELECT email, payment_status FROM users INNER JOIN students ON students.student_id=users.user_id WHERE email=$1", [payload.email])).rows[0];

    if (!user)
        return next(new AppError("This user doesn't exist", 404));
    
    res.status(200).json({
        status: "success",
        payment_status: user.payment_status
    });
});