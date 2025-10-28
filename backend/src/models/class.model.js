import mongoose from "mongoose";

// ============================================
// CLASS SCHEMA  
// ============================================

const CLASS_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  ARCHIVED: "archived",
  UPCOMING: "upcoming",
};

const SEMESTER = {
  FALL: "fall",
  SPRING: "spring",
  SUMMER: "summer",
};

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      maxLength: 1000,
    },
    // Academic info
    subject: {
      type: String,
      required: true,
    },
    grade: {
      type: String,
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
    },
    semester: {
      type: String,
      enum: Object.values(SEMESTER),
    },
    // Teachers
    mainTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assistantTeachers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    // Students
    students: [{
      student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      enrolledAt: {
        type: Date,
        default: Date.now,
      },
      status: {
        type: String,
        enum: ["active", "dropped", "completed"],
        default: "active",
      },
      finalGrade: {
        type: Number,
        min: 0,
        max: 100,
      },
      attendance: {
        present: { type: Number, default: 0 },
        absent: { type: Number, default: 0 },
        late: { type: Number, default: 0 },
      },
    }],
    maxStudents: {
      type: Number,
      default: 40,
    },
    // Schedule
    schedule: [{
      dayOfWeek: {
        type: String,
        enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      },
      startTime: {
        type: String, // Format: "HH:MM"
      },
      endTime: {
        type: String,
      },
      room: {
        type: String,
      },
      building: {
        type: String,
      },
    }],
    // Class settings
    classSettings: {
      allowStudentPosts: {
        type: Boolean,
        default: true,
      },
      allowStudentComments: {
        type: Boolean,
        default: true,
      },
      requireApprovalForPosts: {
        type: Boolean,
        default: false,
      },
      allowFileSharing: {
        type: Boolean,
        default: true,
      },
      maxFileSize: {
        type: Number,
        default: 10485760, // 10MB in bytes
      },
    },
    // Class materials
    syllabus: {
      fileName: String,
      fileUrl: String,
      uploadedAt: Date,
    },
    materials: [{
      title: String,
      description: String,
      fileUrl: String,
      fileName: String,
      fileType: String,
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
      category: {
        type: String,
        enum: ["lecture", "assignment", "reading", "video", "other"],
        default: "other",
      },
    }],
    // Grading system
    gradingScheme: [{
      name: String, // e.g., "Homework", "Midterm", "Final"
      weight: Number, // percentage
      description: String,
    }],
    // Calendar/Important dates
    importantDates: [{
      title: String,
      date: Date,
      type: {
        type: String,
        enum: ["exam", "assignment", "holiday", "event", "other"],
      },
      description: String,
    }],
    // Join code for students
    joinCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    joinCodeExpiry: {
      type: Date,
    },
    // Class banner/cover
    coverImage: {
      type: String,
      default: "",
    },
    // Class color theme
    themeColor: {
      type: String,
      default: "#3B82F6",
    },
    // Status
    status: {
      type: String,
      enum: Object.values(CLASS_STATUS),
      default: CLASS_STATUS.ACTIVE,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    // Statistics
    stats: {
      totalAssignments: { type: Number, default: 0 },
      totalAnnouncements: { type: Number, default: 0 },
      averageGrade: { type: Number, default: 0 },
      attendanceRate: { type: Number, default: 100 },
    },
    // Tags for organization
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
  },
  { 
    timestamps: true,
  }
);

// Indexes
classSchema.index({ code: 1 });
classSchema.index({ mainTeacher: 1 });
classSchema.index({ "students.student": 1 });
classSchema.index({ academicYear: 1, semester: 1 });
classSchema.index({ status: 1 });
classSchema.index({ joinCode: 1 });

// Virtuals
classSchema.virtual('studentCount').get(function() {
  return this.students.filter(s => s.status === "active").length;
});

classSchema.virtual('isFull').get(function() {
  return this.studentCount >= this.maxStudents;
});

classSchema.virtual('activeStudents').get(function() {
  return this.students.filter(s => s.status === "active");
});

// Methods
classSchema.methods.enrollStudent = async function(studentId) {
  if (this.isFull) {
    throw new Error("Class is full");
  }
  
  const alreadyEnrolled = this.students.some(s => s.student.equals(studentId));
  
  if (alreadyEnrolled) {
    throw new Error("Student already enrolled");
  }
  
  this.students.push({
    student: studentId,
    enrolledAt: new Date(),
    status: "active",
  });
  
  // Update user's classId
  await mongoose.model("User").findByIdAndUpdate(
    studentId,
    { "roleSpecificData.classId": this._id }
  );
  
  return await this.save();
};

classSchema.methods.unenrollStudent = async function(studentId) {
  const studentIndex = this.students.findIndex(s => s.student.equals(studentId));
  
  if (studentIndex === -1) {
    throw new Error("Student not found in class");
  }
  
  this.students[studentIndex].status = "dropped";
  
  // Update user's classId
  await mongoose.model("User").findByIdAndUpdate(
    studentId,
    { $unset: { "roleSpecificData.classId": "" } }
  );
  
  return await this.save();
};

classSchema.methods.addTeacher = async function(teacherId) {
  if (!this.assistantTeachers.includes(teacherId)) {
    this.assistantTeachers.push(teacherId);
    
    // Update teacher's classes
    await mongoose.model("User").findByIdAndUpdate(
      teacherId,
      { $addToSet: { "roleSpecificData.classesTeaching": this._id } }
    );
    
    await this.save();
  }
  return this;
};

