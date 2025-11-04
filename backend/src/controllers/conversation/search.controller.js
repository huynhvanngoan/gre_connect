import asyncHandler from "express-async-handler";
import { Conversation } from "../../models/conversation.model.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";

/**
 * @desc    Search conversations
 * @route   GET /api/v1/conversations/search
 * @access  Private
 */
export const searchConversations = asyncHandler(async (req, res) => {
  const { q, type, limit = 20 } = req.query;
  const userId = req.user._id;

  if (!q) {
    return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "Search query is required");
  }

  const searchRegex = new RegExp(q, "i");

  const query = {
    "participants.user": userId,
    "participants.status": "active",
    isActive: true,
    $or: [
      { name: searchRegex },
      { description: searchRegex },
    ],
  };

  if (type) {
    query.type = type;
  }

  const conversations = await Conversation.find(query)
    .populate("participants.user", "firstName lastName username profilePicture")
    .populate("lastMessage")
    .limit(parseInt(limit))
    .sort({ lastMessageAt: -1 });

  successResponse(res, HTTP_STATUS.OK, "Search results retrieved successfully", {
    conversations,
    total: conversations.length,
  });
});

