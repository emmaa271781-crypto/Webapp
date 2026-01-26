import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return socket;
}
