import { Server } from "socket.io";
import { ENV } from "./env.js";

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
    console.log(`✅ User connected: ${socket.id}`);

    // Join user to their own room
    socket.on("join", (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined their room`);
    });

    // Join conversation room
    socket.on("join-conversation", (conversationId) => {
      socket.join(`conversation-${conversationId}`);
    });

    // Leave conversation room
    socket.on("leave-conversation", (conversationId) => {
      socket.leave(`conversation-${conversationId}`);
    });

    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${socket.id}`);
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
