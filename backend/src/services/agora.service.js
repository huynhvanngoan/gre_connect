import agoraTokenPkg from "agora-token";
const { RtcTokenBuilder, RtcRole } = agoraTokenPkg;
import { ENV } from "../config/env.js";
import { logger } from "../utils/logger.js";

const AGORA_APP_ID = ENV.AGORA_APP_ID;
const AGORA_APP_CERTIFICATE = ENV.AGORA_APP_CERTIFICATE;

/**
 * Generate Agora RTC token for joining a channel
 * @param {string} channelName - The channel name (usually call/meeting ID)
 * @param {string|number} uid - User ID (0 for auto-generated)
 * @param {number} expirationTimeInSeconds - Token expiration time (default: 3600 = 1 hour)
 * @param {string} role - 'publisher' or 'subscriber' (default: 'publisher')
 * @returns {string} RTC token
 */
export const generateRtcToken = (
    channelName,
    uid = 0,
    expirationTimeInSeconds = 3600,
    role = 'publisher'
) => {
    if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
        logger.error("Agora App ID or Certificate not configured");
        throw new Error("Agora configuration is missing. Please set AGORA_APP_ID and AGORA_APP_CERTIFICATE in environment variables.");
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    try {
        // Convert uid to number if it's a string
        const numericUid = typeof uid === 'string' ? parseInt(uid) || 0 : uid;

        // Determine role
        const rtcRole = role === 'subscriber' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;

        // Build token with specified role
        const token = RtcTokenBuilder.buildTokenWithUid(
            AGORA_APP_ID,
            AGORA_APP_CERTIFICATE,
            channelName,
            numericUid,
            rtcRole,
            privilegeExpiredTs
        );

        logger.debug(`Generated RTC token for channel: ${channelName}, uid: ${numericUid}, role: ${role}`);
        return token;
    } catch (error) {
        logger.error("Error generating RTC token", {
            error: error.message,
            stack: error.stack,
            channelName,
            uid,
            role,
        });
        throw error;
    }
};

/**
 * Generate Agora channel name from call/meeting ID
 * @param {string} prefix - Prefix for channel (e.g., 'call', 'meeting')
 * @param {string} id - Call or meeting ID
 * @returns {string} Channel name
 */
export const generateChannelName = (prefix, id) => {
    return `${prefix}-${id}`;
};

/**
 * Validate Agora configuration
 * @returns {boolean} True if configuration is valid
 */
export const validateAgoraConfig = () => {
    if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
        logger.warn("Agora configuration is incomplete");
        return false;
    }
    return true;
};

/**
 * Get Agora App ID
 * @returns {string|null} Agora App ID
 */
export const getAgoraAppId = () => {
    return AGORA_APP_ID || null;
};

