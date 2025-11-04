import express from "express";
import authRoutes from "./auth.route.js";
import userRoutes from "./user.route.js";
import postRoutes from "./post.route.js";
import commentRoutes from "./comment.route.js";
import notificationRoutes from "./notification.route.js";
import classRoutes from "./class.route.js";
import conversationRoutes from "./conversation.route.js";
import messageRoutes from "./message.route.js";

const router = express.Router();

// Health check
router.get("/health", async (req, res) => {
  const mongoose = (await import("mongoose")).default;
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
  };

  res.status(health.database === "connected" ? 200 : 503).json(health);
});

// API Routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/posts", postRoutes);
router.use("/comments", commentRoutes);
router.use("/notifications", notificationRoutes);
router.use("/classes", classRoutes);
router.use("/conversations", conversationRoutes);
router.use("/messages", messageRoutes);

export default router;
