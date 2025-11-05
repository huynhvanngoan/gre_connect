import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Image,
    Alert,
    Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Lazy load expo-av to handle module resolution
let Audio: any = null;
const loadAudio = async () => {
    if (Audio) return Audio;
    try {
        const audioModule = await import('expo-av');
        Audio = audioModule.Audio;
        return Audio;
    } catch (error) {
        console.warn('expo-av not available:', error);
        return null;
    }
};
import { useCall } from '@/hooks/useCall';
import { useAuth } from '@clerk/clerk-expo';
import { useApi } from '@/hooks/useApi';
import { apiService } from '@/services/api';

// Lazy load RtcSurfaceView to avoid errors when native module is not linked
// Use a factory function to prevent module loading until actually needed
let RtcSurfaceView: any = null;
let AgoraComponentsLoaded = false;
let AgoraLoadError: any = null;
let loadPromise: Promise<any> | null = null;

async function loadAgoraComponents() {
    // If already tried and failed, don't try again
    if (AgoraLoadError) {
        return null;
    }

    // If already loaded, return it
    if (AgoraComponentsLoaded && RtcSurfaceView) {
        return RtcSurfaceView;
    }

    // If a load is in progress, wait for it
    if (loadPromise) {
        return loadPromise;
    }

    // Start loading
    loadPromise = (async () => {
        try {
            // Use dynamic import - this will only execute when called
            const agoraModule = await import('react-native-agora');
            RtcSurfaceView = agoraModule.RtcSurfaceView;
            AgoraComponentsLoaded = true;
            return RtcSurfaceView;
        } catch (error: any) {
            console.warn('[Call] Agora components not available:', error?.message || error);
            AgoraLoadError = error;
            // Return null to use fallback UI
            return null;
        } finally {
            loadPromise = null;
        }
    })();

    return loadPromise;
}

