import asyncHandler from "express-async-handler";
import {
  apiRateLimiter,
  authRateLimiter,
  messageRateLimiter,
  postCreationRateLimiter,
  commentCreationRateLimiter,
  uploadRateLimiter,
  searchRateLimiter,
  strictRateLimiter,
  callRateLimiter,
  getUserIdentifier,
  getRateLimitInfo,
  isAllowedBot,
} from "../config/arcjet.js";

// ============================================
// ARCJET MIDDLEWARE FACTORY
// ============================================

/**
 * Create Arcjet middleware với custom rules
 * @param {Object} arcjetInstance - Arcjet instance với rules
 * @param {Object} options - Options
 * @returns {Function} Express middleware
 */
const createArcjetMiddleware = (arcjetInstance, options = {}) => {
  const {
    errorMessage = "Too many requests. Please try again later.",
    errorStatus = 429,
    includeHeaders = true,
  } = options;

  return asyncHandler(async (req, res, next) => {
    try {
      // Get user identifier
      const userId = getUserIdentifier(req);

      // Make decision
      const decision = await arcjetInstance.protect(req, {
        userId,
        requested: 1,
      });

      // Log decision in development
      if (process.env.NODE_ENV !== "production") {
        console.log("Arcjet Decision:", {
          id: decision.id,
          conclusion: decision.conclusion,
          reason: decision.reason,
        });
      }

      // Check if request is denied
      if (decision.isDenied()) {
        // Get rate limit info
        const rateLimitInfo = getRateLimitInfo(decision);

        // Add rate limit headers if enabled
        if (includeHeaders && rateLimitInfo.limited) {
          res.set({
            "X-RateLimit-Limit": rateLimitInfo.max,
            "X-RateLimit-Remaining": rateLimitInfo.remaining,
            "X-RateLimit-Reset": rateLimitInfo.reset,
          });
        }

        // Check if denied due to bot detection
        if (decision.reason?.bot && !isAllowedBot(decision)) {
          res.status(403);
          throw new Error("Bot detected. Access denied.");
        }

        // Check if denied due to shield (security)
        if (decision.reason?.shield) {
          res.status(403);
          throw new Error("Suspicious activity detected. Access denied.");
        }

        // Rate limit exceeded
        if (rateLimitInfo.limited) {
          res.status(errorStatus);
          throw new Error(errorMessage);
        }

        // Generic denial
        res.status(403);
        throw new Error("Access denied.");
      }

      // Add rate limit info to response headers (even if not limited)
      if (includeHeaders) {
        const rateLimitInfo = getRateLimitInfo(decision);
        if (rateLimitInfo.max) {
          res.set({
            "X-RateLimit-Limit": rateLimitInfo.max,
            "X-RateLimit-Remaining": rateLimitInfo.remaining || rateLimitInfo.max,
          });
        }
      }

      // Attach decision to request for further processing
      req.arcjetDecision = decision;

      next();
    } catch (error) {
      // If error is already thrown by us, pass it through
      if (error.message.includes("denied") || error.message.includes("limit")) {
        throw error;
      }

      // Log unexpected errors
      console.error("Arcjet middleware error:", error);

      // In production, fail open (allow request) on errors
      if (process.env.NODE_ENV === "production") {
        console.error("Arcjet failed, allowing request through");
        return next();
      }

      // In development, throw error
      throw new Error(`Security check failed: ${error.message}`);
    }
  });
};

// ============================================
// PREDEFINED MIDDLEWARES
// ============================================

/**
 * General API rate limiting
 * 100 requests per 15 minutes
 */
export const apiRateLimit = createArcjetMiddleware(apiRateLimiter, {
  errorMessage: "Too many requests. Please try again in 15 minutes.",
  errorStatus: 429,
});

// Bypass Arcjet in development for easier testing
export const apiRateLimitDev = (req, res, next) => {
  if (process.env.NODE_ENV !== "production") {
    return next();
  }
  return apiRateLimit(req, res, next);
};

/**
 * Authentication rate limiting
 * 5 requests per 15 minutes
 */
export const authRateLimit = createArcjetMiddleware(authRateLimiter, {
  errorMessage: "Too many login attempts. Please try again in 15 minutes.",
  errorStatus: 429,
});

/**
 * Message rate limiting
 * 30 messages per minute
 */
export const messageRateLimit = createArcjetMiddleware(messageRateLimiter, {
  errorMessage: "You're sending messages too quickly. Please slow down.",
  errorStatus: 429,
});

