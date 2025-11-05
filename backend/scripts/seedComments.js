import mongoose from "mongoose";
import dotenv from "dotenv";
import { ENV } from "../src/config/env.js";
import { logger } from "../src/utils/logger.js";
import { Comment } from "../src/models/comment.model.js";
import { Post } from "../src/models/post.model.js";
import User from "../src/models/user.model.js";
import { COMMENT_TYPES } from "../src/utils/constants.js";

dotenv.config();

const seedComments = async () => {
  try {
    // Connect to database
    await mongoose.connect(ENV.MONGO_URI);
    logger.info("Connected to database");

    // Check if comments already exist
    const existingComments = await Comment.countDocuments();
    if (existingComments > 0) {
      logger.info(`⚠️  ${existingComments} comments already exist. Skipping seed.`);
      await mongoose.connection.close();
      process.exit(0);
    }

    // Get users and posts
    const users = await User.find();
    const posts = await Post.find();

    if (users.length === 0 || posts.length === 0) {
      logger.error("❌ No users or posts found. Please run seedUsers and seedPosts first.");
      await mongoose.connection.close();
      process.exit(1);
    }

    logger.info("Starting comment seed...");

    const commentsData = [];

    // Add comments to each post
    posts.forEach((post, postIndex) => {
      // Main comments (2-3 per post)
      const numComments = Math.floor(Math.random() * 2) + 2;
      for (let i = 0; i < numComments; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const commentTexts = [
          "Great post! This is very helpful.",
          "I have a question about this. Can someone explain?",
          "Thanks for sharing! I learned something new today.",
          "This is exactly what I needed. Thank you!",
          "Interesting perspective. I'll have to think about this more.",
          "Can you provide more details on this topic?",
          "I agree with this completely.",
          "This is a great resource for studying.",
        ];
        commentsData.push({
          post: post._id,
          user: randomUser._id,
          content: commentTexts[Math.floor(Math.random() * commentTexts.length)],
          commentType: COMMENT_TYPES.TEXT,
          parentComment: null,
          likes: [],
        });
      }
    });

    // Insert comments
    const comments = await Comment.insertMany(commentsData);
    logger.info(`✅ Created ${comments.length} comments`);

    // Add some replies to comments (nested comments)
    const mainComments = comments.slice(0, Math.floor(comments.length * 0.7)); // Use 70% as parent comments
    const replyTexts = [
      "I think so too!",
      "Good point!",
      "Thanks for clarifying.",
      "That makes sense.",
      "I'll look into that.",
    ];

    const repliesData = [];
    mainComments.slice(0, 5).forEach((parentComment) => {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      repliesData.push({
        post: parentComment.post,
        user: randomUser._id,
        content: replyTexts[Math.floor(Math.random() * replyTexts.length)],
        commentType: COMMENT_TYPES.TEXT,
        parentComment: parentComment._id,
        likes: [],
      });
    });

    if (repliesData.length > 0) {
      const replies = await Comment.insertMany(repliesData);
      logger.info(`✅ Created ${replies.length} reply comments`);

      // Update parent comments with replies
      for (const reply of replies) {
        await Comment.findByIdAndUpdate(reply.parentComment, {
          $push: { replies: reply._id },
        });
      }
    }

    await mongoose.connection.close();
    logger.info("✅ Comment seed completed successfully");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Error seeding comments", { error: error.message, stack: error.stack });
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedComments();

