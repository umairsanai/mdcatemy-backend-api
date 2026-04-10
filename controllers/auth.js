import { AppError } from "../error.js";

export function protect(req, res, next) {
    next();
}
export function restrictTo(...roles) {
    return function(req, res, next) {
        if (roles.includes(req.user.role))
            return next();
        next(new AppError("You are not authorized for this service!", 401));
    }
}
export function login(req, res, next) {
    res.status(416).json({
        status: "success",
        message: "Route incomplete!"
    });
}
export function logout(req, res, next) {
    res.status(416).json({
        status: "success",
        message: "Route incomplete!"
    });
}