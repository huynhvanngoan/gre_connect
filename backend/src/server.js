// server.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import http from "http";

import routes from "./routes/index.js";
import { connectDB } from "./config/db.js";
import { initSocket } from "./config/socket.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { clerkMiddleware } from "@clerk/express";
import { ENV } from "./config/env.js";

dotenv.config();

// ============================================
// CREATE EXPRESS APP
// ============================================

const app = express();

// 🧰 Middlewares cơ bản
app.use(helmet());
app.use(cors({
  origin: ENV.CLIENT_URL || "*",
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(clerkMiddleware());
app.use(morgan(ENV.NODE_ENV === "production" ? "combined" : "dev"));
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
    console.log("✅ Database connected successfully");

    // 🔌 HTTP + Socket.IO Server
    const server = http.createServer(app);
    initSocket(server);

    // 🚀 Start Server
    const PORT = ENV.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Environment: ${ENV.NODE_ENV || "development"}`);
      console.log(`🌐 API Base URL: http://localhost:${PORT}/api/v1`);
    });

    // ⚠️ Handle unhandled rejections
    process.on("unhandledRejection", (err) => {
      console.error(`❌ Unhandled Rejection: ${err.message}`);
      server.close(() => process.exit(1));
    });

    // Handle SIGTERM
    process.on("SIGTERM", () => {
      console.log("👋 SIGTERM received, shutting down gracefully");
      server.close(() => {
        console.log("✅ Process terminated");
      });
    });

    return server;
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
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