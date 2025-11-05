import mongoose from "mongoose";
import { MESSAGE_TYPES, MESSAGE_STATUS } from "../utils/constants.js";

// ============================================
// MESSAGE SCHEMA
// ============================================

const messageSchema = new mongoose.Schema(
  {
    // Conversation reference
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    
    // Sender
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    
    // Message type
    type: {
      type: String,
      enum: Object.values(MESSAGE_TYPES),
      default: MESSAGE_TYPES.TEXT,
      required: true,
    },
    
    // Content
    content: {
      type: String,
      maxLength: 5000,
    },
    
    // Media attachments
    media: [{
      type: {
        type: String,
        enum: ["image", "video", "audio", "file"],
      },
      url: {
        type: String,
        required: true,
      },
      publicId: String, // Cloudinary public ID
      filename: String,
      size: Number, // File size in bytes
      mimeType: String,
      duration: Number, // For audio/video in seconds
      thumbnail: String, // Thumbnail URL for videos
      width: Number, // For images/videos
      height: Number, // For images/videos
    }],
    
    // Location data (for location messages)
    location: {
      latitude: {
        type: Number,
        min: -90,
        max: 90,
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180,
      },
      address: String,
      name: String, // Place name
    },
    
    // Reply to another message
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    
    // Forwarded from
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
        required: true,
      },
      emoji: {
        type: String,
        required: true,
      },
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
        required: true,
      },
      readAt: {
        type: Date,
        default: Date.now,
      },
    }],
    
    // Delivery status
    status: {
      type: String,
      enum: Object.values(MESSAGE_STATUS),
      default: MESSAGE_STATUS.SENT,
    },
    
    // Edit history
    isEdited: {
      type: Boolean,
      default: false,
    },
    editHistory: [{
      previousContent: {
        type: String,
        required: true,
      },
      editedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    editedAt: {
      type: Date,
    },
    
    // Deletion
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
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    
    // System message data
    systemType: {
      type: String,
      enum: [
        "user_joined",
        "user_left",
        "user_added",
        "user_removed",
        "user_promoted",
        "user_demoted",
        "group_created",
        "name_changed",
        "avatar_changed",
        "settings_changed",
        "call_started",
        "call_ended",
        "call_missed",
      ],
    },
    systemMetadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    
    // Metadata
    metadata: {
      clientMessageId: String, // For client-side message tracking
      deviceType: String, // mobile, web, desktop
      userAgent: String,
    },
    
    // Expiry (for disappearing messages - future feature)
    expiresAt: {
      type: Date,
    },
  },
  { 
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

// Compound indexes for efficient queries
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, type: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ "readBy.user": 1 });
messageSchema.index({ mentions: 1 });
messageSchema.index({ isDeleted: 1, deletedFor: 1 });
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Text search index
messageSchema.index({ content: "text" });

// ============================================
// VIRTUALS
// ============================================

messageSchema.virtual('isRead').get(function() {
  return this.readBy && this.readBy.length > 0;
});

messageSchema.virtual('isSystem').get(function() {
  return this.type === MESSAGE_TYPES.SYSTEM;
});

messageSchema.virtual('hasMedia').get(function() {
  return this.media && this.media.length > 0;
});

messageSchema.virtual('hasLocation').get(function() {
  return this.type === MESSAGE_TYPES.LOCATION && this.location;
});

messageSchema.virtual('isForwarded').get(function() {
  return !!this.forwardedFrom;
});

messageSchema.virtual('reactionCount').get(function() {
  return this.reactions ? this.reactions.length : 0;
});

// ============================================
// METHODS
// ============================================

/**
 * Mark message as read by user
 */
messageSchema.methods.markAsRead = async function(userId) {
  // Don't mark own messages as read
  if (this.sender.equals(userId)) {
    return this;
  }
  
  // Check if already read
  const alreadyRead = this.readBy.some(r => r.user.equals(userId));
  
  if (!alreadyRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date(),
    });
    
    this.status = MESSAGE_STATUS.READ;
    await this.save();
  }
  
  return this;
};

/**
 * Add or update reaction
 */
