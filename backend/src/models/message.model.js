import mongoose from "mongoose";

// ============================================
// MESSAGE & CONVERSATION SCHEMA
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

const CONVERSATION_TYPES = {
  DIRECT: "direct",
  GROUP: "group",
  CLASS: "class",
};

// Conversation Schema
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
  }
  
  return this;
};

conversationSchema.methods.removeParticipant = async function(userId) {
  this.participants = this.participants.filter(p => !p.user.equals(userId));
  return await this.save();
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

conversationSchema.methods.getUnreadCount = function(userId) {
  const participant = this.participants.find(p => p.user.equals(userId));
  
  if (!participant) return 0;
  
  return mongoose.model("Message").countDocuments({
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

conversationSchema.statics.createGroupConversation = async function(name, creatorId, participantIds) {
  return await this.create({
    type: CONVERSATION_TYPES.GROUP,
    name,
    participants: [
      { user: creatorId, role: "admin" },
      ...participantIds.map(id => ({ user: id, role: "member" }))
    ],
  });
};

const Conversation = mongoose.model("Conversation", conversationSchema);

// ============================================
// MESSAGE SCHEMA
// ============================================

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

// Virtuals
messageSchema.virtual('isRead').get(function() {
  return this.readBy.length > 0;
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
    .populate("replyTo")
    .sort({ createdAt: -1 })
    .limit(limit);
};

messageSchema.statics.searchMessages = function(conversationId, searchTerm, userId) {
  const searchRegex = new RegExp(searchTerm, "i");
  
  return this.find({
    conversation: conversationId,
    content: searchRegex,
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

// Middleware: Update conversation's lastMessage
messageSchema.post("save", async function() {
  if (this.isNew && !this.isDeleted) {
    const conversation = await Conversation.findById(this.conversation);
    if (conversation) {
      await conversation.updateLastMessage(this);
    }
  }
});

// Middleware: Create notifications for mentions
messageSchema.post("save", async function() {
  if (this.isNew && this.mentions.length > 0) {
    try {
      const Notification = mongoose.model("Notification");
      const sender = await mongoose.model("User").findById(this.sender);
      
      for (const mentionedUserId of this.mentions) {
        await Notification.createNotification({
          recipientId: mentionedUserId,
          senderId: this.sender,
          type: "message_mention",
          title: "You were mentioned",
          message: `${sender.firstName} ${sender.lastName} mentioned you in a message`,
          actionUrl: `/messages/${this.conversation}`,
        });
      }
    } catch (error) {
      console.error("Error creating mention notifications:", error);
    }
  }
});

const Message = mongoose.model("Message", messageSchema);

// ============================================
// CALL SCHEMA
// ============================================

const CALL_TYPES = {
  AUDIO: "audio",
  VIDEO: "video",
};

const CALL_STATUS = {
  INITIATED: "initiated",
  RINGING: "ringing",
  ONGOING: "ongoing",
  ENDED: "ended",
  MISSED: "missed",
  DECLINED: "declined",
  CANCELLED: "cancelled",
  FAILED: "failed",
};

const callSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    callType: {
      type: String,
      enum: Object.values(CALL_TYPES),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(CALL_STATUS),
      default: CALL_STATUS.INITIATED,
    },
    // Participants in the call
    participants: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      joinedAt: Date,
      leftAt: Date,
      status: {
        type: String,
        enum: ["waiting", "joined", "left", "declined"],
        default: "waiting",
      },
      // Media settings
      video: {
        type: Boolean,
        default: true,
      },
      audio: {
        type: Boolean,
        default: true,
      },
      screen: {
        type: Boolean,
        default: false,
      },
    }],
    // Call timing
    initiatedAt: {
      type: Date,
      default: Date.now,
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    duration: {
      type: Number, // in seconds
      default: 0,
    },
    // WebRTC details (for reference/debugging)
    webrtcData: {
      roomId: String,
      serverId: String,
    },
    // Recording
    isRecording: {
      type: Boolean,
      default: false,
    },
    recordingUrl: {
      type: String,
    },
    recordingDuration: {
      type: Number,
    },
    // Call quality metrics
    quality: {
      averageBitrate: Number,
      packetLoss: Number,
      jitter: Number,
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
    },
    // End reason
    endReason: {
      type: String,
      enum: ["normal", "timeout", "network_error", "user_ended", "system_error"],
    },
  },
  { 
    timestamps: true,
  }
);

// Indexes
callSchema.index({ conversation: 1, createdAt: -1 });
callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ "participants.user": 1 });
callSchema.index({ status: 1 });

// Virtuals
callSchema.virtual('isActive').get(function() {
  return [CALL_STATUS.INITIATED, CALL_STATUS.RINGING, CALL_STATUS.ONGOING].includes(this.status);
});

callSchema.virtual('activeParticipants').get(function() {
  return this.participants.filter(p => p.status === "joined");
});

// Methods
callSchema.methods.startCall = async function() {
  this.status = CALL_STATUS.ONGOING;
  this.startedAt = new Date();
  return await this.save();
};

callSchema.methods.endCall = async function(reason = "normal") {
  this.status = CALL_STATUS.ENDED;
  this.endedAt = new Date();
  this.endReason = reason;
  
  if (this.startedAt) {
    this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
  }
  
  // Update all participants who are still joined
  this.participants.forEach(p => {
    if (p.status === "joined" && !p.leftAt) {
      p.leftAt = new Date();
      p.status = "left";
    }
  });
  
  // Create call message in conversation
  await this.createCallMessage();
  
  return await this.save();
};

callSchema.methods.joinCall = async function(userId, mediaSettings = {}) {
  const participant = this.participants.find(p => p.user.equals(userId));
  
  if (!participant) {
    throw new Error("User not in call participants");
  }
  
  participant.status = "joined";
  participant.joinedAt = new Date();
  participant.video = mediaSettings.video !== undefined ? mediaSettings.video : true;
  participant.audio = mediaSettings.audio !== undefined ? mediaSettings.audio : true;
  participant.screen = mediaSettings.screen || false;
  
  // Start call if it's the first person joining after caller
  if (this.status === CALL_STATUS.RINGING) {
    await this.startCall();
  }
  
  return await this.save();
};

callSchema.methods.leaveCall = async function(userId) {
  const participant = this.participants.find(p => p.user.equals(userId));
  
  if (participant && participant.status === "joined") {
    participant.status = "left";
    participant.leftAt = new Date();
    await this.save();
  }
  
  // End call if all participants left
  const activeParticipants = this.participants.filter(p => p.status === "joined");
  if (activeParticipants.length === 0) {
    await this.endCall("user_ended");
  }
  
  return this;
};

callSchema.methods.declineCall = async function(userId) {
  const participant = this.participants.find(p => p.user.equals(userId));
  
  if (participant) {
    participant.status = "declined";
    await this.save();
  }
  
  // If all participants declined, cancel the call
  const waitingOrJoined = this.participants.filter(p => 
    ["waiting", "joined"].includes(p.status)
  );
  
  if (waitingOrJoined.length === 0) {
    this.status = CALL_STATUS.DECLINED;
    await this.save();
  }
  
  return this;
};

callSchema.methods.toggleMedia = async function(userId, mediaType) {
  const participant = this.participants.find(p => p.user.equals(userId));
  
  if (participant && participant.status === "joined") {
    if (mediaType === "video") {
      participant.video = !participant.video;
    } else if (mediaType === "audio") {
      participant.audio = !participant.audio;
    } else if (mediaType === "screen") {
      participant.screen = !participant.screen;
    }
    
    await this.save();
  }
  
  return this;
};

callSchema.methods.startRecording = async function() {
  this.isRecording = true;
  return await this.save();
};

callSchema.methods.stopRecording = async function(recordingUrl, duration) {
  this.isRecording = false;
  this.recordingUrl = recordingUrl;
  this.recordingDuration = duration;
  return await this.save();
};

callSchema.methods.rateQuality = async function(rating) {
  this.quality.rating = rating;
  return await this.save();
};

callSchema.methods.createCallMessage = async function() {
  const callStatus = this.duration > 0 ? "completed" : 
                     this.status === CALL_STATUS.MISSED ? "missed" :
                     this.status === CALL_STATUS.DECLINED ? "declined" : "cancelled";
  
  const content = `${this.callType === CALL_TYPES.VIDEO ? "Video" : "Voice"} call ${callStatus}${
    this.duration > 0 ? ` - ${Math.floor(this.duration / 60)}m ${this.duration % 60}s` : ""
  }`;
  
  await Message.create({
    conversation: this.conversation,
    sender: this.caller,
    type: MESSAGE_TYPES.CALL,
    content,
    callData: {
      callId: this._id,
      callType: this.callType,
      duration: this.duration,
      status: callStatus,
    },
  });
};

// Static methods
callSchema.statics.findActiveCall = function(conversationId) {
  return this.findOne({
    conversation: conversationId,
    status: { $in: [CALL_STATUS.INITIATED, CALL_STATUS.RINGING, CALL_STATUS.ONGOING] },
  });
};

callSchema.statics.findUserActiveCalls = function(userId) {
  return this.find({
    "participants.user": userId,
    "participants.status": "joined",
    status: CALL_STATUS.ONGOING,
  });
};

callSchema.statics.initiateCall = async function(callData) {
  const { conversationId, callerId, callType, participantIds } = callData;
  
  // Check if there's already an active call
  const activeCall = await this.findActiveCall(conversationId);
  if (activeCall) {
    throw new Error("There is already an active call in this conversation");
  }
  
  const call = await this.create({
    conversation: conversationId,
    caller: callerId,
    callType,
    status: CALL_STATUS.RINGING,
    participants: participantIds.map(id => ({
      user: id,
      status: "waiting",
    })),
  });
  
  // Send notifications to participants
  try {
    const Notification = mongoose.model("Notification");
    const caller = await mongoose.model("User").findById(callerId);
    
    for (const participantId of participantIds) {
      if (!participantId.equals(callerId)) {
        await Notification.createNotification({
          recipientId: participantId,
          senderId: callerId,
          type: callType === CALL_TYPES.VIDEO ? "video_call_incoming" : "voice_call_incoming",
          title: `Incoming ${callType} call`,
          message: `${caller.firstName} ${caller.lastName} is calling`,
          priority: "urgent",
          actionUrl: `/calls/${call._id}`,
          channels: { inApp: true, push: true },
        });
      }
    }
  } catch (error) {
    console.error("Error sending call notifications:", error);
  }
  
  return call;
};

callSchema.statics.getCallHistory = function(userId, limit = 50) {
  return this.find({
    $or: [
      { caller: userId },
      { "participants.user": userId }
    ],
    status: { $in: [CALL_STATUS.ENDED, CALL_STATUS.MISSED, CALL_STATUS.DECLINED] }
  })
  .populate("caller", "firstName lastName username profilePicture")
  .populate("participants.user", "firstName lastName username profilePicture")
  .populate("conversation", "name type")
  .sort({ createdAt: -1 })
  .limit(limit);
};

const Call = mongoose.model("Call", callSchema);

// ============================================
// MEETING SCHEMA (For scheduled group calls/classes)
// ============================================

const MEETING_TYPES = {
  CLASS_LECTURE: "class_lecture",
  GROUP_STUDY: "group_study",
  OFFICE_HOURS: "office_hours",
  PRESENTATION: "presentation",
  CONFERENCE: "conference",
  ONE_ON_ONE: "one_on_one",
};

const MEETING_STATUS = {
  SCHEDULED: "scheduled",
  ONGOING: "ongoing",
  ENDED: "ended",
  CANCELLED: "cancelled",
};

const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      maxLength: 1000,
    },
    meetingType: {
      type: String,
      enum: Object.values(MEETING_TYPES),
      required: true,
    },
    // Organizer/Host
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    coHosts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    // Related entities
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
    },
    // Scheduling
    scheduledStart: {
      type: Date,
      required: true,
    },
    scheduledEnd: {
      type: Date,
      required: true,
    },
    timezone: {
      type: String,
      default: "UTC",
    },
    // Actual timing
    actualStart: {
      type: Date,
    },
    actualEnd: {
      type: Date,
    },
    duration: {
      type: Number, // in minutes
    },
    // Participants
    invitees: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      response: {
        type: String,
        enum: ["pending", "accepted", "declined", "tentative"],
        default: "pending",
      },
      respondedAt: Date,
    }],
    attendees: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      joinedAt: Date,
      leftAt: Date,
      duration: Number, // minutes attended
    }],
    // Meeting link/access
    meetingLink: {
      type: String,
      unique: true,
      sparse: true,
    },
    meetingCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    password: {
      type: String,
    },
    // Settings
    settings: {
      enableWaitingRoom: {
        type: Boolean,
        default: false,
      },
      muteParticipantsOnEntry: {
        type: Boolean,
        default: false,
      },
      allowScreenShare: {
        type: Boolean,
        default: true,
      },
      allowRecording: {
        type: Boolean,
        default: true,
      },
      allowChat: {
        type: Boolean,
        default: true,
      },
      allowReactions: {
        type: Boolean,
        default: true,
      },
      onlyHostCanShareScreen: {
        type: Boolean,
        default: false,
      },
      maxParticipants: {
        type: Number,
        default: 100,
      },
    },
    // Recording
    recordings: [{
      url: String,
      duration: Number,
      size: Number,
      startedAt: Date,
      uploadedAt: Date,
    }],
    // Status
    status: {
      type: String,
      enum: Object.values(MEETING_STATUS),
      default: MEETING_STATUS.SCHEDULED,
    },
    // Associated call (when meeting is live)
    activeCall: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Call",
    },
    // Reminder settings
    reminders: [{
      time: {
        type: Number, // minutes before meeting
        default: 15,
      },
      sent: {
        type: Boolean,
        default: false,
      },
      sentAt: Date,
    }],
    // Meeting materials/agenda
    agenda: {
      type: String,
      maxLength: 2000,
    },
    attachments: [{
      fileName: String,
      fileUrl: String,
      fileType: String,
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      uploadedAt: Date,
    }],
    // Post-meeting
    notes: {
      type: String,
    },
    actionItems: [{
      description: String,
      assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      dueDate: Date,
      completed: {
        type: Boolean,
        default: false,
      },
    }],
  },
  { 
    timestamps: true,
  }
);

