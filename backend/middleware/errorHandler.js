import logger from "../utils/logger.js";

export function notFoundHandler(req, res, next) {
    res.status(404).json({
        success: false,
        error: `Route not found: ${req.method} ${req.originalUrl}`
    });
}

export function errorHandler(err, req, res, next) {
    logger.error("Unhandled error", {
        message: err?.message || "Unknown error",
        stack: err?.stack || null,
        path: req?.originalUrl || null,
        method: req?.method || null
    });

    const statusCode = err?.statusCode || err?.status || 500;

    return res.status(statusCode).json({
        success: false,
        error: err?.message || "Internal Server Error"
    });
}