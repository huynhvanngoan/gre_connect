import mongoose from "mongoose";
import { CONVERSATION_TYPES } from "../utils/constants";

// ============================================
// CONVERSATION SCHEMA
// ============================================


const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(CONVERSATION_TYPES),
      required: true,
    },
    name: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      maxLength: 500,
    },
    avatar: {
      type: String,
      default: "",
    },
    // Participants
    participants: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      role: {
        type: String,
        enum: ["admin", "moderator", "member"],
        default: "member",
      },
      joinedAt: {
        type: Date,
        default: Date.now,
      },
      lastReadAt: {
        type: Date,
        default: Date.now,
      },
      notificationsMuted: {
        type: Boolean,
        default: false,
      },
      isPinned: {
        type: Boolean,
        default: false,
      },
    }],
    // For class conversations
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
    },
    // Last message info for quick access
    lastMessage: {
      content: String,
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      sentAt: Date,
      type: String,
    },
    // Settings
    settings: {
      allowFileSharing: {
        type: Boolean,
        default: true,
      },
      allowVoiceMessages: {
        type: Boolean,
        default: true,
      },
      allowVideoMessages: {
        type: Boolean,
        default: true,
      },
      allowCalls: {
        type: Boolean,
        default: true,
      },
      maxFileSize: {
        type: Number,
        default: 10485760, // 10MB
      },
      onlyAdminsCanPost: {
        type: Boolean,
        default: false,
      },
    },
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { 
    timestamps: true,
  }
);

// Indexes
conversationSchema.index({ "participants.user": 1 });
conversationSchema.index({ type: 1 });
conversationSchema.index({ classId: 1 });
conversationSchema.index({ updatedAt: -1 });

// Virtuals
conversationSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

conversationSchema.virtual('isDirect').get(function() {
  return this.type === CONVERSATION_TYPES.DIRECT;
});

conversationSchema.virtual('isGroup').get(function() {
  return this.type === CONVERSATION_TYPES.GROUP;
});

conversationSchema.virtual('isClass').get(function() {
  return this.type === CONVERSATION_TYPES.CLASS;
});

// Methods
conversationSchema.methods.addParticipant = async function(userId, role = "member") {
  const exists = this.participants.some(p => p.user.equals(userId));
  
  if (!exists) {
    this.participants.push({
      user: userId,
      role,
      joinedAt: new Date(),
    });
    
    await this.save();
    
    // Create system message
    await this.createSystemMessage({
      action: "user_joined",
      performedBy: userId,
      affectedUsers: [userId],
    });
  }
  
  return this;
};

conversationSchema.methods.removeParticipant = async function(userId, removedBy = null) {
  this.participants = this.participants.filter(p => !p.user.equals(userId));
  await this.save();
  
  // Create system message
  await this.createSystemMessage({
    action: "user_left",
    performedBy: removedBy || userId,
    affectedUsers: [userId],
  });
  
  return this;
};

conversationSchema.methods.updateLastMessage = async function(messageData) {
  this.lastMessage = {
    content: messageData.content,
    sender: messageData.sender,
    sentAt: messageData.createdAt,
    type: messageData.type,
  };
  
  return await this.save();
};

conversationSchema.methods.markAsRead = async function(userId) {
  const participant = this.participants.find(p => p.user.equals(userId));
  
  if (participant) {
    participant.lastReadAt = new Date();
    await this.save();
  }
  
  return this;
};

conversationSchema.methods.getUnreadCount = async function(userId) {
  const participant = this.participants.find(p => p.user.equals(userId));
  
  if (!participant) return 0;
  
  const Message = mongoose.model("Message");
  return await Message.countDocuments({
    conversation: this._id,
    createdAt: { $gt: participant.lastReadAt },
    sender: { $ne: userId },
    isDeleted: false,
  });
};

