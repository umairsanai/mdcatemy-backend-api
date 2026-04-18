import express from "express";
import morgan from "morgan";
import { xss } from "express-xss-sanitizer";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import hpp from "hpp-clean";
import helmet from "helmet";
import userRouter from "./routes/userRouter.js";
import mcqRouter from "./routes/mcqRouter.js";
import quizRouter from "./routes/quizRouter.js";
import testRouter from "./routes/testRouter.js";
import paymentRouter from "./routes/paymentRouter.js";
import { errorMiddleware } from "./error.js";
import pool from "./database.js";

const app = express();

// BODY PARSING
app.set('query parser', 'extended');    
app.use(express.json({limit: '10kb'}));
app.use(cookieParser());
app.use(express.urlencoded({extended: true, limit:'10kb'}));

// LOGGING
app.use(morgan("tiny"));

// SECURITY
// TODO: SQL INJECTION REMAINS
app.use([xss(), helmet(), hpp({ whitelist: ['attempts', 'topic_ids'] })]);

// Rate limiting
app.use(rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100,
    message: {
        status: "fail",
        statusCode: 429,
        message: "Too many requests, please try again later."
    }
}));


// ROUTERS
app.use("/api/v1/users/", userRouter);
app.use("/api/v1/mcqs/", mcqRouter);
app.use("/api/v1/quizzes/", quizRouter);
app.use("/api/v1/tests/", testRouter);
app.use("/api/v1/payments/", paymentRouter);

app.use(errorMiddleware);

export default app;