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
    if (process.env.MODE === "prod") {
        sendProductionError(error, res);
    } else {
        console.error(error.message);
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
        if (error.code === "23505" && error.table === "users" && error.detail.includes("email")) {
            res.status(400).json({
                status: "error",
                message: "A user with this email already exists. Please signup with some other email."
            });
        } else if (error.errno === -4058 && error.syscall === "unlink") {
            res.status(400).json({
                status: "error",
                message: "This user's payment is already verified."
            });
        } 
        else if (error.code === "23505") {
            res.status(400).json({
                status: "error",
                message: "You can't perform this operation again."
            });
        }
         else if (error.code === "LIMIT_FILE_SIZE") {
            res.status(400).json({
                status: "error",
                message: "Your image size is more than 100KB. Please upload an image of size under 100KB"
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