// Indexes
meetingSchema.index({ host: 1, scheduledStart: 1 });
meetingSchema.index({ classId: 1, scheduledStart: 1 });
meetingSchema.index({ "invitees.user": 1 });
meetingSchema.index({ status: 1, scheduledStart: 1 });
meetingSchema.index({ meetingLink: 1 });
meetingSchema.index({ meetingCode: 1 });

// Virtuals
meetingSchema.virtual('isUpcoming').get(function() {
  return this.status === MEETING_STATUS.SCHEDULED && new Date() < this.scheduledStart;
});

meetingSchema.virtual('isHappening').get(function() {
  const now = new Date();
  return this.status === MEETING_STATUS.ONGOING || 
         (this.status === MEETING_STATUS.SCHEDULED && 
          now >= this.scheduledStart && 
          now <= this.scheduledEnd);
});

meetingSchema.virtual('isPast').get(function() {
  return this.status === MEETING_STATUS.ENDED || 
         (this.status === MEETING_STATUS.SCHEDULED && new Date() > this.scheduledEnd);
});

meetingSchema.virtual('attendanceRate').get(function() {
  if (this.invitees.length === 0) return 0;
  return (this.attendees.length / this.invitees.length * 100).toFixed(2);
});

// Methods
meetingSchema.methods.generateMeetingCode = async function() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  this.meetingCode = code;
  this.meetingLink = `/meetings/join/${code}`;
  
  return await this.save();
};

