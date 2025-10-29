import { errorResponse } from "../utils/response.js";
import { HTTP_STATUS } from "../utils/constants.js";

export const errorMiddleware = (err, req, res, next) => {
  console.error("Error:", err);

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

  // Default error
  return errorResponse(
    res,
    err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
    err.message || "Internal server error"
  );
};