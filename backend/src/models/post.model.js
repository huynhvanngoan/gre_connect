import mongoose from "mongoose";

// Enum cho post types
const POST_TYPES = {
  ANNOUNCEMENT: "announcement",
  HOMEWORK: "homework",
  DISCUSSION: "discussion",
  GENERAL: "general",
  POLL: "poll",
  EVENT: "event",
};

const VISIBILITY_TYPES = {
  PUBLIC: "public",
  TEACHERS_ONLY: "teachers_only",
  STUDENTS_ONLY: "students_only",
  CLASS_SPECIFIC: "class_specific",
  FOLLOWERS_ONLY: "followers_only",
};

const POST_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
};

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      maxLength: 1000,
      required: true,
    },
    // Multiple images support
    images: [{
      url: String,
      caption: String,
    }],
    // Video support
    video: {
      url: String,
      thumbnail: String,
      duration: Number, // seconds
    },
    // File attachments
    attachments: [{
      fileName: String,
      fileUrl: String,
      fileType: String,
      fileSize: Number, // bytes
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    // Phân loại bài đăng
    postType: {
      type: String,
      enum: Object.values(POST_TYPES),
      default: POST_TYPES.GENERAL,
    },
    // Status
    status: {
      type: String,
      enum: Object.values(POST_STATUS),
      default: POST_STATUS.PUBLISHED,
    },
    // Ai có thể xem
    visibility: {
      type: String,
      enum: Object.values(VISIBILITY_TYPES),
      default: VISIBILITY_TYPES.PUBLIC,
    },
    // Dành cho homework hoặc announcement theo lớp
    targetClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
    },
    // Multiple classes support
    targetClasses: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
    }],
    // Tags để lọc/tìm kiếm
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    // Mentions (@username)
    mentions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    // Dành cho homework
    homeworkData: {
      subject: String,
      dueDate: Date,
      maxScore: {
        type: Number,
        default: 100,
      },
      allowLateSubmission: {
        type: Boolean,
        default: false,
      },
      lateSubmissionPenalty: {
        type: Number,
        default: 0, // percentage
      },
      instructions: String,
      rubric: [{
        criteria: String,
        points: Number,
      }],
      submissions: [{
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        submittedAt: Date,
        files: [{
          fileName: String,
          fileUrl: String,
        }],
        content: String,
        score: Number,
        feedback: String,
        gradedAt: Date,
        gradedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        isLate: Boolean,
      }],
    },
    // Dành cho announcement
    announcementData: {
      priority: {
        type: String,
        enum: ["low", "medium", "high", "urgent"],
        default: "medium",
      },
      expiresAt: Date,
      readBy: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      }],
      requiresAcknowledgment: {
        type: Boolean,
        default: false,
      },
      acknowledgedBy: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        acknowledgedAt: {
          type: Date,
          default: Date.now,
        },
      }],
    },
    // Dành cho poll
    pollData: {
      question: String,
      options: [{
        text: String,
        votes: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        }],
      }],
      allowMultipleVotes: {
        type: Boolean,
        default: false,
      },
      expiresAt: Date,
      showResultsBeforeVote: {
        type: Boolean,
        default: false,
      },
    },
    // Dành cho event
    eventData: {
      title: String,
      startDate: Date,
      endDate: Date,
      location: String,
      isOnline: {
        type: Boolean,
        default: false,
      },
      meetingLink: String,
      attendees: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        status: {
          type: String,
          enum: ["going", "maybe", "not_going"],
          default: "maybe",
        },
        respondedAt: Date,
      }],
      maxAttendees: Number,
    },
    // Ghim bài (cho thông báo quan trọng)
    isPinned: {
      type: Boolean,
      default: false,
    },
    pinnedUntil: {
      type: Date,
    },
    // Allow interactions
    allowComments: {
      type: Boolean,
      default: true,
    },
    allowLikes: {
      type: Boolean,
      default: true,
    },
    allowSharing: {
      type: Boolean,
      default: true,
    },
    // Tương tác
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    shares: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      sharedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    // Views tracking
    views: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      viewedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    viewsCount: {
      type: Number,
      default: 0,
    },
    // Scheduled post
    scheduledFor: {
      type: Date,
    },
    // Edit history
    editHistory: [{
      editedAt: {
        type: Date,
        default: Date.now,
      },
      previousContent: String,
      editedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    }],
    // Report/flag system
    reports: [{
      reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      reason: String,
      reportedAt: {
        type: Date,
        default: Date.now,
      },
      status: {
        type: String,
        enum: ["pending", "reviewed", "resolved"],
        default: "pending",
      },
    }],
    // Trạng thái
    isActive: {
      type: Boolean,
      default: true,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  { 
    timestamps: true,
  }
);

