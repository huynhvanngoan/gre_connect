import mongoose from "mongoose";
import dotenv from "dotenv";
import { ENV } from "../src/config/env.js";
import { logger } from "../src/utils/logger.js";
import User from "../src/models/user.model.js";
import { ROLES, PERMISSIONS } from "../src/utils/constants.js";

dotenv.config();

const seedUsers = async () => {
  try {
    // Connect to database
    await mongoose.connect(ENV.MONGO_URI);
    logger.info("Connected to database");

    // Check if users already exist
    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      logger.info(`⚠️  ${existingUsers} users already exist. Skipping seed.`);
      await mongoose.connection.close();
      process.exit(0);
    }

    logger.info("Starting user seed...");

    // Sample users data in English
    const usersData = [
      // Teachers
      {
        clerkId: "seed_teacher_001",
        email: "john.smith@school.edu",
        firstName: "John",
        lastName: "Smith",
        username: "johnsmith",
        role: ROLES.TEACHER,
        bio: "Mathematics teacher with 10 years of experience. Passionate about helping students excel.",
        location: "New York, USA",
        profilePicture: "",
        roleSpecificData: {
          teacherId: "T001",
          department: "Mathematics",
          subjects: ["Algebra", "Calculus", "Geometry"],
          hireDate: new Date("2020-01-15"),
        },
        permissions: [
          PERMISSIONS.CREATE_POST,
          PERMISSIONS.CREATE_ANNOUNCEMENT,
          PERMISSIONS.CREATE_HOMEWORK,
          PERMISSIONS.GRADE_HOMEWORK,
          PERMISSIONS.CREATE_CLASS,
          PERMISSIONS.MANAGE_CLASSES,
        ],
      },
      {
        clerkId: "seed_teacher_002",
        email: "sarah.johnson@school.edu",
        firstName: "Sarah",
        lastName: "Johnson",
        username: "sarahjohnson",
        role: ROLES.TEACHER,
        bio: "Science teacher specializing in Biology and Chemistry.",
        location: "Los Angeles, USA",
        profilePicture: "",
        roleSpecificData: {
          teacherId: "T002",
          department: "Science",
          subjects: ["Biology", "Chemistry"],
          hireDate: new Date("2019-08-20"),
        },
        permissions: [
          PERMISSIONS.CREATE_POST,
          PERMISSIONS.CREATE_ANNOUNCEMENT,
          PERMISSIONS.CREATE_HOMEWORK,
          PERMISSIONS.GRADE_HOMEWORK,
          PERMISSIONS.CREATE_CLASS,
        ],
      },
      {
        clerkId: "seed_teacher_003",
        email: "michael.brown@school.edu",
        firstName: "Michael",
        lastName: "Brown",
        username: "michaelbrown",
        role: ROLES.TEACHER,
        bio: "English Literature teacher. Love reading and writing.",
        location: "Chicago, USA",
        profilePicture: "",
        roleSpecificData: {
          teacherId: "T003",
          department: "English",
          subjects: ["Literature", "Writing"],
          hireDate: new Date("2021-02-10"),
        },
        permissions: [
          PERMISSIONS.CREATE_POST,
          PERMISSIONS.CREATE_ANNOUNCEMENT,
          PERMISSIONS.CREATE_HOMEWORK,
          PERMISSIONS.GRADE_HOMEWORK,
        ],
      },
      // Students
      {
        clerkId: "seed_student_001",
        email: "emma.wilson@student.edu",
        firstName: "Emma",
        lastName: "Wilson",
        username: "emmawilson",
        role: ROLES.STUDENT,
        bio: "High school student. Interested in mathematics and science.",
        location: "New York, USA",
        profilePicture: "",
        roleSpecificData: {
          studentId: "S001",
          grade: "10th Grade",
          enrollmentDate: new Date("2023-09-01"),
        },
      },
      {
        clerkId: "seed_student_002",
        email: "james.davis@student.edu",
        firstName: "James",
        lastName: "Davis",
        username: "jamesdavis",
        role: ROLES.STUDENT,
        bio: "Active student, love sports and coding.",
        location: "Los Angeles, USA",
        profilePicture: "",
        roleSpecificData: {
          studentId: "S002",
          grade: "11th Grade",
          enrollmentDate: new Date("2022-09-01"),
        },
      },
      {
        clerkId: "seed_student_003",
        email: "olivia.martinez@student.edu",
        firstName: "Olivia",
        lastName: "Martinez",
        username: "oliviamartinez",
        role: ROLES.STUDENT,
        bio: "Passionate about literature and history.",
        location: "Chicago, USA",
        profilePicture: "",
        roleSpecificData: {
          studentId: "S003",
          grade: "9th Grade",
          enrollmentDate: new Date("2024-09-01"),
        },
      },
      {
        clerkId: "seed_student_004",
        email: "william.taylor@student.edu",
        firstName: "William",
        lastName: "Taylor",
        username: "williamtaylor",
        role: ROLES.STUDENT,
        bio: "Science enthusiast, future engineer.",
        location: "Boston, USA",
        profilePicture: "",
        roleSpecificData: {
          studentId: "S004",
          grade: "12th Grade",
          enrollmentDate: new Date("2021-09-01"),
        },
      },
      {
        clerkId: "seed_student_005",
        email: "sophia.anderson@student.edu",
        firstName: "Sophia",
        lastName: "Anderson",
        username: "sophiaanderson",
        role: ROLES.STUDENT,
        bio: "Art and design lover. Creative thinker.",
        location: "Seattle, USA",
        profilePicture: "",
        roleSpecificData: {
          studentId: "S005",
          grade: "10th Grade",
          enrollmentDate: new Date("2023-09-01"),
        },
      },
      // Staff
      {
        clerkId: "seed_staff_001",
        email: "admin@school.edu",
        firstName: "Admin",
        lastName: "User",
        username: "admin",
        role: ROLES.STAFF,
        bio: "School administrator.",
        location: "New York, USA",
        profilePicture: "",
        roleSpecificData: {
          staffId: "ST001",
          position: "Administrator",
          department: "Administration",
        },
        permissions: Object.values(PERMISSIONS),
      },
    ];

    // Insert users
    const users = await User.insertMany(usersData);
    logger.info(`✅ Created ${users.length} users`);

    // Log user details
    users.forEach((user) => {
      logger.info(`  - ${user.firstName} ${user.lastName} (${user.role}) - ${user.email}`);
    });

    await mongoose.connection.close();
    logger.info("✅ User seed completed successfully");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Error seeding users", { error: error.message, stack: error.stack });
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedUsers();