/**
 * Post creation rate limiting
 * 10 posts per hour
 */
export const postCreationRateLimit = createArcjetMiddleware(postCreationRateLimiter, {
  errorMessage: "You're creating posts too quickly. Please wait before posting again.",
  errorStatus: 429,
});

/**
 * Comment creation rate limiting
 * 30 comments per 10 minutes
 */
export const commentCreationRateLimit = createArcjetMiddleware(commentCreationRateLimiter, {
  errorMessage: "You're commenting too quickly. Please slow down.",
  errorStatus: 429,
});

/**
 * Upload rate limiting
 * 20 uploads per hour
 */
export const uploadRateLimit = createArcjetMiddleware(uploadRateLimiter, {
  errorMessage: "Too many uploads. Please try again later.",
  errorStatus: 429,
});

/**
 * Search rate limiting
 * 50 searches per 5 minutes
 */
export const searchRateLimit = createArcjetMiddleware(searchRateLimiter, {
  errorMessage: "Too many search requests. Please try again in a few minutes.",
  errorStatus: 429,
});

/**
 * Strict rate limiting for sensitive operations
 * 3 requests per 10 minutes
 */
export const strictRateLimit = createArcjetMiddleware(strictRateLimiter, {
  errorMessage: "This action is rate limited. Please try again later.",
  errorStatus: 429,
});

/**
 * Call rate limiting
 * 50 calls per hour (increased for better UX)
 * In development, this is bypassed completely
 */
export const callRateLimit = (req, res, next) => {
  // Bypass completely in development
  if (process.env.NODE_ENV !== "production") {
    return next();
  }

  // Apply rate limiting in production
  return createArcjetMiddleware(callRateLimiter, {
    errorMessage: "Too many calls. Please try again later.",
    errorStatus: 429,
  })(req, res, next);
};

// ============================================
// CUSTOM RATE LIMIT MIDDLEWARE
// ============================================

/**
 * Create custom rate limit middleware
 * @param {Number} max - Maximum requests
 * @param {String} window - Time window (e.g., "1m", "1h", "1d")
 * @param {String} message - Error message
 * @returns {Function} Express middleware
 */
export const createCustomRateLimit = (max, window, message) => {
  const aj = require("../config/arcjet.js").default;
  const customLimiter = aj.withRule(
    require("@arcjet/node").fixedWindow({
      mode: "LIVE",
      window,
      max,
    })
  );

  return createArcjetMiddleware(customLimiter, {
    errorMessage: message || `Rate limit exceeded. Max ${max} requests per ${window}.`,
    errorStatus: 429,
  });
};

// ============================================
// CONDITIONAL RATE LIMITING
// ============================================

/**
 * Apply different rate limits based on user role
 * @param {Object} limits - Role-based limits
 * @returns {Function} Express middleware
 */
export const roleBasedRateLimit = (limits = {}) => {
  return asyncHandler(async (req, res, next) => {
    const userRole = req.user?.role || "guest";
    const limit = limits[userRole] || limits.default;

    if (!limit) {
      return next();
    }

    // Create temporary rate limiter for this role
    const aj = require("../config/arcjet.js").default;
    const roleLimiter = aj.withRule(
      require("@arcjet/node").slidingWindow({
        mode: "LIVE",
        interval: limit.window || "15m",
        max: limit.max || 100,
      })
    );

    // Apply rate limiting
    const middleware = createArcjetMiddleware(roleLimiter, {
      errorMessage: limit.message || "Rate limit exceeded for your role.",
    });

    return middleware(req, res, next);
  });
};

// ============================================
// BYPASS MIDDLEWARE FOR TESTING
// ============================================

/**
 * Bypass Arcjet protection in test environment
 * @param {Function} middleware - Arcjet middleware
 * @returns {Function} Express middleware
 */
export const bypassInTest = (middleware) => {
  return (req, res, next) => {
    if (process.env.NODE_ENV === "test") {
      return next();
    }
    return middleware(req, res, next);
  };
};

// ============================================
// EXPORTS
// ============================================

export default {
  apiRateLimit,
  authRateLimit,
  messageRateLimit,
  postCreationRateLimit,
  commentCreationRateLimit,
  uploadRateLimit,
  searchRateLimit,
  strictRateLimit,
  callRateLimit,
  createCustomRateLimit,
  roleBasedRateLimit,
  bypassInTest,
};