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
import { clerkMiddleware } from "@clerk/express"
import { ENV } from "./config/env.js";

dotenv.config();

/* -------------------------------------------------------------
 *  Core Server Initialization
 * ----------------------------------------------------------- */
async function bootstrap() {
  try {
    // 🧩 1. Kết nối Database
    await connectDB();
    console.log("✅ Database connected successfully");

    // 🧱 2. Tạo Express app
    const app = express();

    // 🧰 3. Middlewares cơ bản
    app.use(helmet());
    app.use(cors());
    app.use(express.json());
    app.use(clerkMiddleware())
    app.use(morgan(ENV.NODE_ENV === "production" ? "combined" : "development"));
    app.use(cookieParser());

    // 🚏 4. API Routes
    app.use("/api/v1", routes);

    // ⚙️ 5. Error & 404 Handling
    app.use(errorMiddleware);
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: "Route not found",
      });
    });

    // 🔌 6. HTTP + Socket.IO Server
    const server = http.createServer(app);
    initSocket(server);

    // 🚀 7. Start Server
    const PORT = ENV.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Environment: ${ENV.NODE_ENV || "development"}`);
    });

    // ⚠️ 8. Handle unhandled rejections
    process.on("unhandledRejection", (err) => {
      console.error(`❌ Unhandled Rejection: ${err.message}`);
      server.close(() => process.exit(1));
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
}

// 🏁 Run app
bootstrap();