// Indexes cho performance
postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ postType: 1, status: 1, createdAt: -1 });
postSchema.index({ visibility: 1, isActive: 1 });
postSchema.index({ targetClass: 1, createdAt: -1 });
postSchema.index({ targetClasses: 1, createdAt: -1 });
postSchema.index({ isPinned: 1, createdAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ status: 1, scheduledFor: 1 });
postSchema.index({ "homeworkData.dueDate": 1 });
postSchema.index({ "eventData.startDate": 1 });

// Virtuals
postSchema.virtual('likesCount').get(function() {
  return this.likes.length;
});

postSchema.virtual('commentsCount').get(function() {
  return this.comments.length;
});

postSchema.virtual('sharesCount').get(function() {
  return this.shares.length;
});

postSchema.virtual('isExpired').get(function() {
  if (this.postType === POST_TYPES.ANNOUNCEMENT && this.announcementData?.expiresAt) {
    return new Date() > this.announcementData.expiresAt;
  }
  if (this.postType === POST_TYPES.POLL && this.pollData?.expiresAt) {
    return new Date() > this.pollData.expiresAt;
  }
  return false;
});

// Middleware: Validate quyền đăng bài
postSchema.pre("save", async function(next) {
  try {
    const User = mongoose.model("User");
    const user = await User.findById(this.user);
    
    if (!user) {
      throw new Error("User not found");
    }

    // Kiểm tra quyền đăng announcement
    if (this.postType === POST_TYPES.ANNOUNCEMENT) {
      if (!["teacher", "staff"].includes(user.role)) {
        throw new Error("Only teachers and staff can create announcements");
      }
    }

    // Kiểm tra quyền đăng homework
    if (this.postType === POST_TYPES.HOMEWORK) {
      if (user.role !== "teacher") {
        throw new Error("Only teachers can create homework");
      }
      
      if (!this.homeworkData?.dueDate) {
        throw new Error("Homework must have a due date");
      }
      
      if (!this.targetClass && !this.targetClasses?.length) {
        throw new Error("Homework must be assigned to at least one class");
      }
    }

    // Validate visibility
    if (this.visibility === VISIBILITY_TYPES.CLASS_SPECIFIC) {
      if (!this.targetClass && !this.targetClasses?.length) {
        throw new Error("Class-specific posts must have target class(es)");
      }
    }

    // Track edit history
    if (this.isModified('content') && !this.isNew) {
      this.editHistory.push({
        previousContent: this._original?.content || this.content,
        editedBy: this.user,
      });
      this.isEdited = true;
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Middleware: Auto-publish scheduled posts
postSchema.pre("save", function(next) {
  if (this.scheduledFor && new Date() >= this.scheduledFor && this.status === POST_STATUS.DRAFT) {
    this.status = POST_STATUS.PUBLISHED;
  }
  next();
});

// Methods
postSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(id => id.toString() === userId.toString());
};

postSchema.methods.toggleLike = async function(userId) {
  if (!this.allowLikes) {
    throw new Error("Likes are disabled for this post");
  }
  
  const index = this.likes.findIndex(id => id.toString() === userId.toString());
  
  if (index > -1) {
    this.likes.splice(index, 1);
  } else {
    this.likes.push(userId);
  }
  
  return await this.save();
};

postSchema.methods.addView = async function(userId) {
  // Avoid duplicate views from same user
  const alreadyViewed = this.views.some(v => v.user.equals(userId));
  
  if (!alreadyViewed) {
    this.views.push({ user: userId });
    this.viewsCount += 1;
    await this.save();
  }
};

postSchema.methods.share = async function(userId) {
  if (!this.allowSharing) {
    throw new Error("Sharing is disabled for this post");
  }
  
  this.shares.push({ user: userId });
  return await this.save();
};

postSchema.methods.submitHomework = async function(studentId, submissionData) {
  if (this.postType !== POST_TYPES.HOMEWORK) {
    throw new Error("This is not a homework post");
  }
  
  const dueDate = this.homeworkData.dueDate;
  const isLate = new Date() > dueDate;
  
  if (isLate && !this.homeworkData.allowLateSubmission) {
    throw new Error("Late submissions are not allowed");
  }
  
  // Check if already submitted
  const existingSubmission = this.homeworkData.submissions.find(
    s => s.student.equals(studentId)
  );
  
  if (existingSubmission) {
    throw new Error("Already submitted. Contact teacher to resubmit.");
  }
  
  this.homeworkData.submissions.push({
    student: studentId,
    submittedAt: new Date(),
    ...submissionData,
    isLate,
  });
  
  return await this.save();
};

postSchema.methods.gradeSubmission = async function(studentId, score, feedback, graderId) {
  const submission = this.homeworkData.submissions.find(
    s => s.student.equals(studentId)
  );
  
  if (!submission) {
    throw new Error("Submission not found");
  }
  
  // Apply late penalty
  if (submission.isLate && this.homeworkData.lateSubmissionPenalty) {
    score = score * (1 - this.homeworkData.lateSubmissionPenalty / 100);
  }
  
  submission.score = Math.min(score, this.homeworkData.maxScore);
  submission.feedback = feedback;
  submission.gradedAt = new Date();
  submission.gradedBy = graderId;
  
  return await this.save();
};

postSchema.methods.votePoll = async function(userId, optionIndex) {
  if (this.postType !== POST_TYPES.POLL) {
    throw new Error("This is not a poll");
  }
  
  if (this.isExpired) {
    throw new Error("This poll has expired");
  }
  
  const option = this.pollData.options[optionIndex];
  if (!option) {
    throw new Error("Invalid option");
  }
  
  // Check if already voted
  const alreadyVoted = this.pollData.options.some(
    opt => opt.votes.some(v => v.equals(userId))
  );
  
  if (alreadyVoted && !this.pollData.allowMultipleVotes) {
    throw new Error("You have already voted");
  }
  
  option.votes.push(userId);
  return await this.save();
};

postSchema.methods.respondToEvent = async function(userId, status) {
  if (this.postType !== POST_TYPES.EVENT) {
    throw new Error("This is not an event");
  }
  
  const attendee = this.eventData.attendees.find(a => a.user.equals(userId));
  
  if (attendee) {
    attendee.status = status;
    attendee.respondedAt = new Date();
  } else {
    // Check max attendees
    const goingCount = this.eventData.attendees.filter(a => a.status === "going").length;
    if (this.eventData.maxAttendees && goingCount >= this.eventData.maxAttendees && status === "going") {
      throw new Error("Event is full");
    }
    
    this.eventData.attendees.push({
      user: userId,
      status,
      respondedAt: new Date(),
    });
  }
  
  return await this.save();
};

postSchema.methods.markAsRead = async function(userId) {
  if (this.postType === POST_TYPES.ANNOUNCEMENT) {
    const alreadyRead = this.announcementData.readBy.some(r => r.user.equals(userId));
    
    if (!alreadyRead) {
      this.announcementData.readBy.push({ user: userId });
      await this.save();
    }
  }
};

postSchema.methods.acknowledge = async function(userId) {
  if (this.postType !== POST_TYPES.ANNOUNCEMENT || !this.announcementData.requiresAcknowledgment) {
    throw new Error("This announcement does not require acknowledgment");
  }
  
  const alreadyAcknowledged = this.announcementData.acknowledgedBy.some(a => a.user.equals(userId));
  
  if (!alreadyAcknowledged) {
    this.announcementData.acknowledgedBy.push({ user: userId });
    await this.save();
  }
};

postSchema.methods.report = async function(userId, reason) {
  this.reports.push({
    reportedBy: userId,
    reason,
  });
  return await this.save();
};

// Static methods
postSchema.statics.findByType = function(postType, options = {}) {
  return this.find({ 
    postType,
    status: POST_STATUS.PUBLISHED,
    isActive: true,
    ...options 
  }).sort({ isPinned: -1, createdAt: -1 });
};

postSchema.statics.findByClass = function(classId) {
  return this.find({ 
    $or: [
      { targetClass: classId },
      { targetClasses: classId }
    ],
    status: POST_STATUS.PUBLISHED,
    isActive: true 
  }).sort({ isPinned: -1, createdAt: -1 });
};

postSchema.statics.findVisiblePosts = function(user, options = {}) {
  const query = { 
    status: POST_STATUS.PUBLISHED,
    isActive: true,
    ...options 
  };
  
  // Logic xem bài dựa trên role
  if (user.role === "student") {
    query.$or = [
      { visibility: VISIBILITY_TYPES.PUBLIC },
      { visibility: VISIBILITY_TYPES.STUDENTS_ONLY },
      { 
        visibility: VISIBILITY_TYPES.CLASS_SPECIFIC,
        $or: [
          { targetClass: user.roleSpecificData?.classId },
          { targetClasses: user.roleSpecificData?.classId }
        ]
      },
      { 
        visibility: VISIBILITY_TYPES.FOLLOWERS_ONLY,
        user: { $in: user.following }
      },
      { user: user._id } // Own posts
    ];
  } else if (user.role === "teacher") {
    query.$or = [
      { visibility: VISIBILITY_TYPES.PUBLIC },
      { visibility: VISIBILITY_TYPES.TEACHERS_ONLY },
      { 
        visibility: VISIBILITY_TYPES.FOLLOWERS_ONLY,
        user: { $in: user.following }
      },
      { user: user._id }
    ];
  } else {
    // Staff xem được tất cả
  }
  
  return this.find(query)
    .sort({ isPinned: -1, createdAt: -1 })
    .populate('user', 'firstName lastName username profilePicture role');
};

postSchema.statics.findScheduledPosts = function() {
  return this.find({
    status: POST_STATUS.DRAFT,
    scheduledFor: { $lte: new Date() },
  });
};

postSchema.statics.findExpiringSoon = function(hours = 24) {
  const futureDate = new Date();
  futureDate.setHours(futureDate.getHours() + hours);
  
  return this.find({
    postType: POST_TYPES.ANNOUNCEMENT,
    "announcementData.expiresAt": {
      $gte: new Date(),
      $lte: futureDate,
    },
    isActive: true,
  });
};

postSchema.statics.findHomeworkDueSoon = function(hours = 24) {
  const futureDate = new Date();
  futureDate.setHours(futureDate.getHours() + hours);
  
  return this.find({
    postType: POST_TYPES.HOMEWORK,
    "homeworkData.dueDate": {
      $gte: new Date(),
      $lte: futureDate,
    },
    isActive: true,
  });
};

postSchema.statics.findUpcomingEvents = function(days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    postType: POST_TYPES.EVENT,
    "eventData.startDate": {
      $gte: new Date(),
      $lte: futureDate,
    },
    isActive: true,
  }).sort({ "eventData.startDate": 1 });
};

postSchema.statics.findTrending = function(days = 7) {
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: pastDate },
        status: POST_STATUS.PUBLISHED,
        isActive: true,
      }
    },
    {
      $addFields: {
        engagementScore: {
          $add: [
            { $size: "$likes" },
            { $multiply: [{ $size: "$comments" }, 2] },
            { $size: "$shares" },
            { $divide: ["$viewsCount", 10] }
          ]
        }
      }
    },
    { $sort: { engagementScore: -1 } },
    { $limit: 20 }
  ]);
};

