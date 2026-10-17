import { io, Socket } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

let socketInstance: Socket | null = null;

/**
 * Returns the singleton Socket.IO client instance connected to the SharkBridge backend.
 */
export const getSocket = (): Socket => {
  if (!socketInstance) {
    socketInstance = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('Socket.IO real-time channel established:', socketInstance?.id);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('Socket.IO connection note (fallback available):', err.message);
    });
  }
  return socketInstance;
};