meetingSchema.methods.startMeeting = async function() {
  this.status = MEETING_STATUS.ONGOING;
  this.actualStart = new Date();
  
  // Create associated call
  const Call = mongoose.model("Call");
  
  const participantIds = this.invitees
    .filter(i => i.response === "accepted")
    .map(i => i.user);
  
  const call = await Call.initiateCall({
    conversationId: this.conversation,
    callerId: this.host,
    callType: "video",
    participantIds: [this.host, ...participantIds],
  });
  
  this.activeCall = call._id;
  
  return await this.save();
};

meetingSchema.methods.endMeeting = async function() {
  this.status = MEETING_STATUS.ENDED;
  this.actualEnd = new Date();
  
  if (this.actualStart) {
    this.duration = Math.floor((this.actualEnd - this.actualStart) / 60000); // minutes
  }
  
  // End associated call
  if (this.activeCall) {
    const call = await mongoose.model("Call").findById(this.activeCall);
    if (call && call.isActive) {
      await call.endCall("normal");
    }
  }
  
  return await this.save();
};

meetingSchema.methods.cancelMeeting = async function() {
  this.status = MEETING_STATUS.CANCELLED;
  
  // Notify all invitees
  try {
    const Notification = mongoose.model("Notification");
    const host = await mongoose.model("User").findById(this.host);
    
    for (const invitee of this.invitees) {
      await Notification.createNotification({
        recipientId: invitee.user,
        senderId: this.host,
        type: "meeting_cancelled",
        title: "Meeting Cancelled",
        message: `${host.firstName} ${host.lastName} cancelled: ${this.title}`,
        actionUrl: `/meetings/${this._id}`,
      });
    }
  } catch (error) {
    console.error("Error sending cancellation notifications:", error);
  }
  
  return await this.save();
};

