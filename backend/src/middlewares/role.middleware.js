import asyncHandler from "express-async-handler";

export const requireRoles = (allowed) => {
    const roles = Array.isArray(allowed) ? allowed : [allowed];

    return asyncHandler(async (req, res, next) => {
        if (!req.user) {
            res.status(401);
            throw new Error("Not authorized");
        }

        if (!roles.includes(req.user.role)) {
            res.status(403);
            throw new Error("Insufficient role");
        }

        next();
    });
};