conversationSchema.methods.togglePin = async function(userId) {
  const participant = this.participants.find(p => p.user.equals(userId));
  
  if (participant) {
    participant.isPinned = !participant.isPinned;
    await this.save();
  }
  
  return this;
};

conversationSchema.methods.toggleMute = async function(userId) {
  const participant = this.participants.find(p => p.user.equals(userId));
  
  if (participant) {
    participant.notificationsMuted = !participant.notificationsMuted;
    await this.save();
  }
  
  return this;
};

conversationSchema.methods.updateParticipantRole = async function(userId, newRole) {
  const participant = this.participants.find(p => p.user.equals(userId));
  
  if (participant) {
    participant.role = newRole;
    await this.save();
  }
  
  return this;
};

conversationSchema.methods.createSystemMessage = async function(systemData) {
  const Message = mongoose.model("Message");
  const User = mongoose.model("User");
  
  let content = "";
  const performer = await User.findById(systemData.performedBy);
  const affected = systemData.affectedUsers.length > 0 
    ? await User.findById(systemData.affectedUsers[0]) 
    : null;
  
  switch(systemData.action) {
    case "user_joined":
      content = `${performer.firstName} joined the conversation`;
      break;
    case "user_left":
      content = affected && !affected._id.equals(performer._id)
        ? `${performer.firstName} removed ${affected.firstName}`
        : `${performer.firstName} left the conversation`;
      break;
    case "group_created":
      content = `${performer.firstName} created this group`;
      break;
    case "name_changed":
      content = `${performer.firstName} changed the group name`;
      break;
    case "avatar_changed":
      content = `${performer.firstName} changed the group photo`;
      break;
    default:
      content = "System message";
  }
  
  return await Message.create({
    conversation: this._id,
    sender: systemData.performedBy,
    type: "system",
    content,
    systemMessageData: systemData,
  });
};

// Static methods
conversationSchema.statics.findByUser = function(userId) {
  return this.find({
    "participants.user": userId,
    isActive: true,
    isArchived: false,
  })
  .populate("participants.user", "firstName lastName username profilePicture role")
  .populate("classId", "name code coverImage")
  .sort({ updatedAt: -1 });
};

conversationSchema.statics.findDirectConversation = function(user1Id, user2Id) {
  return this.findOne({
    type: CONVERSATION_TYPES.DIRECT,
    "participants.user": { $all: [user1Id, user2Id] },
    isActive: true,
  });
};

conversationSchema.statics.createDirectConversation = async function(user1Id, user2Id) {
  // Check if conversation already exists
  let conversation = await this.findDirectConversation(user1Id, user2Id);
  
  if (!conversation) {
    conversation = await this.create({
      type: CONVERSATION_TYPES.DIRECT,
      participants: [
        { user: user1Id },
        { user: user2Id }
      ],
    });
  }
  
  return conversation;
};

conversationSchema.statics.createGroupConversation = async function(name, creatorId, participantIds, description = "") {
  const conversation = await this.create({
    type: CONVERSATION_TYPES.GROUP,
    name,
    description,
    participants: [
      { user: creatorId, role: "admin" },
      ...participantIds.map(id => ({ user: id, role: "member" }))
    ],
  });
  
  // Create system message
  await conversation.createSystemMessage({
    action: "group_created",
    performedBy: creatorId,
    affectedUsers: [],
  });
  
  return conversation;
};

conversationSchema.statics.createClassConversation = async function(classData) {
  return await this.create({
    type: CONVERSATION_TYPES.CLASS,
    name: classData.name,
    classId: classData._id,
    avatar: classData.coverImage,
    participants: classData.participants,
  });
};

const Conversation = mongoose.model("Conversation", conversationSchema);

// ============================================
// MESSAGE SCHEMA
// ============================================

