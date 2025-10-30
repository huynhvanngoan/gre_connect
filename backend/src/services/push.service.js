import admin from "firebase-admin";
import { ENV } from "../config/env.js";

// ============================================
// FIREBASE INITIALIZATION
// ============================================

// Initialize Firebase Admin SDK
// You need to download your service account key from Firebase Console
// and set the path in your environment variables
try {
    if (ENV.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const serviceAccount = require(ENV.FIREBASE_SERVICE_ACCOUNT_PATH);
        
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        
        console.log("✅ Firebase Admin initialized successfully");
    } else {
        console.warn("⚠️ Firebase service account path not configured");
    }
} catch (error) {
    console.error("❌ Firebase initialization error:", error.message);
}

// ============================================
// DEVICE TOKEN STORAGE
// ============================================

// In production, store device tokens in MongoDB
// For now, we'll assume they're stored in the User model
// user.deviceTokens = [{ token: string, platform: 'ios' | 'android', deviceId: string }]

// ============================================
// SEND PUSH NOTIFICATION
// ============================================

/**
 * Send push notification to a single device token
 */
export const sendPushNotification = async (token, notification, data = {}) => {
    try {
        if (!admin.apps.length) {
            console.warn("Firebase not initialized. Skipping push notification.");
            return { success: false, error: "Firebase not initialized" };
        }

        const message = {
            token,
            notification: {
                title: notification.title,
                body: notification.message,
                imageUrl: notification.image,
            },
            data: {
                ...data,
                notificationId: notification._id?.toString() || '',
                type: notification.type || 'default',
                actionUrl: notification.actionUrl || '',
                click_action: 'FLUTTER_NOTIFICATION_CLICK', // For Flutter/React Native
            },
            // Android specific options
            android: {
                priority: notification.priority === 'high' ? 'high' : 'normal',
                notification: {
                    channelId: 'default',
                    sound: 'default',
                    priority: notification.priority === 'high' ? 'high' : 'default',
                    defaultSound: true,
                    defaultVibrateTimings: true,
                },
            },
            // iOS specific options
            apns: {
                payload: {
                    aps: {
                        alert: {
                            title: notification.title,
                            body: notification.message,
                        },
                        sound: 'default',
                        badge: data.badge || 0,
                    },
                },
            },
        };

        const response = await admin.messaging().send(message);
        
        console.log("✅ Push notification sent successfully:", response);
        return { success: true, messageId: response };
        
    } catch (error) {
        console.error("❌ Push notification error:", error);
        
        // Handle invalid token errors
        if (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
            return { success: false, error: 'Invalid token', shouldRemoveToken: true };
        }
        
        return { success: false, error: error.message };
    }
};

// ============================================
// SEND TO MULTIPLE DEVICES
// ============================================

/**
 * Send push notification to multiple device tokens
 */
export const sendPushNotificationToMultipleDevices = async (tokens, notification, data = {}) => {
    try {
        if (!admin.apps.length || tokens.length === 0) {
            return { success: false, error: "Firebase not initialized or no tokens" };
        }

        const message = {
            notification: {
                title: notification.title,
                body: notification.message,
                imageUrl: notification.image,
            },
            data: {
                ...data,
                notificationId: notification._id?.toString() || '',
                type: notification.type || 'default',
                actionUrl: notification.actionUrl || '',
            },
            android: {
                priority: notification.priority === 'high' ? 'high' : 'normal',
                notification: {
                    channelId: 'default',
                    sound: 'default',
                },
            },
            apns: {
                payload: {
                    aps: {
                        alert: {
                            title: notification.title,
                            body: notification.message,
                        },
                        sound: 'default',
                        badge: data.badge || 0,
                    },
                },
            },
            tokens, // Array of tokens
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        
        console.log(`✅ Sent ${response.successCount} notifications successfully`);
        console.log(`❌ ${response.failureCount} notifications failed`);
        
        // Check for invalid tokens
        const invalidTokens = [];
        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const error = resp.error;
                    if (error.code === 'messaging/invalid-registration-token' ||
                        error.code === 'messaging/registration-token-not-registered') {
                        invalidTokens.push(tokens[idx]);
                    }
                }
            });
        }
        
        return {
            success: true,
            successCount: response.successCount,
            failureCount: response.failureCount,
            invalidTokens,
        };
        
    } catch (error) {
        console.error("❌ Bulk push notification error:", error);
        return { success: false, error: error.message };
    }
};

// ============================================
// SEND TO USER
// ============================================

/**
 * Send push notification to a user (all their devices)
 */
export const sendPushToUser = async (user, notification, data = {}) => {
    if (!user.deviceTokens || user.deviceTokens.length === 0) {
        return { success: false, error: "User has no device tokens" };
    }

    const tokens = user.deviceTokens
        .filter(dt => dt.token && dt.isActive !== false)
        .map(dt => dt.token);

    if (tokens.length === 0) {
        return { success: false, error: "No active device tokens" };
    }

    const result = await sendPushNotificationToMultipleDevices(tokens, notification, data);
    
    // Remove invalid tokens from user
    if (result.invalidTokens && result.invalidTokens.length > 0) {
        user.deviceTokens = user.deviceTokens.filter(
            dt => !result.invalidTokens.includes(dt.token)
        );
        await user.save();
    }
    
    return result;
};

// ============================================
// SEND TO MULTIPLE USERS
// ============================================

/**
 * Send push notification to multiple users
 */
