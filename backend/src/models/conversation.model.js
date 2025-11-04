import mongoose from "mongoose";
import { CONVERSATION_TYPES } from "../utils/constants.js";

// ============================================
// CONVERSATION SCHEMA
// ============================================

const conversationSchema = new mongoose.Schema(
  {
    // Loại conversation
    type: {
      type: String,
      enum: Object.values(CONVERSATION_TYPES),
      required: true,
      default: CONVERSATION_TYPES.DIRECT,
    },

    // Tên conversation (bắt buộc với group/class, optional với direct)
    name: {
      type: String,
      trim: true,
    },

    // Avatar cho group/class
    avatar: {
      type: String,
      default: "",
    },

    // Mô tả (cho group/class)
    description: {
      type: String,
      maxLength: 500,
    },

    // Participants - Danh sách thành viên
    participants: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      // Role trong conversation
      role: {
        type: String,
        enum: ["admin", "moderator", "member"],
        default: "member",
      },
      // Thời gian tham gia
      joinedAt: {
        type: Date,
        default: Date.now,
      },
      // Thời gian rời khỏi (null nếu đang active)
      leftAt: {
        type: Date,
      },
      // Trạng thái
      status: {
        type: String,
        enum: ["active", "left", "removed", "banned"],
        default: "active",
      },
      // Mute notifications
      isMuted: {
        type: Boolean,
        default: false,
      },
      mutedUntil: {
        type: Date,
      },
      // Custom notification settings
      notificationSettings: {
        mentions: { type: Boolean, default: true },
        allMessages: { type: Boolean, default: true },
      },
      // Last seen message (để tính unread)
      lastSeenMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
      lastSeenAt: {
        type: Date,
      },
      // Custom nickname trong group
      nickname: {
        type: String,
        trim: true,
      },
    }],

    // Last message (để hiển thị preview)
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    lastMessageAt: {
      type: Date,
    },

    // Liên kết với Class (nếu type = 'class')
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
    },

    // Settings của conversation
    settings: {
      // Cho phép chia sẻ file
      allowFileSharing: {
        type: Boolean,
        default: true,
      },
      // Cho phép voice messages
      allowVoiceMessages: {
        type: Boolean,
        default: true,
      },
      // Cho phép video messages
      allowVideoMessages: {
        type: Boolean,
        default: true,
      },
      // Cho phép gọi điện
      allowCalls: {
        type: Boolean,
        default: true,
      },
      // Kích thước file tối đa (bytes)
      maxFileSize: {
        type: Number,
        default: 10485760, // 10MB
      },
      // Chỉ admin mới được gửi tin nhắn (useful cho announcements)
      onlyAdminsCanPost: {
        type: Boolean,
        default: false,
      },
      // Cho phép thành viên mời người khác
      allowMemberInvites: {
        type: Boolean,
        default: false,
      },
      // Tự động delete messages sau X ngày
      autoDeleteAfterDays: {
        type: Number,
        default: 0, // 0 = không auto delete
      },
    },

    // Encryption (for future end-to-end encryption)
    isEncrypted: {
      type: Boolean,
      default: false,
    },

    // Pinned messages
    pinnedMessages: [{
      message: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
      pinnedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      pinnedAt: {
        type: Date,
        default: Date.now,
      },
    }],

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },

    // For direct chats - quick lookup
    // [userId1, userId2] sorted to ensure uniqueness
    directChatUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],

    // Statistics
    stats: {
      totalMessages: { type: Number, default: 0 },
      totalFiles: { type: Number, default: 0 },
      totalImages: { type: Number, default: 0 },
      totalVideos: { type: Number, default: 0 },
    },

    // Created by (người tạo conversation)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

// Index cho direct chat lookup nhanh
conversationSchema.index({ directChatUsers: 1, type: 1 });

// Index cho class conversation
conversationSchema.index({ classId: 1, type: 1 });

// Index cho participant lookup
conversationSchema.index({ "participants.user": 1, "participants.status": 1 });

// Index cho active conversations
conversationSchema.index({ isActive: 1, lastMessageAt: -1 });

// Compound index for user conversations query (optimized for getUserConversations)
conversationSchema.index({
  "participants.user": 1,
  "participants.status": 1,
  isActive: 1,
  lastMessageAt: -1
});

// Text search
conversationSchema.index({ name: "text", description: "text" });

// ============================================
// VIRTUALS
// ============================================

conversationSchema.virtual('participantCount').get(function () {
  return this.participants.filter(p => p.status === "active").length;
});

conversationSchema.virtual('activeParticipants').get(function () {
  return this.participants.filter(p => p.status === "active");
});

conversationSchema.virtual('admins').get(function () {
  return this.participants.filter(p =>
    p.role === "admin" && p.status === "active"
  );
});

conversationSchema.virtual('isDirect').get(function () {
  return this.type === CONVERSATION_TYPES.DIRECT;
});

conversationSchema.virtual('isGroup').get(function () {
  return this.type === CONVERSATION_TYPES.GROUP;
});

