import { useState, useEffect, useCallback, useRef } from 'react';
import { Message } from '@/types';

type MessageType = 'join' | 'speech' | 'continuous' | 'translation' | 'interim' | 'error';

interface WebSocketMessage {
  type: MessageType;
  [key: string]: any;
}

interface WebSocketHookOptions {
  sessionId: string;
  onMessage?: (message: WebSocketMessage) => void;
  onTranslation?: (message: Message) => void;
  onInterim?: (speakerId: number, text: string) => void;
  onError?: (error: Error | string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useWebSocket({
  sessionId,
  onMessage,
  onTranslation,
  onInterim,
  onError,
  onConnect,
  onDisconnect
}: WebSocketHookOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to WebSocket
  const connect = useCallback(() => {
    // Clean up previous connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Clear any reconnect timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Determine WebSocket URL based on current window location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    // Create new connection
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    // Set up event handlers
    ws.onopen = () => {
      setIsConnected(true);
      onConnect?.();
      
      // Join the session
      ws.send(JSON.stringify({
        type: 'join',
        sessionId
      }));
    };

    ws.onclose = () => {
      setIsConnected(false);
      onDisconnect?.();
      
      // Attempt to reconnect after a delay
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      onError?.(new Error('WebSocket connection error'));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        
        // Call the general message handler
        onMessage?.(data);
        
        // Call specific handlers based on message type
        switch (data.type) {
          case 'translation':
            onTranslation?.(data.message);
            break;
            
          case 'interim':
            onInterim?.(data.speakerId, data.text);
            break;
            
          case 'error':
            onError?.(data.message);
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
  }, [sessionId, onMessage, onTranslation, onInterim, onError, onConnect, onDisconnect]);

  // Send a message over WebSocket
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      onError?.(new Error('WebSocket not connected'));
    }
  }, [onError]);

  // Send speech data
  const sendSpeech = useCallback((
    text: string,
    speakerId: number,
    language: string | null,
    targetLanguage: string
  ) => {
    sendMessage({
      type: 'speech',
      text,
      speakerId,
      language,
      targetLanguage
    });
  }, [sendMessage]);

  // Send continuous speech data (interim results)
  const sendContinuousSpeech = useCallback((
    interimText: string,
    finalSpeakerId: number,
    targetLang: string
  ) => {
    sendMessage({
      type: 'continuous',
      interimText,
      finalSpeakerId,
      targetLang
    });
  }, [sendMessage]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    
    // Clean up on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return {
    isConnected,
    sendMessage,
    sendSpeech,
    sendContinuousSpeech
  };
}

export default useWebSocket;