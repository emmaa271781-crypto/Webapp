import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  TypingIndicator,
  ConversationHeader,
  Avatar,
} from '@chatscope/chat-ui-kit-react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import { useSocket } from './hooks/useSocket';
import { useMessages } from './hooks/useMessages';
import { usePresence } from './hooks/usePresence';
import { useCall } from './hooks/useCall';
import JoinOverlay from './components/JoinOverlay';
import ProfileOverlay from './components/ProfileOverlay';
import GameCanvas from './components/GameCanvas';
import CallPanel from './components/CallPanel';
import CallBanner from './components/CallBanner';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import MessageComposer from './components/MessageComposer';
import MessageActions from './components/MessageActions';
import './App.css';

function AppChatScope() {
  const [currentUser, setCurrentUser] = useState('');
  const [currentAvatar, setCurrentAvatar] = useState('');
  const [showJoin, setShowJoin] = useState(true);
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [gameType, setGameType] = useState('pong');
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
      const username = payload?.username || payload;
      setCurrentUser(username);
      setShowJoin(false);
      if (payload?.avatar) {
        setCurrentAvatar(payload.avatar);
      }
    });

    socket.on('auth_error', () => {
      setShowJoin(true);
    });

    socket.on('history', (history) => {
      if (history && Array.isArray(history)) {
        history.forEach((msg) => addMessage(msg));
      }
    });

    socket.on('message', (msg) => {
      addMessage(msg);
    });

    socket.on('message_edit', (data) => {
      updateMessage(data.id, data.text);
    });

    socket.on('message_delete', (id) => {
      updateMessage(id, null, true);
    });

    socket.on('reaction', (data) => {
      updateReactions(data.messageId, data.emoji, data.user, data.add);
    });

    return () => {
      socket.off('auth_ok');
      socket.off('auth_error');
      socket.off('history');
      socket.off('message');
      socket.off('message_edit');
      socket.off('message_delete');
      socket.off('reaction');
    };
  }, [socket, addMessage, updateMessage, updateReactions]);

  const handleJoin = (username, password, avatar) => {
    if (socket) {
      socket.emit('join', { username, password, avatar });
      setCurrentAvatar(avatar);
    }
  };

  const handleProfileUpdate = (name, avatar) => {
    setCurrentUser(name);
    setCurrentAvatar(avatar);
    if (socket) {
      socket.emit('join', { username: name, password: '', avatar });
    }
  };

  const toggleSound = () => setSoundEnabled(!soundEnabled);
  const toggleNotify = () => setNotifyEnabled(!notifyEnabled);

  // MessageComposer handles sending, so we don't need handleSend for ChatScope MessageInput

  const handleReaction = (messageId, emoji) => {
    if (!socket || !currentUser) return;
    socket.emit('reaction', {
      messageId,
      emoji,
      user: currentUser,
      add: true,
    });
  };

  if (showJoin || !currentUser) {
    return (
      <AnimatePresence>
        <JoinOverlay onJoin={handleJoin} initialAvatar={currentAvatar} />
      </AnimatePresence>
    );
  }

  if (showGame) {
    return <GameCanvas gameType={gameType} onGameEnd={() => setShowGame(false)} />;
  }

  const typingIndicator = typingUsers.length > 0 ? (
    <TypingIndicator content={`${typingUsers.join(', ')} ${typingUsers.length === 1 ? 'is' : 'are'} typing`} />
  ) : null;

  return (
    <div className="app" style={{ height: '100vh' }}>
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

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <MainContainer style={{ height: '100%', flex: 1 }}>
              <ChatContainer>
                <ConversationHeader>
                  <ConversationHeader.Content>
                    <ConversationHeader.Info>
                      Private Chat Room
                    </ConversationHeader.Info>
                    <ConversationHeader.Actions>
                      <button
                        onClick={() => setShowGame(true)}
                        style={{
                          padding: '0.4rem 0.8rem',
                          marginRight: '0.5rem',
                          borderRadius: '0.4rem',
                          border: '1px solid #4ade80',
                          background: 'transparent',
                          color: '#4ade80',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                        }}
                      >
                        🎮 Play Game
                      </button>
                      <span style={{ fontSize: '0.8rem', color: '#4ade80' }}>
                        {total} online
                      </span>
                    </ConversationHeader.Actions>
                  </ConversationHeader.Content>
                </ConversationHeader>
                <MessageList
                  typingIndicator={typingIndicator}
                  scrollBehavior="smooth"
                >
                  {messages.map((msg) => {
              if (msg.deleted) {
                return (
                  <Message
                    key={msg.id}
                    model={{
                      message: '(message deleted)',
                      sentTime: new Date(msg.timestamp).toLocaleTimeString(),
                      sender: msg.user,
                      direction: msg.user === currentUser ? 'outgoing' : 'incoming',
                    }}
                  />
                );
              }

              const reactions = msg.reactions || {};
              const reactionButtons = Object.entries(reactions).map(([emoji, users]) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(msg.id, emoji)}
                  style={{
                    margin: '2px',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    border: '1px solid #4ade80',
                    background: users.includes(currentUser) ? '#4ade80' : 'transparent',
                    color: users.includes(currentUser) ? '#0a1418' : '#4ade80',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {emoji} {users.length}
                </button>
              ));

              // Build message content with replies, files, etc.
              let messageContent = msg.text || '';
              if (msg.file) {
                messageContent = msg.file.kind === 'image' ? '[Image]' : '[Video]';
              }

              return (
                <div key={msg.id} style={{ position: 'relative', marginBottom: '0.5rem' }}>
                  <Message
                    model={{
                      message: messageContent,
                      sentTime: new Date(msg.timestamp).toLocaleTimeString(),
                      sender: msg.user,
                      direction: msg.user === currentUser ? 'outgoing' : 'incoming',
                    }}
                  >
                    {msg.replyTo && (
                      <div style={{ 
                        marginBottom: '8px', 
                        padding: '8px', 
                        background: 'rgba(74, 222, 128, 0.1)', 
                        borderRadius: '4px',
                        borderLeft: '3px solid #4ade80',
                        fontSize: '0.85rem'
                      }}>
                        <div style={{ color: '#a8d5ba', fontWeight: 600, marginBottom: '4px' }}>
                          {msg.replyTo.user}
                        </div>
                        <div style={{ color: '#7fb3a0' }}>
                          {msg.replyTo.text?.slice(0, 50) || '(message deleted)'}
                        </div>
                      </div>
                    )}
                    {msg.file && (
                      <div style={{ marginTop: '8px' }}>
                        {msg.file.kind === 'image' ? (
                          <img src={msg.file.url} alt={msg.file.name} style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} />
                        ) : (
                          <video src={msg.file.url} controls style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} />
                        )}
                      </div>
                    )}
                    {reactionButtons.length > 0 && (
                      <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {reactionButtons}
                      </div>
                    )}
                  </Message>
                  <div style={{ 
                    position: 'absolute',
                    top: '4px',
                    right: msg.user === currentUser ? '4px' : 'auto',
                    left: msg.user !== currentUser ? '4px' : 'auto',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    zIndex: 10
                  }} 
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}>
                    <MessageActions message={msg} currentUser={currentUser} socket={socket} />
                  </div>
                </div>
              );
                  })}
                </MessageList>
              </ChatContainer>
            </MainContainer>
          </div>
          <MessageComposer currentUser={currentUser} socket={socket} />
        </div>
      </div>
    </div>
  );
}

export default AppChatScope;
