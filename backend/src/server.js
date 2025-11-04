// server.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import http from "http";
import mongoSanitize from "express-mongo-sanitize";

import routes from "./routes/index.js";
import { connectDB } from "./config/db.js";
import { initSocket } from "./config/socket.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { clerkMiddleware } from "@clerk/express";
import { ENV } from "./config/env.js";
import { logger, morganStream } from "./utils/logger.js";
import { sanitizeBody } from "./middlewares/sanitize.middleware.js";

dotenv.config();

// ============================================
// CREATE EXPRESS APP
// ============================================

const app = express();

// 🧰 Middlewares cơ bản
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "https://res.cloudinary.com", "data:", "https:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration - improved security
const allowedOrigins = ENV.NODE_ENV === "production"
  ? [ENV.CLIENT_URL, ENV.MOBILE_APP_URL].filter(Boolean)
  : [
    "http://localhost:3000",
    "http://localhost:8081",
    /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // Mobile dev server IPs
    /^exp:\/\/192\.168\.\d+\.\d+:\d+$/, // Expo dev server
  ];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin matches allowed patterns
    const isAllowed = allowedOrigins.some((allowed) => {
      if (typeof allowed === "string") {
        return origin === allowed;
      }
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });

    if (isAllowed || ENV.NODE_ENV === "development") {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Prevent NoSQL injection
app.use(mongoSanitize());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Sanitize HTML content to prevent XSS
app.use(sanitizeBody);
app.use(clerkMiddleware());
app.use(morgan(ENV.NODE_ENV === "production" ? "combined" : "dev", { stream: morganStream }));
app.use(cookieParser());

// 🚏 API Routes
app.use("/api/v1", routes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Education Social Platform API",
    version: "1.0.0",
    endpoints: {
      health: "/api/v1/health",
      docs: "/api/v1/docs",
    },
  });
});

// ⚙️ Error & 404 Handling
app.use(errorMiddleware);
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path,
  });
});

// ============================================
// SERVER INITIALIZATION (for non-serverless)
// ============================================

const startServer = async () => {
  try {
    // 🧩 Kết nối Database
    await connectDB();
    logger.info("✅ Database connected successfully");

    // 🔌 HTTP + Socket.IO Server
    const server = http.createServer(app);
    initSocket(server);

    // 🚀 Start Server
    // Listen on 0.0.0.0 to accept connections from all network interfaces (for mobile devices)
    const PORT = ENV.PORT || 5000;
    const HOST = ENV.NODE_ENV === "production" ? "0.0.0.0" : "0.0.0.0";
    server.listen(PORT, HOST, () => {
      logger.info(`🚀 Server running on ${HOST}:${PORT}`);
      logger.info(`📡 Environment: ${ENV.NODE_ENV || "development"}`);
      logger.info(`🌐 API Base URL: http://localhost:${PORT}/api/v1`);
    });

    // ⚠️ Handle unhandled rejections
    process.on("unhandledRejection", (err) => {
      logger.error(`❌ Unhandled Rejection: ${err.message}`, { stack: err.stack });
      server.close(() => process.exit(1));
    });

    // Handle SIGTERM
    process.on("SIGTERM", () => {
      logger.info("👋 SIGTERM received, shutting down gracefully");
      server.close(() => {
        logger.info("✅ Process terminated");
      });
    });

    return server;
  } catch (err) {
    logger.error("❌ Failed to start server", { message: err.message, stack: err.stack });
    process.exit(1);
  }
};

// ============================================
// EXPORTS
// ============================================

// Export app cho Vercel/serverless platforms
export default app;

// Start server nếu không phải serverless environment
// Vercel sẽ không chạy phần này vì nó import app trực tiếp
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  startServer();
}