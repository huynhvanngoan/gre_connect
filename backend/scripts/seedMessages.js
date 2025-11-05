import mongoose from "mongoose";
import dotenv from "dotenv";
import { ENV } from "../src/config/env.js";
import { logger } from "../src/utils/logger.js";
import { Message } from "../src/models/message.model.js";
import { Conversation } from "../src/models/conversation.model.js";
import User from "../src/models/user.model.js";
import { MESSAGE_TYPES, MESSAGE_STATUS } from "../src/utils/constants.js";
import { CONVERSATION_TYPES } from "../src/utils/constants.js";

dotenv.config();

const seedMessages = async () => {
  try {
    // Connect to database
    await mongoose.connect(ENV.MONGO_URI);
    logger.info("Connected to database");

    // Check if messages already exist
    const existingMessages = await Message.countDocuments();
    if (existingMessages > 0) {
      logger.info(`⚠️  ${existingMessages} messages already exist. Skipping seed.`);
      await mongoose.connection.close();
      process.exit(0);
    }

    // Get users
    const users = await User.find();

    if (users.length < 2) {
      logger.error("❌ Need at least 2 users to create conversations. Please run seedUsers first.");
      await mongoose.connection.close();
      process.exit(1);
    }

    logger.info("Starting message seed...");

    // Create some direct conversations
    const conversationsData = [
      {
        type: CONVERSATION_TYPES.DIRECT,
        participants: [
          {
            user: users[0]._id,
            role: "member",
            joinedAt: new Date(),
            status: "active",
          },
          {
            user: users[3]._id, // Student
            role: "member",
            joinedAt: new Date(),
            status: "active",
          },
        ],
        settings: {
          allowCalls: true,
          allowFiles: true,
        },
      },
      {
        type: CONVERSATION_TYPES.DIRECT,
        participants: [
          {
            user: users[1]._id,
            role: "member",
            joinedAt: new Date(),
            status: "active",
          },
          {
            user: users[4]._id, // Student
            role: "member",
            joinedAt: new Date(),
            status: "active",
          },
        ],
        settings: {
          allowCalls: true,
          allowFiles: true,
        },
      },
      // Group conversation
      {
        type: CONVERSATION_TYPES.GROUP,
        name: "Study Group",
        description: "Study group for Algebra class",
        participants: [
          {
            user: users[3]._id,
            role: "admin",
            joinedAt: new Date(),
            status: "active",
          },
          {
            user: users[4]._id,
            role: "member",
            joinedAt: new Date(),
            status: "active",
          },
          {
            user: users[5]._id,
            role: "member",
            joinedAt: new Date(),
            status: "active",
          },
        ],
        settings: {
          allowCalls: true,
          allowFiles: true,
        },
      },
    ];

    const conversations = await Conversation.insertMany(conversationsData);
    logger.info(`✅ Created ${conversations.length} conversations`);

    // Sample messages in English
    const messagesData = [];

    conversations.forEach((conversation, convIndex) => {
      const participants = conversation.participants.map((p) => p.user);
      const messageTexts = [
        "Hello! How are you doing?",
        "I'm doing great, thanks for asking!",
        "Did you finish the homework assignment?",
        "Yes, I just submitted it. It was challenging but I learned a lot.",
        "Can we meet up to study together?",
        "Sure! When are you free?",
        "How about tomorrow afternoon at the library?",
        "That works for me! See you then.",
        "Don't forget about the group project deadline next week.",
        "Thanks for the reminder! I'm almost done with my part.",
        "Great work everyone!",
        "Does anyone have questions about the material?",
        "I have a question about problem 5.",
        "I can help with that! Let me explain.",
        "Thanks for your help!",
        "You're welcome! Happy to help.",
      ];

      // Add 5-8 messages per conversation
      const numMessages = Math.floor(Math.random() * 4) + 5;
      for (let i = 0; i < numMessages; i++) {
        const randomUser = participants[Math.floor(Math.random() * participants.length)];
        const messageText = messageTexts[Math.floor(Math.random() * messageTexts.length)];

        messagesData.push({
          conversation: conversation._id,
          sender: randomUser,
          type: MESSAGE_TYPES.TEXT,
          content: messageText,
          status: MESSAGE_STATUS.SENT,
          readBy: [],
          createdAt: new Date(Date.now() - (numMessages - i) * 60000), // Spread messages over time
        });
      }
    });

    // Insert messages
    const messages = await Message.insertMany(messagesData);
    logger.info(`✅ Created ${messages.length} messages`);

    // Update conversations with last message
    for (const conversation of conversations) {
      const conversationMessages = messages.filter(
        (m) => m.conversation.toString() === conversation._id.toString()
      );
      if (conversationMessages.length > 0) {
        const lastMessage = conversationMessages[conversationMessages.length - 1];
        await Conversation.findByIdAndUpdate(conversation._id, {
          lastMessage: lastMessage._id,
          lastMessageAt: lastMessage.createdAt,
        });
      }
    }

    await mongoose.connection.close();
    logger.info("✅ Message seed completed successfully");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Error seeding messages", { error: error.message, stack: error.stack });
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedMessages();

