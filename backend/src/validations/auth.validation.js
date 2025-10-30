import { body, param } from "express-validator";
import { ROLES } from "../utils/constants.js";

// ============================================
// SYNC USER VALIDATION
// ============================================

export const validateSyncUser = [
    body("role")
        .optional()
        .isIn(Object.values(ROLES))
        .withMessage(`Role must be one of: ${Object.values(ROLES).join(", ")}`),
];

// ============================================
// REFRESH TOKEN VALIDATION
// ============================================

export const validateRefreshToken = [
    body("token")
        .notEmpty()
        .withMessage("Token is required")
        .isString()
        .withMessage("Token must be a string"),
];

// ============================================
// DELETE ACCOUNT VALIDATION
// ============================================

export const validateDeleteAccount = [
    body("confirmPassword")
        .optional()
        .isString()
        .withMessage("Confirmation password must be a string"),
    
    body("reason")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Reason must not exceed 500 characters"),
];

// ============================================
// EXPORTS
// ============================================

export default {
    validateSyncUser,
    validateRefreshToken,
    validateDeleteAccount,
};