postSchema.statics.searchPosts = function(searchTerm, user) {
  const searchRegex = new RegExp(searchTerm, "i");
  
  return this.findVisiblePosts(user, {
    $or: [
      { content: searchRegex },
      { tags: searchRegex },
      { "homeworkData.subject": searchRegex },
      { "eventData.title": searchRegex },
    ]
  });
};

postSchema.statics.getAnalytics = async function(postId) {
  const post = await this.findById(postId);
  
  if (!post) return null;
  
  return {
    postId: post._id,
    type: post.postType,
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    sharesCount: post.sharesCount,
    viewsCount: post.viewsCount,
    engagementRate: post.viewsCount > 0 
      ? ((post.likesCount + post.commentsCount + post.sharesCount) / post.viewsCount * 100).toFixed(2)
      : 0,
    // Homework specific
    submissionRate: post.postType === POST_TYPES.HOMEWORK && post.homeworkData?.submissions
      ? (post.homeworkData.submissions.length / (post.targetClasses?.length || 1) * 100).toFixed(2)
      : null,
    // Announcement specific
    readRate: post.postType === POST_TYPES.ANNOUNCEMENT && post.announcementData?.readBy
      ? (post.announcementData.readBy.length / post.viewsCount * 100).toFixed(2)
      : null,
    acknowledgmentRate: post.postType === POST_TYPES.ANNOUNCEMENT && post.announcementData?.requiresAcknowledgment
      ? (post.announcementData.acknowledgedBy.length / post.announcementData.readBy.length * 100).toFixed(2)
      : null,
  };
};

const Post = mongoose.model("Post", postSchema);

export default Post;
export { POST_TYPES, VISIBILITY_TYPES, POST_STATUS };