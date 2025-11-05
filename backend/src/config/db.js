import mongoose from "mongoose";
import { ENV } from "./env.js";
import { logger } from "../utils/logger.js";

export const connectDB = async () => {
  try {
    // Check if MONGO_URI is set
    if (!ENV.MONGO_URI) {
      logger.error("MONGO_URI is not set in environment variables");
      throw new Error("MONGO_URI is required but not found in environment variables");
    }

    const options = {
      maxPoolSize: ENV.NODE_ENV === "production" ? 50 : 10, // Tăng pool size cho production
      minPoolSize: ENV.NODE_ENV === "production" ? 5 : 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      connectTimeoutMS: 30000, // Give up initial connection after 30s
      heartbeatFrequencyMS: 10000, // Check server status every 10s
      retryWrites: true,
      retryReads: true,
    };

    logger.info("Attempting to connect to MongoDB...", {
      hasUri: !!ENV.MONGO_URI,
      nodeEnv: ENV.NODE_ENV,
    });

    await mongoose.connect(ENV.MONGO_URI, options);

    // Set default query timeout
    mongoose.set("maxTimeMS", 30000); // 30 seconds

    logger.info("Connected to DB SUCCESSFULLY ✅", {
      poolSize: options.maxPoolSize,
      environment: ENV.NODE_ENV,
    });

    // Log connection events
    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB connection error", { error: err.message, stack: err.stack });
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected");
    });

    mongoose.connection.on("connecting", () => {
      logger.info("MongoDB connecting...");
    });
  } catch (error) {
    logger.error("Error connecting to MONGODB", {
      error: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      hasMongoUri: !!ENV.MONGO_URI,
    });
    process.exit(1);
  }
};