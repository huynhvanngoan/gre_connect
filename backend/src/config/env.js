import dotenv from "dotenv";

dotenv.config();

export const ENV = {
    // 🚀 Server
    PORT: process.env.PORT || 5001,
    NODE_ENV: process.env.NODE_ENV || "development",

    // 🗄️ Database
    MONGO_URI: process.env.MONGO_URI,

    // 🔐 Clerk Authentication
    CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,

    // ☁️ Cloudinary
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

    // 🧠 Arcjet
    ARCJET_ENV: process.env.ARCJET_ENV,
    ARCJET_KEY: process.env.ARCJET_KEY,

    // 🔄 Realtime (Ably)
    ABLY_API_KEY: process.env.ABLY_API_KEY,

    // 🔒 JWT Tokens
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRE: process.env.JWT_EXPIRE,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE,

    // 💬 Agora (Video/Chat)
    AGORA_APP_ID: process.env.AGORA_APP_ID,
    AGORA_APP_CERTIFICATE: process.env.AGORA_APP_CERTIFICATE,

    // 🌐 Client URL
    CLIENT_URL: process.env.CLIENT_URL || ""
};