messageSchema.methods.addReaction = async function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(r => !r.user.equals(userId));
  
  // Add new reaction
  this.reactions.push({
    user: userId,
    emoji,
    createdAt: new Date(),
  });
  
  return await this.save();
};

/**
 * Remove reaction
 */
messageSchema.methods.removeReaction = async function(userId) {
  this.reactions = this.reactions.filter(r => !r.user.equals(userId));
  return await this.save();
};

/**
 * Get reactions grouped by emoji
 */
messageSchema.methods.getReactionsSummary = function() {
  const summary = {};
  
  this.reactions.forEach(reaction => {
    if (!summary[reaction.emoji]) {
      summary[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        users: [],
      };
    }
    
    summary[reaction.emoji].count++;
    summary[reaction.emoji].users.push(reaction.user);
  });
  
  return Object.values(summary);
};

/**
 * Edit message content
 */
messageSchema.methods.editContent = async function(newContent, userId) {
  // Only text messages can be edited
  if (this.type !== MESSAGE_TYPES.TEXT) {
    throw new Error("Only text messages can be edited");
  }
  
  // Only sender can edit
  if (!this.sender.equals(userId)) {
    throw new Error("Only the sender can edit this message");
  }
  
  // Can't edit deleted messages
  if (this.isDeleted) {
    throw new Error("Cannot edit deleted messages");
  }
  
  // Save to edit history
  this.editHistory.push({
    previousContent: this.content,
    editedAt: new Date(),
  });
  
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  
  return await this.save();
};

/**
 * Delete message for everyone
 */
messageSchema.methods.deleteForEveryone = async function(userId) {
  // Only sender can delete for everyone
  if (!this.sender.equals(userId)) {
    throw new Error("Only the sender can delete this message for everyone");
  }
  
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  this.content = "This message was deleted";
  
  return await this.save();
};

/**
 * Delete message for specific user
 */
messageSchema.methods.deleteForUser = async function(userId) {
  if (!this.deletedFor.includes(userId)) {
    this.deletedFor.push(userId);
    await this.save();
  }
  
  return this;
};

/**
 * Forward message to another conversation
 */
messageSchema.methods.forwardTo = async function(conversationId, forwardedBy) {
  const Message = mongoose.model("Message");
  
  const forwardedMessage = await Message.create({
    conversation: conversationId,
    sender: forwardedBy,
    type: this.type,
    content: this.content,
    media: this.media,
    location: this.location,
    forwardedFrom: this._id,
  });
  
  return forwardedMessage;
};

/**
 * Check if user can see this message
 */
messageSchema.methods.canUserSee = function(userId) {
  // Deleted for everyone
  if (this.isDeleted) return false;
  
  // Deleted for this specific user
  if (this.deletedFor.includes(userId)) return false;
  
  return true;
};

/**
 * Check if user has read this message
 */
messageSchema.methods.hasUserRead = function(userId) {
  return this.readBy.some(r => r.user.equals(userId));
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find messages by conversation with pagination
 */
messageSchema.statics.findByConversation = function(conversationId, userId, options = {}) {
  const {
    limit = 50,
    before = null,
    after = null,
  } = options;
  
  const query = {
    conversation: conversationId,
    isDeleted: false,
    deletedFor: { $ne: userId },
  };
  
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }
  
  if (after) {
    query.createdAt = { $gt: new Date(after) };
  }
  
  return this.find(query)
    .populate("sender", "firstName lastName username profilePicture role isOnline")
    .populate({
      path: "replyTo",
      populate: {
        path: "sender",
        select: "firstName lastName username profilePicture"
      }
    })
    .populate("mentions", "firstName lastName username")
    .populate("reactions.user", "firstName lastName username profilePicture")
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Search messages in conversation
 */
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
  .sort({ createdAt: -1 })
  .limit(50);
};

/**
 * Get unread message count
 */
messageSchema.statics.getUnreadCount = function(conversationId, userId, lastReadAt) {
  return this.countDocuments({
    conversation: conversationId,
    sender: { $ne: userId },
    createdAt: { $gt: lastReadAt },
    isDeleted: false,
    deletedFor: { $ne: userId },
  });
};

/**
 * Get media messages
 */
