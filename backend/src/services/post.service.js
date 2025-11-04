import Post from "../models/post.model.js";
import { Comment } from "../models/comment.model.js";
import Class from "../models/class.model.js";
import { Notification } from "../models/notification.model.js";
import { POST_TYPES, NOTIFICATION_TYPES } from "../utils/constants.js";
import { logger } from "../utils/logger.js";

/**
 * Check if user can view post
 */
export const canViewPost = (post, user) => {
    // Owner can view
    if (post.user.equals(user._id)) return true;

    // Staff can view
    if (user.role === "staff") return true;

    // Check visibility
    if (post.visibility === "public") return true;
    if (post.visibility === "class" && post.targetClass) {
        // Check if user is in the class
        return user.roleSpecificData?.enrolledClasses?.some(id => id.equals(post.targetClass));
    }

    return false;
};

/**
 * Check if user can edit post
 */
export const canEditPost = (post, user) => {
    // Owner can edit
    if (post.user.equals(user._id)) return true;

    // Staff can edit
    if (user.role === "staff") return true;

    // Teacher can edit class posts
    if (user.role === "teacher" && post.targetClass &&
        user.roleSpecificData?.classesTeaching?.some(id => id.equals(post.targetClass))) {
        return true;
    }

    return false;
};

/**
 * Check if user can delete post
 */
export const canDeletePost = (post, user) => {
    // Owner can delete
    if (post.user.equals(user._id)) return true;

    // Staff can delete
    if (user.role === "staff") return true;

    return false;
};

/**
 * Check if user can view homework submissions
 */
export const canViewHomeworkSubmissions = (post, user) => {
    // Post owner can view
    if (post.user.equals(user._id)) return true;

    // Staff can view
    if (user.role === "staff") return true;

    // Teachers of the class can view
    if (user.role === "teacher" && post.targetClass &&
        user.roleSpecificData?.classesTeaching?.some(id => id.equals(post.targetClass))) {
        return true;
    }

    return false;
};

/**
 * Build visibility query based on user role
 */
export const buildVisibilityQuery = (user) => {
    const query = {};

    // Staff can see all posts
    if (user.role === "staff") {
        return query;
    }

    // Regular users can see public posts and class posts they're in
    query.$or = [
        { visibility: "public" },
    ];

    // Add class visibility if user is enrolled in classes
    if (user.roleSpecificData?.enrolledClasses?.length > 0) {
        query.$or.push({
            visibility: "class",
            $or: [
                { targetClass: { $in: user.roleSpecificData.enrolledClasses } },
                { targetClasses: { $in: user.roleSpecificData.enrolledClasses } },
            ],
        });
    }

    return query;
};

/**
 * Send notifications for new post
 */
export const sendPostNotifications = async (post) => {
    try {
        let recipients = [];

        // Get recipients based on post type and target
        if (post.targetClass) {
            const classData = await Class.findById(post.targetClass).populate("students.student");
            recipients = classData.students
                .filter(s => s.status === "active")
                .map(s => s.student._id);
        } else if (post.targetClasses && post.targetClasses.length > 0) {
            for (const classId of post.targetClasses) {
                const classData = await Class.findById(classId).populate("students.student");
                const classStudents = classData.students
                    .filter(s => s.status === "active")
                    .map(s => s.student._id);
                recipients.push(...classStudents);
            }
        }

        // Remove duplicates
        recipients = [...new Set(recipients.map(id => id.toString()))];

        // Determine notification type and message
        let notificationType;
        let title;
        let message;

        switch (post.postType) {
            case POST_TYPES.HOMEWORK:
                notificationType = NOTIFICATION_TYPES.NEW_HOMEWORK;
                title = "New Homework";
                message = `New homework assigned: ${post.content.substring(0, 50)}...`;
                break;
            case POST_TYPES.ANNOUNCEMENT:
                notificationType = NOTIFICATION_TYPES.NEW_ANNOUNCEMENT;
                title = "New Announcement";
                message = post.content.substring(0, 100);
                break;
            case POST_TYPES.EVENT:
                notificationType = NOTIFICATION_TYPES.EVENT_INVITATION;
                title = "New Event";
                message = `${post.eventData?.title || "New Event"}`;
                break;
            default:
                notificationType = NOTIFICATION_TYPES.NEW_POST;
                title = "New Post";
                message = post.content.substring(0, 100);
        }

        // Create notifications
        for (const recipientId of recipients) {
            await Notification.createNotification({
                recipientId,
                senderId: post.user,
                type: notificationType,
                title,
                message,
                actionUrl: `/posts/${post._id}`,
                postId: post._id,
            });
        }
    } catch (error) {
        logger.error("Error sending post notifications", { error: error.message, stack: error.stack });
    }
};

/**
 * Compute comments count for posts using aggregation
 */
export const getCommentsCountMap = async (postIds) => {
    try {
        const counts = await Comment.aggregate([
            { $match: { post: { $in: postIds } } },
            { $group: { _id: "$post", count: { $sum: 1 } } },
        ]);
        return counts.reduce((acc, cur) => {
            acc[cur._id.toString()] = cur.count;
            return acc;
        }, {});
    } catch (error) {
        logger.error("Error computing comments count", { error: error.message });
        return {};
    }
};

