import mongoose from "mongoose";
import dotenv from "dotenv";
import { ENV } from "../src/config/env.js";
import { logger } from "../src/utils/logger.js";

dotenv.config();

const resetDatabase = async () => {
    try {
        // Connect to database
        await mongoose.connect(ENV.MONGO_URI);
        logger.info("Connected to database");

        // Get all collections
        const collections = await mongoose.connection.db.listCollections().toArray();

        // Check if --keep-users flag is set
        const keepUsers = process.argv.includes("--keep-users");

        logger.info(`Starting database reset${keepUsers ? " (keeping users)" : ""}...`);

        // Delete all collections
        for (const collection of collections) {
            const collectionName = collection.name;

            // Skip users if --keep-users flag is set
            if (keepUsers && collectionName === "users") {
                logger.info(`Skipping ${collectionName} (--keep-users flag set)`);
                continue;
            }

            try {
                await mongoose.connection.db.dropCollection(collectionName);
                logger.info(`✅ Dropped collection: ${collectionName}`);
            } catch (error) {
                if (error.code === 26) {
                    // Collection doesn't exist, skip
                    logger.info(`⚠️  Collection ${collectionName} doesn't exist, skipping`);
                } else {
                    throw error;
                }
            }
        }

        logger.info("✅ Database reset completed successfully");
        process.exit(0);
    } catch (error) {
        logger.error("❌ Error resetting database", { error: error.message });
        process.exit(1);
    }
};

resetDatabase();

