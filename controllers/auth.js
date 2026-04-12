import { AppError, handleAsyncError } from "../error.js";
import pool from "../database.js";
import argon from "argon2";
import jwt from "jsonwebtoken";

const signJwtToken = (email) => {
    return jwt.sign({ email }, process.env.JWT_SIGN_SECRET, {
        expiresIn: "7 days"
    });
}
const signTokenAndSetInCookie = (email, res) => {
    res.cookie("mdcatemy-login-token", signJwtToken(email), {
        httpOnly: true,
        sameSite: "strict",
        path: "/api",
        maxAge: 7 * 24 * 60 * 60 * 1000,      // 7 days
        secure: process.env.MODE === "prod"
    });
}

const hashPassword = async (password) => {
    try {
        return (await argon.hash(password, {
            hashLength: 32,
            type: argon.argon2id,
            secret: Buffer.from(process.env.PASSWORD_HASH_SECRET)
        }));
    } catch(err) {
        console.error("Error in hashing passwrod: \n", err);
        return err;
    }
}
const verifyPassword = async (actual_password, input_password) => {
    return await argon.verify(actual_password, input_password, {
        secret: Buffer.from(process.env.PASSWORD_HASH_SECRET)
    });
}


export const protect = handleAsyncError(async (req, res, next) => {
    const token = req.cookies["mdcatemy-login-token"];
    if (!token) 
        return next("You're not logged in!", 401);
    const payload = jwt.verify(token, process.env.JWT_SIGN_SECRET);
    const user = (await pool.query("SELECT student_id, name, email, streak, password_changed_at FROM student WHERE email=$1", [payload.email])).rows[0];

    if (!user)
        return next(new AppError("The user has been deleted", 404));
    if (payload.exp*1000 <= user.password_changed_at)
        return next(new AppError("You have changed your password. Please log in again!", 401));
    
    req.user = user;       
    next();
});

export function restrictTo(...roles) {
    return function(req, res, next) {
        if (roles.includes(req.user.role))
            return next();
        next(new AppError("You are not authorized for this service!", 401));
    }
}
export const signup = handleAsyncError(async (req, res, next) => {
    let {name, email, password, age, gender, academic_status} = req.body;

    if (!name || !email || !password || !age || !gender)
        return next(new AppError("Incomplete Data for Signup!", 400));

    academic_status = academic_status ?? "Fresher";
    password = await hashPassword(password);

    await pool.query("INSERT INTO student (name, email, password, age, gender, academic_status) VALUES ($1, $2, $3, $4, $5, $6)", [name, email, password, age, gender, academic_status]);
    
    signTokenAndSetInCookie(email, res);

    res.status(200).json({
        status: "success",
        message: "Signed Up Successfully! Welcome Home!"
    });
});

export const login = handleAsyncError(async (req, res, next) => {
    const {email: input_email, password: input_password} = req.body;

    if (!input_email || !input_password) 
        return next("User not found!", 400);

    const user = (await pool.query("SELECT email, password FROM student WHERE email=$1", [input_email])).rows[0];

    if (!user || !verifyPassword(user.password, input_password)) 
        return next(new AppError("Incorrect email or password!", 401));

    signTokenAndSetInCookie(user.email, res);
    
    res.status(200).json({
        status: "success",
        message: "Logged In Successfully!"
    });
});

export const logout = (req, res, next) => {
    res.cookie("mdcatemy-login-token", "", {
        sameSite: "strict",
        path: "/api",
        maxAge: 0
    });
    res.status(200).json({
        status: "success",
        message: "Logged out!"
    });
};