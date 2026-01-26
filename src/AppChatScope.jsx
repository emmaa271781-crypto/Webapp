import React, { useState, useEffect } from 'react';
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  TypingIndicator,
  ConversationHeader,
} from '@chatscope/chat-ui-kit-react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import { useSocket } from './hooks/useSocket';
import { useMessages } from './hooks/useMessages';
import { usePresence } from './hooks/usePresence';
import JoinOverlay from './components/JoinOverlay';
import './App.css';

function AppChatScope() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showJoin, setShowJoin] = useState(true);
  const socket = useSocket();
  const { messages, addMessage, updateMessage, updateReactions } = useMessages();
  const { users, total, typingUsers } = usePresence(socket);

  useEffect(() => {
    if (!socket) return;

    socket.on('auth_ok', ({ username }) => {
      setCurrentUser(username);
      setShowJoin(false);
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
    }
  };

  const handleSend = (innerHtml, textContent, innerText, nodes) => {
    if (!socket || !currentUser || !textContent.trim()) return;

    socket.emit('message', {
      text: textContent.trim(),
      user: currentUser,
    });
  };

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
    return <JoinOverlay onJoin={handleJoin} />;
  }

  const typingIndicator = typingUsers.length > 0 ? (
    <TypingIndicator content={`${typingUsers.join(', ')} ${typingUsers.length === 1 ? 'is' : 'are'} typing`} />
  ) : null;

  return (
    <div style={{ height: '100vh' }}>
      <MainContainer>
        <ChatContainer>
          <ConversationHeader>
            <ConversationHeader.Content>
              <ConversationHeader.Info>
                Private Chat Room
              </ConversationHeader.Info>
              <ConversationHeader.Actions>
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
                  }}
                >
                  {emoji} {users.length}
                </button>
              ));

              return (
                <Message
                  key={msg.id}
                  model={{
                    message: msg.text,
                    sentTime: new Date(msg.timestamp).toLocaleTimeString(),
                    sender: msg.user,
                    direction: msg.user === currentUser ? 'outgoing' : 'incoming',
                  }}
                >
                  {reactionButtons.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {reactionButtons}
                    </div>
                  )}
                </Message>
              );
            })}
          </MessageList>
          <MessageInput
            placeholder="Type message here"
            onSend={handleSend}
            attachButton={false}
          />
        </ChatContainer>
      </MainContainer>
    </div>
  );
}

export default AppChatScope;
