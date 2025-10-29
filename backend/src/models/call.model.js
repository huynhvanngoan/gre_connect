import mongoose from "mongoose";
import { CALL_STATUS, CALL_TYPES } from "../utils/constants";

// ============================================
// CALL SCHEMA
// ============================================

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
      iceServers: [String],
    },
    // Recording
    isRecording: {
      type: Boolean,
      default: false,
    },
    recordings: [{
      url: String,
      duration: Number,
      size: Number,
      startedAt: Date,
      stoppedAt: Date,
      recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    }],
    // Call quality metrics
    quality: {
      averageBitrate: Number,
      packetLoss: Number,
      jitter: Number,
      latency: Number,
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      feedback: String,
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
callSchema.index({ status: 1, createdAt: -1 });

// Virtuals
callSchema.virtual('isActive').get(function() {
  return [CALL_STATUS.INITIATED, CALL_STATUS.RINGING, CALL_STATUS.ONGOING].includes(this.status);
});

callSchema.virtual('activeParticipants').get(function() {
  return this.participants.filter(p => p.status === "joined");
});

callSchema.virtual('participantCount').get(function() {
  return this.activeParticipants.length;
});

callSchema.virtual('durationFormatted').get(function() {
  if (this.duration === 0) return "0s";
  const hours = Math.floor(this.duration / 3600);
  const minutes = Math.floor((this.duration % 3600) / 60);
  const seconds = this.duration % 60;
  
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
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
  
  // Stop recording if active
  if (this.isRecording) {
    this.isRecording = false;
  }
  
  // Create call message in conversation
  await this.createCallMessage();
  
  return await this.save();
};

callSchema.methods.joinCall = async function(userId, mediaSettings = {}) {
  const participant = this.participants.find(p => p.user.equals(userId));
  
  if (!participant) {
    throw new Error("User not in call participants");
  }
  
  if (participant.status === "joined") {
    throw new Error("User already joined the call");
  }
  
  participant.status = "joined";
  participant.joinedAt = new Date();
  participant.video = mediaSettings.video !== undefined ? mediaSettings.video : (this.callType === CALL_TYPES.VIDEO);
  participant.audio = mediaSettings.audio !== undefined ? mediaSettings.audio : true;
  participant.screen = mediaSettings.screen || false;
  
  // Start call if it's the first person joining after caller
  if (this.status === CALL_STATUS.RINGING || this.status === CALL_STATUS.INITIATED) {
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
  
  // End call if all participants left or only one person remains
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
    await this.createCallMessage();
    await this.save();
  }
  
  return this;
};

callSchema.methods.cancelCall = async function() {
  this.status = CALL_STATUS.CANCELLED;
  this.endedAt = new Date();
  
  await this.createCallMessage();
  
  return await this.save();
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

callSchema.methods.startRecording = async function(userId) {
  if (this.status !== CALL_STATUS.ONGOING) {
    throw new Error("Can only record ongoing calls");
  }
  
  this.isRecording = true;
  
  this.recordings.push({
    startedAt: new Date(),
    recordedBy: userId,
  });
  
  return await this.save();
};

callSchema.methods.stopRecording = async function(recordingUrl, size) {
  this.isRecording = false;
  
  const lastRecording = this.recordings[this.recordings.length - 1];
  if (lastRecording && !lastRecording.stoppedAt) {
    lastRecording.url = recordingUrl;
    lastRecording.stoppedAt = new Date();
    lastRecording.size = size;
    lastRecording.duration = Math.floor((lastRecording.stoppedAt - lastRecording.startedAt) / 1000);
  }
  
  return await this.save();
};

callSchema.methods.rateQuality = async function(userId, rating, feedback = "") {
  this.quality.rating = rating;
  this.quality.feedback = feedback;
  return await this.save();
};

callSchema.methods.updateQualityMetrics = async function(metrics) {
  this.quality = {
    ...this.quality,
    ...metrics,
  };
  return await this.save();
};

callSchema.methods.createCallMessage = async function() {
  const Message = mongoose.model("Message");
  
  const callStatus = this.duration > 0 ? "completed" : 
                     this.status === CALL_STATUS.MISSED ? "missed" :
                     this.status === CALL_STATUS.DECLINED ? "declined" : 
                     this.status === CALL_STATUS.CANCELLED ? "cancelled" : "completed";
  
  const content = `${this.callType === CALL_TYPES.VIDEO ? "Video" : "Voice"} call ${callStatus}${
    this.duration > 0 ? ` - ${this.durationFormatted}` : ""
  }`;
  
  await Message.create({
    conversation: this.conversation,
    sender: this.caller,
    type: "call",
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
  })
  .populate("caller", "firstName lastName username profilePicture")
  .populate("participants.user", "firstName lastName username profilePicture");
};

callSchema.statics.findUserActiveCalls = function(userId) {
  return this.find({
    "participants.user": userId,
    "participants.status": "joined",
    status: CALL_STATUS.ONGOING,
  })
  .populate("conversation", "name type")
  .populate("caller", "firstName lastName username profilePicture");
};

callSchema.statics.initiateCall = async function(callData) {
  const { conversationId, callerId, callType, participantIds } = callData;
  
  // Check if there's already an active call
  const activeCall = await this.findActiveCall(conversationId);
  if (activeCall) {
    throw new Error("There is already an active call in this conversation");
  }
  
  // Check if user is already in another call
  const userActiveCalls = await this.findUserActiveCalls(callerId);
  if (userActiveCalls.length > 0) {
    throw new Error("User is already in another call");
  }
  
  const call = await this.create({
    conversation: conversationId,
    caller: callerId,
    callType,
    status: CALL_STATUS.RINGING,
    participants: participantIds.map(id => ({
      user: id,
      status: id.equals(callerId) ? "joined" : "waiting",
      joinedAt: id.equals(callerId) ? new Date() : null,
      video: callType === CALL_TYPES.VIDEO,
      audio: true,
    })),
    webrtcData: {
      roomId: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    },
  });
  
  // Send notifications to participants
  try {
    const Notification = mongoose.model("Notification");
    const User = mongoose.model("User");
    const Conversation = mongoose.model("Conversation");
    
    const caller = await User.findById(callerId);
    const conversation = await Conversation.findById(conversationId);
    
    for (const participantId of participantIds) {
      if (!participantId.equals(callerId)) {
        await Notification.createNotification({
          recipientId: participantId,
          senderId: callerId,
          type: callType === CALL_TYPES.VIDEO ? "video_call_incoming" : "voice_call_incoming",
          title: `Incoming ${callType} call`,
          message: conversation.type === "direct"
            ? `${caller.firstName} ${caller.lastName} is calling`
            : `${caller.firstName} is calling in ${conversation.name}`,
          priority: "urgent",
          actionUrl: `/calls/${call._id}`,
          data: {
            callId: call._id,
          },
          channels: { inApp: true, push: true },
        });
      }
    }
  } catch (error) {
    console.error("Error sending call notifications:", error);
  }
  
  return call;
};

callSchema.statics.getCallHistory = function(userId, limit = 50, options = {}) {
  const query = {
    $or: [
      { caller: userId },
      { "participants.user": userId }
    ],
    status: { $in: [CALL_STATUS.ENDED, CALL_STATUS.MISSED, CALL_STATUS.DECLINED, CALL_STATUS.CANCELLED] },
    ...options,
  };
  
  return this.find(query)
    .populate("caller", "firstName lastName username profilePicture")
    .populate("participants.user", "firstName lastName username profilePicture")
    .populate("conversation", "name type")
    .sort({ createdAt: -1 })
    .limit(limit);
};

callSchema.statics.getMissedCalls = function(userId) {
  return this.find({
    "participants.user": userId,
    "participants.status": "waiting",
    status: { $in: [CALL_STATUS.ENDED, CALL_STATUS.MISSED] },
  })
  .populate("caller", "firstName lastName username profilePicture")
  .populate("conversation", "name type")
  .sort({ createdAt: -1 });
};

callSchema.statics.getCallStatistics = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const calls = await this.find({
    $or: [
      { caller: userId },
      { "participants.user": userId }
    ],
    createdAt: { $gte: startDate },
    status: CALL_STATUS.ENDED,
  });
  
  const totalCalls = calls.length;
  const totalDuration = calls.reduce((sum, call) => sum + call.duration, 0);
  const videoCalls = calls.filter(c => c.callType === CALL_TYPES.VIDEO).length;
  const audioCalls = calls.filter(c => c.callType === CALL_TYPES.AUDIO).length;
  const averageDuration = totalCalls > 0 ? Math.floor(totalDuration / totalCalls) : 0;
  
  return {
    totalCalls,
    totalDuration,
    videoCalls,
    audioCalls,
    averageDuration,
    averageQualityRating: calls
      .filter(c => c.quality.rating)
      .reduce((sum, c, _, arr) => sum + c.quality.rating / arr.length, 0)
      .toFixed(1),
  };
};

// Middleware: Auto-end calls that have been ongoing for too long (safety mechanism)
callSchema.statics.autoEndStaleCalls = async function(maxDurationHours = 24) {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - maxDurationHours);
  
  const staleCalls = await this.find({
    status: CALL_STATUS.ONGOING,
    startedAt: { $lt: cutoffTime },
  });
  
  for (const call of staleCalls) {
    await call.endCall("system_error");
  }
  
  return staleCalls.length;
};

// Middleware: Auto-cancel calls that were never answered (timeout)
callSchema.statics.autoCancelUnansweredCalls = async function(timeoutMinutes = 2) {
  const cutoffTime = new Date();
  cutoffTime.setMinutes(cutoffTime.getMinutes() - timeoutMinutes);
  
  const unansweredCalls = await this.find({
    status: { $in: [CALL_STATUS.INITIATED, CALL_STATUS.RINGING] },
    initiatedAt: { $lt: cutoffTime },
  });
  
  for (const call of unansweredCalls) {
    call.status = CALL_STATUS.MISSED;
    await call.createCallMessage();
    await call.save();
    
    // Notify caller
    try {
      const Notification = mongoose.model("Notification");
      await Notification.createNotification({
        recipientId: call.caller,
        type: "call_missed",
        title: "Call Not Answered",
        message: "Your call was not answered",
        actionUrl: `/calls/${call._id}`,
      });
    } catch (error) {
      console.error("Error notifying about missed call:", error);
    }
  }
  
  return unansweredCalls.length;
};

const Call = mongoose.model("Call", callSchema);

// ============================================
// EXPORTS
// ============================================

export default Call;
export { CALL_TYPES, CALL_STATUS };