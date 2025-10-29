import express from "express";
// import authRoutes from "./auth.route.js";
import userRoutes from "./user.route.js";
// import postRoutes from "./post.route.js";
// import commentRoutes from "./comment.route.js";
// import notificationRoutes from "./notification.route.js";
// import classRoutes from "./class.route.js";
// import conversationRoutes from "./conversation.route.js";
// import messageRoutes from "./message.route.js";
// import callRoutes from "./call.route.js";
// import meetingRoutes from "./meeting.route.js";

const router = express.Router();

// Health check
router.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is running" });
});

// API Routes
// router.use("/auth", authRoutes);
router.use("/users", userRoutes);
// router.use("/posts", postRoutes);
// router.use("/comments", commentRoutes);
// router.use("/notifications", notificationRoutes);
// router.use("/classes", classRoutes);
// router.use("/conversations", conversationRoutes);
// router.use("/messages", messageRoutes);
// router.use("/calls", callRoutes);
// router.use("/meetings", meetingRoutes);

export default router;
