// Agora.io Service Wrapper for React Native
// Lazy import to avoid errors when native module is not linked
let createAgoraRtcEngine: any = null;

let rtcEngine: any = null;
let agoraAppId: string | null = null;

// Event handlers
let eventHandlers: any = {};

/**
 * Lazy load Agora module
 */
async function loadAgoraModule() {
  if (createAgoraRtcEngine) {
    return createAgoraRtcEngine;
  }

  try {
    // Use dynamic import with try-catch to handle linking errors gracefully
    const agoraModule = await import('react-native-agora');
    createAgoraRtcEngine = agoraModule.createAgoraRtcEngine;
    return createAgoraRtcEngine;
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.warn('[Agora] Native module not available:', {
      error: errorMsg,
      hint: 'This is expected if native module is not linked. App will work without Agora features.',
    });
    
    // Don't throw - return null to allow graceful degradation
    // The calling code should handle null gracefully
    return null;
  }
}

/**
 * Initialize Agora RTC Engine
 */
export async function initAgora(appId: string): Promise<any> {
  if (rtcEngine && agoraAppId === appId) {
    return rtcEngine;
  }

  if (!appId) {
    throw new Error('Agora App ID is required');
  }

  try {
    // Lazy load the module
    const createEngine = await loadAgoraModule();
    
    if (!createEngine) {
      throw new Error('Agora native module is not available. Please ensure the app is built with native dependencies.');
    }
    
    // For react-native-agora v4.x
    rtcEngine = createEngine();
    await rtcEngine.initialize({ appId: appId });
    agoraAppId = appId;

    // Enable audio/video
    await rtcEngine.enableAudio();
    await rtcEngine.enableVideo();

    // Set default video encoder configuration
    await rtcEngine.setVideoEncoderConfiguration({
      dimensions: { width: 640, height: 480 },
      frameRate: 15,
      bitrate: 400,
      orientationMode: 0,
    } as any);

    // Register event handlers
    if (rtcEngine && Object.keys(eventHandlers).length > 0) {
      Object.keys(eventHandlers).forEach((event) => {
        (rtcEngine as any).on(event, eventHandlers[event]);
      });
    }

    console.log('[Agora] Engine initialized successfully');
    return rtcEngine;
  } catch (error) {
    console.error('[Agora] Failed to initialize engine:', error);
    throw error;
  }
}

/**
 * Get Agora RTC Engine instance
 */
export function getAgoraEngine(): any {
  return rtcEngine;
}

/**
 * Register event handlers
 */
export function registerEventHandlers(handlers: any) {
  eventHandlers = { ...eventHandlers, ...handlers };
  
  if (rtcEngine) {
    Object.keys(handlers).forEach((event) => {
      (rtcEngine as any).on(event, handlers[event]);
    });
  }
}

/**
 * Join Agora channel
 */
export async function joinChannel(
  token: string,
  channelName: string,
  uid: string | number = 0
): Promise<void> {
  if (!rtcEngine) {
    throw new Error('Agora engine not initialized. Call initAgora() first.');
  }

  try {
    const numericUid = typeof uid === 'string' ? parseInt(uid, 10) : uid;
    const finalUid = isNaN(numericUid) ? 0 : numericUid;

    await rtcEngine.joinChannel(token, channelName, finalUid, {
      channelProfile: 0, // Communication
      clientRoleType: 1, // Broadcaster
    });
    console.log(`[Agora] Joined channel: ${channelName} with uid: ${finalUid}`);
  } catch (error) {
    console.error('[Agora] Failed to join channel:', error);
    throw error;
  }
}

/**
 * Leave Agora channel
 */
export async function leaveChannel(): Promise<void> {
  if (!rtcEngine) {
    return;
  }

  try {
    await rtcEngine.leaveChannel();
    console.log('[Agora] Left channel');
  } catch (error) {
    console.error('[Agora] Failed to leave channel:', error);
    throw error;
  }
}

/**
 * Enable/disable local audio
 */
export async function enableLocalAudio(enabled: boolean): Promise<void> {
  if (!rtcEngine) {
    throw new Error('Agora engine not initialized');
  }

  try {
    await rtcEngine.enableLocalAudio(enabled);
    console.log(`[Agora] Local audio ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.error('[Agora] Failed to toggle local audio:', error);
    throw error;
  }
}

/**
 * Enable/disable local video
 */
export async function enableLocalVideo(enabled: boolean): Promise<void> {
  if (!rtcEngine) {
    throw new Error('Agora engine not initialized');
  }

  try {
    await rtcEngine.enableLocalVideo(enabled);
    console.log(`[Agora] Local video ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.error('[Agora] Failed to toggle local video:', error);
    throw error;
  }
}

/**
 * Switch camera (front/back)
 */
export async function switchCamera(): Promise<void> {
  if (!rtcEngine) {
    throw new Error('Agora engine not initialized');
  }

  try {
    await rtcEngine.switchCamera();
    console.log('[Agora] Camera switched');
  } catch (error) {
    console.error('[Agora] Failed to switch camera:', error);
    throw error;
  }
}

/**
 * Set speakerphone on/off
 */
export async function setEnableSpeakerphone(enabled: boolean): Promise<void> {
  if (!rtcEngine) {
    throw new Error('Agora engine not initialized');
  }

  try {
    await rtcEngine.setEnableSpeakerphone(enabled);
    console.log(`[Agora] Speakerphone ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.error('[Agora] Failed to toggle speakerphone:', error);
    throw error;
  }
}

/**
 * Setup local video view
 */
export async function setupLocalVideo(container: any): Promise<void> {
  if (!rtcEngine) {
    throw new Error('Agora engine not initialized');
  }

  try {
    await rtcEngine.startPreview();
    await rtcEngine.setupLocalVideo({
      uid: 0,
      view: container,
    } as any);
    console.log('[Agora] Local video setup complete');
  } catch (error) {
    console.error('[Agora] Failed to setup local video:', error);
    throw error;
  }
}

/**
 * Setup remote video view
 */
export async function setupRemoteVideo(uid: string | number, container: any): Promise<void> {
  if (!rtcEngine) {
    throw new Error('Agora engine not initialized');
  }

  try {
    // Convert uid to number if string
    const numericUid = typeof uid === 'string' ? parseInt(uid, 10) : uid;
    const finalUid = isNaN(numericUid) ? 0 : numericUid;

    await rtcEngine.setupRemoteVideo({
      uid: finalUid,
      view: container,
    } as any);
    console.log(`[Agora] Remote video setup for uid: ${finalUid}`);
  } catch (error) {
    console.error('[Agora] Failed to setup remote video:', error);
    throw error;
  }
}

/**
 * Destroy Agora engine
 */
export async function destroyAgora(): Promise<void> {
  if (!rtcEngine) {
    return;
  }

  try {
    await rtcEngine.leaveChannel();
    await rtcEngine.release();
    rtcEngine = null;
    agoraAppId = null;
    eventHandlers = {};
    console.log('[Agora] Engine destroyed');
  } catch (error) {
    console.error('[Agora] Failed to destroy engine:', error);
    throw error;
  }
}

