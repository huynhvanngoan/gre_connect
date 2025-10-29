import { validationResult } from "express-validator";

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        // Format errors
        const formattedErrors = errors.array().map(error => ({
            field: error.path || error.param,
            message: error.msg,
            value: error.value,
        }));
        
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: formattedErrors,
        });
    }
    
    next();
};

/**
 * Apply validation middleware to route handlers
 */
export const validate = (validations) => {
    return [
        ...validations,
        handleValidationErrors,
    ];
};