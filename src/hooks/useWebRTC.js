import { useRef, useEffect, useState, useCallback } from 'react';
import { checkWebRTCSupport, getOptimalConstraints, ensureAudioPlayback } from '../utils/browserCompatibility';

// WebRTC hook with browser compatibility and Discord-style connection verification

export function useWebRTC(socket, isInCall, callRole, remotePeerId, onCallEnd) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMicMuted, setIsMicMuted] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [connectionQuality, setConnectionQuality] = useState('good');
  
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

  // Connection health check helpers (defined first to avoid circular dependencies)
  const stopConnectionHealthCheck = useCallback(() => {
    if (connectionHealthRef.current) {
      clearInterval(connectionHealthRef.current);
      connectionHealthRef.current = null;
    }
  }, []);

  const startConnectionHealthCheck = useCallback(() => {
    if (connectionHealthRef.current) {
      clearInterval(connectionHealthRef.current);
    }

    connectionHealthRef.current = setInterval(async () => {
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
        setConnectionState('connected');
        
        // Get connection quality from stats (Discord-style)
        try {
          const statsReport = await peerRef.current._pc.getStats();
          let packetsLost = 0;
          let packetsReceived = 0;
          
          statsReport.forEach((report) => {
            if (report.type === 'inbound-rtp' && report.mediaType === 'audio') {
              packetsLost += report.packetsLost || 0;
              packetsReceived += report.packetsReceived || 0;
            }
          });

          const lossRate = packetsReceived > 0 ? packetsLost / packetsReceived : 0;
          
          if (lossRate < 0.01) {
            setConnectionQuality('excellent');
          } else if (lossRate < 0.03) {
            setConnectionQuality('good');
          } else if (lossRate < 0.05) {
            setConnectionQuality('fair');
          } else {
            setConnectionQuality('poor');
          }
        } catch (err) {
          // Stats not available, assume good
          setConnectionQuality('good');
        }
      } else if (stats.iceConnectionState === 'disconnected') {
        setConnectionQuality('fair');
        // Try ICE restart
        try {
          peerRef.current._pc.restartIce();
        } catch (err) {
          console.warn('[WebRTC] ICE restart failed:', err);
        }
      } else if (stats.iceConnectionState === 'failed') {
        setConnectionState('error');
        setConnectionQuality('poor');
        clearInterval(connectionHealthRef.current);
      }
    }, 3000); // Check every 3 seconds
  }, []);

  // Flush pending signals (defined before initPeer)
  const flushPendingSignals = useCallback(() => {
    if (!peerRef.current || !remotePeerId || !socket) return;
    
    pendingSignalsRef.current.forEach(signal => {
      socket.emit('webrtc_signal', { signal, to: remotePeerId });
    });
    pendingSignalsRef.current = [];
  }, [socket, remotePeerId]);

  // Destroy peer connection (defined before initPeer)
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
      console.log('[WebRTC] Generated signal, type:', signal.type || 'unknown', 'remotePeerId:', remotePeerId);
      if (remotePeerId && socket) {
        console.log('[WebRTC] Sending signal to', remotePeerId);
        socket.emit('webrtc_signal', { signal, to: remotePeerId });
      } else {
        console.log('[WebRTC] No remotePeerId yet, queuing signal');
        pendingSignalsRef.current.push(signal);
      }
    });

    peer.on('connect', () => {
      console.log('[WebRTC] ✅ Peer connected successfully!');
      setConnectionState('connected');
      reconnectAttemptsRef.current = 0;
      startConnectionHealthCheck();
      
      // Ensure audio plays when connected
      if (remoteAudioRef.current && remoteStreamRef.current) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current;
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.volume = 1.0;
        ensureAudioPlayback(remoteAudioRef.current).catch(err => {
          console.warn('[WebRTC] Audio playback on connect error:', err);
        });
      }
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
      console.log('[WebRTC] Received remote stream with', stream.getTracks().length, 'tracks');
      remoteStreamRef.current = stream;
      setRemoteStream(stream);
      
      // Set video
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        console.log('[WebRTC] Set remote video stream');
      }
      
      // Set audio and ensure playback
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        console.log('[WebRTC] Set remote audio stream');
        // Force unmute and play
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.volume = 1.0;
        ensureAudioPlayback(remoteAudioRef.current).then(success => {
          if (success) {
            console.log('[WebRTC] Audio playback started successfully');
          } else {
            console.warn('[WebRTC] Audio playback may require user interaction');
          }
        }).catch(err => {
          console.warn('[WebRTC] Audio playback error:', err);
        });
      }
    });

    peer.on('track', (track, stream) => {
      console.log('[WebRTC] Received track:', track.kind, 'readyState:', track.readyState);
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
        setRemoteStream(remoteStreamRef.current);
      }
      remoteStreamRef.current.addTrack(track);
      
      if (track.kind === 'video' && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        console.log('[WebRTC] Added video track to remote video element');
      }
      if (track.kind === 'audio' && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current;
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.volume = 1.0;
        console.log('[WebRTC] Added audio track to remote audio element');
        ensureAudioPlayback(remoteAudioRef.current).then(success => {
          if (success) {
            console.log('[WebRTC] Audio playback started from track');
          } else {
            console.warn('[WebRTC] Audio playback may require user interaction');
          }
        }).catch(err => {
          console.warn('[WebRTC] Audio playback error:', err);
        });
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
  }, [socket, remotePeerId, isInCall, callRole, onCallEnd, startConnectionHealthCheck, destroyPeer, flushPendingSignals]);

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
      console.log('[WebRTC] Stopping screen share');
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(track => {
          if (track.getSettings().displaySurface === 'monitor' || track.label.includes('screen')) {
            track.stop();
            localStreamRef.current.removeTrack(track);
            if (peerRef.current && peerRef.current.removeTrack) {
              try {
                peerRef.current.removeTrack(track, localStreamRef.current);
              } catch (err) {
                console.warn('[WebRTC] Error removing screen track:', err);
              }
            }
          }
        });
      }
      setIsScreenSharing(false);
      
      // Re-enable camera if it was on before screen share
      if (isCameraEnabled) {
        console.log('[WebRTC] Re-enabling camera after screen share');
        await toggleCamera();
      } else {
        // If no camera, trigger renegotiation to update remote
        if (peerRef.current?.negotiate && callRole !== 'caller') {
          try {
            peerRef.current.negotiate();
          } catch (err) {
            console.warn('[WebRTC] Error negotiating after screen share stop:', err);
          }
        }
      }
    } else {
      // Start screen share
      try {
        console.log('[WebRTC] Starting screen share');
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          },
          audio: false,
        });

        const screenTrack = screenStream.getVideoTracks()[0];
        if (!screenTrack) {
          throw new Error('No screen track available');
        }
        
        // Ensure we have a local stream
        if (!localStreamRef.current) {
          localStreamRef.current = new MediaStream();
        }

        // Stop existing video tracks (camera or previous screen share)
        const existingVideoTracks = localStreamRef.current.getVideoTracks();
        existingVideoTracks.forEach(track => {
          localStreamRef.current.removeTrack(track);
          if (peerRef.current?.removeTrack) {
            try {
              peerRef.current.removeTrack(track, localStreamRef.current);
            } catch (err) {
              console.warn('[WebRTC] Error removing existing video track:', err);
            }
          }
        });

        // Add screen track
        localStreamRef.current.addTrack(screenTrack);
        
        if (peerRef.current) {
          try {
            peerRef.current.addTrack(screenTrack, localStreamRef.current);
            console.log('[WebRTC] Added screen track to peer');
          } catch (err) {
            console.warn('[WebRTC] Error adding screen track to peer:', err);
          }
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }

        // Handle screen share ending (user stops sharing in browser)
        screenTrack.onended = () => {
          console.log('[WebRTC] Screen share ended by user');
          setIsScreenSharing(false);
          // Clean up
          if (localStreamRef.current) {
            localStreamRef.current.removeTrack(screenTrack);
          }
        };

        setIsScreenSharing(true);
        // Mark camera as disabled if it was on (we'll restore it when screen share stops)
        const hadCamera = isCameraEnabled;
        if (hadCamera) {
          setIsCameraEnabled(false);
        }

        // Trigger renegotiation for callee
        if (callRole !== 'caller' && peerRef.current?.negotiate) {
          setTimeout(() => {
            try {
              peerRef.current.negotiate();
              console.log('[WebRTC] Triggered renegotiation for screen share');
            } catch (err) {
              console.warn('[WebRTC] Error negotiating screen share:', err);
            }
          }, 100);
        } else if (callRole === 'caller' && peerRef.current) {
          // For caller, signals will be sent automatically via 'signal' event
          console.log('[WebRTC] Screen share started, signals will be sent automatically');
        }
      } catch (err) {
        console.error('[WebRTC] Error sharing screen:', err);
        if (err.name === 'NotAllowedError') {
          alert('Screen sharing was denied. Please allow screen sharing permissions.');
        } else if (err.name === 'NotFoundError') {
          alert('No screen or window available to share.');
        } else {
          alert('Failed to share screen. Please check permissions and try again.');
        }
      }
    }
  }, [isScreenSharing, isCameraEnabled, callRole, toggleCamera]);

  // Initialize peer when call starts
  useEffect(() => {
    if (isInCall && socket && remotePeerId) {
      console.log('[WebRTC] Call started - isInCall:', isInCall, 'remotePeerId:', remotePeerId, 'callRole:', callRole);
      setConnectionState('connecting');
      
      // Ensure SimplePeer is loaded
      if (!window.SimplePeer) {
        console.error('[WebRTC] SimplePeer not available!');
        setConnectionState('error');
        return;
      }

      // Destroy any existing peer first
      if (peerRef.current) {
        console.log('[WebRTC] Destroying existing peer before reinitializing');
        destroyPeer();
      }
      
      // Try to get local stream (audio optional - call works without mic)
      // This allows calls to connect even if mic permission is denied
      getLocalStream(true, false).then(() => {
        console.log('[WebRTC] Local stream obtained, initializing peer');
        setIsMicMuted(true); // Start muted
        const peer = initPeer(callRole === 'caller');
        if (peer) {
          console.log('[WebRTC] Peer initialized, flushing pending signals');
          setTimeout(() => {
            flushPendingSignals();
          }, 100);
        } else {
          console.error('[WebRTC] Failed to initialize peer');
        }
      }).catch(err => {
        console.warn('[WebRTC] Could not get local stream (mic may be disabled):', err.message);
        // Continue without local stream - call can still work for receiving audio
        console.log('[WebRTC] Initializing peer without local stream - call will work for receiving');
        setIsMicMuted(true);
        // Create empty stream for peer initialization
        if (!localStreamRef.current) {
          localStreamRef.current = new MediaStream();
        }
        const peer = initPeer(callRole === 'caller');
        if (peer) {
          setTimeout(() => {
            flushPendingSignals();
          }, 100);
        }
      });

      return () => {
        console.log('[WebRTC] Cleaning up peer connection');
        destroyPeer();
      };
    } else if (!isInCall) {
      console.log('[WebRTC] Call ended, cleaning up');
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
      console.log('[WebRTC] Received signal:', payload);
      if (!payload?.signal) {
        console.warn('[WebRTC] Signal missing signal data:', payload);
        return;
      }
      
      // If peer doesn't exist yet, queue the signal
      if (!peerRef.current) {
        console.log('[WebRTC] Peer not ready, queuing signal');
        pendingSignalsRef.current.push(payload.signal);
        // Try to initialize peer if we have remotePeerId
        if (remotePeerId && isInCall) {
          console.log('[WebRTC] Initializing peer from signal handler');
          initPeer(callRole === 'caller');
        }
        return;
      }
      
      try {
        console.log('[WebRTC] Processing signal with peer');
        peerRef.current.signal(payload.signal);
      } catch (err) {
        console.error('[WebRTC] Error processing signal:', err);
      }
    };

    socket.on('webrtc_signal', handleSignal);

    return () => {
      socket.off('webrtc_signal', handleSignal);
    };
  }, [socket, remotePeerId, isInCall, callRole, initPeer]);

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
    connectionQuality,
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
