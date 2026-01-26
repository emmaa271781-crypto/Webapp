import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    try {
      // Connect to the current origin (works for both dev and production)
      const socketUrl = window.location.origin;
      const newSocket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      newSocket.on('connect', () => {
        console.log('[Socket] Connected to server');
      });

      newSocket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } catch (error) {
      console.error('[Socket] Failed to initialize:', error);
    }
  }, []);

  return socket;
}
