import asyncHandler from "express-async-handler";
import Class from "../../models/class.model.js";
import { Notification } from "../../models/notification.model.js";
import { findOr404 } from "../../utils/helpers.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS, NOTIFICATION_TYPES } from "../../utils/constants.js";
import { canAccessClass, canManageMaterials } from "../../services/class.service.js";

/**
 * @desc    Add material to class
 * @route   POST /api/classes/:classId/materials
 * @access  Private (Teachers)
 */
export const addMaterial = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { title, description, category } = req.body;

    const classData = await findOr404(Class, classId, "Class not found");

    // Check permissions
    if (!canManageMaterials(classData, req.user)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You don't have permission to add materials");
    }

    // Prepare material data
    const materialData = {
        title,
        description,
        category: category || "other",
        uploadedBy: req.user._id,
    };

    // Handle file upload
    if (req.file) {
        materialData.fileUrl = req.file.path;
        materialData.fileName = req.file.originalname;
        materialData.fileType = req.file.mimetype;
    }

    // Add material
    await classData.addMaterial(materialData);

    // Notify students
    const students = classData.students.filter(s => s.status === "active");
    for (const student of students) {
        await Notification.createNotification({
            recipientId: student.student,
            senderId: req.user._id,
            type: NOTIFICATION_TYPES.CLASS_MATERIAL_ADDED,
            title: "New Material",
            message: `New material added to ${classData.name}: ${title}`,
            actionUrl: `/classes/${classId}`,
        });
    }

    successResponse(res, HTTP_STATUS.CREATED, "Material added successfully", null);
});

/**
 * @desc    Remove material from class
 * @route   DELETE /api/classes/:classId/materials/:materialId
 * @access  Private (Teachers)
 */
export const removeMaterial = asyncHandler(async (req, res) => {
    const { classId, materialId } = req.params;

    const classData = await findOr404(Class, classId, "Class not found");

    // Check permissions
    if (!canManageMaterials(classData, req.user)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You don't have permission to remove materials");
    }

    // Remove material
    await classData.removeMaterial(materialId);

    successResponse(res, HTTP_STATUS.OK, "Material removed successfully", null);
});

/**
 * @desc    Get all materials for a class
 * @route   GET /api/classes/:classId/materials
 * @access  Private
 */
export const getClassMaterials = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { category } = req.query;

    const classData = await Class.findById(classId)
        .populate("materials.uploadedBy", "firstName lastName username");

    if (!classData) {
        return errorResponse(res, HTTP_STATUS.NOT_FOUND, "Class not found");
    }

    // Check access
    if (!canAccessClass(classData, req.user)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You don't have access to this class");
    }

    // Filter by category if provided
    let materials = classData.materials;
    if (category) {
        materials = materials.filter(m => m.category === category);
    }

    successResponse(res, HTTP_STATUS.OK, "Materials retrieved successfully", {
        materials,
        count: materials.length,
    });
});

