import express from "express";
import pool from "../database.js";
import { protect } from "../controllers/auth.js";
import {  } from "../controllers/mcq.js";
import { AppError, handleAsyncError } from "../error.js";

const router = express.Router();



export default router;