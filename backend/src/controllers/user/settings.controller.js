import asyncHandler from "express-async-handler";
import User from "../../models/user.model.js";

/**
 * @desc    Get notification settings
 * @route   GET /api/users/me/settings/notifications
 * @access  Private
 */
export const getNotificationSettings = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    res.status(200).json({
        success: true,
        data: user.notificationSettings,
    });
});

/**
 * @desc    Update notification settings
 * @route   PUT /api/users/me/settings/notifications
 * @access  Private
 */
export const updateNotificationSettings = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    // Update only provided fields
    Object.keys(req.body).forEach(key => {
        if (user.notificationSettings[key] !== undefined) {
            user.notificationSettings[key] = req.body[key];
        }
    });
    
    await user.save();
    
    res.status(200).json({
        success: true,
        message: "Notification settings updated successfully",
        data: user.notificationSettings,
    });
});

/**
 * @desc    Get privacy settings
 * @route   GET /api/users/me/settings/privacy
 * @access  Private
 */
export const getPrivacySettings = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    res.status(200).json({
        success: true,
        data: user.privacySettings,
    });
});

/**
 * @desc    Update privacy settings
 * @route   PUT /api/users/me/settings/privacy
 * @access  Private
 */
export const updatePrivacySettings = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    // Update only provided fields
    Object.keys(req.body).forEach(key => {
        if (user.privacySettings[key] !== undefined) {
            user.privacySettings[key] = req.body[key];
        }
    });
    
    await user.save();
    
    res.status(200).json({
        success: true,
        message: "Privacy settings updated successfully",
        data: user.privacySettings,
    });
});

