export class AppError extends Error {
    constructor(errorMessage, statusCode) {
        super(errorMessage);
        this.statusCode = +statusCode || 500;
        this.isOperational = true;
        this.status = String(this.statusCode).startsWith("4") ? "fail" : "error";
        Error.captureStackTrace(this, this.constructor);
    }
}
export function handleAsyncError(func) {
    return (req, res, next) => {
        func(req, res, next).catch(next);
    }
}
export function errorMiddleware(error, req, res, next) {
    res.status(error.statusCode ?? 400).json({
        status: error.status ?? "error",
        error
    });
}