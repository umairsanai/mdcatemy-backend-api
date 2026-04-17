export class AppError extends Error {
    constructor(errorMessage, statusCode) {
        super(errorMessage);
        this.statusCode = +statusCode || 500;
        this.isOperational = true;
        this.status = String(this.statusCode).startsWith("4") ? "fail" : "error";
        this.message = errorMessage;
        Error.captureStackTrace(this, this.constructor);
    }
}
export function handleAsyncError(func) {
    return (req, res, next) => {
        func(req, res, next).catch(next);
    }
}
export function errorMiddleware(error, req, res, next) {
    console.error(error.message);

    if (process.env.MODE === "prod") {
        sendProductionError(error, res);
    } else {
        sendDevelopementError(error, res);
    }
}
function sendProductionError(error, res) {
    if (error.isOperational) {
        res.status(error.statusCode).json({
            status: error.status,
            message: error.message
        });
    } else {
        if (error.code === "23505") {
            res.status(400).json({
                status: "error",
                message: "You cannot perform this operation again."
            });
        } else {
            res.status(500).json({
                status: "error",
                message: "Internal Server Wrong. Something went wrong."
            });
        }
    }
}
function sendDevelopementError(error, res) {
    if (error.isOperational) {
        res.status(error.statusCode).json({
            status: error.status,
            message: error.message,
            stack: error.stack
        });
    } else {
        res.status(400).json({
            status: "error",
            error
        });
    }
}     