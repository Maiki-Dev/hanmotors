import io, { Socket } from 'socket.io-client';
import { API_URL } from '../config';

export let socket: Socket | null = null;

export const initSocket = (customerId?: string) => {
  if (!socket) {
    socket = io(API_URL, {
      transports: ['websocket'],
      query: customerId ? { customerId } : {},
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });
  }
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