meetingSchema.methods.respondToInvite = async function(userId, response) {
  const invitee = this.invitees.find(i => i.user.equals(userId));
  
  if (invitee) {
    invitee.response = response;
    invitee.respondedAt = new Date();
    await this.save();
  }
  
  return this;
};

meetingSchema.methods.markAttendance = async function(userId, joinedAt, leftAt = null) {
  const existing = this.attendees.find(a => a.user.equals(userId));
  
  if (!existing) {
    const attendance = {
      user: userId,
      joinedAt,
      leftAt,
    };
    
    if (leftAt) {
      attendance.duration = Math.floor((leftAt - joinedAt) / 60000); // minutes
    }
    
    this.attendees.push(attendance);
  } else if (leftAt && !existing.leftAt) {
    existing.leftAt = leftAt;
    existing.duration = Math.floor((leftAt - existing.joinedAt) / 60000);
  }
  
  return await this.save();
};

meetingSchema.methods.addRecording = async function(recordingData) {
  this.recordings.push(recordingData);
  return await this.save();
};

meetingSchema.methods.sendReminders = async function() {
  const now = new Date();
  const minutesUntilMeeting = Math.floor((this.scheduledStart - now) / 60000);
  
  for (const reminder of this.reminders) {
    if (!reminder.sent && minutesUntilMeeting <= reminder.time) {
      try {
        const Notification = mongoose.model("Notification");
        const host = await mongoose.model("User").findById(this.host);
        
        for (const invitee of this.invitees) {
          if (invitee.response !== "declined") {
            await Notification.createNotification({
              recipientId: invitee.user,
              senderId: this.host,
              type: "meeting_reminder",
              title: "Meeting Reminder",
              message: `${this.title} starts in ${reminder.time} minutes`,
              priority: "high",
              actionUrl: `/meetings/${this._id}`,
              channels: { inApp: true, push: true },
            });
          }
        }
        
        reminder.sent = true;
        reminder.sentAt = new Date();
      } catch (error) {
        console.error("Error sending meeting reminders:", error);
      }
    }
  }
  
  return await this.save();
};