conversationSchema.virtual('isClass').get(function () {
  return this.type === CONVERSATION_TYPES.CLASS;
});

// ============================================
// METHODS
// ============================================

/**
 * Add participant to conversation
 */
conversationSchema.methods.addParticipant = async function (userId, addedBy, role = "member") {
  // Check if already exists
  const existingParticipant = this.participants.find(p =>
    p.user.equals(userId) && p.status === "active"
  );

  if (existingParticipant) {
    throw new Error("User is already a participant");
  }

  // Check if user was previously a member
  const previousParticipant = this.participants.find(p => p.user.equals(userId));

  if (previousParticipant) {
    // Reactivate
    previousParticipant.status = "active";
    previousParticipant.joinedAt = new Date();
    previousParticipant.leftAt = null;
  } else {
    // Add new
    this.participants.push({
      user: userId,
      role,
      joinedAt: new Date(),
      status: "active",
    });
  }

  // Create system message
  await this.createSystemMessage(`${addedBy.fullName} added a new member`, "user_added", {
    addedUserId: userId,
    addedBy: addedBy._id,
  });

  return await this.save();
};

/**
 * Remove participant from conversation
 */
conversationSchema.methods.removeParticipant = async function (userId, removedBy) {
  const participant = this.participants.find(p =>
    p.user.equals(userId) && p.status === "active"
  );

  if (!participant) {
    throw new Error("User is not an active participant");
  }

  participant.status = "removed";
  participant.leftAt = new Date();

  // Create system message
  await this.createSystemMessage(`${removedBy.fullName} removed a member`, "user_removed", {
    removedUserId: userId,
    removedBy: removedBy._id,
  });

  return await this.save();
};

/**
 * Leave conversation
 */
conversationSchema.methods.leaveConversation = async function (userId) {
  const participant = this.participants.find(p =>
    p.user.equals(userId) && p.status === "active"
  );

  if (!participant) {
    throw new Error("User is not an active participant");
  }

  participant.status = "left";
  participant.leftAt = new Date();

  // Get user for system message
  const User = mongoose.model("User");
  const user = await User.findById(userId);

  // Create system message
  await this.createSystemMessage(`${user.fullName} left the conversation`, "user_left", {
    leftUserId: userId,
  });

  return await this.save();
};

/**
 * Update participant role
 */
conversationSchema.methods.updateParticipantRole = async function (userId, newRole, updatedBy) {
  const participant = this.participants.find(p =>
    p.user.equals(userId) && p.status === "active"
  );

  if (!participant) {
    throw new Error("User is not an active participant");
  }

  const oldRole = participant.role;
  participant.role = newRole;

  // Create system message
  await this.createSystemMessage(
    `${updatedBy.fullName} changed a member's role from ${oldRole} to ${newRole}`,
    "role_changed",
    {
      userId,
      oldRole,
      newRole,
      updatedBy: updatedBy._id,
    }
  );

  return await this.save();
};

/**
 * Check if user is participant
 */
conversationSchema.methods.isParticipant = function (userId) {
  return this.participants.some(p =>
    p.user.equals(userId) && p.status === "active"
  );
};

/**
 * Check if user is admin
 */
conversationSchema.methods.isAdmin = function (userId) {
  const participant = this.participants.find(p =>
    p.user.equals(userId) && p.status === "active"
  );
  return participant && participant.role === "admin";
};

/**
 * Check if user can post
 */
conversationSchema.methods.canUserPost = function (userId) {
  if (!this.settings.onlyAdminsCanPost) return true;
  return this.isAdmin(userId);
};

/**
 * Get unread count for user
 */
conversationSchema.methods.getUnreadCount = async function (userId) {
  const participant = this.participants.find(p =>
    p.user.equals(userId) && p.status === "active"
  );

  if (!participant) return 0;

  const Message = mongoose.model("Message");

  const query = {
    conversation: this._id,
    sender: { $ne: userId },
  };

  if (participant.lastSeenAt) {
    query.createdAt = { $gt: participant.lastSeenAt };
  }

  return await Message.countDocuments(query);
};

/**
 * Mark as read for user
 */
conversationSchema.methods.markAsRead = async function (userId, messageId = null) {
  const participant = this.participants.find(p =>
    p.user.equals(userId) && p.status === "active"
  );

  if (!participant) {
    throw new Error("User is not a participant");
  }

  if (messageId) {
    participant.lastSeenMessage = messageId;
  }
  participant.lastSeenAt = new Date();

  return await this.save();
};

/**
 * Pin message
 */
conversationSchema.methods.pinMessage = async function (messageId, userId) {
  // Check if already pinned
  const alreadyPinned = this.pinnedMessages.some(pm => pm.message.equals(messageId));

  if (alreadyPinned) {
    throw new Error("Message is already pinned");
  }

  this.pinnedMessages.push({
    message: messageId,
    pinnedBy: userId,
    pinnedAt: new Date(),
  });

  return await this.save();
};

/**
 * Unpin message
 */
conversationSchema.methods.unpinMessage = async function (messageId) {
  this.pinnedMessages = this.pinnedMessages.filter(pm => !pm.message.equals(messageId));
  return await this.save();
};

/**
 * Update last message
 */
conversationSchema.methods.updateLastMessage = async function (messageId) {
  this.lastMessage = messageId;
  this.lastMessageAt = new Date();
  return await this.save();
};

/**
 * Create system message
 */
conversationSchema.methods.createSystemMessage = async function (content, systemType, metadata = {}) {
  const Message = mongoose.model("Message");

  return await Message.create({
    conversation: this._id,
    type: "system",
    content,
    systemType,
    systemMetadata: metadata,
  });
};

/**
 * Archive conversation for user
 */
conversationSchema.methods.archiveForUser = async function (userId) {
  const participant = this.participants.find(p => p.user.equals(userId));
  if (participant) {
    participant.isArchived = true;
    await this.save();
  }
};

/**
 * Mute conversation for user
 */
conversationSchema.methods.muteForUser = async function (userId, duration = null) {
  const participant = this.participants.find(p => p.user.equals(userId));

  if (participant) {
    participant.isMuted = true;

    if (duration) {
      const mutedUntil = new Date();
      mutedUntil.setTime(mutedUntil.getTime() + duration);
      participant.mutedUntil = mutedUntil;
    }

    await this.save();
  }
};

/**
 * Unmute conversation for user
 */
conversationSchema.methods.unmuteForUser = async function (userId) {
  const participant = this.participants.find(p => p.user.equals(userId));

  if (participant) {
    participant.isMuted = false;
    participant.mutedUntil = null;
    await this.save();
  }
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find or create direct conversation between two users
 */
conversationSchema.statics.findOrCreateDirectConversation = async function (user1Id, user2Id) {
  // Sort user IDs to ensure consistency
  const sortedUsers = [user1Id, user2Id].sort();

  // Try to find existing conversation
  let conversation = await this.findOne({
    type: CONVERSATION_TYPES.DIRECT,
    directChatUsers: { $all: sortedUsers },
    isActive: true,
  })
    .populate("participants.user", "firstName lastName username profilePicture")
    .populate("lastMessage");

  // Create if not exists
  if (!conversation) {
    conversation = await this.create({
      type: CONVERSATION_TYPES.DIRECT,
      directChatUsers: sortedUsers,
      participants: [
        { user: user1Id, role: "admin", status: "active" },
        { user: user2Id, role: "admin", status: "active" },
      ],
      createdBy: user1Id,
    });

    conversation = await conversation.populate("participants.user", "firstName lastName username profilePicture");
  }

  return conversation;
};

/**
 * Get user's conversations
 */
conversationSchema.statics.getUserConversations = function (userId, options = {}) {
  const {
    type,
    limit = 50,
    skip = 0,
    includeArchived = false,
  } = options;

  const query = {
    "participants.user": userId,
    "participants.status": "active",
    isActive: true,
  };

  if (type) {
    query.type = type;
  }

  if (!includeArchived) {
    query["participants.isArchived"] = { $ne: true };
  }

  return this.find(query)
    .populate("participants.user", "firstName lastName username profilePicture role")
    .populate("lastMessage")
    .populate("createdBy", "firstName lastName username")
    .sort({ lastMessageAt: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Search conversations
 */
conversationSchema.statics.searchConversations = function (userId, searchQuery) {
  return this.find({
    "participants.user": userId,
    "participants.status": "active",
    isActive: true,
    $or: [
      { name: new RegExp(searchQuery, "i") },
      { description: new RegExp(searchQuery, "i") },
    ],
  })
    .populate("participants.user", "firstName lastName username profilePicture")
    .populate("lastMessage")
    .limit(20);
};

/**
 * Get active group conversations for user
 */
conversationSchema.statics.getUserGroups = function (userId) {
  return this.find({
    type: CONVERSATION_TYPES.GROUP,
    "participants.user": userId,
    "participants.status": "active",
    isActive: true,
  })
    .populate("participants.user", "firstName lastName username profilePicture")
    .populate("lastMessage")
    .sort({ lastMessageAt: -1 });
};

/**
 * Delete old archived conversations
 */
conversationSchema.statics.cleanupOldArchived = async function (days = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return await this.deleteMany({
    isArchived: true,
    updatedAt: { $lt: cutoffDate },
  });
};

// ============================================
// MIDDLEWARE
// ============================================

// Auto-generate name for direct chats
conversationSchema.pre("save", async function (next) {
  if (this.isNew && this.type === CONVERSATION_TYPES.DIRECT && !this.name) {
    const User = mongoose.model("User");
    const users = await User.find({
      _id: { $in: this.directChatUsers }
    });

    if (users.length === 2) {
      this.name = users.map(u => u.fullName).join(" & ");
    }
  }
  next();
});

// Update stats on save
conversationSchema.pre("save", function (next) {
  // Update participant count would go here if needed
  next();
});

// ============================================
// EXPORTS
// ============================================

const Conversation = mongoose.model("Conversation", conversationSchema);

// export default Conversation;
export { Conversation, CONVERSATION_TYPES };