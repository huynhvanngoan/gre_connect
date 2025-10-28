import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Enum cho các role
const ROLES = {
    STUDENT: "student",
    TEACHER: "teacher", 
    STAFF: "staff"
};

// Enum cho permissions
const PERMISSIONS = {
    // Post permissions
    CREATE_ANNOUNCEMENT: "create_announcement",
    CREATE_HOMEWORK: "create_homework",
    DELETE_ANY_POST: "delete_any_post",
    PIN_POST: "pin_post",
    
    // User permissions
    MANAGE_USERS: "manage_users",
    VIEW_ALL_USERS: "view_all_users",
    ASSIGN_ROLES: "assign_roles",
    
    // Class permissions
    MANAGE_CLASSES: "manage_classes",
    VIEW_ALL_CLASSES: "view_all_classes",
    
    // Grade permissions
    GRADE_HOMEWORK: "grade_homework",
    VIEW_GRADES: "view_grades",
};

const userSchema = new mongoose.Schema(
    {
        clerkId: {
            type: String,
            required: true,
            unique: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        firstName: {
            type: String,
            required: true,
            trim: true,
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
        },
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        // Role field
        role: {
            type: String,
            enum: Object.values(ROLES),
            default: ROLES.STUDENT,
            required: true,
        },
        profilePicture: {
            type: String,
            default: "",
        },
        bannerImage: {
            type: String,
            default: "",
        },
        bio: {
            type: String,
            default: "",
            maxLength: 500,
        },
        location: {
            type: String,
            default: "",
        },
        // Thông tin liên hệ
        phone: {
            type: String,
            sparse: true,
        },
        // Thông tin bổ sung cho từng role
        roleSpecificData: {
            // Cho học sinh
            studentId: {
                type: String,
                sparse: true,
            },
            grade: {
                type: String,
            },
            classId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Class",
            },
            parentContact: {
                name: String,
                phone: String,
                email: String,
            },
            enrollmentDate: {
                type: Date,
            },
            
            // Cho giáo viên
            teacherId: {
                type: String,
                sparse: true,
            },
            department: {
                type: String,
            },
            subjects: [{
                type: String,
            }],
            classesTeaching: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Class",
            }],
            hireDate: {
                type: Date,
            },
            
            // Cho staff
            staffId: {
                type: String,
                sparse: true,
            },
            position: {
                type: String,
            },
            department: {
                type: String,
            },
        },
        // Permissions/capabilities
        permissions: [{
            type: String,
            enum: Object.values(PERMISSIONS),
        }],
        // Social features
        followers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        following: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        // Bookmarks/saved posts
        savedPosts: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
        }],
        // Notifications settings
        notificationSettings: {
            email: {
                type: Boolean,
                default: true,
            },
            push: {
                type: Boolean,
                default: true,
            },
            announcements: {
                type: Boolean,
                default: true,
            },
            homework: {
                type: Boolean,
                default: true,
            },
            comments: {
                type: Boolean,
                default: true,
            },
            likes: {
                type: Boolean,
                default: false,
            },
        },
        // Privacy settings
        privacySettings: {
            profileVisibility: {
                type: String,
                enum: ["public", "friends", "private"],
                default: "public",
            },
            showEmail: {
                type: Boolean,
                default: false,
            },
            showPhone: {
                type: Boolean,
                default: false,
            },
            allowMessages: {
                type: String,
                enum: ["everyone", "following", "none"],
                default: "everyone",
            },
        },
        // Trạng thái tài khoản
        isActive: {
            type: Boolean,
            default: true,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        isBanned: {
            type: Boolean,
            default: false,
        },
        banReason: {
            type: String,
        },
        bannedUntil: {
            type: Date,
        },
        // Activity tracking
        lastLogin: {
            type: Date,
        },
        loginCount: {
            type: Number,
            default: 0,
        },
        // Points/gamification
        points: {
            type: Number,
            default: 0,
        },
        badges: [{
            name: String,
            icon: String,
            earnedAt: {
                type: Date,
                default: Date.now,
            },
        }],
    },
    { 
        timestamps: true,
    }
);

// Indexes
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ "roleSpecificData.classId": 1 });
userSchema.index({ "roleSpecificData.studentId": 1 });
userSchema.index({ "roleSpecificData.teacherId": 1 });

// Virtual fields
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('followersCount').get(function() {
    return this.followers.length;
});

userSchema.virtual('followingCount').get(function() {
    return this.following.length;
});

// Methods để kiểm tra role
userSchema.methods.isStudent = function() {
    return this.role === ROLES.STUDENT;
};