const MESSAGE_TYPES = {
  TEXT: "text",
  IMAGE: "image",
  FILE: "file",
  VOICE: "voice",
  VIDEO: "video",
  SYSTEM: "system",
  CALL: "call",
};

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(MESSAGE_TYPES),
      default: MESSAGE_TYPES.TEXT,
    },
    content: {
      type: String,
      required: true,
    },
    // For media messages
    media: {
      url: String,
      thumbnailUrl: String,
      fileName: String,
      fileSize: Number,
      fileType: String,
      duration: Number, // For voice/video in seconds
      width: Number,
      height: Number,
    },
    // For call messages
    callData: {
      callId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Call",
      },
      callType: {
        type: String,
        enum: ["audio", "video"],
      },
      duration: Number,
      status: {
        type: String,
        enum: ["missed", "declined", "completed", "cancelled"],
      },
    },
    // Reply to another message
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    // Forwarded message
    forwardedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    // Mentions
    mentions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    // Reactions
    reactions: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      emoji: String,
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    // Read receipts
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
    // Edit history
    isEdited: {
      type: Boolean,
      default: false,
    },
    editHistory: [{
      previousContent: String,
      editedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    // Status
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedFor: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    deletedAt: {
      type: Date,
    },
    // System messages
    systemMessageData: {
      action: String, // e.g., "user_joined", "user_left", "group_created"
      performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      affectedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }],
    },
  },
  { 
    timestamps: true,
  }
);

// Indexes
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ "readBy.user": 1 });
messageSchema.index({ mentions: 1 });

// Virtuals
messageSchema.virtual('isRead').get(function() {
  return this.readBy.length > 0;
});

messageSchema.virtual('isSystem').get(function() {
  return this.type === MESSAGE_TYPES.SYSTEM;
});

messageSchema.virtual('hasMedia').get(function() {
  return [MESSAGE_TYPES.IMAGE, MESSAGE_TYPES.VIDEO, MESSAGE_TYPES.FILE, MESSAGE_TYPES.VOICE].includes(this.type);
});

// Methods
messageSchema.methods.markAsRead = async function(userId) {
  const alreadyRead = this.readBy.some(r => r.user.equals(userId));
  
  if (!alreadyRead && !this.sender.equals(userId)) {
    this.readBy.push({
      user: userId,
      readAt: new Date(),
    });
    
    await this.save();
  }
  
  return this;
};

messageSchema.methods.addReaction = async function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(r => !r.user.equals(userId));
  
  // Add new reaction
  this.reactions.push({
    user: userId,
    emoji,
  });
  
  return await this.save();
};

messageSchema.methods.removeReaction = async function(userId) {
  this.reactions = this.reactions.filter(r => !r.user.equals(userId));
  return await this.save();
};

messageSchema.methods.editContent = async function(newContent) {
  if (this.type !== MESSAGE_TYPES.TEXT) {
    throw new Error("Can only edit text messages");
  }
  
  this.editHistory.push({
    previousContent: this.content,
  });
  
  this.content = newContent;
  this.isEdited = true;
  
  return await this.save();
};

messageSchema.methods.deleteForEveryone = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return await this.save();
};

messageSchema.methods.deleteForUser = async function(userId) {
  if (!this.deletedFor.includes(userId)) {
    this.deletedFor.push(userId);
    await this.save();
  }
  return this;
};

messageSchema.methods.forwardTo = async function(conversationId, forwardedBy) {
  return await Message.create({
    conversation: conversationId,
    sender: forwardedBy,
    type: this.type,
    content: this.content,
    media: this.media,
    forwardedFrom: this._id,
  });
};

// Static methods
messageSchema.statics.findByConversation = function(conversationId, userId, limit = 50, before = null) {
  const query = {
    conversation: conversationId,
    isDeleted: false,
    deletedFor: { $ne: userId },
  };
  
  if (before) {
    query.createdAt = { $lt: before };
  }
  
  return this.find(query)
    .populate("sender", "firstName lastName username profilePicture role")
    .populate({
      path: "replyTo",
      populate: {
        path: "sender",
        select: "firstName lastName username profilePicture"
      }
    })
    .sort({ createdAt: -1 })
    .limit(limit);
};

