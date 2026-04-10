import express from "express";
import morgan from "morgan";
import { xss } from "express-xss-sanitizer";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import hpp from "hpp-clean";
import helmet from "helmet";
import userRouter from "./routes/userRouter.js";
import mcqRouter from "./routes/mcqRouter.js";
import { errorMiddleware } from "./error.js";

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
app.use([xss(), helmet(), hpp({ whitelist: ['attempts'] })]);

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

// SECURITY
app.use("/api/v1/users/", userRouter);
app.use("/api/v1/mcqs/", mcqRouter);

app.use(errorMiddleware);

export default app;