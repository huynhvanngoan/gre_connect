import { HTTP_STATUS } from "./constants.js";

/**
 * Find document by ID or throw 404 error
 * @param {Model} Model - Mongoose model
 * @param {string} id - Document ID
 * @param {string} message - Custom error message
 * @returns {Promise<Document>} Found document
 */
export const findOr404 = async (Model, id, message) => {
  const doc = await Model.findById(id);
  if (!doc) {
    const error = new Error(message || `${Model.modelName} not found`);
    error.statusCode = HTTP_STATUS.NOT_FOUND;
    throw error;
  }
  return doc;
};

/**
 * Check if user has permission to access resource
 * @param {Object} user - User object
 * @param {Object} resource - Resource object
 * @param {string} ownerField - Field name for owner (default: "user")
 * @returns {boolean} True if user can access
 */
export const canAccessResource = (user, resource, ownerField = "user") => {
  if (!user || !resource) return false;

  // Staff can access anything
  if (user.role === "staff" || user.role === "admin") {
    return true;
  }

  // Check ownership
  const ownerId = resource[ownerField];
  if (!ownerId) return false;

  return ownerId.toString() === user._id.toString();
};

/**
 * Create paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Data array
 * @param {Object} pagination - Pagination info
 * @returns {Object} Response object
 */
export const createPaginatedResponse = (data, pagination) => {
  return {
    data,
    pagination: {
      page: parseInt(pagination.page) || 1,
      limit: parseInt(pagination.limit) || 10,
      total: pagination.total || 0,
      pages: Math.ceil((pagination.total || 0) / (parseInt(pagination.limit) || 10)),
    },
  };
};

/**
 * Validate ObjectId format
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid
 */
export const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Deep clone object (for sanitization)
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }

  if (typeof obj === "object") {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }

  return obj;
};