messageSchema.statics.searchMessages = function(conversationId, searchTerm, userId) {
  const searchRegex = new RegExp(searchTerm, "i");
  
  return this.find({
    conversation: conversationId,
    content: searchRegex,
    type: MESSAGE_TYPES.TEXT,
    isDeleted: false,
    deletedFor: { $ne: userId },
  })
  .populate("sender", "firstName lastName username profilePicture")
  .sort({ createdAt: -1 });
};

messageSchema.statics.getUnreadCount = function(conversationId, userId, lastReadAt) {
  return this.countDocuments({
    conversation: conversationId,
    sender: { $ne: userId },
    createdAt: { $gt: lastReadAt },
    isDeleted: false,
  });
};

messageSchema.statics.getMediaMessages = function(conversationId, userId, mediaType = null) {
  const query = {
    conversation: conversationId,
    type: { $in: [MESSAGE_TYPES.IMAGE, MESSAGE_TYPES.VIDEO, MESSAGE_TYPES.FILE] },
    isDeleted: false,
    deletedFor: { $ne: userId },
  };
  
  if (mediaType) {
    query.type = mediaType;
  }
  
  return this.find(query)
    .populate("sender", "firstName lastName username profilePicture")
    .sort({ createdAt: -1 });
};

// Middleware: Update conversation's lastMessage
messageSchema.post("save", async function() {
  if (this.isNew && !this.isDeleted && this.type !== MESSAGE_TYPES.SYSTEM) {
    try {
      const conversation = await Conversation.findById(this.conversation);
      if (conversation) {
        await conversation.updateLastMessage(this);
      }
    } catch (error) {
      console.error("Error updating last message:", error);
    }
  }
});

// Middleware: Create notifications for mentions
messageSchema.post("save", async function() {
  if (this.isNew && this.mentions.length > 0) {
    try {
      const Notification = mongoose.model("Notification");
      const sender = await mongoose.model("User").findById(this.sender);
      const conversation = await Conversation.findById(this.conversation);
      
      for (const mentionedUserId of this.mentions) {
        // Check if user has muted notifications
        const participant = conversation.participants.find(p => p.user.equals(mentionedUserId));
        if (participant && !participant.notificationsMuted) {
          await Notification.createNotification({
            recipientId: mentionedUserId,
            senderId: this.sender,
            type: "message_mention",
            title: "You were mentioned",
            message: `${sender.firstName} ${sender.lastName} mentioned you in a message`,
            actionUrl: `/messages/${this.conversation}`,
          });
        }
      }
    } catch (error) {
      console.error("Error creating mention notifications:", error);
    }
  }
});

// Middleware: Send notification for new messages in unmuted conversations
messageSchema.post("save", async function() {
  if (this.isNew && this.type === MESSAGE_TYPES.TEXT && !this.isDeleted) {
    try {
      const Notification = mongoose.model("Notification");
      const conversation = await Conversation.findById(this.conversation);
      const sender = await mongoose.model("User").findById(this.sender);
      
      // Notify all participants except sender
      for (const participant of conversation.participants) {
        if (!participant.user.equals(this.sender) && !participant.notificationsMuted) {
          await Notification.createNotification({
            recipientId: participant.user,
            senderId: this.sender,
            type: "new_message",
            title: conversation.type === CONVERSATION_TYPES.DIRECT 
              ? `${sender.firstName} ${sender.lastName}`
              : conversation.name || "Group Message",
            message: this.content.substring(0, 100),
            actionUrl: `/messages/${this.conversation}`,
          });
        }
      }
    } catch (error) {
      console.error("Error creating message notifications:", error);
    }
  }
});

const Message = mongoose.model("Message", messageSchema);

// ============================================
// EXPORTS
// ============================================

export { 
  Conversation, 
  Message, 
  CONVERSATION_TYPES,
  MESSAGE_TYPES, 
};