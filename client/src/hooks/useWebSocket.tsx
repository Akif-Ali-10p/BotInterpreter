import { useState, useEffect, useCallback, useRef } from 'react';
import { Message } from '@/types';

type MessageType = 'join' | 'speech' | 'continuous' | 'translation' | 'interim' | 'error' | 'ping' | 'pong';

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
  const reconnectAttemptsRef = useRef(0);
  const lastActivity = useRef<number>(Date.now());
  const maxReconnectAttempts = 5;
  const initialReconnectDelay = 1000;

  // Connect to WebSocket
  const connect = useCallback(() => {
    // Clean up previous connection if any
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        console.error('Error closing previous WebSocket connection:', e);
      }
      wsRef.current = null;
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

    let connectionTimeoutId: number | null = null;

    try {
      console.log(`Attempting to connect to WebSocket at ${wsUrl}`);
      
      // Add a connection timeout
      connectionTimeoutId = window.setTimeout(() => {
        console.warn('WebSocket connection attempt timed out - server may be starting up');
        if (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) {
          try {
            wsRef.current.close();
          } catch (e) {
            console.error('Error closing timed out WebSocket:', e);
          }
          wsRef.current = null;
          
          // Trigger reconnection logic with increased timeout
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            // Use a longer delay for the first few attempts to give the server time to start
            const baseDelay = reconnectAttemptsRef.current < 2 ? 3000 : initialReconnectDelay;
            const delay = baseDelay * Math.pow(1.5, reconnectAttemptsRef.current);
            
            console.log(`Connection timed out. Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              connect();
            }, delay);
          } else {
            console.error('Maximum reconnection attempts reached after timeout');
            onError?.(new Error('Connection timed out after multiple attempts'));
          }
        }
      }, 15000); // 15 second connection timeout - increased to account for server startup
      
      // Create new connection
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Set up event handlers
      ws.onopen = () => {
        // Clear the connection timeout
        if (connectionTimeoutId !== null) {
          clearTimeout(connectionTimeoutId);
          connectionTimeoutId = null;
        }
        
        // Reset reconnect attempts on successful connection
        reconnectAttemptsRef.current = 0;
        setIsConnected(true);
        console.log('WebSocket connection established successfully');
        onConnect?.();
        
        // Join the session with retry logic
        let joinAttempts = 0;
        const maxJoinAttempts = 3;
        const tryJoin = () => {
          try {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'join',
                sessionId
              }));
              console.log(`Joined session: ${sessionId}`);
            } else {
              if (joinAttempts < maxJoinAttempts) {
                joinAttempts++;
                console.warn(`WebSocket not ready for join, retrying (attempt ${joinAttempts}/${maxJoinAttempts})...`);
                setTimeout(tryJoin, 500);
              } else {
                console.error('Failed to join session after multiple attempts');
                onError?.(new Error('Failed to join session: WebSocket not ready'));
              }
            }
          } catch (e) {
            console.error('Error sending join message:', e);
            if (joinAttempts < maxJoinAttempts) {
              joinAttempts++;
              console.warn(`Join failed, retrying (attempt ${joinAttempts}/${maxJoinAttempts})...`);
              setTimeout(tryJoin, 500);
            } else {
              onError?.(new Error('Failed to join session after multiple attempts'));
            }
          }
        };
        
        // Start join process
        tryJoin();
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        onDisconnect?.();

        console.log(`WebSocket closed with code ${event.code} and reason: ${event.reason || 'No reason provided'}`);
        
        // Implement exponential backoff for reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = initialReconnectDelay * Math.pow(1.5, reconnectAttemptsRef.current);
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          console.error('Maximum reconnection attempts reached');
          onError?.(new Error('Could not reconnect to the server after multiple attempts'));
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(new Error('WebSocket connection error'));
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string) as WebSocketMessage;
          
          // Call the general message handler
          onMessage?.(data);
          
          // Handle message receipt (any message updates activity timestamp)
          lastActivity.current = Date.now();
          
          // Call specific handlers based on message type
          switch (data.type) {
            case 'translation':
              onTranslation?.(data.message);
              break;
              
            case 'interim':
              onInterim?.(data.speakerId, data.text);
              break;
              
            case 'pong':
              const roundTripTime = Date.now() - (data.timestamp || 0);
              console.log(`Received pong (round-trip: ${roundTripTime}ms)`);
              break;
              
            case 'error':
              onError?.(data.message);
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Error establishing WebSocket connection:', error);
      onError?.(new Error('Failed to establish WebSocket connection'));
      
      // Attempt to reconnect after a delay
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = initialReconnectDelay * Math.pow(1.5, reconnectAttemptsRef.current);
        console.log(`Connection failed. Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      }
    }
  }, [sessionId, onMessage, onTranslation, onInterim, onError, onConnect, onDisconnect]);

  // Send a message over WebSocket with retry
  const pendingMessagesRef = useRef<{message: WebSocketMessage, attempts: number}[]>([]);
  const messageProcessingRef = useRef<NodeJS.Timeout | null>(null);
  const maxSendAttempts = 3;

  // Process any pending messages every 1 second
  useEffect(() => {
    const processMessages = () => {
      const connected = wsRef.current && wsRef.current.readyState === WebSocket.OPEN;
      
      if (connected && pendingMessagesRef.current.length > 0) {
        console.log(`Processing ${pendingMessagesRef.current.length} pending WebSocket messages`);
        
        // Try to send the oldest message first
        const nextMessage = pendingMessagesRef.current[0];
        
        try {
          wsRef.current!.send(JSON.stringify(nextMessage.message));
          // Remove successfully sent message
          pendingMessagesRef.current.shift();
        } catch (error) {
          console.error('Error sending pending WebSocket message:', error);
          nextMessage.attempts++;
          
          // If we've tried too many times, remove this message
          if (nextMessage.attempts >= maxSendAttempts) {
            console.error(`Failed to send message after ${maxSendAttempts} attempts, discarding`);
            pendingMessagesRef.current.shift();
            onError?.(new Error('Failed to send message after multiple attempts'));
          }
        }
      }
      
      // Continue processing pending messages
      messageProcessingRef.current = setTimeout(processMessages, 1000);
    };
    
    // Start the message processing cycle
    messageProcessingRef.current = setTimeout(processMessages, 1000);
    
    return () => {
      if (messageProcessingRef.current) {
        clearTimeout(messageProcessingRef.current);
        messageProcessingRef.current = null;
      }
    };
  }, [onError]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    // Try to send immediately if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
        return; // Message sent successfully
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        // Will fall through to queue the message
      }
    }
    
    // Queue the message for later if sending failed or not connected
    console.warn('WebSocket not ready. Queueing message and attempting to reconnect...');
    
    // Queue low priority messages only if there aren't too many already
    if (message.type === 'interim' && pendingMessagesRef.current.length > 5) {
      console.log('Too many messages queued, dropping interim message');
      return;
    }
    
    // Add to pending messages
    pendingMessagesRef.current.push({
      message,
      attempts: 0
    });
    
    // Try to reconnect if needed
    if (!isConnected) {
      connect();
    }
  }, [isConnected, connect]);

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
        wsRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect]);

  // Check connection periodically (heartbeat) and send ping messages
  useEffect(() => {
    const pingInterval = 20000; // 20 seconds
    const heartbeatInterval = 5000; // 5 seconds
    let pingTimeoutId: NodeJS.Timeout | null = null;
    
    // Function to send a ping to the server
    const sendPing = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          // Send a ping message
          wsRef.current.send(JSON.stringify({
            type: 'ping',
            timestamp: Date.now()
          }));
          console.log('Sent ping to server');
          lastActivity.current = Date.now();
        } catch (e) {
          console.error('Error sending ping:', e);
        }
      }
    };
    
    // Set up a heartbeat that checks connection health
    const heartbeat = setInterval(() => {
      const currentTime = Date.now();
      const inactiveTime = currentTime - lastActivity.current;
      
      // If connected but WebSocket state is not OPEN
      if (isConnected && wsRef.current?.readyState !== WebSocket.OPEN) {
        console.log('WebSocket connection lost (state not OPEN). Reconnecting...');
        setIsConnected(false);
        connect();
        return;
      }
      
      // If connected but inactive for too long (60s)
      if (isConnected && inactiveTime > 60000) {
        console.log(`WebSocket connection may be stale (inactive for ${inactiveTime}ms). Reconnecting...`);
        
        // Try to gracefully close before reconnecting
        if (wsRef.current) {
          try {
            wsRef.current.close(1000, 'Connection stale');
          } catch (e) {
            console.error('Error closing stale connection:', e);
          }
          wsRef.current = null;
        }
        
        setIsConnected(false);
        connect();
        return;
      }
      
      // If connected but haven't pinged recently, send a ping
      if (isConnected && inactiveTime > pingInterval) {
        console.log(`No activity for ${inactiveTime}ms, sending ping...`);
        sendPing();
        
        // Set a timeout to check if ping is responded to
        if (pingTimeoutId) clearTimeout(pingTimeoutId);
        pingTimeoutId = setTimeout(() => {
          const currentInactiveTime = Date.now() - lastActivity.current;
          if (currentInactiveTime > pingInterval) {
            console.log(`Ping not responded to after ${currentInactiveTime}ms. Connection may be dead. Reconnecting...`);
            if (wsRef.current) {
              try {
                wsRef.current.close(1000, 'Ping timeout');
              } catch (e) {
                console.error('Error closing connection after ping timeout:', e);
              }
              wsRef.current = null;
            }
            setIsConnected(false);
            connect();
          }
        }, 10000); // Wait 10s for ping response
      }
    }, heartbeatInterval);
    
    // Clean up on unmount
    return () => {
      clearInterval(heartbeat);
      if (pingTimeoutId) clearTimeout(pingTimeoutId);
    };
  }, [isConnected, connect]);

  return {
    isConnected,
    sendMessage,
    sendSpeech,
    sendContinuousSpeech
  };
}

export default useWebSocket;