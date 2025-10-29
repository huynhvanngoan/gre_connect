import mongoose from "mongoose";

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
  PARENT_TEACHER: "parent_teacher",
  WORKSHOP: "workshop",
};

const MEETING_STATUS = {
  SCHEDULED: "scheduled",
  ONGOING: "ongoing",
  ENDED: "ended",
  CANCELLED: "cancelled",
};

const MEETING_RECURRENCE = {
  NONE: "none",
  DAILY: "daily",
  WEEKLY: "weekly",
  BIWEEKLY: "biweekly",
  MONTHLY: "monthly",
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
      maxLength: 2000,
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
    // Recurrence
    recurrence: {
      type: String,
      enum: Object.values(MEETING_RECURRENCE),
      default: MEETING_RECURRENCE.NONE,
    },
    recurrenceEndDate: {
      type: Date,
    },
    // Parent meeting (for recurring meetings)
    parentMeeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
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
      notificationSent: {
        type: Boolean,
        default: false,
      },
    }],
    attendees: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      joinedAt: Date,
      leftAt: Date,
      duration: Number, // minutes attended
      wasPresent: {
        type: Boolean,
        default: true,
      },
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
    requirePassword: {
      type: Boolean,
      default: false,
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
      allowRaiseHand: {
        type: Boolean,
        default: true,
      },
      onlyHostCanShareScreen: {
        type: Boolean,
        default: false,
      },
      onlyHostCanUnmute: {
        type: Boolean,
        default: false,
      },
      maxParticipants: {
        type: Number,
        default: 100,
      },
      enableBreakoutRooms: {
        type: Boolean,
        default: false,
      },
    },
    // Waiting room
    waitingRoom: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      requestedAt: {
        type: Date,
        default: Date.now,
      },
      admitted: {
        type: Boolean,
        default: false,
      },
      admittedAt: Date,
      admittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    }],
    // Breakout rooms
    breakoutRooms: [{
      name: String,
      participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }],
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    // Recording
    recordings: [{
      url: String,
      duration: Number,
      size: Number,
      thumbnail: String,
      startedAt: Date,
      stoppedAt: Date,
      uploadedAt: Date,
      recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
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
      maxLength: 5000,
    },
    attachments: [{
      fileName: String,
      fileUrl: String,
      fileType: String,
      fileSize: Number,
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    // Chat messages during meeting
    chatMessages: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      message: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
      isPrivate: {
        type: Boolean,
        default: false,
      },
      recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    }],
    // Polls during meeting
    polls: [{
      question: String,
      options: [{
        text: String,
        votes: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        }],
      }],
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      isActive: {
        type: Boolean,
        default: true,
      },
    }],
    // Raised hands
    raisedHands: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      raisedAt: {
        type: Date,
        default: Date.now,
      },
      loweredAt: Date,
    }],
    // Post-meeting
    notes: {
      type: String,
      maxLength: 10000,
    },
    summary: {
      type: String,
      maxLength: 2000,
    },
    actionItems: [{
      description: String,
      assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      dueDate: Date,
      priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium",
      },
      completed: {
        type: Boolean,
        default: false,
      },
      completedAt: Date,
    }],
    // Feedback/Rating
    feedback: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: String,
      submittedAt: {
        type: Date,
        default: Date.now,
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
meetingSchema.index({ parentMeeting: 1 });

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

meetingSchema.virtual('acceptanceRate').get(function() {
  if (this.invitees.length === 0) return 0;
  const accepted = this.invitees.filter(i => i.response === "accepted").length;
  return (accepted / this.invitees.length * 100).toFixed(2);
});

meetingSchema.virtual('averageRating').get(function() {
  if (this.feedback.length === 0) return 0;
  const sum = this.feedback.reduce((acc, f) => acc + f.rating, 0);
  return (sum / this.feedback.length).toFixed(1);
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
  if (this.status !== MEETING_STATUS.SCHEDULED) {
    throw new Error("Can only start scheduled meetings");
  }
  
  this.status = MEETING_STATUS.ONGOING;
  this.actualStart = new Date();
  
  // Create associated call
  const Call = mongoose.model("Call");
  
  const participantIds = this.invitees
    .filter(i => i.response === "accepted")
    .map(i => i.user);
  
  try {
    const call = await Call.initiateCall({
      conversationId: this.conversation,
      callerId: this.host,
      callType: "video",
      participantIds: [this.host, ...this.coHosts, ...participantIds],
    });
    
    this.activeCall = call._id;
  } catch (error) {
    console.error("Error creating call for meeting:", error);
  }
  
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
    try {
      const Call = mongoose.model("Call");
      const call = await Call.findById(this.activeCall);
      if (call && call.isActive) {
        await call.endCall("normal");
      }
    } catch (error) {
      console.error("Error ending call:", error);
    }
  }
  
  // Send feedback request to attendees
  await this.sendFeedbackRequests();
  
  return await this.save();
};

meetingSchema.methods.cancelMeeting = async function(reason = "") {
  this.status = MEETING_STATUS.CANCELLED;
  
  // Notify all invitees
  try {
    const Notification = mongoose.model("Notification");
    const User = mongoose.model("User");
    const host = await User.findById(this.host);
    
    for (const invitee of this.invitees) {
      await Notification.createNotification({
        recipientId: invitee.user,
        senderId: this.host,
        type: "meeting_cancelled",
        title: "Meeting Cancelled",
        message: `${host.firstName} ${host.lastName} cancelled: ${this.title}${reason ? ` - ${reason}` : ""}`,
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

meetingSchema.methods.admitFromWaitingRoom = async function(userId, admittedBy) {
  const waitingUser = this.waitingRoom.find(w => w.user.equals(userId) && !w.admitted);
  
  if (waitingUser) {
    waitingUser.admitted = true;
    waitingUser.admittedAt = new Date();
    waitingUser.admittedBy = admittedBy;
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
      wasPresent: true,
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
  this.recordings.push({
    ...recordingData,
    uploadedAt: new Date(),
  });
  return await this.save();
};

meetingSchema.methods.addChatMessage = async function(userId, message, isPrivate = false, recipientId = null) {
  this.chatMessages.push({
    user: userId,
    message,
    isPrivate,
    recipientId,
  });
  return await this.save();
};

meetingSchema.methods.createPoll = async function(creatorId, question, options) {
  this.polls.push({
    question,
    options: options.map(opt => ({ text: opt, votes: [] })),
    createdBy: creatorId,
  });
  return await this.save();
};

meetingSchema.methods.votePoll = async function(pollIndex, optionIndex, userId) {
  const poll = this.polls[pollIndex];
  
  if (!poll || !poll.isActive) {
    throw new Error("Poll not found or inactive");
  }
  
  // Remove previous vote from this user
  poll.options.forEach(opt => {
    opt.votes = opt.votes.filter(v => !v.equals(userId));
  });
  
  // Add new vote
  poll.options[optionIndex].votes.push(userId);
  
  return await this.save();
};

meetingSchema.methods.raiseHand = async function(userId) {
  const existing = this.raisedHands.find(r => r.user.equals(userId) && !r.loweredAt);
  
  if (!existing) {
    this.raisedHands.push({ user: userId });
    await this.save();
  }
  
  return this;
};

meetingSchema.methods.lowerHand = async function(userId) {
  const raised = this.raisedHands.find(r => r.user.equals(userId) && !r.loweredAt);
  
  if (raised) {
    raised.loweredAt = new Date();
    await this.save();
  }
  
  return this;
};

meetingSchema.methods.createBreakoutRoom = async function(name, participantIds) {
  this.breakoutRooms.push({
    name,
    participants: participantIds,
  });
  return await this.save();
};

meetingSchema.methods.addActionItem = async function(actionItem) {
  this.actionItems.push(actionItem);
  return await this.save();
};

meetingSchema.methods.completeActionItem = async function(actionItemId) {
  const item = this.actionItems.id(actionItemId);
  
  if (item) {
    item.completed = true;
    item.completedAt = new Date();
    await this.save();
  }
  
  return this;
};

meetingSchema.methods.submitFeedback = async function(userId, rating, comment = "") {
  const existing = this.feedback.find(f => f.user.equals(userId));
  
  if (existing) {
    existing.rating = rating;
    existing.comment = comment;
    existing.submittedAt = new Date();
  } else {
    this.feedback.push({
      user: userId,
      rating,
      comment,
    });
  }
  
  return await this.save();
};

meetingSchema.methods.sendReminders = async function() {
  const now = new Date();
  const minutesUntilMeeting = Math.floor((this.scheduledStart - now) / 60000);
  
  for (const reminder of this.reminders) {
    if (!reminder.sent && minutesUntilMeeting <= reminder.time && minutesUntilMeeting > 0) {
      try {
        const Notification = mongoose.model("Notification");
        const User = mongoose.model("User");
        const host = await User.findById(this.host);
        
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
              channels: { inApp: true, push: true, email: true },
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

meetingSchema.methods.sendFeedbackRequests = async function() {
  try {
    const Notification = mongoose.model("Notification");
    
    for (const attendee of this.attendees) {
      await Notification.createNotification({
        recipientId: attendee.user,
        type: "meeting_feedback",
        title: "Rate this meeting",
        message: `Please rate your experience in: ${this.title}`,
        actionUrl: `/meetings/${this._id}/feedback`,
      });
    }
  } catch (error) {
    console.error("Error sending feedback requests:", error);
  }
};

// Static methods
meetingSchema.statics.findUpcoming = function(userId, days = 30) {
  const now = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  
  return this.find({
    $or: [
      { host: userId },
      { coHosts: userId },
      { "invitees.user": userId }
    ],
    status: MEETING_STATUS.SCHEDULED,
    scheduledStart: { $gte: now, $lte: endDate },
  })
  .populate("host", "firstName lastName username profilePicture")
  .populate("coHosts", "firstName lastName username profilePicture")
  .populate("classId", "name code")
  .sort({ scheduledStart: 1 });
};

meetingSchema.statics.findByClass = function(classId, includeEnded = false) {
  const query = {
    classId,
    status: includeEnded 
      ? { $in: [MEETING_STATUS.SCHEDULED, MEETING_STATUS.ONGOING, MEETING_STATUS.ENDED] }
      : { $in: [MEETING_STATUS.SCHEDULED, MEETING_STATUS.ONGOING] },
  };
  
  return this.find(query)
    .populate("host", "firstName lastName username profilePicture")
    .sort({ scheduledStart: -1 });
};

meetingSchema.statics.findByMeetingCode = function(code) {
  return this.findOne({
    meetingCode: code.toUpperCase(),
    status: { $in: [MEETING_STATUS.SCHEDULED, MEETING_STATUS.ONGOING] },
  })
  .populate("host", "firstName lastName username profilePicture")
  .populate("coHosts", "firstName lastName username profilePicture");
};

meetingSchema.statics.scheduleMeeting = async function(meetingData) {
  const meeting = await this.create(meetingData);
  await meeting.generateMeetingCode();
  
  // Send invitations
  try {
    const Notification = mongoose.model("Notification");
    const User = mongoose.model("User");
    const host = await User.findById(meeting.host);
    
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
      
      invitee.notificationSent = true;
    }
    
    await meeting.save();
  } catch (error) {
    console.error("Error sending meeting invitations:", error);
  }
  
  // Create recurring meetings if needed
  if (meeting.recurrence !== MEETING_RECURRENCE.NONE) {
    await meeting.createRecurringMeetings();
  }
  
  return meeting;
};

meetingSchema.methods.createRecurringMeetings = async function() {
  if (this.recurrence === MEETING_RECURRENCE.NONE) return [];
  
  const meetings = [];
  let currentDate = new Date(this.scheduledStart);
  const endDate = this.recurrenceEndDate || new Date(currentDate.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days default
  
  const daysToAdd = {
    [MEETING_RECURRENCE.DAILY]: 1,
    [MEETING_RECURRENCE.WEEKLY]: 7,
    [MEETING_RECURRENCE.BIWEEKLY]: 14,
    [MEETING_RECURRENCE.MONTHLY]: 30,
  };
  
  const increment = daysToAdd[this.recurrence];
  
  while (currentDate < endDate) {
    currentDate.setDate(currentDate.getDate() + increment);
    
    if (currentDate >= endDate) break;
    
    const duration = (this.scheduledEnd - this.scheduledStart) / 1000 / 60; // minutes
    const newEnd = new Date(currentDate.getTime() + duration * 60 * 1000);
    
    const recurringMeeting = await mongoose.model("Meeting").create({
      ...this.toObject(),
      _id: undefined,
      scheduledStart: new Date(currentDate),
      scheduledEnd: newEnd,
      parentMeeting: this._id,
      meetingCode: undefined,
      meetingLink: undefined,
      status: MEETING_STATUS.SCHEDULED,
      attendees: [],
      recordings: [],
      chatMessages: [],
      polls: [],
      raisedHands: [],
      feedback: [],
      actualStart: undefined,
      actualEnd: undefined,
      duration: undefined,
    });
    
    await recurringMeeting.generateMeetingCode();
    meetings.push(recurringMeeting);
  }
  
  return meetings;
};

const Meeting = mongoose.model("Meeting", meetingSchema);

// ============================================
// EXPORTS
// ============================================

export default Meeting;
export { MEETING_TYPES, MEETING_STATUS, MEETING_RECURRENCE };