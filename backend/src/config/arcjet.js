import arcjet, {
  detectBot,
  shield,
  tokenBucket,
  fixedWindow,
  slidingWindow,
} from "@arcjet/node";
import { ENV } from "./env.js";

// ============================================
// ARCJET INSTANCE
// ============================================

const aj = arcjet({
  key: ENV.ARCJET_KEY,
  // Các rule mặc định cho toàn bộ app
  rules: [
    // Bảo vệ chống lại các tấn công phổ biến
    shield({
      mode: "LIVE", // "LIVE" hoặc "DRY_RUN"
    }),
    // Phát hiện bot
    detectBot({
      mode: "LIVE",
      allow: [
        // Cho phép các bot hợp lệ
        "CATEGORY:SEARCH_ENGINE",
        "CATEGORY:MONITOR",
      ],
    }),
  ],
});

// ============================================
// RATE LIMITING CONFIGURATIONS
// ============================================

/**
 * Rate limiting cho authentication endpoints
 * 5 requests per 15 minutes
 */
export const authRateLimiter = aj.withRule(
  fixedWindow({
    mode: "LIVE",
    window: "15m",
    max: 5,
  })
);

/**
 * Rate limiting cho API endpoints chung
 * 100 requests per 15 minutes
 */
export const apiRateLimiter = aj.withRule(
  slidingWindow({
    mode: "LIVE",
    interval: "15m",
    max: 100,
  })
);

/**
 * Rate limiting cho message endpoints
 * 30 messages per minute
 */
export const messageRateLimiter = aj.withRule(
  tokenBucket({
    mode: "LIVE",
    refillRate: 30,
    interval: "1m",
    capacity: 30,
  })
);

/**
 * Rate limiting cho post creation
 * 10 posts per hour
 */
export const postCreationRateLimiter = aj.withRule(
  fixedWindow({
    mode: "LIVE",
    window: "1h",
    max: 10,
  })
);

/**
 * Rate limiting cho comment creation
 * 30 comments per 10 minutes
 */
export const commentCreationRateLimiter = aj.withRule(
  slidingWindow({
    mode: "LIVE",
    interval: "10m",
    max: 30,
  })
);

/**
 * Rate limiting cho file uploads
 * 20 uploads per hour
 */
export const uploadRateLimiter = aj.withRule(
  fixedWindow({
    mode: "LIVE",
    window: "1h",
    max: 20,
  })
);

/**
 * Rate limiting cho search endpoints
 * 50 searches per 5 minutes
 */
export const searchRateLimiter = aj.withRule(
  slidingWindow({
    mode: "LIVE",
    interval: "5m",
    max: 50,
  })
);

/**
 * Strict rate limiting cho sensitive operations
 * 3 requests per 10 minutes
 */
export const strictRateLimiter = aj.withRule(
  fixedWindow({
    mode: "LIVE",
    window: "10m",
    max: 3,
  })
);

/**
 * Rate limiting cho call/video call
 * 10 calls per hour
 */
export const callRateLimiter = aj.withRule(
  fixedWindow({
    mode: "LIVE",
    window: "1h",
    max: 10,
  })
);

// ============================================
// BOT DETECTION
// ============================================

/**
 * Strict bot detection - chặn tất cả bot
 */
export const strictBotDetection = aj.withRule(
  detectBot({
    mode: "LIVE",
    allow: [], // Không cho phép bot nào
  })
);

/**
 * Lenient bot detection - cho phép một số bot
 */
export const lenientBotDetection = aj.withRule(
  detectBot({
    mode: "LIVE",
    allow: [
      "CATEGORY:SEARCH_ENGINE",
      "CATEGORY:MONITOR",
      "CATEGORY:PREVIEW",
    ],
  })
);

// ============================================
// COMBINED RULES
// ============================================

/**
 * Rules cho authentication endpoints
 */
export const authProtection = aj.withRule([
  shield({ mode: "LIVE" }),
  detectBot({ mode: "LIVE", allow: [] }),
  fixedWindow({
    mode: "LIVE",
    window: "15m",
    max: 5,
  }),
]);

/**
 * Rules cho public API endpoints
 */
export const publicApiProtection = aj.withRule([
  shield({ mode: "LIVE" }),
  detectBot({
    mode: "LIVE",
    allow: ["CATEGORY:SEARCH_ENGINE"],
  }),
  slidingWindow({
    mode: "LIVE",
    interval: "1m",
    max: 20,
  }),
]);

/**
 * Rules cho protected API endpoints
 */
export const protectedApiProtection = aj.withRule([
  shield({ mode: "LIVE" }),
  detectBot({ mode: "LIVE", allow: [] }),
  slidingWindow({
    mode: "LIVE",
    interval: "15m",
    max: 100,
  }),
]);

/**
 * Rules cho write operations (create, update, delete)
 */
export const writeOperationProtection = aj.withRule([
  shield({ mode: "LIVE" }),
  detectBot({ mode: "LIVE", allow: [] }),
  tokenBucket({
    mode: "LIVE",
    refillRate: 10,
    interval: "1h",
    capacity: 10,
  }),
]);

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get user identifier for rate limiting
 * @param {Object} req - Express request object
 * @returns {String} User identifier
 */
export const getUserIdentifier = (req) => {
  // Ưu tiên userId nếu có
  if (req.user?._id) {
    return `user:${req.user._id}`;
  }
  
  // Fallback to IP address
  const ip = req.ip || req.connection.remoteAddress;
  return `ip:${ip}`;
};

/**
 * Check if request is from allowed bot
 * @param {Object} decision - Arcjet decision object
 * @returns {Boolean}
 */
export const isAllowedBot = (decision) => {
  if (decision.reason?.bot) {
    const botInfo = decision.reason.bot;
    return botInfo.allowed;
  }
  return true; // Không phải bot
};

/**
 * Get rate limit info from decision
 * @param {Object} decision - Arcjet decision object
 * @returns {Object} Rate limit info
 */
export const getRateLimitInfo = (decision) => {
  if (decision.reason?.rateLimit) {
    const rateLimit = decision.reason.rateLimit;
    return {
      limited: true,
      remaining: rateLimit.remaining,
      reset: rateLimit.reset,
      max: rateLimit.max,
    };
  }
  return {
    limited: false,
  };
};

export default aj;