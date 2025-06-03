import { useEffect, useRef, useState, useCallback } from 'react';
import type { MessageWithUser, Room } from '@shared/schema';

interface SocketMessage {
  type: string;
  [key: string]: any;
}

interface UseSocketReturn {
  socket: WebSocket | null;
  isConnected: boolean;
  sendMessage: (message: any) => void;
  joinRoom: (roomId: number) => void;
  sendChatMessage: (content: string) => void;
  startTyping: () => void;
  stopTyping: () => void;
}

export function useSocket(userId?: number, username?: string): UseSocketReturn {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeout = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (socket?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        // Join with user info if available
        if (userId && username) {
          ws.send(JSON.stringify({
            type: 'join',
            userId,
            username
          }));
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setSocket(null);

        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          
          reconnectTimeout.current = setTimeout(() => {
            console.log(`Reconnecting... (attempt ${reconnectAttempts.current})`);
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      setSocket(ws);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [userId, username, socket]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (socket) {
        socket.close();
      }
    };
  }, []);

  // Send join message when user info becomes available and socket is connected
  useEffect(() => {
    if (userId && username && socket?.readyState === WebSocket.OPEN) {
      console.log('Sending join message for user:', userId, username);
      socket.send(JSON.stringify({
        type: 'join',
        userId,
        username
      }));
    }
  }, [userId, username, socket, isConnected]);

  const sendMessage = useCallback((message: any) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, [socket]);

  const joinRoom = useCallback((roomId: number) => {
    sendMessage({
      type: 'join_room',
      roomId
    });
  }, [sendMessage]);

  const sendChatMessage = useCallback((content: string) => {
    sendMessage({
      type: 'send_message',
      content
    });
  }, [sendMessage]);

  const startTyping = useCallback(() => {
    sendMessage({
      type: 'typing_start'
    });
  }, [sendMessage]);

  const stopTyping = useCallback(() => {
    sendMessage({
      type: 'typing_stop'
    });
  }, [sendMessage]);

  return {
    socket,
    isConnected,
    sendMessage,
    joinRoom,
    sendChatMessage,
    startTyping,
    stopTyping
  };
}
