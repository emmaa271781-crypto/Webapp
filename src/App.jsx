import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import JoinOverlay from './components/JoinOverlay';
import ProfileOverlay from './components/ProfileOverlay';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import MessageComposer from './components/MessageComposer';
import CallPanel from './components/CallPanel';
import CallBanner from './components/CallBanner';
import { useSocket } from './hooks/useSocket';
import { useMessages } from './hooks/useMessages';
import { usePresence } from './hooks/usePresence';
import { useCall } from './hooks/useCall';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState('');
  const [currentAvatar, setCurrentAvatar] = useState('');
  const [showJoinOverlay, setShowJoinOverlay] = useState(true);
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [notifyEnabled, setNotifyEnabled] = useState(false);

  const socket = useSocket();
  const { messages, addMessage, updateMessage, updateReactions } = useMessages();
  const { users, total, typingUsers } = usePresence(socket);
  const {
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
  } = useCall(socket, currentUser);

  useEffect(() => {
    if (!socket) return;

    socket.on('auth_ok', (payload) => {
      setCurrentUser(payload?.username || '');
      setShowJoinOverlay(false);
      const storedAvatar = localStorage.getItem('avatarUrl');
      if (storedAvatar) setCurrentAvatar(storedAvatar);
      // Load message history
      socket.once('history', (history) => {
        if (history && Array.isArray(history)) {
          // History will be loaded by useMessages hook
        }
      });
    });

    socket.on('auth_error', () => {
      setCurrentUser('');
      setShowJoinOverlay(true);
    });

    socket.on('message', (message) => {
      addMessage(message);
      if (message.user !== currentUser && !document.hidden) {
        playSound();
      }
    });

    socket.on('message_update', (message) => {
      updateMessage(message);
    });

    socket.on('reaction_update', (payload) => {
      updateReactions(payload.messageId, payload.reactions);
    });

    socket.on('history', (history) => {
      if (history && Array.isArray(history)) {
        // Load history into messages
        history.forEach((msg) => addMessage(msg));
      }
    });

    return () => {
      socket.off('auth_ok');
      socket.off('auth_error');
      socket.off('message');
      socket.off('message_update');
      socket.off('reaction_update');
      socket.off('history');
    };
  }, [socket, currentUser, addMessage, updateMessage, updateReactions]);

  useEffect(() => {
    const storedSound = localStorage.getItem('soundEnabled') === 'true';
    const storedNotify = localStorage.getItem('notifyEnabled') === 'true';
    setSoundEnabled(storedSound);
    setNotifyEnabled(storedNotify);
  }, []);

  const playSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 660;
      gain.gain.value = 0.08;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.15);
      oscillator.onended = () => context.close();
    } catch (error) {
      // Ignore
    }
  };

  const handleJoin = (username, password, avatar) => {
    if (socket) {
      socket.emit('join', { username, password, avatar });
    }
  };

  const handleProfileUpdate = (username, avatar) => {
    setCurrentUser(username);
    setCurrentAvatar(avatar);
    localStorage.setItem('profileName', username);
    localStorage.setItem('avatarUrl', avatar);
    if (socket) {
      socket.emit('profile_update', { username, avatar });
    }
  };

  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('soundEnabled', newValue.toString());
  };

  const toggleNotify = async () => {
    if (!notifyEnabled && Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
    }
    const newValue = !notifyEnabled;
    setNotifyEnabled(newValue);
    localStorage.setItem('notifyEnabled', newValue.toString());
  };

  if (!socket) {
    return (
      <div className="app-loading">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="loading-spinner"
        >
          Connecting...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="app">
      <AnimatePresence>
        {showJoinOverlay && (
          <JoinOverlay
            onJoin={handleJoin}
            initialAvatar={currentAvatar}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProfileOverlay && (
          <ProfileOverlay
            currentName={currentUser}
            currentAvatar={currentAvatar}
            onClose={() => setShowProfileOverlay(false)}
            onUpdate={handleProfileUpdate}
          />
        )}
      </AnimatePresence>

      <TopBar
        currentUser={currentUser}
        onProfileClick={() => setShowProfileOverlay(true)}
        soundEnabled={soundEnabled}
        notifyEnabled={notifyEnabled}
        onSoundToggle={toggleSound}
        onNotifyToggle={toggleNotify}
        isInCall={isInCall}
        onCallStart={startCall}
        onCallEnd={endCall}
      />

      <div className="app-layout">
        <Sidebar users={users} total={total} currentUser={currentUser} />

        <div className="app-main">
          <AnimatePresence>
            {showCallBanner && (
              <CallBanner
                text={callBannerText}
                onJoin={joinCall}
                onDismiss={dismissBanner}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showCallPanel && (
              <CallPanel
                currentUser={currentUser}
                currentAvatar={currentAvatar}
                remoteProfile={remoteProfile}
                callRole={callRole}
                callConnected={callConnected}
                remotePeerId={remotePeerId}
                socket={socket}
                isInCall={isInCall}
                onEnd={endCall}
              />
            )}
          </AnimatePresence>

          <ChatPanel
            messages={messages}
            currentUser={currentUser}
            typingUsers={typingUsers}
            socket={socket}
          />

          <MessageComposer
            currentUser={currentUser}
            socket={socket}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
