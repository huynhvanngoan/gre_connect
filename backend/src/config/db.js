import mongoose from "mongoose";
import { ENV } from "./env.js";
import { logger } from "../utils/logger.js";

export const connectDB = async () => {
  try {
    await mongoose.connect(ENV.MONGO_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
    });

    // Set default query timeout
    mongoose.set("maxTimeMS", 30000); // 30 seconds

    logger.info("Connected to DB SUCCESSFULLY ✅");

    // Log connection events
    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB connection error", { error: err.message });
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
    });
  } catch (error) {
    logger.error("Error connecting to MONGODB", { error: error.message, stack: error.stack });
    process.exit(1);
  }
};