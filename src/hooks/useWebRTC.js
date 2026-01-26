import { useRef, useEffect, useState, useCallback } from 'react';

export function useWebRTC(socket, isInCall, callRole, remotePeerId, onCallEnd) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMicMuted, setIsMicMuted] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  
  const peerRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingSignalsRef = useRef([]);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

  // Initialize SimplePeer
  const initPeer = useCallback((initiator) => {
    if (peerRef.current) {
      return peerRef.current;
    }

    if (!window.SimplePeer) {
      console.error('[WebRTC] SimplePeer not loaded');
      return null;
    }

    const stream = localStreamRef.current || new MediaStream();
    
    const peer = new window.SimplePeer({
      initiator: Boolean(initiator),
      trickle: true,
      stream: stream.getTracks().length > 0 ? stream : undefined,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    peer.on('signal', (signal) => {
      if (remotePeerId && socket) {
        socket.emit('webrtc_signal', { signal, to: remotePeerId });
      } else {
        pendingSignalsRef.current.push(signal);
      }
    });

    peer.on('connect', () => {
      console.log('[WebRTC] Peer connected');
      setConnectionState('connected');
      reconnectAttemptsRef.current = 0;
    });

    peer.on('stream', (stream) => {
      console.log('[WebRTC] Received remote stream');
      remoteStreamRef.current = stream;
      setRemoteStream(stream);
      
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play().catch(err => {
          console.warn('[WebRTC] Audio autoplay blocked:', err);
        });
      }
    });

    peer.on('track', (track, stream) => {
      console.log('[WebRTC] Received track:', track.kind);
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
        setRemoteStream(remoteStreamRef.current);
      }
      remoteStreamRef.current.addTrack(track);
      
      if (track.kind === 'video' && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
      if (track.kind === 'audio' && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current;
        remoteAudioRef.current.play().catch(err => {
          console.warn('[WebRTC] Audio autoplay blocked:', err);
        });
      }
    });

    peer.on('close', () => {
      console.log('[WebRTC] Peer connection closed');
      if (reconnectAttemptsRef.current < maxReconnectAttempts && isInCall) {
        reconnectAttemptsRef.current++;
        console.log(`[WebRTC] Attempting reconnect ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
        setTimeout(() => {
          if (isInCall && socket) {
            destroyPeer();
            socket.emit('call_restart', { to: remotePeerId });
            setTimeout(() => initPeer(callRole === 'caller'), 500);
          }
        }, 1000 * reconnectAttemptsRef.current);
      } else {
        setConnectionState('disconnected');
        if (onCallEnd) onCallEnd();
      }
    });

    peer.on('error', (err) => {
      console.error('[WebRTC] Peer error:', err);
      setConnectionState('error');
    });

    peerRef.current = peer;
    return peer;
  }, [socket, remotePeerId, isInCall, callRole, onCallEnd]);

  // Destroy peer connection
  const destroyPeer = useCallback(() => {
    if (peerRef.current) {
      try {
        peerRef.current.destroy();
      } catch (err) {
        console.warn('[WebRTC] Error destroying peer:', err);
      }
      peerRef.current = null;
    }
    pendingSignalsRef.current = [];
    reconnectAttemptsRef.current = 0;
  }, []);

  // Flush pending signals
  const flushPendingSignals = useCallback(() => {
    if (!peerRef.current || !remotePeerId || !socket) return;
    
    pendingSignalsRef.current.forEach(signal => {
      socket.emit('webrtc_signal', { signal, to: remotePeerId });
    });
    pendingSignalsRef.current = [];
  }, [socket, remotePeerId]);

  // Get local media stream
  const getLocalStream = useCallback(async (audio = true, video = false) => {
    try {
      const constraints = {
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } : false,
        video: video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Add tracks to peer if it exists
      if (peerRef.current && stream.getTracks().length > 0) {
        stream.getTracks().forEach(track => {
          if (peerRef.current) {
            peerRef.current.addTrack(track, stream);
          }
        });
        if (callRole !== 'caller' && peerRef.current.negotiate) {
          peerRef.current.negotiate();
        }
      }

      return stream;
    } catch (err) {
      console.error('[WebRTC] Error getting local stream:', err);
      throw err;
    }
  }, [callRole]);

  // Stop local stream
  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, []);

  // Toggle microphone
  const toggleMic = useCallback(async () => {
    if (isMicMuted) {
      // Enable mic
      try {
        if (!localStreamRef.current) {
          await getLocalStream(true, isCameraEnabled);
        } else {
          const stream = await getLocalStream(true, false);
          const audioTrack = stream.getAudioTracks()[0];
          if (audioTrack && peerRef.current) {
            const existingTrack = localStreamRef.current?.getAudioTracks()[0];
            if (existingTrack && peerRef.current.replaceTrack) {
              peerRef.current.replaceTrack(existingTrack, audioTrack, localStreamRef.current);
            } else {
              peerRef.current.addTrack(audioTrack, localStreamRef.current);
            }
            if (callRole !== 'caller' && peerRef.current.negotiate) {
              peerRef.current.negotiate();
            }
          }
        }
        setIsMicMuted(false);
      } catch (err) {
        console.error('[WebRTC] Error enabling mic:', err);
        alert('Failed to enable microphone. Please check permissions.');
      }
    } else {
      // Disable mic
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => {
          track.enabled = false;
        });
      }
      setIsMicMuted(true);
    }
  }, [isMicMuted, isCameraEnabled, getLocalStream, callRole]);

  // Toggle camera
  const toggleCamera = useCallback(async () => {
    if (isCameraEnabled) {
      // Disable camera
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(track => {
          track.stop();
          if (peerRef.current && peerRef.current.removeTrack) {
            peerRef.current.removeTrack(track, localStreamRef.current);
          }
        });
      }
      setIsCameraEnabled(false);
    } else {
      // Enable camera
      try {
        if (!localStreamRef.current) {
          await getLocalStream(isMicMuted, true);
        } else {
          const stream = await getLocalStream(false, true);
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack && peerRef.current) {
            const existingTrack = localStreamRef.current?.getVideoTracks()[0];
            if (existingTrack && peerRef.current.replaceTrack) {
              peerRef.current.replaceTrack(existingTrack, videoTrack, localStreamRef.current);
            } else {
              peerRef.current.addTrack(videoTrack, localStreamRef.current);
            }
            if (callRole !== 'caller' && peerRef.current.negotiate) {
              peerRef.current.negotiate();
            }
          }
        }
        setIsCameraEnabled(true);
      } catch (err) {
        console.error('[WebRTC] Error enabling camera:', err);
        alert('Failed to enable camera. Please check permissions.');
      }
    }
  }, [isCameraEnabled, isMicMuted, getLocalStream, callRole]);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Stop screen share
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(track => {
          if (track.getSettings().displaySurface === 'monitor') {
            track.stop();
            if (peerRef.current && peerRef.current.removeTrack) {
              peerRef.current.removeTrack(track, localStreamRef.current);
            }
          }
        });
      }
      setIsScreenSharing(false);
      
      // Re-enable camera if it was on
      if (isCameraEnabled) {
        await toggleCamera();
      }
    } else {
      // Start screen share
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });

        const screenTrack = screenStream.getVideoTracks()[0];
        
        if (!localStreamRef.current) {
          localStreamRef.current = new MediaStream();
        }

        // Replace camera track with screen track
        const existingVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (existingVideoTrack && peerRef.current?.replaceTrack) {
          peerRef.current.replaceTrack(existingVideoTrack, screenTrack, localStreamRef.current);
        } else {
          localStreamRef.current.addTrack(screenTrack);
          if (peerRef.current) {
            peerRef.current.addTrack(screenTrack, localStreamRef.current);
          }
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }

        screenTrack.onended = () => {
          setIsScreenSharing(false);
        };

        setIsScreenSharing(true);
        if (isCameraEnabled) {
          setIsCameraEnabled(false);
        }

        if (callRole !== 'caller' && peerRef.current?.negotiate) {
          peerRef.current.negotiate();
        }
      } catch (err) {
        console.error('[WebRTC] Error sharing screen:', err);
        alert('Failed to share screen. Please check permissions.');
      }
    }
  }, [isScreenSharing, isCameraEnabled, callRole, toggleCamera]);

  // Initialize peer when call starts
  useEffect(() => {
    if (isInCall && socket && remotePeerId) {
      console.log('[WebRTC] Initializing peer connection');
      setConnectionState('connecting');
      const peer = initPeer(callRole === 'caller');
      
      if (peer) {
        flushPendingSignals();
      }

      return () => {
        destroyPeer();
      };
    } else if (!isInCall) {
      destroyPeer();
      stopLocalStream();
      setRemoteStream(null);
      setConnectionState('disconnected');
    }
  }, [isInCall, socket, remotePeerId, callRole, initPeer, flushPendingSignals, destroyPeer, stopLocalStream]);

  // Handle WebRTC signals from server
  useEffect(() => {
    if (!socket) return;

    const handleSignal = (payload) => {
      if (!payload?.signal || !peerRef.current) return;
      
      try {
        peerRef.current.signal(payload.signal);
      } catch (err) {
        console.error('[WebRTC] Error processing signal:', err);
      }
    };

    socket.on('webrtc_signal', handleSignal);

    return () => {
      socket.off('webrtc_signal', handleSignal);
    };
  }, [socket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroyPeer();
      stopLocalStream();
      if (remoteStreamRef.current) {
        remoteStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [destroyPeer, stopLocalStream]);

  return {
    localStream,
    remoteStream,
    isMicMuted,
    isCameraEnabled,
    isScreenSharing,
    connectionState,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    getLocalStream,
    stopLocalStream,
  };
}
