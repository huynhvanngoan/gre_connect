import { Server } from "socket.io";
import { ENV } from "./env.js";
import { logger } from "../utils/logger.js";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: ENV.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    logger.info(`✅ User connected: ${socket.id}`);

    // Join user to their own room
    socket.on("join", (userId) => {
      socket.join(userId);
      logger.debug(`User ${userId} joined their room`);
    });

    // Join conversation room
    socket.on("join-conversation", (conversationId) => {
      socket.join(`conversation-${conversationId}`);
      logger.debug(`Socket ${socket.id} joined conversation ${conversationId}`);
    });

    // Leave conversation room
    socket.on("leave-conversation", (conversationId) => {
      socket.leave(`conversation-${conversationId}`);
      logger.debug(`Socket ${socket.id} left conversation ${conversationId}`);
    });

    socket.on("disconnect", () => {
      logger.info(`❌ User disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};
