import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { apiService } from '@/services/api';
import {
  initAgora,
  joinChannel,
  leaveChannel,
  enableLocalAudio,
  enableLocalVideo,
  switchCamera,
  setupLocalVideo,
  setupRemoteVideo,
  destroyAgora,
  registerEventHandlers,
  getAgoraEngine,
  setEnableSpeakerphone,
} from '@/services/agora';
import { useSocket } from './useSocket';

export interface CallData {
  _id: string;
  callType: 'voice' | 'audio' | 'video';
  status: string;
  conversation: any;
  caller: any;
  participants: Array<{
    user: any;
    status: string;
    video: boolean;
    audio: boolean;
  }>;
  token?: string;
  channelName?: string;
  agoraAppId?: string;
}

interface UseCallOptions {
  callId?: string;
  onCallEnded?: () => void;
  onCallDeclined?: () => void;
}

export function useCall(options: UseCallOptions = {}) {
  const { callId, onCallEnded, onCallDeclined } = options;
  const { socket } = useSocket();
  
  const [call, setCall] = useState<CallData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);
  const [remoteUsers, setRemoteUsers] = useState<Array<{ uid: string | number; user: any }>>([]);
  
  const localVideoRef = useRef<any>(null);
  const remoteVideoRefs = useRef<Map<string | number, any>>(new Map());
  const agoraInitialized = useRef(false);

  // Initialize Agora lazily (only when needed)
  const initializeAgoraIfNeeded = useCallback(async (appId: string) => {
    if (agoraInitialized.current) {
      return;
    }

    try {
      await initAgora(appId);
      agoraInitialized.current = true;

      // Register event handlers
      registerEventHandlers({
        onJoinChannelSuccess: (connection: any, elapsed: number) => {
          console.log(`[Call] Joined channel with uid ${connection?.localUid || 'unknown'}`);
        },
        onUserJoined: (connection: any, remoteUid: number, elapsed: number) => {
          console.log(`[Call] User ${remoteUid} joined`);
          // Setup remote video view when user joins
          const container = remoteVideoRefs.current.get(remoteUid);
          if (container) {
            setupRemoteVideo(remoteUid, container);
          }
          // Add to remote users list
          setRemoteUsers(prev => [...prev, { uid: remoteUid, user: null }]);
        },
        onUserOffline: (connection: any, remoteUid: number, reason: number) => {
          console.log(`[Call] User ${remoteUid} left: ${reason}`);
          setRemoteUsers(prev => prev.filter(u => u.uid !== remoteUid));
        },
        onError: (err: any, msg: string) => {
          console.error('[Call] Agora error:', err, msg);
          setError(`Agora error: ${msg}`);
        },
      });
    } catch (err: any) {
      console.error('[Call] Failed to initialize Agora:', err);
      // Don't set error state - allow app to continue without Agora
      console.warn('[Call] Continuing without Agora support');
    }
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (agoraInitialized.current) {
        leaveChannel().catch(console.error);
        destroyAgora().catch(console.error);
      }
    };
  }, []);

  // Listen to socket events
  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (data: any) => {
      console.log('[Call] Incoming call:', data);
      // Navigate to call screen with call data
      router.push(`/call/${data.callId}`);
    };

    const handleCallEnded = (data: any) => {
      console.log('[Call] Call ended:', data);
      if (onCallEnded) {
        onCallEnded();
      }
      router.back();
    };

    const handleCallDeclined = (data: any) => {
      console.log('[Call] Call declined:', data);
      if (onCallDeclined) {
        onCallDeclined();
      }
    };

    const handleUserJoinedCall = (data: any) => {
      console.log('[Call] User joined call:', data);
      setRemoteUsers(prev => [...prev, { uid: data.userId, user: data.user }]);
    };

    socket.on('incoming-call', handleIncomingCall);
    socket.on('call-ended', handleCallEnded);
    socket.on('call-declined', handleCallDeclined);
    socket.on('user-joined-call', handleUserJoinedCall);

    return () => {
      socket.off('incoming-call', handleIncomingCall);
      socket.off('call-ended', handleCallEnded);
      socket.off('call-declined', handleCallDeclined);
      socket.off('user-joined-call', handleUserJoinedCall);
    };
  }, [socket, onCallEnded, onCallDeclined]);

  // Load call data if callId provided
  useEffect(() => {
    if (!callId) return;

    const loadCall = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiService.getCall(callId);
        if (response.success && response.data) {
          // Handle both response.data.call and direct response.data
          const callData = (response.data as any)?.call || response.data;
          setCall(callData);
        } else {
          setError(response.error || 'Failed to load call');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadCall();
  }, [callId]);

  // Initiate call
  const initiateCall = useCallback(async (
    conversationId: string | undefined,
    recipientId: string | undefined,
    callType: 'voice' | 'audio' | 'video'
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.initiateCall({
        conversationId,
        recipientId,
        callType,
      });

      if (response.success && response.data) {
        // Handle both response.data.call and direct response.data
        const callData = (response.data as any)?.call || response.data;
        
        // Ensure callData has _id
        if (!callData?._id) {
          console.error('[Call] No call ID in response:', callData);
          throw new Error('Call ID not found in response');
        }
        
        console.log('[Call] Call initiated successfully:', callData._id);
        setCall(callData);
        
        // Navigate to call screen immediately
        router.push(`/call/${callData._id}`);
        
        return callData;
      } else {
        throw new Error(response.error || 'Failed to initiate call');
      }
    } catch (err: any) {
      setError(err.message);
      Alert.alert('Call Error', err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Join call
  const joinCall = useCallback(async (callIdParam?: string, options?: { video?: boolean; audio?: boolean }) => {
    const targetCallId = callIdParam || callId;
    if (!targetCallId) {
      throw new Error('Call ID is required');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.joinCall(targetCallId, options);
      
      if (response.success && response.data) {
        // Handle both response.data.call and direct response.data
        const callData = (response.data as any)?.call || response.data;
        setCall(callData);
        
        // Join Agora channel
        if (callData.token && callData.channelName && callData.agoraAppId) {
          // Initialize Agora if needed
          await initializeAgoraIfNeeded(callData.agoraAppId);
          
          if (agoraInitialized.current) {
            const currentUserId = 0; // Will be auto-generated by Agora
            await joinChannel(callData.token, callData.channelName, currentUserId);
            
            // Setup local video if video call
            if (callData.callType === 'video' && localVideoRef.current) {
              await setupLocalVideo(localVideoRef.current);
            }
          }
        }
        
        return callData;
      } else {
        throw new Error(response.error || 'Failed to join call');
      }
    } catch (err: any) {
      setError(err.message);
      Alert.alert('Join Call Error', err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [callId]);

  // End call
  const endCall = useCallback(async (reason?: string) => {
    if (!call) return;

    setIsLoading(true);

    try {
      await apiService.endCall(call._id, reason);
      await leaveChannel();
      
      // Store conversation ID before clearing call
      const conversationId = call.conversation?._id || call.conversation;
      setCall(null);
      
      if (onCallEnded) {
        onCallEnded();
      } else {
        // Fallback: navigate to chat detail if conversation exists
        if (conversationId) {
          router.replace(`/messages/${conversationId}`);
        } else {
          router.back();
        }
      }
    } catch (err: any) {
      setError(err.message);
      Alert.alert('End Call Error', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [call, onCallEnded]);

  // Decline call
  const declineCall = useCallback(async () => {
    if (!call) return;

    setIsLoading(true);

    try {
      await apiService.declineCall(call._id);
      setCall(null);
      
      if (onCallDeclined) {
        onCallDeclined();
      }
      
      router.back();
    } catch (err: any) {
      setError(err.message);
      Alert.alert('Decline Call Error', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [call, onCallDeclined]);

  // Toggle audio
  const toggleAudio = useCallback(async () => {
    if (!call || !agoraInitialized.current) return;

    try {
      const newMutedState = !isMuted;
      await enableLocalAudio(!newMutedState);
      setIsMuted(newMutedState);
      
      // Update backend
      await apiService.toggleCallMedia(call._id, 'audio');
    } catch (err: any) {
      console.error('[Call] Failed to toggle audio:', err);
    }
  }, [call, isMuted]);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (!call || !agoraInitialized.current) return;

    try {
      const newVideoState = !isVideoEnabled;
      await enableLocalVideo(newVideoState);
      setIsVideoEnabled(newVideoState);
      
      // Update backend
      await apiService.toggleCallMedia(call._id, 'video');
    } catch (err: any) {
      console.error('[Call] Failed to toggle video:', err);
    }
  }, [call, isVideoEnabled]);

  // Switch camera
  const handleSwitchCamera = useCallback(async () => {
    if (!agoraInitialized.current) return;

    try {
      await switchCamera();
    } catch (err: any) {
      console.error('[Call] Failed to switch camera:', err);
    }
  }, []);

  // Toggle speaker
  const toggleSpeaker = useCallback(async () => {
    if (!agoraInitialized.current) return;

    try {
      const newSpeakerState = !isSpeakerEnabled;
      await setEnableSpeakerphone(newSpeakerState);
      setIsSpeakerEnabled(newSpeakerState);
    } catch (err: any) {
      console.error('[Call] Failed to toggle speaker:', err);
      Alert.alert('Error', err.message || 'Failed to toggle speaker');
    }
  }, [isSpeakerEnabled]);

  return {
    call,
    isLoading,
    error,
    isMuted,
    isVideoEnabled,
    isSpeakerEnabled,
    remoteUsers,
    localVideoRef,
    remoteVideoRefs,
    initiateCall,
    joinCall,
    endCall,
    declineCall,
    toggleAudio,
    toggleVideo,
    toggleSpeaker,
    switchCamera: handleSwitchCamera,
    setLocalVideoRef: (ref: any) => {
      localVideoRef.current = ref;
    },
    setRemoteVideoRef: (uid: string | number, ref: any) => {
      remoteVideoRefs.current.set(uid, ref);
    },
  };
}

