import Class from "../../models/class.model.js";
import User from "../../models/user.model.js";
import { Notification } from "../../models/notification.model.js";
import { POST_TYPES, VISIBILITY_TYPES, NOTIFICATION_TYPES } from "../../utils/constants.js";
import { getIO } from "../../config/socket.js";
import { logger } from "../../utils/logger.js";

/**
 * Build visibility query based on user role
 */
export function buildVisibilityQuery(user) {
    const query = {};

    if (user.role === "student") {
        query.$or = [
            { visibility: VISIBILITY_TYPES.PUBLIC },
            { visibility: VISIBILITY_TYPES.STUDENTS_ONLY },
            {
                visibility: VISIBILITY_TYPES.CLASS_SPECIFIC,
                $or: [
                    { targetClass: user.roleSpecificData?.classId },
                    { targetClasses: user.roleSpecificData?.classId },
                ],
            },
            {
                visibility: VISIBILITY_TYPES.FOLLOWERS_ONLY,
                user: { $in: user.following },
            },
            { user: user._id },
        ];
    } else if (user.role === "teacher") {
        query.$or = [
            { visibility: VISIBILITY_TYPES.PUBLIC },
            { visibility: VISIBILITY_TYPES.TEACHERS_ONLY },
            {
                visibility: VISIBILITY_TYPES.CLASS_SPECIFIC,
                $or: [
                    { targetClass: { $in: user.roleSpecificData?.classesTeaching || [] } },
                    { targetClasses: { $in: user.roleSpecificData?.classesTeaching || [] } },
                ],
            },
            {
                visibility: VISIBILITY_TYPES.FOLLOWERS_ONLY,
                user: { $in: user.following },
            },
            { user: user._id },
        ];
    }
    // Staff can see everything

    return query;
}

/**
 * Check if user can view post
 */
export function canViewPost(post, user) {
    // Unauthenticated users can only view PUBLIC posts
    if (!user) {
        return post.visibility === VISIBILITY_TYPES.PUBLIC;
    }
    // Staff can view everything
    if (user.role === "staff") return true;

    // Owner can view own posts
    if (post.user.equals(user._id)) return true;

    // Check visibility
    if (post.visibility === VISIBILITY_TYPES.PUBLIC) return true;

    if (post.visibility === VISIBILITY_TYPES.STUDENTS_ONLY && user.role === "student") return true;

    if (post.visibility === VISIBILITY_TYPES.TEACHERS_ONLY && user.role === "teacher") return true;

    if (post.visibility === VISIBILITY_TYPES.CLASS_SPECIFIC) {
        if (user.role === "student" && post.targetClass?.equals(user.roleSpecificData?.classId)) return true;
        if (user.role === "student" && post.targetClasses?.some(id => id.equals(user.roleSpecificData?.classId))) return true;
        if (user.role === "teacher" && user.roleSpecificData?.classesTeaching?.some(id => post.targetClass?.equals(id) || post.targetClasses?.some(cId => cId.equals(id)))) return true;
    }

    if (post.visibility === VISIBILITY_TYPES.FOLLOWERS_ONLY) {
        return user.following.some(id => id.equals(post.user));
    }

    return false;
}

/**
 * Check if user can edit post
 */
export function canEditPost(post, user) {
    // Owner can edit
    if (post.user.equals(user._id)) return true;

    // Staff can edit
    if (user.role === "staff") return true;

    // Teacher can edit class posts
    if (user.role === "teacher" && post.targetClass && user.roleSpecificData?.classesTeaching?.some(id => id.equals(post.targetClass))) {
        return true;
    }

    return false;
}

/**
 * Check if user can delete post
 */
export function canDeletePost(post, user) {
    // Owner can delete
    if (post.user.equals(user._id)) return true;

    // Staff can delete
    if (user.role === "staff") return true;

    return false;
}

/**
 * Check if user can view homework submissions
 */
export function canViewHomeworkSubmissions(post, user) {
    // Post owner can view
    if (post.user.equals(user._id)) return true;

    // Staff can view
    if (user.role === "staff") return true;

    // Teachers of the class can view
    if (user.role === "teacher" && post.targetClass && user.roleSpecificData?.classesTeaching?.some(id => id.equals(post.targetClass))) {
        return true;
    }

    return false;
}

/**
 * Send notifications for new post (optimized with batch insert)
 */
export async function sendPostNotifications(post) {
    try {
        let recipients = [];

        // Get recipients based on post type and target - optimize with single query
        const classIds = post.targetClass
            ? [post.targetClass]
            : (post.targetClasses && post.targetClasses.length > 0 ? post.targetClasses : []);

        if (classIds.length > 0) {
            // Batch query all classes at once
            const classes = await Class.find({ _id: { $in: classIds } })
                .populate("students.student", "_id")
                .select("students");

            // Collect all student IDs
            for (const classData of classes) {
                const activeStudents = classData.students
                    .filter(s => s.status === "active" && s.student)
                    .map(s => s.student._id);
                recipients.push(...activeStudents);
            }
        }

        // Remove duplicates
        recipients = [...new Set(recipients.map(id => id.toString()))];

        if (recipients.length === 0) {
            return; // No recipients to notify
        }

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

        // Batch fetch user notification preferences
        const users = await User.find({ _id: { $in: recipients } })
            .select("_id notificationSettings");

        // Filter recipients based on their notification preferences
        const validRecipients = users.filter(user => {
            const settings = user.notificationSettings || {};
            if (notificationType.includes('homework') && !settings.homework) return false;
            if (notificationType.includes('announcement') && !settings.announcements) return false;
            return true;
        }).map(user => user._id);

        if (validRecipients.length === 0) {
            return;
        }

        // Batch create notifications using insertMany for better performance
        const notifications = validRecipients.map(recipientId => ({
            recipient: recipientId,
            sender: post.user,
            type: notificationType,
            priority: post.postType === POST_TYPES.ANNOUNCEMENT ? "high" : "medium",
            title,
            message,
            actionUrl: `/posts/${post._id}`,
            data: { postId: post._id },
            channels: { inApp: true, email: false, push: false },
            createdAt: new Date(),
            updatedAt: new Date(),
        }));

        // Batch insert all notifications at once
        await Notification.insertMany(notifications);

        // Emit socket events for real-time updates (non-blocking)
        const io = getIO();
        validRecipients.forEach(recipientId => {
            io.to(recipientId.toString()).emit("new-notification", {
                type: notificationType,
                title,
                message,
                postId: post._id,
            });
        });
    } catch (error) {
        logger.error("Error sending post notifications", {
            error: error.message,
            postId: post._id,
            stack: error.stack
        });
    }
}

