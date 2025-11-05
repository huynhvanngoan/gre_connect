// server.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import http from "http";

import routes from "./routes/index.js";
import { connectDB } from "./config/db.js";
import { initSocket } from "./config/socket.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { clerkMiddleware } from "@clerk/express";
import { ENV } from "./config/env.js";
import { logger, morganStream } from "./utils/logger.js";

dotenv.config();

// ============================================
// CREATE EXPRESS APP
// ============================================

const app = express();

// 🧰 Middlewares cơ bản
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Compression middleware - giảm kích thước response
app.use(compression({
  level: 6, // Compression level (0-9), 6 là balance tốt giữa tốc độ và kích thước
  threshold: 1024, // Chỉ compress responses > 1KB
  filter: (req, res) => {
    // Skip compression for specific content types
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// CORS configuration - allow all origins in development for mobile access
app.use(cors({
  origin: ENV.NODE_ENV === "production"
    ? (ENV.CLIENT_URL || "*")
    : "*", // Allow all origins in development for mobile testing
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Body parsing - giới hạn kích thước để tránh DoS
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(clerkMiddleware());

// Morgan logger - sử dụng winston logger stream
app.use(morgan(
  ENV.NODE_ENV === "production" ? "combined" : "dev",
  { stream: morganStream }
));

app.use(cookieParser());

// Response caching headers (cho static content)
app.use((req, res, next) => {
  // Cache static assets
  if (req.path.match(/\.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  next();
});

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
      logger.error(`❌ Unhandled Rejection: ${err.message}`, { error: err });
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
    logger.error("❌ Failed to start server", { error: err.message, stack: err.stack });
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