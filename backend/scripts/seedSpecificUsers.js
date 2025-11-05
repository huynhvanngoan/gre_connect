import mongoose from "mongoose";
import dotenv from "dotenv";
import { ENV } from "../src/config/env.js";
import { logger } from "../src/utils/logger.js";
import Message from "../src/models/message.model.js";
import { Conversation } from "../src/models/conversation.model.js";
import { Notification } from "../src/models/notification.model.js";
import Post from "../src/models/post.model.js";
import User from "../src/models/user.model.js";
import Class from "../src/models/class.model.js";
import { MESSAGE_TYPES, MESSAGE_STATUS, CONVERSATION_TYPES, POST_TYPES, POST_STATUS, VISIBILITY_TYPES, NOTIFICATION_TYPES } from "../src/utils/constants.js";

dotenv.config();

const seedSpecificUsers = async () => {
  try {
    // Connect to database
    await mongoose.connect(ENV.MONGO_URI);
    logger.info("Connected to database");

    // Find the 2 specific users
    const user1 = await User.findOne({ 
      clerkId: "user_34rwzBlRF6BgnvX1fAGwzeNBkAf" 
    });
    const user2 = await User.findOne({ 
      clerkId: "user_34nKmIXS8CEzkr0TDRmdlrVQ7ru" 
    });

    if (!user1 || !user2) {
      logger.error("❌ One or both users not found. Please check the clerkIds.");
      await mongoose.connection.close();
      process.exit(1);
    }

    logger.info(`✅ Found users: ${user1.firstName} ${user1.lastName} and ${user2.firstName} ${user2.lastName}`);

    // Get a class (if exists)
    const classes = await Class.find();
    const targetClass = classes.length > 0 ? classes[0] : null;

    logger.info("Starting seed for specific users...");

    // ============================================
    // 1. CREATE CONVERSATIONS
    // ============================================

    // Direct conversation between 2 users
    const directConv = await Conversation.findOne({
      type: CONVERSATION_TYPES.DIRECT,
      "participants.user": { $all: [user1._id, user2._id] },
      "participants.1.user": { $exists: true }
    });

    let directConversation;
    if (!directConv) {
      directConversation = await Conversation.create({
        type: CONVERSATION_TYPES.DIRECT,
        participants: [
          {
            user: user1._id,
            role: "member",
            joinedAt: new Date(),
            status: "active",
          },
          {
            user: user2._id,
            role: "member",
            joinedAt: new Date(),
            status: "active",
          },
        ],
        settings: {
          allowCalls: true,
          allowFiles: true,
        },
      });
      logger.info("✅ Created direct conversation");
    } else {
      directConversation = directConv;
      logger.info("✅ Direct conversation already exists");
    }

    // Group conversation
    const groupConversation = await Conversation.create({
      type: CONVERSATION_TYPES.GROUP,
      name: "Study Group",
      description: "Study group for our classes",
      participants: [
        {
          user: user1._id,
          role: "admin",
          joinedAt: new Date(),
          status: "active",
        },
        {
          user: user2._id,
          role: "member",
          joinedAt: new Date(),
          status: "active",
        },
      ],
      settings: {
        allowCalls: true,
        allowFiles: true,
        allowMemberInvites: true,
      },
    });
    logger.info("✅ Created group conversation");

    // Class conversation (if class exists)
    let classConversation = null;
    if (targetClass) {
      classConversation = await Conversation.create({
        type: CONVERSATION_TYPES.CLASS,
        name: targetClass.name,
        description: `Class conversation for ${targetClass.name}`,
        classId: targetClass._id,
        participants: [
          {
            user: user1._id,
            role: "member",
            joinedAt: new Date(),
            status: "active",
          },
          {
            user: user2._id,
            role: "member",
            joinedAt: new Date(),
            status: "active",
          },
        ],
        settings: {
          allowCalls: true,
          allowFiles: true,
        },
      });
      logger.info("✅ Created class conversation");
    }

    // ============================================
    // 2. CREATE MESSAGES
    // ============================================

    const directMessages = [
      {
        conversation: directConversation._id,
        sender: user1._id,
        type: MESSAGE_TYPES.TEXT,
        content: "Hi! How are you doing today?",
        status: MESSAGE_STATUS.SENT,
        readBy: [{ user: user1._id, readAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }],
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        conversation: directConversation._id,
        sender: user2._id,
        type: MESSAGE_TYPES.TEXT,
        content: "I'm doing great, thanks! How about you?",
        status: MESSAGE_STATUS.SENT,
        readBy: [{ user: user1._id, readAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60000) }, { user: user2._id, readAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60000) }],
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60000), // 1 min later
      },
      {
        conversation: directConversation._id,
        sender: user1._id,
        type: MESSAGE_TYPES.TEXT,
        content: "I'm good too! Did you finish the homework?",
        status: MESSAGE_STATUS.SENT,
        readBy: [{ user: user1._id, readAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }, { user: user2._id, readAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }],
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        conversation: directConversation._id,
        sender: user2._id,
        type: MESSAGE_TYPES.TEXT,
        content: "Yes, I just submitted it. It was challenging but I learned a lot.",
        status: MESSAGE_STATUS.SENT,
        readBy: [{ user: user1._id, readAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }],
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 60000),
      },
      {
        conversation: directConversation._id,
        sender: user1._id,
        type: MESSAGE_TYPES.TEXT,
        content: "Great! Can we meet up to study together for the test?",
        status: MESSAGE_STATUS.SENT,
        readBy: [{ user: user1._id, readAt: new Date(Date.now() - 12 * 60 * 60 * 1000) }],
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      },
      {
        conversation: directConversation._id,
        sender: user2._id,
        type: MESSAGE_TYPES.TEXT,
        content: "Sure! When are you free?",
        status: MESSAGE_STATUS.SENT,
        readBy: [{ user: user1._id, readAt: new Date(Date.now() - 12 * 60 * 60 * 1000 + 60000) }, { user: user2._id, readAt: new Date(Date.now() - 12 * 60 * 60 * 1000 + 60000) }],
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000 + 60000),
      },
      {
        conversation: directConversation._id,
        sender: user1._id,
        type: MESSAGE_TYPES.TEXT,
        content: "How about tomorrow afternoon at 3 PM?",
        status: MESSAGE_STATUS.SENT,
        readBy: [{ user: user2._id, readAt: new Date(Date.now() - 6 * 60 * 60 * 1000) }],
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      },
      {
        conversation: directConversation._id,
        sender: user2._id,
        type: MESSAGE_TYPES.TEXT,
        content: "That works for me! See you then! 👍",
        status: MESSAGE_STATUS.SENT,
        readBy: [{ user: user1._id, readAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }],
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000 + 60000),
      },
    ];

    const groupMessages = [
      {
        conversation: groupConversation._id,
        sender: user1._id,
        type: MESSAGE_TYPES.TEXT,
        content: "Welcome to our study group! Let's help each other succeed.",
        status: MESSAGE_STATUS.SENT,
        readBy: [{ user: user1._id, readAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }, { user: user2._id, readAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }],
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        conversation: groupConversation._id,
        sender: user2._id,
        type: MESSAGE_TYPES.TEXT,
        content: "Thanks for creating this group! I'm excited to study together.",
        status: MESSAGE_STATUS.SENT,
        readBy: [{ user: user1._id, readAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }, { user: user2._id, readAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }],
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 60000),
      },
      {
        conversation: groupConversation._id,
        sender: user1._id,
        type: MESSAGE_TYPES.TEXT,
        content: "Does anyone have questions about the material we covered?",
        status: MESSAGE_STATUS.SENT,
        readBy: [{ user: user1._id, readAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }],
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        conversation: groupConversation._id,
        sender: user2._id,
        type: MESSAGE_TYPES.TEXT,
        content: "I have a question about problem 5 in the homework.",
        status: MESSAGE_STATUS.SENT,
        readBy: [{ user: user1._id, readAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }],
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 60000),
      },
      {
        conversation: groupConversation._id,
        sender: user1._id,
        type: MESSAGE_TYPES.TEXT,
        content: "I can help with that! Let me explain step by step.",
        status: MESSAGE_STATUS.SENT,
        readBy: [{ user: user2._id, readAt: new Date(Date.now() - 12 * 60 * 60 * 1000) }],
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      },
    ];

    const messagesData = [...directMessages, ...groupMessages];

    if (classConversation) {
      const classMsgs = [
        {
          conversation: classConversation._id,
          sender: user1._id,
          type: MESSAGE_TYPES.TEXT,
          content: "Hello everyone! Looking forward to learning together in this class.",
          status: MESSAGE_STATUS.SENT,
          readBy: [{ user: user1._id, readAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }, { user: user2._id, readAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }],
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
        {
          conversation: classConversation._id,
          sender: user2._id,
          type: MESSAGE_TYPES.TEXT,
          content: "Same here! Excited to be part of this class.",
          status: MESSAGE_STATUS.SENT,
          readBy: [{ user: user1._id, readAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }, { user: user2._id, readAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }],
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 60000),
        },
        {
          conversation: classConversation._id,
          sender: user1._id,
          type: MESSAGE_TYPES.TEXT,
          content: "Don't forget about the assignment due next week!",
          status: MESSAGE_STATUS.SENT,
          readBy: [{ user: user1._id, readAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }],
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      ];
      messagesData.push(...classMsgs);
    }

    const messages = await Message.insertMany(messagesData);
    logger.info(`✅ Created ${messages.length} messages`);

    // Update conversations with last message
    const directLastMsg = messages.filter(m => m.conversation.toString() === directConversation._id.toString()).pop();
    if (directLastMsg) {
      await Conversation.findByIdAndUpdate(directConversation._id, {
        lastMessage: directLastMsg._id,
        lastMessageAt: directLastMsg.createdAt,
      });
    }

    const groupLastMsg = messages.filter(m => m.conversation.toString() === groupConversation._id.toString()).pop();
    if (groupLastMsg) {
      await Conversation.findByIdAndUpdate(groupConversation._id, {
        lastMessage: groupLastMsg._id,
        lastMessageAt: groupLastMsg.createdAt,
      });
    }

    if (classConversation) {
      const classLastMsg = messages.filter(m => m.conversation.toString() === classConversation._id.toString()).pop();
      if (classLastMsg) {
        await Conversation.findByIdAndUpdate(classConversation._id, {
          lastMessage: classLastMsg._id,
          lastMessageAt: classLastMsg.createdAt,
        });
      }
    }

    // ============================================
    // 3. CREATE POSTS
    // ============================================

    const postsData = [
      {
        user: user1._id,
        content: "Just finished studying for the math test. Feeling confident! Good luck everyone!",
        postType: POST_TYPES.GENERAL,
        status: POST_STATUS.PUBLISHED,
        visibility: VISIBILITY_TYPES.PUBLIC,
        tags: ["study", "math", "motivation"],
        likes: [user2._id],
        likesCount: 1,
      },
      {
        user: user2._id,
        content: "Working on a new project for science class. It's about renewable energy and I'm really excited about it!",
        postType: POST_TYPES.GENERAL,
        status: POST_STATUS.PUBLISHED,
        visibility: VISIBILITY_TYPES.PUBLIC,
        tags: ["science", "project", "renewable-energy"],
        likes: [user1._id],
        likesCount: 1,
      },
      {
        user: user1._id,
        content: "Study group meeting tomorrow at 3 PM in the library. Everyone is welcome to join!",
        postType: POST_TYPES.GENERAL,
        status: POST_STATUS.PUBLISHED,
        visibility: VISIBILITY_TYPES.PUBLIC,
        tags: ["study-group", "meeting", "library"],
      },
      {
        user: user2._id,
        content: "Just submitted my essay. Hope it meets the requirements!",
        postType: POST_TYPES.GENERAL,
        status: POST_STATUS.PUBLISHED,
        visibility: VISIBILITY_TYPES.PUBLIC,
        tags: ["essay", "submission"],
      },
    ];

    if (targetClass) {
      postsData.push({
        user: user1._id,
        content: `Question about ${targetClass.name} assignment: Can someone explain the third problem?`,
        postType: POST_TYPES.DISCUSSION,
        status: POST_STATUS.PUBLISHED,
        visibility: VISIBILITY_TYPES.CLASS,
        targetClass: targetClass._id,
        tags: ["question", "help", "discussion"],
      });
    }

    const posts = await Post.insertMany(postsData);
    logger.info(`✅ Created ${posts.length} posts`);

    // ============================================
    // 4. CREATE NOTIFICATIONS
    // ============================================

    const notificationsData = [
      // Notifications for user1
      {
        recipient: user1._id,
        sender: user2._id,
        type: NOTIFICATION_TYPES.NEW_MESSAGE,
        title: "New Message",
        message: `${user2.firstName} ${user2.lastName} sent you a message`,
        actionUrl: `/conversations/${directConversation._id}`,
        channels: { inApp: true, email: false, push: true },
        read: false,
      },
      {
        recipient: user1._id,
        sender: user2._id,
        type: NOTIFICATION_TYPES.POST_LIKE,
        title: "Post Liked",
        message: `${user2.firstName} ${user2.lastName} liked your post`,
        actionUrl: `/posts/${posts[0]._id}`,
        channels: { inApp: true, email: false, push: false },
        read: false,
      },
      {
        recipient: user1._id,
        sender: user2._id,
        type: NOTIFICATION_TYPES.NEW_FOLLOWER,
        title: "New Follower",
        message: `${user2.firstName} ${user2.lastName} started following you`,
        actionUrl: `/users/${user2._id}`,
        channels: { inApp: true, email: false, push: false },
        read: true,
      },
      // Notifications for user2
      {
        recipient: user2._id,
        sender: user1._id,
        type: NOTIFICATION_TYPES.NEW_MESSAGE,
        title: "New Message",
        message: `${user1.firstName} ${user1.lastName} sent you a message`,
        actionUrl: `/conversations/${directConversation._id}`,
        channels: { inApp: true, email: false, push: true },
        read: false,
      },
      {
        recipient: user2._id,
        sender: user1._id,
        type: NOTIFICATION_TYPES.POST_LIKE,
        title: "Post Liked",
        message: `${user1.firstName} ${user1.lastName} liked your post`,
        actionUrl: `/posts/${posts[1]._id}`,
        channels: { inApp: true, email: false, push: false },
        read: false,
      },
      {
        recipient: user2._id,
        sender: user1._id,
        type: NOTIFICATION_TYPES.NEW_FOLLOWER,
        title: "New Follower",
        message: `${user1.firstName} ${user1.lastName} started following you`,
        actionUrl: `/users/${user1._id}`,
        channels: { inApp: true, email: false, push: false },
        read: true,
      },
    ];

    const notifications = await Notification.insertMany(notificationsData);
    logger.info(`✅ Created ${notifications.length} notifications`);

    // ============================================
    // 5. UPDATE USER FOLLOWERS/FOLLOWING
    // ============================================

    // Add user2 to user1's following
    if (!user1.following.includes(user2._id)) {
      user1.following.push(user2._id);
      await user1.save();
    }

    // Add user1 to user2's followers
    if (!user2.followers.includes(user1._id)) {
      user2.followers.push(user1._id);
      await user2.save();
    }

    // Add user1 to user2's following
    if (!user2.following.includes(user1._id)) {
      user2.following.push(user1._id);
      await user2.save();
    }

    // Add user2 to user1's followers
    if (!user1.followers.includes(user2._id)) {
      user1.followers.push(user2._id);
      await user1.save();
    }

    logger.info("✅ Updated user followers/following");

    await mongoose.connection.close();
    logger.info("✅ Seed completed successfully for specific users!");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Error seeding data", { error: error.message, stack: error.stack });
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedSpecificUsers();

