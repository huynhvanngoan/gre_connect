import mongoose from "mongoose";
import { COMMENT_TYPES } from "../utils/constants.js";

const commentSchema = new mongoose.Schema(
    {
        post: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
            required: true,
            maxLength: 500,
        },
        commentType: {
            type: String,
            enum: Object.values(COMMENT_TYPES),
            default: COMMENT_TYPES.TEXT,
        },
        // For image/file comments (flexible object to avoid cast errors)
        media: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        // Nested comments (replies)
        parentComment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment",
            default: null,
        },
        replies: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment",
        }],
        // Mentions
        mentions: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }],
        // Reactions
        likes: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
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
        // Reports
        reports: [{
            reportedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
            reason: String,
            reportedAt: {
                type: Date,
                default: Date.now,
            },
            status: {
                type: String,
                enum: ["pending", "reviewed", "resolved"],
                default: "pending",
            },
        }],
        // Status
        isActive: {
            type: Boolean,
            default: true,
        },
        isHidden: {
            type: Boolean,
            default: false,
        },
        hiddenReason: String,
    },
    {
        timestamps: true,
    }
);

// Indexes
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ user: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });

// Virtuals
commentSchema.virtual('likesCount').get(function () {
    return this.likes.length;
});

commentSchema.virtual('repliesCount').get(function () {
    return this.replies.length;
});

commentSchema.virtual('isReply').get(function () {
    return this.parentComment !== null;
});

// Methods
commentSchema.methods.toggleLike = async function (userId) {
    const index = this.likes.findIndex(id => id.toString() === userId.toString());

    if (index > -1) {
        this.likes.splice(index, 1);
    } else {
        this.likes.push(userId);
    }

    return await this.save();
};

commentSchema.methods.addReply = async function (replyData) {
    const Comment = mongoose.model("Comment");

    const reply = await Comment.create({
        ...replyData,
        parentComment: this._id,
        post: this.post,
    });

    this.replies.push(reply._id);
    await this.save();

    return reply;
};

commentSchema.methods.updateContent = async function (newContent) {
    this.editHistory.push({
        previousContent: this.content,
    });

    this.content = newContent;
    this.isEdited = true;

    return await this.save();
};

commentSchema.methods.report = async function (userId, reason) {
    this.reports.push({
        reportedBy: userId,
        reason,
    });

    return await this.save();
};

commentSchema.methods.hide = async function (reason) {
    this.isHidden = true;
    this.hiddenReason = reason;
    return await this.save();
};

// Statics
commentSchema.statics.findByPost = function (postId, options = {}) {
    return this.find({
        post: postId,
        parentComment: null,
        isActive: true,
        isHidden: false,
        ...options
    })
        .populate('user', 'firstName lastName username profilePicture role')
        .populate({
            path: 'replies',
            populate: {
                path: 'user',
                select: 'firstName lastName username profilePicture role'
            }
        })
        .sort({ createdAt: -1 });
};

commentSchema.statics.findByUser = function (userId) {
    return this.find({
        user: userId,
        isActive: true,
    }).sort({ createdAt: -1 });
};

commentSchema.statics.findReplies = function (commentId) {
    return this.find({
        parentComment: commentId,
        isActive: true,
        isHidden: false,
    })
        .populate('user', 'firstName lastName username profilePicture role')
        .sort({ createdAt: 1 });
};

// Hooks
commentSchema.post("save", async function () {
    if (this.isNew && !this.parentComment) {
        await mongoose.model("Post").findByIdAndUpdate(
            this.post,
            { $addToSet: { comments: this._id } }
        );
    }
});

commentSchema.post("remove", async function () {
    if (!this.parentComment) {
        await mongoose.model("Post").findByIdAndUpdate(
            this.post,
            { $pull: { comments: this._id } }
        );
    }
});

const Comment = mongoose.model("Comment", commentSchema);
export { Comment, COMMENT_TYPES };


