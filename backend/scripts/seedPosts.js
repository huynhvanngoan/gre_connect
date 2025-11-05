import mongoose from "mongoose";
import dotenv from "dotenv";
import { ENV } from "../src/config/env.js";
import { logger } from "../src/utils/logger.js";
import { Post } from "../src/models/post.model.js";
import User from "../src/models/user.model.js";
import { Class } from "../src/models/class.model.js";
import { POST_TYPES, POST_STATUS, VISIBILITY_TYPES } from "../src/utils/constants.js";

dotenv.config();

const seedPosts = async () => {
  try {
    // Connect to database
    await mongoose.connect(ENV.MONGO_URI);
    logger.info("Connected to database");

    // Check if posts already exist
    const existingPosts = await Post.countDocuments();
    if (existingPosts > 0) {
      logger.info(`⚠️  ${existingPosts} posts already exist. Skipping seed.`);
      await mongoose.connection.close();
      process.exit(0);
    }

    // Get users and classes
    const teachers = await User.find({ role: "teacher" });
    const students = await User.find({ role: "student" });
    const classes = await Class.find();

    if (teachers.length === 0 || classes.length === 0) {
      logger.error("❌ No teachers or classes found. Please run seedUsers and seedClasses first.");
      await mongoose.connection.close();
      process.exit(1);
    }

    logger.info("Starting post seed...");

    // Sample posts data in English
    const postsData = [
      // Announcement
      {
        user: teachers[0]._id,
        content: "Welcome to Algebra I class! This semester we'll be covering fundamental algebraic concepts. Please make sure to attend all classes and complete assignments on time.",
        postType: POST_TYPES.ANNOUNCEMENT,
        status: POST_STATUS.PUBLISHED,
        visibility: VISIBILITY_TYPES.CLASS,
        targetClass: classes[0]._id,
        announcementData: {
          priority: "high",
          expiresAt: new Date("2025-01-31"),
        },
        tags: ["welcome", "algebra", "important"],
      },
      // Homework
      {
        user: teachers[0]._id,
        content: "Homework Assignment #1: Solve the following equations and show your work. Submit by Friday.",
        postType: POST_TYPES.HOMEWORK,
        status: POST_STATUS.PUBLISHED,
        visibility: VISIBILITY_TYPES.CLASS,
        targetClass: classes[0]._id,
        homeworkData: {
          subject: "Algebra",
          dueDate: new Date("2024-12-20"),
          maxScore: 100,
          allowLateSubmission: true,
          lateSubmissionPenalty: 10,
          instructions: "Complete exercises 1-20 from Chapter 3. Show all work and submit as PDF.",
          rubric: [
            { criteria: "Correctness", points: 60 },
            { criteria: "Work shown", points: 30 },
            { criteria: "Format", points: 10 },
          ],
        },
        tags: ["homework", "algebra", "assignment"],
      },
      // General Post
      {
        user: students[0]._id,
        content: "Just finished the algebra homework! It was challenging but I learned a lot. Anyone else working on it?",
        postType: POST_TYPES.GENERAL,
        status: POST_STATUS.PUBLISHED,
        visibility: VISIBILITY_TYPES.PUBLIC,
        tags: ["algebra", "homework", "study"],
      },
      // Announcement
      {
        user: teachers[1]._id,
        content: "Lab session next week: We'll be studying cell structure under the microscope. Please bring your lab notebooks.",
        postType: POST_TYPES.ANNOUNCEMENT,
        status: POST_STATUS.PUBLISHED,
        visibility: VISIBILITY_TYPES.CLASS,
        targetClass: classes[1]._id,
        announcementData: {
          priority: "medium",
          expiresAt: new Date("2025-01-15"),
        },
        tags: ["lab", "biology", "reminder"],
      },
      // Homework
      {
        user: teachers[1]._id,
        content: "Biology Research Project: Choose any organism and write a 5-page report on its ecosystem. Due in 3 weeks.",
        postType: POST_TYPES.HOMEWORK,
        status: POST_STATUS.PUBLISHED,
        visibility: VISIBILITY_TYPES.CLASS,
        targetClass: classes[1]._id,
        homeworkData: {
          subject: "Biology",
          dueDate: new Date("2025-01-10"),
          maxScore: 150,
          allowLateSubmission: false,
          instructions: "Choose an organism, research its habitat, diet, predators, and role in the ecosystem. Include at least 3 references.",
          rubric: [
            { criteria: "Content accuracy", points: 50 },
            { criteria: "Research quality", points: 40 },
            { criteria: "Writing quality", points: 30 },
            { criteria: "References", points: 30 },
          ],
        },
        tags: ["homework", "biology", "research"],
      },
      // Discussion
      {
        user: teachers[2]._id,
        content: "Let's discuss: What themes do you see in the novel we're reading? Share your thoughts below!",
        postType: POST_TYPES.DISCUSSION,
        status: POST_STATUS.PUBLISHED,
        visibility: VISIBILITY_TYPES.CLASS,
        targetClass: classes[2]._id,
        tags: ["discussion", "literature", "themes"],
      },
      // General Post
      {
        user: students[1]._id,
        content: "Study group for next week's math test? We can meet in the library on Tuesday at 3 PM.",
        postType: POST_TYPES.GENERAL,
        status: POST_STATUS.PUBLISHED,
        visibility: VISIBILITY_TYPES.PUBLIC,
        tags: ["study-group", "math", "help"],
      },
      // General Post
      {
        user: students[2]._id,
        content: "Anyone else excited about the science fair next month? I'm working on a project about renewable energy!",
        postType: POST_TYPES.GENERAL,
        status: POST_STATUS.PUBLISHED,
        visibility: VISIBILITY_TYPES.PUBLIC,
        tags: ["science-fair", "excited", "project"],
      },
    ];

    // Insert posts
    const posts = await Post.insertMany(postsData);
    logger.info(`✅ Created ${posts.length} posts`);

    // Log post details
    posts.forEach((post) => {
      logger.info(`  - ${post.postType}: ${post.content.substring(0, 50)}...`);
    });

    await mongoose.connection.close();
    logger.info("✅ Post seed completed successfully");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Error seeding posts", { error: error.message, stack: error.stack });
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedPosts();