messageSchema.statics.getMediaMessages = function(conversationId, userId, mediaType = null) {
  const query = {
    conversation: conversationId,
    type: { $in: [MESSAGE_TYPES.IMAGE, MESSAGE_TYPES.VIDEO, MESSAGE_TYPES.FILE, MESSAGE_TYPES.AUDIO] },
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

/**
 * Mark multiple messages as read
 */
messageSchema.statics.markManyAsRead = async function(messageIds, userId) {
  return await this.updateMany(
    {
      _id: { $in: messageIds },
      sender: { $ne: userId },
      "readBy.user": { $ne: userId },
    },
    {
      $push: {
        readBy: {
          user: userId,
          readAt: new Date(),
        }
      },
      $set: {
        status: MESSAGE_STATUS.READ,
      }
    }
  );
};

/**
 * Mark all messages in a conversation as read for a user
 */
messageSchema.statics.markAllAsRead = async function(conversationId, userId) {
  const result = await this.updateMany(
    {
      conversation: conversationId,
      sender: { $ne: userId },
      isDeleted: false,
      deletedFor: { $ne: userId },
      "readBy.user": { $ne: userId },
    },
    {
      $push: {
        readBy: {
          user: userId,
          readAt: new Date(),
        }
      },
      $set: {
        status: MESSAGE_STATUS.READ,
      }
    }
  );
  return result.modifiedCount || 0;
};

/**
 * Delete old messages (cleanup)
 */
messageSchema.statics.deleteOldMessages = async function(days = 365) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return await this.deleteMany({
    createdAt: { $lt: cutoffDate },
    isDeleted: true,
  });
};

/**
 * Get message statistics for conversation
 */
messageSchema.statics.getConversationStats = async function(conversationId) {
  const stats = await this.aggregate([
    { $match: { conversation: conversationId, isDeleted: false } },
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        totalImages: {
          $sum: { $cond: [{ $eq: ["$type", MESSAGE_TYPES.IMAGE] }, 1, 0] }
        },
        totalVideos: {
          $sum: { $cond: [{ $eq: ["$type", MESSAGE_TYPES.VIDEO] }, 1, 0] }
        },
        totalFiles: {
          $sum: { $cond: [{ $eq: ["$type", MESSAGE_TYPES.FILE] }, 1, 0] }
        },
        totalReactions: { $sum: { $size: "$reactions" } },
      }
    }
  ]);
  
  return stats[0] || {
    totalMessages: 0,
    totalImages: 0,
    totalVideos: 0,
    totalFiles: 0,
    totalReactions: 0,
  };
};

// ============================================
// MIDDLEWARE
// ============================================

// Update conversation's last message
messageSchema.post("save", async function(doc) {
  if (doc.isNew && !doc.isDeleted && doc.type !== MESSAGE_TYPES.SYSTEM) {
    try {
      const Conversation = mongoose.model("Conversation");
      const conversation = await Conversation.findById(doc.conversation);
      
      if (conversation) {
        await conversation.updateLastMessage(doc._id);
      }
    } catch (error) {
      console.error("Error updating last message:", error);
    }
  }
});

// Create notification for mentions
messageSchema.post("save", async function(doc) {
  if (doc.isNew && doc.mentions && doc.mentions.length > 0) {
    try {
      const Notification = mongoose.model("Notification");
      const User = mongoose.model("User");
      const Conversation = mongoose.model("Conversation");
      
      const sender = await User.findById(doc.sender);
      const conversation = await Conversation.findById(doc.conversation);
      
      for (const mentionedUserId of doc.mentions) {
        // Check if user has muted notifications
        const participant = conversation.participants.find(p => 
          p.user.equals(mentionedUserId)
        );
        
        if (participant && !participant.isMuted) {
          await Notification.create({
            recipient: mentionedUserId,
            sender: doc.sender,
            type: "message_mention",
            title: "You were mentioned",
            message: `${sender.fullName} mentioned you in a message`,
            data: {
              conversationId: doc.conversation,
              messageId: doc._id,
            },
          });
        }
      }
    } catch (error) {
      console.error("Error creating mention notifications:", error);
    }
  }
});

// ============================================
// EXPORTS
// ============================================

const Message = mongoose.model("Message", messageSchema);

export default Message;