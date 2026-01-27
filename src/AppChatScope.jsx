import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  TypingIndicator,
  ConversationHeader,
} from '@chatscope/chat-ui-kit-react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import { useSocket } from './hooks/useSocket';
import { useMessages } from './hooks/useMessages';
import { usePresence } from './hooks/usePresence';
import { useCall } from './hooks/useCall';
import JoinOverlay from './components/JoinOverlay';
import ProfileOverlay from './components/ProfileOverlay';
import GameCanvas from './components/GameCanvas';
import BoardGame from './components/BoardGame';
import GameSelector from './components/GameSelector';
import CallPanel from './components/CallPanel';
import CallBanner from './components/CallBanner';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import MessageComposer from './components/MessageComposer';
import MessageActions from './components/MessageActions';
import { GameInvite } from './components/GameInvite';
import { useStreaks } from './hooks/useStreaks';
import './App.css';

function AppChatScope() {
  console.log('[AppChatScope] Component rendering...');
  
  const [currentUser, setCurrentUser] = useState('');
  const [currentAvatar, setCurrentAvatar] = useState('');
  const [showJoin, setShowJoin] = useState(true);
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [showGameSelector, setShowGameSelector] = useState(false);
  const [gameType, setGameType] = useState('pong');
  const [gameMode, setGameMode] = useState('realtime'); // 'realtime' or 'boardgame'
  const [playerID, setPlayerID] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  
  // Hooks must be called unconditionally at the top level
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
  const { dailyStreak, gameWinStreak, totalWins, totalGames, winRate } = useStreaks(socket, currentUser);

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

  console.log('[AppChatScope] showJoin:', showJoin, 'currentUser:', currentUser);
  
  if (showJoin || !currentUser) {
    console.log('[AppChatScope] Rendering JoinOverlay');
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 10000 }}>
        <JoinOverlay onJoin={handleJoin} initialAvatar={currentAvatar} />
      </div>
    );
  }

  const handleGameSelect = (selectedGameType, mode) => {
    setGameType(selectedGameType);
    setGameMode(mode);
    setShowGameSelector(false);
    if (mode === 'boardgame') {
      // Assign player ID (0 or 1) - in real implementation, this would come from server
      setPlayerID('0'); // First player to join
    }
    setShowGame(true);
  };

  if (showGame) {
    if (gameMode === 'boardgame') {
      return (
        <BoardGame
          gameType={gameType}
          playerID={playerID}
          onGameEnd={() => {
            setShowGame(false);
            setGameType('pong');
            setGameMode('realtime');
            setPlayerID(null);
          }}
          currentUser={currentUser}
        />
      );
    } else {
      return <GameCanvas gameType={gameType} onGameEnd={() => setShowGame(false)} socket={socket} currentUser={currentUser} />;
    }
  }

  const typingIndicator = typingUsers.length > 0 ? (
    <TypingIndicator content={`${typingUsers.join(', ')} ${typingUsers.length === 1 ? 'is' : 'are'} typing`} />
  ) : null;

  return (
    <div className="app" style={{ height: '100vh' }}>
      <AnimatePresence>
            {showGameSelector && (
              <GameSelector
                onSelect={handleGameSelect}
                onClose={() => setShowGameSelector(false)}
                socket={socket}
                currentUser={currentUser}
                onSendInvite={({ gameType, gameId }) => {
                  // Game invite will be sent via socket and appear in chat
                  console.log('Game invite sent:', gameType, gameId);
                }}
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

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <MainContainer style={{ height: '100%', flex: 1, background: 'var(--bg-primary)', backgroundColor: 'var(--bg-primary)' }}>
              <ChatContainer style={{ background: 'var(--bg-primary)', backgroundColor: 'var(--bg-primary)' }}>
                <ConversationHeader>
                  <ConversationHeader.Content userName="Private Chat Room">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                      <button
                        onClick={() => setShowGameSelector(true)}
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
                      {dailyStreak > 0 && (
                        <span style={{ fontSize: '0.75rem', color: '#4ade80', marginRight: '0.5rem' }}>
                          🔥 {dailyStreak} day streak
                        </span>
                      )}
                      <span style={{ fontSize: '0.8rem', color: '#4ade80' }}>
                        {total} online
                      </span>
                    </div>
                  </ConversationHeader.Content>
                </ConversationHeader>
                <MessageList
                  typingIndicator={typingIndicator}
                  scrollBehavior="smooth"
                  style={{ background: 'var(--bg-primary)', backgroundColor: 'var(--bg-primary)' }}
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

              // Build full message text with reply context
              let fullMessageContent = messageContent;
              if (msg.replyTo) {
                fullMessageContent = `↩ ${msg.replyTo.user}: ${msg.replyTo.text?.slice(0, 30) || '(deleted)'}\n${messageContent}`;
              }

              // Check if this is a game invite - show inline in chat
              if (msg.gameInvite) {
                return (
                  <div key={msg.id} style={{ marginBottom: '0.5rem' }}>
                    <GameInvite
                      message={msg}
                      currentUser={currentUser}
                      socket={socket}
                    />
                  </div>
                );
              }

              return (
                <div key={msg.id} style={{ position: 'relative', marginBottom: '0.5rem' }}>
                  <Message
                    model={{
                      message: fullMessageContent,
                      sentTime: new Date(msg.timestamp).toLocaleTimeString(),
                      sender: msg.user,
                      direction: msg.user === currentUser ? 'outgoing' : 'incoming',
                    }}
                  />
                  {msg.file && (
                    <div style={{ marginTop: '4px', marginLeft: msg.user === currentUser ? 'auto' : '0', marginRight: msg.user === currentUser ? '0' : 'auto', maxWidth: '300px' }}>
                      {msg.file.kind === 'image' ? (
                        <img src={msg.file.url} alt={msg.file.name} style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} />
                      ) : (
                        <video src={msg.file.url} controls style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} />
                      )}
                    </div>
                  )}
                  {reactionButtons.length > 0 && (
                    <div style={{ 
                      marginTop: '4px', 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: '4px',
                      marginLeft: msg.user === currentUser ? 'auto' : '0',
                      marginRight: msg.user === currentUser ? '0' : 'auto',
                      justifyContent: msg.user === currentUser ? 'flex-end' : 'flex-start'
                    }}>
                      {reactionButtons}
                    </div>
                  )}
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
