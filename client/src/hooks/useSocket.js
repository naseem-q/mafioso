import { useEffect, useCallback, useRef } from 'react';
import socketService from '../services/socket';

export function useSocketEvent(event, handler) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const fn = (...a) => ref.current(...a);
    return socketService.on(event, fn);
  }, [event]);
}

export function useSocketEmit() {
  return useCallback((event, data) => socketService.emit(event, data), []);
}

export function useSocketConnection() {
  useEffect(() => { socketService.connect(); }, []);
  return { getSocketId: socketService.getSocketId, emit: socketService.emit, disconnect: socketService.disconnect };
}
