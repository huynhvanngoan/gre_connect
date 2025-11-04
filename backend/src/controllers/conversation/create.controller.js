import asyncHandler from "express-async-handler";
import { Conversation } from "../../models/conversation.model.js";
import User from "../../models/user.model.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS, CONVERSATION_TYPES } from "../../utils/constants.js";
import { getIO } from "../../config/socket.js";

/**
 * @desc    Create or get direct conversation with another user
 * @route   POST /api/v1/conversations/direct
 * @access  Private
 */
export const createDirectConversation = asyncHandler(async (req, res) => {
    const { userId } = req.body;

    // Check if trying to message yourself
    if (userId === req.user._id.toString()) {
        return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "Cannot create conversation with yourself");
    }

    // Check if other user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
        return errorResponse(res, HTTP_STATUS.NOT_FOUND, "User not found");
    }

    // Check privacy settings
    if (otherUser.privacySettings.allowMessages === "none") {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "This user doesn't accept messages");
    }

    if (otherUser.privacySettings.allowMessages === "following") {
        const isFollowing = otherUser.followers.some(id => id.equals(req.user._id));
        if (!isFollowing) {
            return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You need to be followed by this user to send messages");
        }
    }

    // Find or create direct conversation
    const conversation = await Conversation.findOrCreateDirectConversation(
        req.user._id,
        userId
    );

    // Populate data
    await conversation.populate("participants.user", "firstName lastName username profilePicture role isOnline");

    successResponse(res, HTTP_STATUS.OK, "Conversation retrieved successfully", {
        conversation,
    });
});

/**
 * @desc    Create group conversation
 * @route   POST /api/v1/conversations/group
 * @access  Private
 */
export const createGroupConversation = asyncHandler(async (req, res) => {
    const { name, participantIds, avatar, description } = req.body;

    // Validate participants
    if (!participantIds || participantIds.length === 0) {
        return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "At least one participant is required");
    }

    // Check if users exist
    const users = await User.find({ _id: { $in: participantIds } });
    if (users.length !== participantIds.length) {
        return errorResponse(res, HTTP_STATUS.NOT_FOUND, "One or more users not found");
    }

    // Create participants array with creator as admin
    const participants = [
        {
            user: req.user._id,
            role: "admin",
            status: "active",
        }
    ];

    // Add other participants as members
    participantIds.forEach(userId => {
        if (userId !== req.user._id.toString()) {
            participants.push({
                user: userId,
                role: "member",
                status: "active",
            });
        }
    });

    // Create conversation
    const conversation = await Conversation.create({
        type: CONVERSATION_TYPES.GROUP,
        name,
        avatar,
        description,
        participants,
        createdBy: req.user._id,
    });

    // Populate data
    await conversation.populate("participants.user", "firstName lastName username profilePicture role");
    await conversation.populate("createdBy", "firstName lastName username");

    // Create system message
    await conversation.createSystemMessage(
        `${req.user.fullName} created the group`,
        "group_created",
        {
            createdBy: req.user._id,
        }
    );

    // Emit socket event to all participants
    const io = getIO();
    participants.forEach(p => {
        if (!p.user.equals(req.user._id)) {
            io.to(p.user.toString()).emit("new-conversation", conversation);
        }
    });

    successResponse(res, HTTP_STATUS.CREATED, "Group conversation created successfully", {
        conversation,
    });
});

