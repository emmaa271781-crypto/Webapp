import { useRef, useEffect, useState, useCallback } from 'react';
import { checkWebRTCSupport, getOptimalConstraints, ensureAudioPlayback } from '../utils/browserCompatibility';

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
  const connectionHealthRef = useRef(null);
  const iceConnectionStateRef = useRef('new');

  // Initialize SimplePeer
  const initPeer = useCallback((initiator) => {
    if (peerRef.current) {
      return peerRef.current;
    }

    // Wait for SimplePeer to load
    if (!window.SimplePeer) {
      console.error('[WebRTC] SimplePeer not loaded, waiting...');
      const checkSimplePeer = setInterval(() => {
        if (window.SimplePeer) {
          clearInterval(checkSimplePeer);
          initPeer(initiator);
        }
      }, 100);
      setTimeout(() => clearInterval(checkSimplePeer), 5000);
      return null;
    }

    const stream = localStreamRef.current || new MediaStream();
    
    // Enhanced ICE servers for better connectivity (Discord-style)
    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ];

    const peer = new window.SimplePeer({
      initiator: Boolean(initiator),
      trickle: true,
      stream: stream.getTracks().length > 0 ? stream : undefined,
      config: {
        iceServers,
        iceCandidatePoolSize: 10, // Pre-gather more candidates
      },
      // Better browser compatibility
      sdpTransform: (sdp) => {
        // Fix for Safari and older browsers
        sdp = sdp.replace(/a=extmap-allow-mixed\r\n/g, '');
        return sdp;
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
      startConnectionHealthCheck();
    });

    // Monitor ICE connection state (Discord-style verification)
    if (peer._pc) {
      peer._pc.addEventListener('iceconnectionstatechange', () => {
        const state = peer._pc?.iceConnectionState;
        iceConnectionStateRef.current = state;
        console.log('[WebRTC] ICE connection state:', state);
        
        if (state === 'connected' || state === 'completed') {
          setConnectionState('connected');
          startConnectionHealthCheck();
        } else if (state === 'disconnected') {
          setConnectionState('connecting');
          // Try to recover
          setTimeout(() => {
            if (peer._pc && peer._pc.iceConnectionState === 'disconnected' && isInCall) {
              console.log('[WebRTC] Attempting ICE restart');
              peer._pc.restartIce();
            }
          }, 2000);
        } else if (state === 'failed') {
          setConnectionState('error');
          // Attempt recovery
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            setTimeout(() => {
              if (isInCall && socket && remotePeerId) {
                destroyPeer();
                socket.emit('call_restart', { to: remotePeerId });
                setTimeout(() => initPeer(callRole === 'caller'), 500);
              }
            }, 1000 * reconnectAttemptsRef.current);
          }
        }
      });

      peer._pc.addEventListener('connectionstatechange', () => {
        const state = peer._pc?.connectionState;
        console.log('[WebRTC] Connection state:', state);
        if (state === 'connected') {
          setConnectionState('connected');
        } else if (state === 'disconnected' || state === 'failed') {
          setConnectionState('connecting');
        }
      });
    }

    peer.on('stream', (stream) => {
      console.log('[WebRTC] Received remote stream');
      remoteStreamRef.current = stream;
      setRemoteStream(stream);
      
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        await ensureAudioPlayback(remoteAudioRef.current);
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
        await ensureAudioPlayback(remoteAudioRef.current);
      }
    });

    peer.on('close', () => {
      console.log('[WebRTC] Peer connection closed');
      setConnectionState('disconnected');
      // Don't auto-reconnect on close - let user manually reconnect if needed
      if (onCallEnd && !isInCall) {
        onCallEnd();
      }
    });

    peer.on('error', (err) => {
      console.error('[WebRTC] Peer error:', err);
      setConnectionState('error');
      
      // Try to recover from non-fatal errors
      if (reconnectAttemptsRef.current < maxReconnectAttempts && isInCall) {
        reconnectAttemptsRef.current++;
        console.log(`[WebRTC] Attempting recovery ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
        setTimeout(() => {
          if (isInCall && socket && remotePeerId) {
            destroyPeer();
            socket.emit('call_restart', { to: remotePeerId });
            setTimeout(() => {
              const newPeer = initPeer(callRole === 'caller');
              if (newPeer) {
                flushPendingSignals();
              }
            }, 500);
          }
        }, 1000 * reconnectAttemptsRef.current);
      }
    });

    peerRef.current = peer;
    return peer;
  }, [socket, remotePeerId, isInCall, callRole, onCallEnd]);

  // Destroy peer connection
  const destroyPeer = useCallback(() => {
    stopConnectionHealthCheck();
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
    iceConnectionStateRef.current = 'new';
  }, [stopConnectionHealthCheck]);

  // Flush pending signals
  const flushPendingSignals = useCallback(() => {
    if (!peerRef.current || !remotePeerId || !socket) return;
    
    pendingSignalsRef.current.forEach(signal => {
      socket.emit('webrtc_signal', { signal, to: remotePeerId });
    });
    pendingSignalsRef.current = [];
  }, [socket, remotePeerId]);

  // Connection health check (Discord-style)
  const startConnectionHealthCheck = useCallback(() => {
    if (connectionHealthRef.current) {
      clearInterval(connectionHealthRef.current);
    }

    connectionHealthRef.current = setInterval(() => {
      if (!peerRef.current?._pc) {
        clearInterval(connectionHealthRef.current);
        return;
      }

      const stats = {
        iceConnectionState: peerRef.current._pc.iceConnectionState,
        connectionState: peerRef.current._pc.connectionState,
        signalingState: peerRef.current._pc.signalingState,
      };

      // Check if connection is healthy
      if (stats.iceConnectionState === 'connected' || stats.iceConnectionState === 'completed') {
        // Connection is good
        setConnectionState('connected');
      } else if (stats.iceConnectionState === 'disconnected') {
        // Try ICE restart
        try {
          peerRef.current._pc.restartIce();
        } catch (err) {
          console.warn('[WebRTC] ICE restart failed:', err);
        }
      } else if (stats.iceConnectionState === 'failed') {
        setConnectionState('error');
        clearInterval(connectionHealthRef.current);
      }
    }, 3000); // Check every 3 seconds
  }, []);

  const stopConnectionHealthCheck = useCallback(() => {
    if (connectionHealthRef.current) {
      clearInterval(connectionHealthRef.current);
      connectionHealthRef.current = null;
    }
  }, []);

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
            try {
              peerRef.current.addTrack(track, stream);
            } catch (err) {
              console.warn('[WebRTC] Error adding track:', err);
            }
          }
        });
        // Trigger renegotiation for callee
        if (callRole !== 'caller' && peerRef.current.negotiate) {
          setTimeout(() => {
            try {
              peerRef.current.negotiate();
            } catch (err) {
              console.warn('[WebRTC] Error negotiating:', err);
            }
          }, 100);
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
          const audioTrack = localStreamRef.current.getAudioTracks()[0];
          if (audioTrack) {
            // Re-enable existing track
            audioTrack.enabled = true;
          } else {
            // Get new audio stream
            const stream = await getLocalStream(true, false);
            const newAudioTrack = stream.getAudioTracks()[0];
            if (newAudioTrack && peerRef.current) {
              const existingTrack = localStreamRef.current?.getAudioTracks()[0];
              if (existingTrack && peerRef.current.replaceTrack) {
                peerRef.current.replaceTrack(existingTrack, newAudioTrack, localStreamRef.current);
              } else {
                localStreamRef.current.addTrack(newAudioTrack);
                peerRef.current.addTrack(newAudioTrack, localStreamRef.current);
              }
              if (callRole !== 'caller' && peerRef.current.negotiate) {
                setTimeout(() => {
                  try {
                    peerRef.current.negotiate();
                  } catch (err) {
                    console.warn('[WebRTC] Negotiate error:', err);
                  }
                }, 100);
              }
            }
          }
        }
        setIsMicMuted(false);
      } catch (err) {
        console.error('[WebRTC] Error enabling mic:', err);
        alert('Failed to enable microphone. Please check permissions.');
      }
    } else {
      // Disable mic (mute)
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
      
      // Auto-enable microphone when call starts (but keep it muted initially)
      getLocalStream(true, false).then(() => {
        setIsMicMuted(true); // Start muted
        const peer = initPeer(callRole === 'caller');
        if (peer) {
          flushPendingSignals();
        }
      }).catch(err => {
        console.error('[WebRTC] Failed to get local stream:', err);
        // Continue anyway - user can enable mic manually
        const peer = initPeer(callRole === 'caller');
        if (peer) {
          flushPendingSignals();
        }
      });

      return () => {
        destroyPeer();
      };
    } else if (!isInCall) {
      destroyPeer();
      stopLocalStream();
      setRemoteStream(null);
      setConnectionState('disconnected');
      setIsMicMuted(true);
      setIsCameraEnabled(false);
      setIsScreenSharing(false);
    }
  }, [isInCall, socket, remotePeerId, callRole, initPeer, flushPendingSignals, destroyPeer, stopLocalStream, getLocalStream]);

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
      stopConnectionHealthCheck();
      destroyPeer();
      stopLocalStream();
      if (remoteStreamRef.current) {
        remoteStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [destroyPeer, stopLocalStream, stopConnectionHealthCheck]);

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