userSchema.methods.isTeacher = function() {
    return this.role === ROLES.TEACHER;
};

userSchema.methods.isStaff = function() {
    return this.role === ROLES.STAFF;
};

// Method để kiểm tra permission
userSchema.methods.hasPermission = function(permission) {
    return this.permissions.includes(permission);
};

// Method để kiểm tra có thể xem profile
userSchema.methods.canViewProfile = function(viewer) {
    if (!viewer) return this.privacySettings.profileVisibility === "public";
    if (this._id.equals(viewer._id)) return true;
    if (this.privacySettings.profileVisibility === "public") return true;
    if (this.privacySettings.profileVisibility === "friends") {
        return this.followers.some(id => id.equals(viewer._id));
    }
    return false;
};

// Method follow/unfollow
userSchema.methods.follow = async function(userIdToFollow) {
    if (this._id.equals(userIdToFollow)) {
        throw new Error("Cannot follow yourself");
    }
    
    if (!this.following.includes(userIdToFollow)) {
        this.following.push(userIdToFollow);
        await this.save();
        
        // Add to follower's followers list
        await mongoose.model("User").findByIdAndUpdate(
            userIdToFollow,
            { $addToSet: { followers: this._id } }
        );
    }
    return this;
};

userSchema.methods.unfollow = async function(userIdToUnfollow) {
    this.following = this.following.filter(id => !id.equals(userIdToUnfollow));
    await this.save();
    
    // Remove from follower's followers list
    await mongoose.model("User").findByIdAndUpdate(
        userIdToUnfollow,
        { $pull: { followers: this._id } }
    );
    return this;
};

// Method save/unsave post
userSchema.methods.savePost = async function(postId) {
    if (!this.savedPosts.includes(postId)) {
        this.savedPosts.push(postId);
        await this.save();
    }
    return this;
};

userSchema.methods.unsavePost = async function(postId) {
    this.savedPosts = this.savedPosts.filter(id => !id.equals(postId));
    await this.save();
    return this;
};

// Method cập nhật login
userSchema.methods.recordLogin = async function() {
    this.lastLogin = new Date();
    this.loginCount += 1;
    await this.save();
};

// Method thêm points
userSchema.methods.addPoints = async function(points, reason) {
    this.points += points;
    await this.save();
    
    // Log activity (có thể tạo Activity model riêng)
    return this;
};

// Method thêm badge
userSchema.methods.addBadge = async function(name, icon) {
    const exists = this.badges.some(badge => badge.name === name);
    if (!exists) {
        this.badges.push({ name, icon });
        await this.save();
    }
    return this;
};

// Static methods
userSchema.statics.findByRole = function(role, options = {}) {
    return this.find({ role, isActive: true, ...options });
};

userSchema.statics.findStudentsByClass = function(classId) {
    return this.find({
        role: ROLES.STUDENT,
        "roleSpecificData.classId": classId,
        isActive: true,
    });
};

userSchema.statics.findTeachersBySubject = function(subject) {
    return this.find({
        role: ROLES.TEACHER,
        "roleSpecificData.subjects": subject,
        isActive: true,
    });
};

userSchema.statics.searchUsers = function(query, viewer) {
    const searchRegex = new RegExp(query, "i");
    return this.find({
        $or: [
            { firstName: searchRegex },
            { lastName: searchRegex },
            { username: searchRegex },
        ],
        isActive: true,
    });
};

// Middleware: Set default permissions based on role
userSchema.pre("save", function(next) {
    if (this.isNew || this.isModified("role")) {
        switch(this.role) {
            case ROLES.TEACHER:
                this.permissions = [
                    PERMISSIONS.CREATE_ANNOUNCEMENT,
                    PERMISSIONS.CREATE_HOMEWORK,
                    PERMISSIONS.GRADE_HOMEWORK,
                    PERMISSIONS.VIEW_ALL_CLASSES,
                ];
                break;
            case ROLES.STAFF:
                this.permissions = [
                    PERMISSIONS.CREATE_ANNOUNCEMENT,
                    PERMISSIONS.PIN_POST,
                    PERMISSIONS.MANAGE_USERS,
                    PERMISSIONS.VIEW_ALL_USERS,
                    PERMISSIONS.MANAGE_CLASSES,
                    PERMISSIONS.VIEW_ALL_CLASSES,
                ];
                break;
            case ROLES.STUDENT:
                this.permissions = [
                    PERMISSIONS.VIEW_GRADES,
                ];
                break;
        }
    }
    next();
});

const User = mongoose.model("User", userSchema);

export default User;
export { ROLES, PERMISSIONS };