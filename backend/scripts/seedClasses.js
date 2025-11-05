import mongoose from "mongoose";
import dotenv from "dotenv";
import { ENV } from "../src/config/env.js";
import { logger } from "../src/utils/logger.js";
import { Class } from "../src/models/class.model.js";
import User from "../src/models/user.model.js";
import { CLASS_STATUS, SEMESTER } from "../src/utils/constants.js";

dotenv.config();

const seedClasses = async () => {
  try {
    // Connect to database
    await mongoose.connect(ENV.MONGO_URI);
    logger.info("Connected to database");

    // Check if classes already exist
    const existingClasses = await Class.countDocuments();
    if (existingClasses > 0) {
      logger.info(`⚠️  ${existingClasses} classes already exist. Skipping seed.`);
      await mongoose.connection.close();
      process.exit(0);
    }

    // Get users
    const teachers = await User.find({ role: "teacher" });
    const students = await User.find({ role: "student" });

    if (teachers.length === 0 || students.length === 0) {
      logger.error("❌ No teachers or students found. Please run seedUsers first.");
      await mongoose.connection.close();
      process.exit(1);
    }

    logger.info("Starting class seed...");

    // Sample classes data in English
    const classesData = [
      {
        name: "Algebra I",
        code: "MATH101",
        description: "Introduction to algebraic concepts, equations, and problem-solving techniques.",
        subject: "Mathematics",
        grade: "10th Grade",
        academicYear: "2024-2025",
        semester: SEMESTER.FALL,
        mainTeacher: teachers[0]._id,
        assistantTeachers: [],
        students: students
          .filter((s) => s.roleSpecificData?.grade === "10th Grade")
          .slice(0, 3)
          .map((student) => ({
            student: student._id,
            enrolledAt: new Date("2024-09-01"),
            status: "active",
            attendance: {
              present: 15,
              absent: 2,
              late: 1,
            },
          })),
        maxStudents: 30,
        status: CLASS_STATUS.ACTIVE,
        schedule: [
          {
            dayOfWeek: "Monday",
            startTime: "09:00",
            endTime: "10:30",
            room: "Room 101",
            building: "Main Building",
          },
          {
            dayOfWeek: "Wednesday",
            startTime: "09:00",
            endTime: "10:30",
            room: "Room 101",
            building: "Main Building",
          },
        ],
        joinCode: "MATH1012024",
        classSettings: {
          allowStudentPosts: true,
          allowStudentComments: true,
          requireApprovalForPosts: false,
        },
      },
      {
        name: "Biology Fundamentals",
        code: "SCI201",
        description: "Introduction to biological concepts including cells, genetics, and ecosystems.",
        subject: "Science",
        grade: "10th Grade",
        academicYear: "2024-2025",
        semester: SEMESTER.FALL,
        mainTeacher: teachers[1]._id,
        assistantTeachers: [],
        students: students
          .filter((s) => s.roleSpecificData?.grade === "10th Grade")
          .slice(0, 2)
          .map((student) => ({
            student: student._id,
            enrolledAt: new Date("2024-09-01"),
            status: "active",
            attendance: {
              present: 14,
              absent: 3,
              late: 0,
            },
          })),
        maxStudents: 25,
        status: CLASS_STATUS.ACTIVE,
        schedule: [
          {
            dayOfWeek: "Tuesday",
            startTime: "10:00",
            endTime: "11:30",
            room: "Lab 201",
            building: "Science Building",
          },
          {
            dayOfWeek: "Thursday",
            startTime: "10:00",
            endTime: "11:30",
            room: "Lab 201",
            building: "Science Building",
          },
        ],
        joinCode: "SCI2012024",
        settings: {
          allowStudentPosts: true,
          allowStudentComments: true,
          requireApproval: false,
        },
      },
      {
        name: "English Literature",
        code: "ENG301",
        description: "Study of classic and contemporary literature, focusing on analysis and critical thinking.",
        subject: "English",
        grade: "11th Grade",
        academicYear: "2024-2025",
        semester: SEMESTER.FALL,
        mainTeacher: teachers[2]._id,
        assistantTeachers: [],
        students: students
          .filter((s) => s.roleSpecificData?.grade === "11th Grade")
          .slice(0, 1)
          .map((student) => ({
            student: student._id,
            enrolledAt: new Date("2024-09-01"),
            status: "active",
            attendance: {
              present: 16,
              absent: 1,
              late: 0,
            },
          })),
        maxStudents: 20,
        status: CLASS_STATUS.ACTIVE,
        schedule: [
          {
            dayOfWeek: "Monday",
            startTime: "13:00",
            endTime: "14:30",
            room: "Room 305",
            building: "Main Building",
          },
          {
            dayOfWeek: "Friday",
            startTime: "13:00",
            endTime: "14:30",
            room: "Room 305",
            building: "Main Building",
          },
        ],
        joinCode: "ENG3012024",
        settings: {
          allowStudentPosts: true,
          allowStudentComments: true,
          requireApproval: false,
        },
      },
    ];

    // Insert classes
    const classes = await Class.insertMany(classesData);
    logger.info(`✅ Created ${classes.length} classes`);

    // Log class details
    classes.forEach((cls) => {
      logger.info(`  - ${cls.name} (${cls.code}) - ${cls.students.length} students`);
    });

    await mongoose.connection.close();
    logger.info("✅ Class seed completed successfully");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Error seeding classes", { error: error.message, stack: error.stack });
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedClasses();

