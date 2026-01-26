import { useState, useEffect } from 'react';

export function usePresence(socket) {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [typingUsers, setTypingUsers] = useState([]);

  useEffect(() => {
    if (!socket) return;

    socket.on('presence_update', (payload) => {
      const userList = Array.isArray(payload?.users) ? payload.users : [];
      const userTotal = typeof payload?.total === 'number'
        ? payload.total
        : userList.reduce((sum, user) => sum + (user.count || 0), 0);
      setUsers(userList);
      setTotal(userTotal);
    });

    socket.on('typing_update', (payload) => {
      const typing = Array.isArray(payload?.users) ? payload.users : [];
      setTypingUsers(typing);
    });

    return () => {
      socket.off('presence_update');
      socket.off('typing_update');
    };
  }, [socket]);

  return { users, total, typingUsers };
}
