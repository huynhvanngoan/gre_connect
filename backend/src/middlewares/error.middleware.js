import { errorResponse } from "../utils/response.js";
import { HTTP_STATUS } from "../utils/constants.js";
import { logger } from "../utils/logger.js";
import { ENV } from "../config/env.js";

export const errorMiddleware = (err, req, res, next) => {
  const isDevelopment = ENV.NODE_ENV === "development";

  // Log error with full details
  logger.error("Error occurred", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    user: req.user?._id?.toString(),
    statusCode: err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
    name: err.name,
  });

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
    }));
    return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "Validation error", errors);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return errorResponse(res, HTTP_STATUS.BAD_REQUEST, `${field} already exists`);
  }

  // Mongoose cast error
  if (err.name === "CastError") {
    return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "Invalid ID format");
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return errorResponse(res, HTTP_STATUS.UNAUTHORIZED, "Invalid token");
  }

  if (err.name === "TokenExpiredError") {
    return errorResponse(res, HTTP_STATUS.UNAUTHORIZED, "Token expired");
  }

  // Don't expose internal errors in production
  const message = isDevelopment
    ? err.message
    : "An error occurred. Please try again later.";

  // Default error
  return errorResponse(
    res,
    err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message
  );
};