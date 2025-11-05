import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Image,
    Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useCall } from '@/hooks/useCall';
import { RtcSurfaceView } from 'react-native-agora';

export default function CallScreen() {
    const { id: callId } = useLocalSearchParams<{ id: string }>();
    const {
        call,
        isLoading,
        error,
        isMuted,
        isVideoEnabled,
        remoteUsers,
        localVideoRef,
        remoteVideoRefs,
        joinCall,
        endCall,
        declineCall,
        toggleAudio,
        toggleVideo,
        switchCamera,
        setLocalVideoRef,
        setRemoteVideoRef,
    } = useCall({ callId, onCallEnded: () => router.back() });

    const isCaller = call?.caller?._id === callId; // You'll need to get current user ID
    const isVideoCall = call?.callType === 'video';
    const isRinging = call?.status === 'ringing' || call?.status === 'initiated';

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
            await declineCall();
            router.back();
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

    // Active call screen
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Remote video views */}
            {isVideoCall && (
                <View style={styles.videoContainer}>
                    {remoteUsers.map((remote) => {
                        const uid = typeof remote.uid === 'string' ? parseInt(remote.uid, 10) : remote.uid;
                        return (
                            <View key={remote.uid} style={styles.remoteVideoWrapper}>
                                <RtcSurfaceView
                                    canvas={{ uid: isNaN(uid) ? 0 : uid }}
                                    style={styles.remoteVideo}
                                    ref={(ref) => setRemoteVideoRef(remote.uid, ref)}
                                />
                            </View>
                        );
                    })}

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
            {isVideoCall && isVideoEnabled && (
                <View style={styles.localVideoContainer}>
                    <RtcSurfaceView
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
                    <Text style={styles.callerName}>
                        {call?.caller?.firstName} {call?.caller?.lastName}
                    </Text>
                    <Text style={styles.callStatus}>Calling...</Text>
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