// Static methods
meetingSchema.statics.findUpcoming = function(userId) {
  const now = new Date();
  
  return this.find({
    $or: [
      { host: userId },
      { "invitees.user": userId }
    ],
    status: MEETING_STATUS.SCHEDULED,
    scheduledStart: { $gte: now },
  })
  .populate("host", "firstName lastName username profilePicture")
  .populate("classId", "name code")
  .sort({ scheduledStart: 1 });
};

meetingSchema.statics.findByClass = function(classId) {
  return this.find({
    classId,
    status: { $ne: MEETING_STATUS.CANCELLED },
  })
  .populate("host", "firstName lastName username profilePicture")
  .sort({ scheduledStart: -1 });
};

meetingSchema.statics.findByMeetingCode = function(code) {
  return this.findOne({
    meetingCode: code.toUpperCase(),
    status: { $in: [MEETING_STATUS.SCHEDULED, MEETING_STATUS.ONGOING] },
  });
};

meetingSchema.statics.scheduleMeeting = async function(meetingData) {
  const meeting = await this.create(meetingData);
  await meeting.generateMeetingCode();
  
  // Send invitations
  try {
    const Notification = mongoose.model("Notification");
    const host = await mongoose.model("User").findById(meeting.host);
    
    for (const invitee of meeting.invitees) {
      await Notification.createNotification({
        recipientId: invitee.user,
        senderId: meeting.host,
        type: "meeting_invitation",
        title: "Meeting Invitation",
        message: `${host.firstName} ${host.lastName} invited you to: ${meeting.title}`,
        actionUrl: `/meetings/${meeting._id}`,
        channels: { inApp: true, email: true },
      });
    }
  } catch (error) {
    console.error("Error sending meeting invitations:", error);
  }
  
  return meeting;
};

const Meeting = mongoose.model("Meeting", meetingSchema);

// ============================================
// EXPORTS
// ============================================

export { 
  Conversation, 
  Message, 
  Call, 
  Meeting,
  MESSAGE_TYPES, 
  CONVERSATION_TYPES,
  CALL_TYPES,
  CALL_STATUS,
  MEETING_TYPES,
  MEETING_STATUS,
};