export const sendPushToMultipleUsers = async (users, notification, data = {}) => {
    const results = {
        successCount: 0,
        failureCount: 0,
        users: [],
    };

    for (const user of users) {
        const result = await sendPushToUser(user, notification, data);
        
        if (result.success) {
            results.successCount += result.successCount || 0;
            results.failureCount += result.failureCount || 0;
        } else {
            results.failureCount++;
        }
        
        results.users.push({
            userId: user._id,
            success: result.success,
            error: result.error,
        });
    }

    return results;
};

// ============================================
// TOPIC-BASED NOTIFICATIONS
// ============================================

/**
 * Send notification to a topic (e.g., all students in a class)
 */
export const sendToTopic = async (topic, notification, data = {}) => {
    try {
        if (!admin.apps.length) {
            return { success: false, error: "Firebase not initialized" };
        }

        const message = {
            notification: {
                title: notification.title,
                body: notification.message,
                imageUrl: notification.image,
            },
            data: {
                ...data,
                notificationId: notification._id?.toString() || '',
                type: notification.type || 'default',
            },
            topic,
        };

        const response = await admin.messaging().send(message);
        
        console.log("✅ Topic notification sent:", response);
        return { success: true, messageId: response };
        
    } catch (error) {
        console.error("❌ Topic notification error:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Subscribe device tokens to a topic
 */
export const subscribeToTopic = async (tokens, topic) => {
    try {
        if (!admin.apps.length) {
            return { success: false, error: "Firebase not initialized" };
        }

        const tokensArray = Array.isArray(tokens) ? tokens : [tokens];
        
        const response = await admin.messaging().subscribeToTopic(tokensArray, topic);
        
        console.log(`✅ Subscribed ${response.successCount} devices to topic: ${topic}`);
        return {
            success: true,
            successCount: response.successCount,
            failureCount: response.failureCount,
        };
        
    } catch (error) {
        console.error("❌ Topic subscription error:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Unsubscribe device tokens from a topic
 */
export const unsubscribeFromTopic = async (tokens, topic) => {
    try {
        if (!admin.apps.length) {
            return { success: false, error: "Firebase not initialized" };
        }

        const tokensArray = Array.isArray(tokens) ? tokens : [tokens];
        
        const response = await admin.messaging().unsubscribeFromTopic(tokensArray, topic);
        
        console.log(`✅ Unsubscribed ${response.successCount} devices from topic: ${topic}`);
        return {
            success: true,
            successCount: response.successCount,
            failureCount: response.failureCount,
        };
        
    } catch (error) {
        console.error("❌ Topic unsubscription error:", error);
        return { success: false, error: error.message };
    }
};

// ============================================
// DEVICE TOKEN MANAGEMENT
// ============================================

/**
 * Register device token for a user
 */
export const registerDeviceToken = async (user, token, platform, deviceId) => {
    // Check if token already exists
    const existingToken = user.deviceTokens?.find(dt => dt.token === token);
    
    if (existingToken) {
        existingToken.lastUsed = new Date();
        existingToken.isActive = true;
    } else {
        if (!user.deviceTokens) {
            user.deviceTokens = [];
        }
        
        user.deviceTokens.push({
            token,
            platform,
            deviceId,
            isActive: true,
            registeredAt: new Date(),
            lastUsed: new Date(),
        });
    }
    
    await user.save();
    
    // Subscribe to user-specific topic
    await subscribeToTopic(token, `user_${user._id}`);
    
    // Subscribe to role-based topic
    await subscribeToTopic(token, `role_${user.role}`);
    
    return { success: true };
};

/**
 * Unregister device token
 */
export const unregisterDeviceToken = async (user, token) => {
    if (!user.deviceTokens) {
        return { success: false, error: "No device tokens found" };
    }
    
    // Mark token as inactive instead of deleting
    const tokenObj = user.deviceTokens.find(dt => dt.token === token);
    if (tokenObj) {
        tokenObj.isActive = false;
    }
    
    await user.save();
    
    // Unsubscribe from topics
    await unsubscribeFromTopic(token, `user_${user._id}`);
    await unsubscribeFromTopic(token, `role_${user.role}`);
    
    return { success: true };
};

/**
 * Remove all inactive tokens older than specified days
 */
export const cleanupInactiveTokens = async (user, days = 30) => {
    if (!user.deviceTokens) {
        return { success: true, removed: 0 };
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const before = user.deviceTokens.length;
    
    user.deviceTokens = user.deviceTokens.filter(dt => {
        if (!dt.isActive && dt.lastUsed < cutoffDate) {
            return false;
        }
        return true;
    });
    
    const after = user.deviceTokens.length;
    const removed = before - after;
    
    if (removed > 0) {
        await user.save();
    }
    
    return { success: true, removed };
};

// ============================================
// DATA MESSAGES (SILENT NOTIFICATIONS)
// ============================================

/**
 * Send silent data message (no notification shown)
 */
export const sendDataMessage = async (token, data) => {
    try {
        if (!admin.apps.length) {
            return { success: false, error: "Firebase not initialized" };
        }

        const message = {
            token,
            data,
            // Android
            android: {
                priority: 'high',
            },
            // iOS - content-available for background updates
            apns: {
                payload: {
                    aps: {
                        contentAvailable: true,
                    },
                },
            },
        };

        const response = await admin.messaging().send(message);
        return { success: true, messageId: response };
        
    } catch (error) {
        console.error("❌ Data message error:", error);
        return { success: false, error: error.message };
    }
};

// ============================================
// EXPORTS
// ============================================

export default {
    sendPushNotification,
    sendPushNotificationToMultipleDevices,
    sendPushToUser,
    sendPushToMultipleUsers,
    sendToTopic,
    subscribeToTopic,
    unsubscribeFromTopic,
    registerDeviceToken,
    unregisterDeviceToken,
    cleanupInactiveTokens,
    sendDataMessage,
};