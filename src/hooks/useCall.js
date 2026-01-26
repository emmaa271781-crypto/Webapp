import { useState, useEffect, useCallback } from 'react';

export function useCall(socket, currentUser) {
  const [isInCall, setIsInCall] = useState(false);
  const [callRole, setCallRole] = useState(null);
  const [remotePeerId, setRemotePeerId] = useState(null);
  const [callConnected, setCallConnected] = useState(false);
  const [remoteProfile, setRemoteProfile] = useState({ name: 'Remote', avatar: '' });
  const [showCallPanel, setShowCallPanel] = useState(false);
  const [showCallBanner, setShowCallBanner] = useState(false);
  const [callBannerText, setCallBannerText] = useState('');
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const startCall = useCallback(() => {
    if (!socket || !currentUser) return;
    socket.emit('call_join');
  }, [socket, currentUser]);

  const endCall = useCallback(() => {
    if (!socket) return;
    socket.emit('call_leave');
    socket.emit('webrtc_hangup');
    setIsInCall(false);
    setShowCallPanel(false);
    setCallRole(null);
    setRemotePeerId(null);
    setCallConnected(false);
  }, [socket]);

  const joinCall = useCallback(() => {
    startCall();
  }, [startCall]);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
    setShowCallBanner(false);
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('call_joined', (payload) => {
      const role = payload?.role || 'caller';
      setCallRole(role);
      setRemotePeerId(payload?.peerId || null);
      setIsInCall(true);
      setShowCallPanel(true);
      setShowCallBanner(false);
      if (payload?.peerName) {
        setRemoteProfile({
          name: payload.peerName,
          avatar: payload.peerAvatar || '',
        });
      }
    });

    socket.on('call_started', (payload) => {
      if (bannerDismissed || isInCall) return;
      const name = payload?.user || 'Someone';
      setCallBannerText(`${name} started a call. Click Join Call to connect.`);
      setShowCallBanner(true);
    });

    socket.on('call_status', (payload) => {
      if (payload?.active && !bannerDismissed && !isInCall) {
        const name = payload?.user || 'Someone';
        setCallBannerText(`${name} started a call. Click Join Call to connect.`);
        setShowCallBanner(true);
      }
    });

    socket.on('call_peer', (payload) => {
      setRemotePeerId(payload?.peerId || null);
      setRemoteProfile({
        name: payload?.peerName || 'Remote',
        avatar: payload?.peerAvatar || '',
      });
      setCallConnected(true);
    });

    socket.on('call_connected', (payload) => {
      setRemotePeerId(payload?.peerId || null);
      setRemoteProfile({
        name: payload?.peerName || 'Remote',
        avatar: payload?.peerAvatar || '',
      });
      setCallConnected(true);
    });

    socket.on('call_peer_update', (payload) => {
      setRemoteProfile({
        name: payload?.peerName || remoteProfile.name,
        avatar: payload?.peerAvatar || remoteProfile.avatar,
      });
    });

    socket.on('call_ended', () => {
      if (!isInCall) {
        setShowCallBanner(false);
      }
    });

    socket.on('call_peer_left', () => {
      endCall();
    });

    socket.on('webrtc_hangup', () => {
      endCall();
    });

    return () => {
      socket.off('call_joined');
      socket.off('call_started');
      socket.off('call_status');
      socket.off('call_peer');
      socket.off('call_connected');
      socket.off('call_peer_update');
      socket.off('call_ended');
      socket.off('call_peer_left');
      socket.off('webrtc_hangup');
    };
  }, [socket, isInCall, bannerDismissed, remoteProfile, endCall]);

  return {
    isInCall,
    callRole,
    remotePeerId,
    callConnected,
    remoteProfile,
    showCallPanel,
    showCallBanner,
    callBannerText,
    startCall,
    endCall,
    joinCall,
    dismissBanner,
  };
}
