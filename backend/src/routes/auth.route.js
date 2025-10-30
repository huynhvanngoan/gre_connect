import express from "express";
import {
    syncUser,
    checkAuth,
    logout,
    refreshToken,
    deleteAccount,
} from "../controllers/auth.controller.js";

import { requireAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * @route   POST /api/auth/sync
 * @desc    Sync user from Clerk to MongoDB
 * @access  Public (requires Clerk token)
 */
router.post("/sync", syncUser);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh authentication token
 * @access  Public
 */
router.post("/refresh", refreshToken);

// ============================================
// PROTECTED ROUTES
// ============================================

/**
 * @route   GET /api/auth/check
 * @desc    Check authentication status
 * @access  Private
 */
router.get("/check", requireAuth, checkAuth);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post("/logout", requireAuth, logout);

/**
 * @route   DELETE /api/auth/account
 * @desc    Delete user account completely
 * @access  Private
 */
router.delete("/account", requireAuth, deleteAccount);

export default router;