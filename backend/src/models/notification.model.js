import mongoose from "mongoose";
import { NOTIFICATION_PRIORITIES, NOTIFICATION_TYPES } from "../utils/constants.js";


const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },
    priority: {
      type: String,
      enum: Object.values(NOTIFICATION_PRIORITIES),
      default: NOTIFICATION_PRIORITIES.MEDIUM,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    // Rich content
    data: {
      postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
      commentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
      homeworkId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      // Generic data field for custom info
      metadata: mongoose.Schema.Types.Mixed,
    },
    // Action URL
    actionUrl: {
      type: String,
    },
    actionText: {
      type: String,
      default: "View",
    },
    // Image/icon
    image: {
      type: String,
    },
    icon: {
      type: String,
    },
    // Status
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    isClicked: {
      type: Boolean,
      default: false,
    },
    clickedAt: {
      type: Date,
    },
    // Delivery channels
    channels: {
      inApp: {
        type: Boolean,
        default: true,
      },
      email: {
        type: Boolean,
        default: false,
      },
      push: {
        type: Boolean,
        default: false,
      },
    },
    // Email delivery status
    emailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: {
      type: Date,
    },
    // Push notification status
    pushSent: {
      type: Boolean,
      default: false,
    },
    pushSentAt: {
      type: Date,
    },
    // Scheduling
    scheduledFor: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    // Grouping (for batching similar notifications)
    groupKey: {
      type: String,
      index: true,
    },
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isDismissed: {
      type: Boolean,
      default: false,
    },
    dismissedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for performance
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isActive: 1, createdAt: -1 });
notificationSchema.index({ scheduledFor: 1, isActive: 1 });
notificationSchema.index({ expiresAt: 1 });

// Virtuals
notificationSchema.virtual('isExpired').get(function () {
  return this.expiresAt && new Date() > this.expiresAt;
});

notificationSchema.virtual('age').get(function () {
  return Date.now() - this.createdAt.getTime();
});

// Methods
notificationSchema.methods.markAsRead = async function () {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

notificationSchema.methods.markAsClicked = async function () {
  if (!this.isClicked) {
    this.isClicked = true;
    this.clickedAt = new Date();

    if (!this.isRead) {
      await this.markAsRead();
    } else {
      await this.save();
    }
  }
  return this;
};

notificationSchema.methods.dismiss = async function () {
  this.isDismissed = true;
  this.dismissedAt = new Date();
  return await this.save();
};

notificationSchema.methods.sendEmail = async function () {
  // Implement email sending logic here
  // For now, just mark as sent
  this.emailSent = true;
  this.emailSentAt = new Date();
  return await this.save();
};

notificationSchema.methods.sendPush = async function () {
  // Implement push notification logic here
  // For now, just mark as sent
  this.pushSent = true;
  this.pushSentAt = new Date();
  return await this.save();
};

// Static methods
notificationSchema.statics.findByUser = function (userId, options = {}) {
  return this.find({
    recipient: userId,
    isActive: true,
    isDismissed: false,
    ...options
  }).sort({ createdAt: -1 });
};

notificationSchema.statics.findUnread = function (userId) {
  return this.find({
    recipient: userId,
    isRead: false,
    isActive: true,
    isDismissed: false,
  }).sort({ createdAt: -1 });
};

notificationSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({
    recipient: userId,
    isRead: false,
    isActive: true,
    isDismissed: false,
  });
};

notificationSchema.statics.markAllAsRead = async function (userId) {
  return await this.updateMany(
    {
      recipient: userId,
      isRead: false,
      isActive: true,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      }
    }
  );
};

notificationSchema.statics.deleteOld = async function (days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return await this.deleteMany({
    createdAt: { $lt: cutoffDate },
    isRead: true,
  });
};

notificationSchema.statics.findScheduled = function () {
  return this.find({
    scheduledFor: { $lte: new Date() },
    isActive: true,
    emailSent: false,
  });
};

// Helper function to create notification
notificationSchema.statics.createNotification = async function (data) {
  const {
    recipientId,
    senderId,
    type,
    title,
    message,
    priority = NOTIFICATION_PRIORITIES.MEDIUM,
    actionUrl,
    actionText,
    image,
    icon,
    postId,
    commentId,
    metadata,
    channels = { inApp: true, email: false, push: false },
  } = data;

  // Check user's notification settings
  const User = mongoose.model("User");
  const recipient = await User.findById(recipientId);

  if (!recipient) {
    throw new Error("Recipient not found");
  }

  // Check if user wants this type of notification
  const notificationSettings = recipient.notificationSettings || {};

  // Skip if user has disabled this notification type (only if type is defined)
  if (type && typeof type === 'string') {
    if (type.includes('homework') && notificationSettings.homework === false) return null;
    if (type.includes('announcement') && notificationSettings.announcements === false) return null;
    if (type.includes('comment') && notificationSettings.comments === false) return null;
    if (type.includes('like') && notificationSettings.likes === false) return null;
  }

  // Adjust channels based on user preferences
  if (notificationSettings.email === false) channels.email = false;
  if (notificationSettings.push === false) channels.push = false;

  const notification = await this.create({
    recipient: recipientId,
    sender: senderId,
    type,
    priority,
    title,
    message,
    actionUrl,
    actionText,
    image,
    icon,
    data: {
      postId,
      commentId,
      metadata,
    },
    channels,
  });

  // Send via appropriate channels
  if (channels.email && notificationSettings.email) {
    await notification.sendEmail();
  }

  if (channels.push && notificationSettings.push) {
    await notification.sendPush();
  }

  return notification;
};

// Middleware: Auto-expire old notifications
notificationSchema.pre("find", function () {
  this.where({
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  });
});

const Notification = mongoose.model("Notification", notificationSchema);
export { Notification, NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES };