// ============================================
// WEBRTC CONFIGURATION
// ============================================

/**
 * ICE Servers configuration
 * Using free STUN servers and sample TURN servers
 * In production, you should use your own TURN servers or services like Twilio, Agora
 */
export const getIceServers = () => {
    return [
        // Google's public STUN servers
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
        
        // Add your TURN servers here (for production)
        // {
        //     urls: "turn:your-turn-server.com:3478",
        //     username: "your-username",
        //     credential: "your-password",
        // },
    ];
};

/**
 * RTCPeerConnection configuration
 */
export const getRTCConfiguration = () => {
    return {
        iceServers: getIceServers(),
        iceCandidatePoolSize: 10,
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require",
        iceTransportPolicy: "all", // 'all' or 'relay'
    };
};

/**
 * Media constraints for getUserMedia
 */
export const getMediaConstraints = (options = {}) => {
    const {
        audio = true,
        video = true,
        videoQuality = 'hd', // 'low', 'medium', 'hd', 'fullhd'
        facingMode = 'user', // 'user' or 'environment'
    } = options;

    const constraints = {
        audio: audio ? {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
        } : false,
        video: false,
    };

    if (video) {
        const videoConstraints = {
            facingMode,
        };

        // Set video quality
        switch (videoQuality) {
            case 'low':
                videoConstraints.width = { ideal: 320 };
                videoConstraints.height = { ideal: 240 };
                videoConstraints.frameRate = { ideal: 15 };
                break;
            case 'medium':
                videoConstraints.width = { ideal: 640 };
                videoConstraints.height = { ideal: 480 };
                videoConstraints.frameRate = { ideal: 24 };
                break;
            case 'hd':
                videoConstraints.width = { ideal: 1280 };
                videoConstraints.height = { ideal: 720 };
                videoConstraints.frameRate = { ideal: 30 };
                break;
            case 'fullhd':
                videoConstraints.width = { ideal: 1920 };
                videoConstraints.height = { ideal: 1080 };
                videoConstraints.frameRate = { ideal: 30 };
                break;
            default:
                videoConstraints.width = { ideal: 1280 };
                videoConstraints.height = { ideal: 720 };
        }

        constraints.video = videoConstraints;
    }

    return constraints;
};

/**
 * Screen share constraints
 */
export const getScreenShareConstraints = () => {
    return {
        video: {
            cursor: "always",
            displaySurface: "monitor",
            frameRate: { ideal: 30 },
        },
        audio: false, // Usually don't capture system audio
    };
};

// ============================================
// PEER CONNECTION MANAGEMENT
// ============================================

/**
 * Peer connection pool to manage multiple connections
 */
class PeerConnectionManager {
    constructor() {
        this.connections = new Map();
    }

    /**
     * Create new peer connection
     */
    createPeerConnection(userId, callId, callbacks = {}) {
        const configuration = getRTCConfiguration();
        const pc = new RTCPeerConnection(configuration);

        // Store connection
        const key = `${callId}-${userId}`;
        this.connections.set(key, pc);

        // Setup event handlers
        this.setupPeerConnectionHandlers(pc, userId, callId, callbacks);

        return pc;
    }

    /**
     * Setup peer connection event handlers
     */
    setupPeerConnectionHandlers(pc, userId, callId, callbacks) {
        // ICE candidate event
        pc.onicecandidate = (event) => {
            if (event.candidate && callbacks.onIceCandidate) {
                callbacks.onIceCandidate(event.candidate, userId);
            }
        };

        // Track event (when remote stream is received)
        pc.ontrack = (event) => {
            if (callbacks.onTrack) {
                callbacks.onTrack(event.streams[0], userId);
            }
        };

        // Connection state change
        pc.onconnectionstatechange = () => {
            console.log(`Connection state (${userId}):`, pc.connectionState);
            
            if (callbacks.onConnectionStateChange) {
                callbacks.onConnectionStateChange(pc.connectionState, userId);
            }

            // Clean up on close
            if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
                this.closePeerConnection(userId, callId);
            }
        };

        // ICE connection state change
        pc.oniceconnectionstatechange = () => {
            console.log(`ICE connection state (${userId}):`, pc.iceConnectionState);
            
            if (callbacks.onIceConnectionStateChange) {
                callbacks.onIceConnectionStateChange(pc.iceConnectionState, userId);
            }
        };

        // Negotiation needed
        pc.onnegotiationneeded = async () => {
            if (callbacks.onNegotiationNeeded) {
                await callbacks.onNegotiationNeeded(userId);
            }
        };
    }

    /**
     * Get peer connection
     */
    getPeerConnection(userId, callId) {
        const key = `${callId}-${userId}`;
        return this.connections.get(key);
    }

    /**
     * Close peer connection
     */
    closePeerConnection(userId, callId) {
        const key = `${callId}-${userId}`;
        const pc = this.connections.get(key);
        
        if (pc) {
            pc.close();
            this.connections.delete(key);
            console.log(`Closed peer connection: ${key}`);
        }
    }

    /**
     * Close all connections for a call
     */
    closeAllConnectionsForCall(callId) {
        for (const [key, pc] of this.connections.entries()) {
            if (key.startsWith(callId)) {
                pc.close();
                this.connections.delete(key);
            }
        }
    }

    /**
     * Get all connections
     */
    getAllConnections() {
        return this.connections;
    }
}

// Singleton instance
const peerConnectionManager = new PeerConnectionManager();

// ============================================
// SDP (Session Description Protocol) HELPERS
// ============================================

/**
 * Create offer
 */
export const createOffer = async (peerConnection, options = {}) => {
    try {
        const offer = await peerConnection.createOffer(options);
        await peerConnection.setLocalDescription(offer);
        return offer;
    } catch (error) {
        console.error("Error creating offer:", error);
        throw error;
    }
};

/**
 * Create answer
 */
export const createAnswer = async (peerConnection) => {
    try {
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        return answer;
    } catch (error) {
        console.error("Error creating answer:", error);
        throw error;
    }
};

/**
 * Set remote description
 */
export const setRemoteDescription = async (peerConnection, description) => {
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(description));
    } catch (error) {
        console.error("Error setting remote description:", error);
        throw error;
    }
};

/**
 * Add ICE candidate
 */
export const addIceCandidate = async (peerConnection, candidate) => {
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
        console.error("Error adding ICE candidate:", error);
        throw error;
    }
};

// ============================================
// MEDIA STREAM MANAGEMENT
// ============================================

/**
 * Get user media (camera + microphone)
 */
export const getUserMedia = async (constraints) => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        return stream;
    } catch (error) {
        console.error("Error getting user media:", error);
        throw new Error(`Failed to access camera/microphone: ${error.message}`);
    }
};

/**
 * Get display media (screen share)
 */
export const getDisplayMedia = async (constraints) => {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
        return stream;
    } catch (error) {
        console.error("Error getting display media:", error);
        throw new Error(`Failed to access screen: ${error.message}`);
    }
};

/**
 * Add stream to peer connection
 */
export const addStreamToPeerConnection = (peerConnection, stream) => {
    stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
    });
};

/**
 * Replace track (for switching camera or screen share)
 */
export const replaceTrack = async (peerConnection, oldTrack, newTrack) => {
    const sender = peerConnection.getSenders().find(s => s.track === oldTrack);
    if (sender) {
        await sender.replaceTrack(newTrack);
    }
};

/**
 * Stop all tracks in a stream
 */
export const stopMediaStream = (stream) => {
    if (stream) {
        stream.getTracks().forEach(track => {
            track.stop();
        });
    }
};

/**
 * Toggle audio track
 */
export const toggleAudioTrack = (stream, enabled) => {
    if (stream) {
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = enabled;
        }
    }
};

/**
 * Toggle video track
 */
export const toggleVideoTrack = (stream, enabled) => {
    if (stream) {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = enabled;
        }
    }
};

// ============================================
// DEVICE MANAGEMENT
// ============================================

/**
 * Get available media devices
 */
export const getMediaDevices = async () => {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        return {
            audioInputs: devices.filter(d => d.kind === 'audioinput'),
            audioOutputs: devices.filter(d => d.kind === 'audiooutput'),
            videoInputs: devices.filter(d => d.kind === 'videoinput'),
        };
    } catch (error) {
        console.error("Error enumerating devices:", error);
        throw error;
    }
};

/**
 * Switch camera
 */
export const switchCamera = async (stream, facingMode = 'environment') => {
    try {
        const videoTrack = stream.getVideoTracks()[0];
        videoTrack.stop();

        const constraints = getMediaConstraints({
            audio: false,
            video: true,
            facingMode,
        });

        const newStream = await getUserMedia(constraints);
        const newVideoTrack = newStream.getVideoTracks()[0];

        return newVideoTrack;
    } catch (error) {
        console.error("Error switching camera:", error);
        throw error;
    }
};

/**
 * Change audio input device
 */
export const changeAudioInputDevice = async (deviceId) => {
    try {
        const constraints = {
            audio: { deviceId: { exact: deviceId } },
            video: false,
        };

        const stream = await getUserMedia(constraints);
        return stream.getAudioTracks()[0];
    } catch (error) {
        console.error("Error changing audio device:", error);
        throw error;
    }
};

// ============================================
// RECORDING
// ============================================

/**
 * Start recording a stream
 */
export const startRecording = (stream, options = {}) => {
    const {
        mimeType = 'video/webm;codecs=vp9',
        videoBitsPerSecond = 2500000,
    } = options;

    const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond,
    });

    const chunks = [];

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            chunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        // Return blob and URL for download/upload
        return { blob, url };
    };

    mediaRecorder.start(1000); // Record in 1-second chunks
    return mediaRecorder;
};

/**
 * Stop recording
 */
export const stopRecording = (mediaRecorder) => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
};

// ============================================
// STATS & MONITORING
// ============================================

/**
 * Get connection stats
 */
export const getConnectionStats = async (peerConnection) => {
    try {
        const stats = await peerConnection.getStats();
        const report = {};

        stats.forEach(stat => {
            if (stat.type === 'inbound-rtp' && stat.mediaType === 'video') {
                report.videoInbound = {
                    bytesReceived: stat.bytesReceived,
                    packetsReceived: stat.packetsReceived,
                    packetsLost: stat.packetsLost,
                    framesDecoded: stat.framesDecoded,
                    frameRate: stat.framesPerSecond,
                };
            }
            
            if (stat.type === 'outbound-rtp' && stat.mediaType === 'video') {
                report.videoOutbound = {
                    bytesSent: stat.bytesSent,
                    packetsSent: stat.packetsSent,
                    framesEncoded: stat.framesEncoded,
                    frameRate: stat.framesPerSecond,
                };
            }
            
            if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
                report.connection = {
                    currentRoundTripTime: stat.currentRoundTripTime,
                    availableOutgoingBitrate: stat.availableOutgoingBitrate,
                };
            }
        });

        return report;
    } catch (error) {
        console.error("Error getting stats:", error);
        return null;
    }
};

// ============================================
// EXPORTS
// ============================================

export default {
    // Configuration
    getIceServers,
    getRTCConfiguration,
    getMediaConstraints,
    getScreenShareConstraints,
    
    // Peer Connection
    peerConnectionManager,
    
    // SDP
    createOffer,
    createAnswer,
    setRemoteDescription,
    addIceCandidate,
    
    // Media
    getUserMedia,
    getDisplayMedia,
    addStreamToPeerConnection,
    replaceTrack,
    stopMediaStream,
    toggleAudioTrack,
    toggleVideoTrack,
    
    // Devices
    getMediaDevices,
    switchCamera,
    changeAudioInputDevice,
    
    // Recording
    startRecording,
    stopRecording,
    
    // Stats
    getConnectionStats,
};