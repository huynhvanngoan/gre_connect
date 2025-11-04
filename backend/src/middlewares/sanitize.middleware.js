import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize HTML content to prevent XSS attacks
 * Only allows safe tags and attributes
 */
export const sanitizeHTML = (dirty) => {
    if (!dirty || typeof dirty !== "string") {
        return "";
    }

    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "a"],
        ALLOWED_ATTR: ["href", "target"],
        ALLOW_DATA_ATTR: false,
    });
};

/**
 * Middleware to sanitize request body
 */
export const sanitizeBody = (req, res, next) => {
    if (req.body && typeof req.body === "object") {
        // Recursively sanitize string fields
        const sanitizeObject = (obj) => {
            for (const key in obj) {
                if (typeof obj[key] === "string") {
                    // Only sanitize fields that might contain HTML
                    if (key.toLowerCase().includes("content") ||
                        key.toLowerCase().includes("description") ||
                        key.toLowerCase().includes("message") ||
                        key.toLowerCase().includes("text")) {
                        obj[key] = sanitizeHTML(obj[key]);
                    }
                } else if (typeof obj[key] === "object" && obj[key] !== null) {
                    sanitizeObject(obj[key]);
                }
            }
        };

        sanitizeObject(req.body);
    }

    next();
};