classSchema.methods.removeTeacher = async function(teacherId) {
  this.assistantTeachers = this.assistantTeachers.filter(id => !id.equals(teacherId));
  
  // Update teacher's classes
  await mongoose.model("User").findByIdAndUpdate(
    teacherId,
    { $pull: { "roleSpecificData.classesTeaching": this._id } }
  );
  
  return await this.save();
};

classSchema.methods.generateJoinCode = async function(expiryDays = 7) {
  // Generate random 6-character code
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  this.joinCode = code;
  
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + expiryDays);
  this.joinCodeExpiry = expiry;
  
  return await this.save();
};

classSchema.methods.isJoinCodeValid = function() {
  if (!this.joinCode || !this.joinCodeExpiry) return false;
  return new Date() < this.joinCodeExpiry;
};

classSchema.methods.markAttendance = async function(studentId, status) {
  const student = this.students.find(s => s.student.equals(studentId));
  
  if (!student) {
    throw new Error("Student not found in class");
  }
  
  if (status === "present") {
    student.attendance.present += 1;
  } else if (status === "absent") {
    student.attendance.absent += 1;
  } else if (status === "late") {
    student.attendance.late += 1;
  }
  
  // Update attendance rate
  this.updateAttendanceRate();
  
  return await this.save();
};

classSchema.methods.updateAttendanceRate = function() {
  let totalPresent = 0;
  let totalSessions = 0;
  
  this.students.forEach(student => {
    const total = student.attendance.present + student.attendance.absent + student.attendance.late;
    totalPresent += student.attendance.present;
    totalSessions += total;
  });
  
  if (totalSessions > 0) {
    this.stats.attendanceRate = (totalPresent / totalSessions * 100).toFixed(2);
  }
};

classSchema.methods.setFinalGrade = async function(studentId, grade) {
  const student = this.students.find(s => s.student.equals(studentId));
  
  if (!student) {
    throw new Error("Student not found in class");
  }
  
  student.finalGrade = grade;
  
  // Update average grade
  this.updateAverageGrade();
  
  return await this.save();
};

classSchema.methods.updateAverageGrade = function() {
  const gradesWithValue = this.students.filter(s => s.finalGrade !== null && s.finalGrade !== undefined);
  
  if (gradesWithValue.length > 0) {
    const sum = gradesWithValue.reduce((acc, s) => acc + s.finalGrade, 0);
    this.stats.averageGrade = (sum / gradesWithValue.length).toFixed(2);
  }
};

classSchema.methods.addMaterial = async function(materialData) {
  this.materials.push(materialData);
  return await this.save();
};

classSchema.methods.removeMaterial = async function(materialId) {
  this.materials = this.materials.filter(m => !m._id.equals(materialId));
  return await this.save();
};

classSchema.methods.addImportantDate = async function(dateData) {
  this.importantDates.push(dateData);
  return await this.save();
};

classSchema.methods.updateStats = async function() {
  const Post = mongoose.model("Post");
  
  // Count assignments
  const assignmentCount = await Post.countDocuments({
    postType: "homework",
    $or: [
      { targetClass: this._id },
      { targetClasses: this._id }
    ]
  });
  
  // Count announcements
  const announcementCount = await Post.countDocuments({
    postType: "announcement",
    $or: [
      { targetClass: this._id },
      { targetClasses: this._id }
    ]
  });
  
  this.stats.totalAssignments = assignmentCount;
  this.stats.totalAnnouncements = announcementCount;
  
  return await this.save();
};

// Static methods
classSchema.statics.findByTeacher = function(teacherId) {
  return this.find({
    $or: [
      { mainTeacher: teacherId },
      { assistantTeachers: teacherId }
    ],
    status: CLASS_STATUS.ACTIVE,
  });
};

classSchema.statics.findByStudent = function(studentId) {
  return this.find({
    "students.student": studentId,
    "students.status": "active",
    status: CLASS_STATUS.ACTIVE,
  });
};

classSchema.statics.findByJoinCode = function(joinCode) {
  return this.findOne({
    joinCode: joinCode.toUpperCase(),
    joinCodeExpiry: { $gt: new Date() },
    status: CLASS_STATUS.ACTIVE,
  });
};

classSchema.statics.findByAcademicYear = function(year, semester = null) {
  const query = { 
    academicYear: year,
    status: CLASS_STATUS.ACTIVE,
  };
  
  if (semester) {
    query.semester = semester;
  }
  
  return this.find(query);
};

classSchema.statics.searchClasses = function(searchTerm) {
  const searchRegex = new RegExp(searchTerm, "i");
  
  return this.find({
    $or: [
      { name: searchRegex },
      { code: searchRegex },
      { subject: searchRegex },
    ],
    status: CLASS_STATUS.ACTIVE,
  });
};

// Middleware: Create class conversation when class is created
classSchema.post("save", async function() {
  if (this.isNew) {
    try {
      const Conversation = mongoose.model("Conversation");
      
      const participants = [
        { user: this.mainTeacher, role: "admin" },
        ...this.assistantTeachers.map(id => ({ user: id, role: "moderator" })),
        ...this.students
          .filter(s => s.status === "active")
          .map(s => ({ user: s.student, role: "member" }))
      ];
      
      await Conversation.create({
        type: "class",
        name: this.name,
        classId: this._id,
        participants,
        avatar: this.coverImage,
      });
    } catch (error) {
      console.error("Error creating class conversation:", error);
    }
  }
});

const Class = mongoose.model("Class", classSchema);

export default Class;
export { CLASS_STATUS, SEMESTER };