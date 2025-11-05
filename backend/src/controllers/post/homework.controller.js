import asyncHandler from "express-async-handler";
import Post from "../../models/post.model.js";
import { Notification } from "../../models/notification.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS, POST_TYPES, PERMISSIONS, NOTIFICATION_TYPES } from "../../utils/constants.js";
import { canViewHomeworkSubmissions } from "./helpers.js";

/**
 * @desc    Submit homework
 * @route   POST /api/posts/:postId/submit
 * @access  Private (Students)
 */
export const submitHomework = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { content, files } = req.body;
    const studentId = req.user._id;

    const post = await Post.findById(postId);

    if (!post) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Post not found");
    }

    if (post.postType !== POST_TYPES.HOMEWORK) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("This is not a homework post");
    }

    // Handle uploaded files from middleware
    let submissionFiles = files || [];
    if (req.files && req.files.attachments) {
        submissionFiles = req.files.attachments.map(file => ({
            fileName: file.originalname,
            fileUrl: file.path,
        }));
    }

    const submissionData = {
        content,
        files: submissionFiles,
    };

    await post.submitHomework(studentId, submissionData);

    // Notify teacher
    await Notification.createNotification({
        recipientId: post.user,
        senderId: studentId,
        type: NOTIFICATION_TYPES.HOMEWORK_SUBMITTED,
        title: "Homework Submitted",
        message: `${req.user.fullName} submitted homework: ${post.content.substring(0, 50)}...`,
        actionUrl: `/posts/${postId}`,
        postId: postId,
    });

    successResponse(res, HTTP_STATUS.OK, "Homework submitted successfully");
});

/**
 * @desc    Grade homework submission
 * @route   POST /api/posts/:postId/grade/:studentId
 * @access  Private (Teachers)
 */
export const gradeHomework = asyncHandler(async (req, res) => {
    const { postId, studentId } = req.params;
    const { score, feedback } = req.body;
    const graderId = req.user._id;

    if (!req.user.hasPermission(PERMISSIONS.GRADE_HOMEWORK)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to grade homework");
    }

    const post = await Post.findById(postId);

    if (!post) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Post not found");
    }

    if (post.postType !== POST_TYPES.HOMEWORK) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("This is not a homework post");
    }

    await post.gradeSubmission(studentId, score, feedback, graderId);

    // Notify student
    await Notification.createNotification({
        recipientId: studentId,
        senderId: graderId,
        type: NOTIFICATION_TYPES.HOMEWORK_GRADED,
        title: "Homework Graded",
        message: `Your homework has been graded: ${score}/${post.homeworkData.maxScore}`,
        actionUrl: `/posts/${postId}`,
        postId: postId,
    });

    successResponse(res, HTTP_STATUS.OK, "Homework graded successfully");
});

/**
 * @desc    Get homework submissions
 * @route   GET /api/posts/:postId/submissions
 * @access  Private (Teachers)
 */
export const getHomeworkSubmissions = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const post = await Post.findById(postId)
        .populate("homeworkData.submissions.student", "firstName lastName username profilePicture studentId")
        .populate("homeworkData.submissions.gradedBy", "firstName lastName username");

    if (!post) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Post not found");
    }

    if (post.postType !== POST_TYPES.HOMEWORK) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("This is not a homework post");
    }

    // Check permission
    if (!canViewHomeworkSubmissions(post, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to view submissions");
    }

    successResponse(res, HTTP_STATUS.OK, "Submissions retrieved successfully", {
        submissions: post.homeworkData.submissions,
    });
});

