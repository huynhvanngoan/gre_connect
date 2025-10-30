import asyncHandler from "express-async-handler";

// Require one or more permissions from req.user.permissions
export const requirePermissions = (required) => {
    const requiredList = Array.isArray(required) ? required : [required];

    return asyncHandler(async (req, res, next) => {
        if (!req.user) {
            res.status(401);
            throw new Error("Not authorized");
        }

        const userPermissions = req.user.permissions || [];
        const hasAll = requiredList.every((p) => userPermissions.includes(p));

        if (!hasAll) {
            res.status(403);
            throw new Error("Insufficient permissions");
        }

        next();
    });
};

// Require at least one permission
export const requireAnyPermission = (possible) => {
    const list = Array.isArray(possible) ? possible : [possible];

    return asyncHandler(async (req, res, next) => {
        if (!req.user) {
            res.status(401);
            throw new Error("Not authorized");
        }

        const userPermissions = req.user.permissions || [];
        const hasAny = list.some((p) => userPermissions.includes(p));

        if (!hasAny) {
            res.status(403);
            throw new Error("Insufficient permissions");
        }

        next();
    });
};