export default function CallScreen() {
    const { id: callId } = useLocalSearchParams<{ id: string }>();
    const { userId: clerkUserId } = useAuth();

    // Get current user's database ID
    const { data: currentUser } = useApi(
        () => apiService.getCurrentUser(),
        [],
        { enabled: !!clerkUserId }
    );
    const currentUserId = (currentUser as any)?._id || null;

    // Store conversation ID for navigation after call ends
    const conversationIdRef = useRef<string | null>(null);

    // Navigate back to chat detail after call ends
    const handleCallEnded = () => {
        // Navigate to chat detail if conversation exists, otherwise go back
        const conversationId = conversationIdRef.current;
        if (conversationId) {
            router.replace(`/messages/${conversationId}`);
        } else {
            router.back();
        }
    };

    const {
        call,
        isLoading,
        error,
        isMuted,
        isVideoEnabled,
        isSpeakerEnabled,
        remoteUsers,
        localVideoRef,
        remoteVideoRefs,
        joinCall,
        endCall,
        declineCall,
        toggleAudio,
        toggleVideo,
        toggleSpeaker,
        switchCamera,
        setLocalVideoRef,
        setRemoteVideoRef,
    } = useCall({ callId, onCallEnded: handleCallEnded });

    // Update conversation ID ref when call changes
    useEffect(() => {
        if (call?.conversation?._id || call?.conversation) {
            conversationIdRef.current = call.conversation._id || call.conversation;
        }
    }, [call]);

    const [VideoComponent, setVideoComponent] = useState<any>(null);
    const [isLoadingVideoComponent, setIsLoadingVideoComponent] = useState(true);
    const ringtoneSound = useRef<any>(null);

    // Determine if current user is the caller
    const isCaller = currentUserId && call?.caller?._id &&
        call.caller._id.toString() === currentUserId.toString();
    const isVideoCall = call?.callType === 'video';
    const isRinging = call?.status === 'ringing' || call?.status === 'initiated';

    // Get the other participant (not the caller)
    const otherParticipant = call?.participants?.find((p: any) => {
        const participantId = p.user?._id?.toString() || p.user?.toString();
        return participantId && participantId !== currentUserId?.toString() &&
            participantId !== call?.caller?._id?.toString();
    });
    const recipient = otherParticipant?.user || (isCaller ? null : call?.caller);

    // Play ringtone for incoming calls
    const hapticIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        let isMounted = true;

        const startHapticPattern = () => {
            // Clear existing interval
            if (hapticIntervalRef.current) {
                clearInterval(hapticIntervalRef.current);
            }
            // Vibrate immediately
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            // Then vibrate every 2 seconds
            hapticIntervalRef.current = setInterval(() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }, 2000);
        };

        const stopHapticPattern = () => {
            if (hapticIntervalRef.current) {
                clearInterval(hapticIntervalRef.current);
                hapticIntervalRef.current = null;
            }
        };

        const playRingtone = async () => {
            try {
                // Try to load Audio module
                const AudioModule = await loadAudio();

                if (AudioModule) {
                    // Set audio mode for calls
                    await AudioModule.setAudioModeAsync({
                        playsInSilentModeIOS: true,
                        staysActiveInBackground: true,
                        shouldDuckAndroid: true,
                    });

                    // Use system notification sound as ringtone
                    // For a better ringtone, you can add a local file to assets/sounds/ringtone.mp3
                    // For now, we'll use a simple approach with a short beep pattern
                    try {
                        // Try to use a simple online ringtone
                        // In production, replace with a local file: require('@/assets/sounds/ringtone.mp3')
                        const { sound } = await AudioModule.Sound.createAsync(
                            // Using a simple notification sound URL
                            // You should replace this with a proper ringtone file
                            { uri: 'https://notificationsounds.com/storage/sounds/file-sounds-1016-doorbell.mp3' },
                            {
                                shouldPlay: true,
                                isLooping: true,
                                volume: 1.0,
                            }
                        );

                        if (isMounted) {
                            ringtoneSound.current = sound;
                        }
                    } catch (loadError) {
                        console.warn('Ringtone loading failed, using haptics', loadError);
                        // Fallback to haptics
                        startHapticPattern();
                    }
                } else {
                    // Fallback: Use haptics if Audio is not available
                    startHapticPattern();
                }
            } catch (error) {
                console.warn('Failed to play ringtone:', error);
                // Fallback: Use haptics
                startHapticPattern();
            }
        };

        const stopRingtone = async () => {
            try {
                if (ringtoneSound.current) {
                    await ringtoneSound.current.stopAsync();
                    await ringtoneSound.current.unloadAsync();
                    ringtoneSound.current = null;
                }
            } catch (error) {
                console.warn('Failed to stop ringtone:', error);
            }
            stopHapticPattern();
        };

        // Play ringtone for incoming calls (receiver)
        if (isRinging && !isCaller && call) {
            playRingtone();
        } else {
            stopRingtone();
        }

        // Cleanup on unmount
        return () => {
            isMounted = false;
            stopRingtone();
            stopHapticPattern();
        };
    }, [isRinging, isCaller, call]);

    // Load Agora video component lazily
    useEffect(() => {
        if (isVideoCall && !VideoComponent) {
            loadAgoraComponents().then((Component) => {
                setVideoComponent(Component);
                setIsLoadingVideoComponent(false);
            }).catch(() => {
                setIsLoadingVideoComponent(false);
            });
        } else if (!isVideoCall) {
            setIsLoadingVideoComponent(false);
        }
    }, [isVideoCall, VideoComponent]);

    // Auto-join call when screen loads (only for caller)
    useEffect(() => {
        if (callId && call && !isRinging && isCaller) {
            joinCall(callId, {
                video: isVideoCall,
                audio: true,
            }).catch(console.error);
        }
    }, [callId, call, isRinging, isVideoCall, isCaller, joinCall]);

    // Handle incoming call
    const handleAnswer = async () => {
        try {
            // Stop ringtone/haptics
            if (ringtoneSound.current) {
                try {
                    await ringtoneSound.current.stopAsync();
                    await ringtoneSound.current.unloadAsync();
                    ringtoneSound.current = null;
                } catch (e) {
                    console.warn('Error stopping ringtone:', e);
                }
            }
            if (hapticIntervalRef.current) {
                clearInterval(hapticIntervalRef.current);
                hapticIntervalRef.current = null;
            }

            await joinCall(callId, {
                video: isVideoCall,
                audio: true,
            });
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
    };

    const handleDecline = async () => {
        try {
            // Stop ringtone/haptics
            if (ringtoneSound.current) {
                try {
                    await ringtoneSound.current.stopAsync();
                    await ringtoneSound.current.unloadAsync();
                    ringtoneSound.current = null;
                } catch (e) {
                    console.warn('Error stopping ringtone:', e);
                }
            }
            if (hapticIntervalRef.current) {
                clearInterval(hapticIntervalRef.current);
                hapticIntervalRef.current = null;
            }

            // Store conversation ID before declining (call may be cleared after decline)
            const conversationId = conversationIdRef.current;
            await declineCall();
            // Navigate to chat detail if conversation exists
            if (conversationId) {
                router.replace(`/messages/${conversationId}`);
            } else {
                router.back();
            }
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
    };

    const handleEndCall = async () => {
        try {
            await endCall();
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
    };

    if (isLoading && !call) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" />
                <View style={styles.centerContent}>
                    <Text style={styles.loadingText}>Loading call...</Text>
                </View>
            </View>
        );
    }

    if (error && !call) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" />
                <View style={styles.centerContent}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.button} onPress={() => router.back()}>
                        <Text style={styles.buttonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Incoming call screen
    if (isRinging && !isCaller) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" />

                {/* Background with blur effect */}
                <View style={styles.backgroundBlur}>
                    {call?.caller?.profilePicture && (
                        <Image
                            source={{ uri: call.caller.profilePicture }}
                            style={styles.backgroundImage}
                            blurRadius={10}
                        />
                    )}
                </View>

                <View style={styles.centerContent}>
                    {/* Avatar */}
                    <View style={styles.avatarContainer}>
                        {call?.caller?.profilePicture ? (
                            <Image
                                source={{ uri: call.caller.profilePicture }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Feather name="user" size={60} color="#fff" />
                            </View>
                        )}
                    </View>

                    {/* Caller name */}
                    <Text style={styles.callerName}>
                        {call?.caller?.firstName} {call?.caller?.lastName}
                    </Text>
                    <Text style={styles.callType}>
                        {isVideoCall ? 'Video' : 'Voice'} Call
                    </Text>
                    <Text style={styles.callStatus}>Incoming call...</Text>

                    {/* Action buttons */}
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.declineButton]}
                            onPress={handleDecline}
                        >
                            <Feather name="phone-off" size={24} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, styles.answerButton]}
                            onPress={handleAnswer}
                        >
                            <Feather
                                name={isVideoCall ? 'video' : 'phone'}
                                size={24}
                                color="#fff"
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    // Outgoing call screen (for caller - waiting for receiver to answer)
    if (isRinging && isCaller) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" />

                {/* Background with blur effect */}
                <View style={styles.backgroundBlur}>
                    {recipient?.profilePicture && (
                        <Image
                            source={{ uri: recipient.profilePicture }}
                            style={styles.backgroundImage}
                            blurRadius={10}
                        />
                    )}
                </View>

                <View style={styles.centerContent}>
                    {/* Avatar */}
                    <View style={styles.avatarContainer}>
                        {recipient?.profilePicture ? (
                            <Image
                                source={{ uri: recipient.profilePicture }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Feather name="user" size={60} color="#fff" />
                            </View>
                        )}
                    </View>

                    {/* Recipient name */}
                    <Text style={styles.callerName}>
                        {recipient?.firstName} {recipient?.lastName}
                    </Text>
                    <Text style={styles.callType}>
                        {isVideoCall ? 'Video' : 'Voice'} Call
                    </Text>
                    <Text style={styles.callStatus}>Calling...</Text>

                    {/* Cancel button */}
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.declineButton]}
                            onPress={handleEndCall}
                        >
                            <Feather name="phone-off" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    // Active call screen
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Remote video views */}
            {isVideoCall && (
                <View style={styles.videoContainer}>
                    {isLoadingVideoComponent ? (
                        <View style={styles.remoteVideoPlaceholder}>
                            <Text style={styles.remoteVideoPlaceholderText}>Loading video...</Text>
                        </View>
                    ) : VideoComponent ? (
                        remoteUsers.map((remote) => {
                            const uid = typeof remote.uid === 'string' ? parseInt(remote.uid, 10) : remote.uid;
                            return (
                                <View key={remote.uid} style={styles.remoteVideoWrapper}>
                                    <VideoComponent
                                        canvas={{ uid: isNaN(uid) ? 0 : uid }}
                                        style={styles.remoteVideo}
                                        ref={(ref: any) => setRemoteVideoRef(remote.uid, ref)}
                                    />
                                </View>
                            );
                        })
                    ) : (
                        <View style={styles.remoteVideoPlaceholder}>
                            <Text style={styles.remoteVideoPlaceholderText}>Video not available</Text>
                        </View>
                    )}

                    {/* Fallback when no remote video */}
                    {remoteUsers.length === 0 && (
                        <View style={styles.remoteVideoPlaceholder}>
                            <Image
                                source={{ uri: call?.caller?.profilePicture || '' }}
                                style={styles.remoteVideoPlaceholderImage}
                            />
                            <Text style={styles.remoteVideoPlaceholderText}>
                                {call?.caller?.firstName} {call?.caller?.lastName}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* Local video (picture-in-picture) */}
            {isVideoCall && isVideoEnabled && VideoComponent && (
                <View style={styles.localVideoContainer}>
                    <VideoComponent
                        canvas={{ uid: 0 }}
                        style={styles.localVideo}
                        ref={setLocalVideoRef}
                    />
                </View>
            )}

            {/* Audio call UI */}
            {!isVideoCall && (
                <View style={styles.audioCallContainer}>
                    <View style={styles.avatarContainer}>
                        {recipient?.profilePicture ? (
                            <Image
                                source={{ uri: recipient.profilePicture }}
                                style={styles.avatar}
                            />
                        ) : call?.caller?.profilePicture ? (
                            <Image
                                source={{ uri: call.caller.profilePicture }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Feather name="user" size={60} color="#fff" />
                            </View>
                        )}
                    </View>
                    <Text style={styles.callerName}>
                        {recipient?.firstName && recipient?.lastName
                            ? `${recipient.firstName} ${recipient.lastName}`
                            : call?.caller?.firstName && call?.caller?.lastName
                                ? `${call.caller.firstName} ${call.caller.lastName}`
                                : 'Call'}
                    </Text>
                    <Text style={styles.callStatus}>
                        {call?.status === 'ongoing' ? 'Connected' : 'Calling...'}
                    </Text>
                </View>
            )}

            {/* Controls */}
            <View style={styles.controlsContainer}>
                <TouchableOpacity
                    style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                    onPress={toggleAudio}
                >
                    <Feather name={isMuted ? 'mic-off' : 'mic'} size={24} color="#fff" />
                </TouchableOpacity>

                {/* Speaker button - show for voice calls or video calls */}
                {!isVideoCall && (
                    <TouchableOpacity
                        style={[styles.controlButton, isSpeakerEnabled && styles.controlButtonActive]}
                        onPress={toggleSpeaker}
                    >
                        <Feather name={isSpeakerEnabled ? 'volume-2' : 'volume-x'} size={24} color="#fff" />
                    </TouchableOpacity>
                )}

                {isVideoCall && (
                    <>
                        <TouchableOpacity
                            style={[styles.controlButton, !isVideoEnabled && styles.controlButtonActive]}
                            onPress={toggleVideo}
                        >
                            <Feather name={isVideoEnabled ? 'video' : 'video-off'} size={24} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.controlButton}
                            onPress={switchCamera}
                        >
                            <Feather name="refresh-cw" size={24} color="#fff" />
                        </TouchableOpacity>
                    </>
                )}

                <TouchableOpacity
                    style={[styles.controlButton, styles.endCallButton]}
                    onPress={handleEndCall}
                >
                    <Feather name="phone-off" size={24} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        color: '#fff',
        fontSize: 18,
    },
    errorText: {
        color: '#fff',
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#1DA1F2',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    backgroundBlur: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#1a1a1a',
    },
    backgroundImage: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.3,
    },
    avatarContainer: {
        marginBottom: 30,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: '#fff',
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#fff',
    },
    callerName: {
        color: '#fff',
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    callType: {
        color: '#ccc',
        fontSize: 16,
        marginBottom: 40,
    },
    callStatus: {
        color: '#ccc',
        fontSize: 14,
        marginTop: 10,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 40,
        marginTop: 40,
    },
    actionButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
    },
    declineButton: {
        backgroundColor: '#EF4444',
    },
    answerButton: {
        backgroundColor: '#10B981',
    },
    videoContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    remoteVideoWrapper: {
        flex: 1,
    },
    remoteVideo: {
        flex: 1,
    },
    remoteVideoPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
    },
    remoteVideoPlaceholderImage: {
        width: 150,
        height: 150,
        borderRadius: 75,
        marginBottom: 20,
    },
    remoteVideoPlaceholderText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '600',
    },
    localVideoContainer: {
        position: 'absolute',
        top: 60,
        right: 20,
        width: 120,
        height: 160,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#fff',
    },
    localVideo: {
        flex: 1,
    },
    audioCallContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    controlsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 30,
        paddingHorizontal: 20,
        gap: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    controlButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlButtonActive: {
        backgroundColor: '#EF4444',
    },
    endCallButton: {
        backgroundColor: '#EF4444',
    },
});

