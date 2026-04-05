import { io } from 'socket.io-client';
const URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';
let socket = null;

export function connect() {
  if (socket?.connected) return socket;
  socket = io(URL, { transports: ['websocket','polling'], reconnection: true, reconnectionAttempts: 10, reconnectionDelay: 1000 });
  socket.on('connect', () => console.log('[Socket] Connected:', socket.id));
  socket.on('disconnect', (r) => console.log('[Socket] Disconnected:', r));
  return socket;
}

export function getSocket() { if (!socket) return connect(); return socket; }

export function emit(event, data = {}) {
  return new Promise((resolve, reject) => {
    getSocket().emit(event, data, (res) => {
      if (res?.success === false) reject(new Error(res.message || 'خطأ'));
      else resolve(res);
    });
  });
}

export function on(event, handler) { const s = getSocket(); s.on(event, handler); return () => s.off(event, handler); }
export function off(event, handler) { getSocket().off(event, handler); }
export function disconnect() { if (socket) { socket.disconnect(); socket = null; } }
export function getSocketId() { return socket?.id || null; }

export default { connect, getSocket, emit, on, off, disconnect, getSocketId };
