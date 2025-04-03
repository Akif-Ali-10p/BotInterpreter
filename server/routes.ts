import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { storage } from "./storage";
import { insertMessageSchema, insertSettingsSchema } from "@shared/schema";
import { z } from "zod";
import { translateWithFallback, detectWithFallback } from "./azureTranslateService";

// For session ID generation
function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // GET session ID
  app.get("/api/session", (req: Request, res: Response) => {
    const sessionId = generateSessionId();
    res.json({ sessionId });
  });

  // GET messages for a session
  app.get("/api/messages/:sessionId", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const messages = await storage.getMessages(sessionId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve messages" });
    }
  });

  // POST new message
  app.post("/api/messages", async (req: Request, res: Response) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const savedMessage = await storage.createMessage(messageData);
      res.status(201).json(savedMessage);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid message data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to save message" });
      }
    }
  });

  // DELETE all messages for a session
  app.delete("/api/messages/:sessionId", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      await storage.clearMessages(sessionId);
      res.status(200).json({ message: "Conversation cleared" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear messages" });
    }
  });

  // GET settings
  app.get("/api/settings/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const settings = await storage.getSettings(userId);
      
      if (settings) {
        res.json(settings);
      } else {
        // Create default settings if none exist
        const defaultSettings = await storage.createOrUpdateSettings({ userId });
        res.json(defaultSettings);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve settings" });
    }
  });

  // POST/PUT settings
  app.post("/api/settings", async (req: Request, res: Response) => {
    try {
      // Validate only the userId field as required, others are optional
      const settingsSchema = z.object({
        userId: z.string()
      }).and(insertSettingsSchema.partial());
      
      const settingsData = settingsSchema.parse(req.body);
      const savedSettings = await storage.createOrUpdateSettings(settingsData);
      res.status(200).json(savedSettings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid settings data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to save settings" });
      }
    }
  });

  // POST translate endpoint using Azure Translator
  app.post("/api/translate", async (req: Request, res: Response) => {
    try {
      const { text, source, target } = req.body;
      
      if (!text || !target) {
        return res.status(400).json({ 
          message: "Missing required fields. 'text' and 'target' are required." 
        });
      }

      // Use Azure Translator with fallback to mock service
      const result = await translateWithFallback(text, source, target);
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        message: "Translation failed", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // POST detect language endpoint using Azure Translator
  app.post("/api/detect", async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      // Use Azure Translator with fallback to mock service for language detection
      const result = await detectWithFallback(text);
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        message: "Language detection failed", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time communication
  // Ensure we use a specific path to not conflict with Vite's dev WebSocket 
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    // Add some server-level error handling
    clientTracking: true,
    perMessageDeflate: {
      zlibDeflateOptions: { level: 6 }, // Higher compression level for better performance
    }
  });
  
  // Keep track of sessions and their connections
  const sessions = new Map<string, Set<WebSocket>>();
  
  // Keep track of last activity time for each connection
  const lastActivity = new Map<WebSocket, number>();
  
  // Clean up inactive connections periodically
  const INACTIVE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  const connectionCleanupInterval = setInterval(() => {
    const now = Date.now();
    
    // Check each connection's last activity time
    lastActivity.forEach((lastTime, ws) => {
      if (now - lastTime > INACTIVE_TIMEOUT) {
        // Connection has been inactive, close it
        console.log('Closing inactive WebSocket connection');
        try {
          ws.close(1000, 'Connection timeout due to inactivity');
        } catch (err) {
          console.error('Error closing inactive connection:', err);
        }
      }
    });
    
    // Also clean up any broken connections
    if (wss.clients) {
      wss.clients.forEach(client => {
        // Check for broken connections or connections without activity
        if (client.readyState !== WebSocket.OPEN && client.readyState !== WebSocket.CONNECTING ||
            !lastActivity.has(client)) {
          try {
            console.log('Terminating broken or stale WebSocket connection');
            client.terminate();
          } catch (err) {
            console.error('Error terminating broken connection:', err);
          }
          lastActivity.delete(client);
          
          // Also remove from any sessions
          // Convert the entries to an array first to avoid iteration issues
          const sessionEntries = Array.from(sessions.entries());
          for (const [sessionId, clients] of sessionEntries) {
            if (clients.has(client)) {
              clients.delete(client);
              console.log(`Removed broken connection from session ${sessionId}`);
              
              // If no more clients in this session, clean up the session
              if (clients.size === 0) {
                sessions.delete(sessionId);
                console.log(`Removed empty session ${sessionId}`);
              }
            }
          }
        }
      });
    }
  }, 60000); // Check every minute
  
  // Handle WebSocket server-level errors
  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });
  
  wss.on('connection', (ws: WebSocket, req) => {
    const clientIp = req.socket.remoteAddress || 'unknown';
    console.log(`WebSocket client connected from ${clientIp}`);
    
    // Initialize connection tracking
    lastActivity.set(ws, Date.now());
    
    // Set up ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.ping();
        } catch (err) {
          console.error('Error sending ping:', err);
        }
      } else {
        clearInterval(pingInterval);
      }
    }, 30000); // Ping every 30 seconds
    
    // Track client session
    let clientSessionId: string | null = null;
    
    // Update activity timestamp on pong response
    ws.on('pong', () => {
      lastActivity.set(ws, Date.now());
    });
    
    // Handle messages from clients
    ws.on('message', async (message: string) => {
      // Update last activity time
      lastActivity.set(ws, Date.now());
      
      let data: any;
      
      // Parse the message
      try {
        data = JSON.parse(message);
        
        // Validate message format
        if (!data.type) {
          throw new Error('Message missing type field');
        }
      } catch (error) {
        console.error('Invalid WebSocket message format:', error);
        safeWSend(ws, JSON.stringify({ 
          type: 'error', 
          message: 'Invalid message format' 
        }));
        return;
      }
      
      // Handle different message types
      try {
        switch (data.type) {
          case 'join':
            // Client is joining a session
            if (!data.sessionId || typeof data.sessionId !== 'string') {
              safeWSend(ws, JSON.stringify({ 
                type: 'error', 
                message: 'Invalid session ID' 
              }));
              break;
            }
            
            clientSessionId = data.sessionId;
            
            // We've already validated sessionId is a string above
            const sessionId = clientSessionId as string;
            
            // Add client to session
            if (!sessions.has(sessionId)) {
              sessions.set(sessionId, new Set());
            }
            sessions.get(sessionId)!.add(ws);
            
            console.log(`Client joined session: ${sessionId} (${sessions.get(sessionId)!.size} clients)`);
            
            // Confirm join to client
            safeWSend(ws, JSON.stringify({ 
              type: 'join',
              success: true,
              sessionId: sessionId
            }));
            break;
            
          case 'speech':
            // Real-time speech transcription
            if (!clientSessionId) {
              safeWSend(ws, JSON.stringify({ 
                type: 'error', 
                message: 'Not joined to a session' 
              }));
              break;
            }
            
            // We know clientSessionId is a string at this point
            const speechSessionId = clientSessionId as string;
            
            // Validate required fields
            if (!data.text || typeof data.speakerId !== 'number' || !data.targetLanguage) {
              safeWSend(ws, JSON.stringify({ 
                type: 'error', 
                message: 'Missing required fields for speech message' 
              }));
              break;
            }
            
            const { text, speakerId, language, targetLanguage } = data;
            
            try {
              // First detect language if not provided
              let sourceLanguage = language;
              if (!sourceLanguage) {
                const detection = await detectWithFallback(text);
                sourceLanguage = detection.language;
              }
              
              // Then translate
              const translation = await translateWithFallback(text, sourceLanguage, targetLanguage);
              
              // Create message object
              const message = {
                sessionId: speechSessionId,
                speakerId,
                originalText: text,
                translatedText: translation.translatedText,
                originalLanguage: sourceLanguage,
                targetLanguage,
                timestamp: new Date()
              };
              
              // Save to database
              const savedMessage = await storage.createMessage(message);
              
              // Broadcast to all clients in the session
              const clients = sessions.get(speechSessionId);
              if (clients && clients.size > 0) {
                const messageToSend = JSON.stringify({
                  type: 'translation',
                  message: savedMessage
                });
                
                broadcastToSession(speechSessionId, messageToSend);
              }
            } catch (error) {
              console.error('Error processing real-time speech:', error);
              safeWSend(ws, JSON.stringify({ 
                type: 'error', 
                message: 'Failed to process speech: ' + (error instanceof Error ? error.message : 'Unknown error')
              }));
            }
            break;
            
          case 'continuous':
            // Real-time continuous transcription without saving to database
            if (!clientSessionId) {
              safeWSend(ws, JSON.stringify({ 
                type: 'error', 
                message: 'Not joined to a session' 
              }));
              break;
            }
            
            // We know clientSessionId is a string at this point
            const continuousSessionId = clientSessionId as string;
            
            // Validate required fields
            if (!data.interimText || typeof data.finalSpeakerId !== 'number' || !data.targetLang) {
              safeWSend(ws, JSON.stringify({ 
                type: 'error', 
                message: 'Missing required fields for continuous message'
              }));
              break;
            }
            
            const { interimText, finalSpeakerId, targetLang } = data;
            
            // Broadcast the interim text to all clients in the session
            const interimData = JSON.stringify({
              type: 'interim',
              speakerId: finalSpeakerId,
              text: interimText
            });
            
            broadcastToSession(continuousSessionId, interimData);
            break;
            
          case 'ping':
            // Handle ping message by sending pong response
            safeWSend(ws, JSON.stringify({
              type: 'pong',
              timestamp: data.timestamp,
              serverTime: Date.now()
            }));
            break;
            
          default:
            console.warn(`Unknown message type: ${data.type}`);
            safeWSend(ws, JSON.stringify({ 
              type: 'error', 
              message: `Unknown message type: ${data.type}`
            }));
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        safeWSend(ws, JSON.stringify({ 
          type: 'error', 
          message: 'Internal server error' 
        }));
      }
    });
    
    // Handle client errors
    ws.on('error', (error) => {
      console.error('WebSocket client error:', error);
      // Try to gracefully close on error
      try {
        ws.close(1011, 'Internal server error');
      } catch (e) {
        console.error('Error closing WebSocket connection after error:', e);
      }
    });
    
    // Handle client disconnection
    ws.on('close', (code, reason) => {
      console.log(`WebSocket client disconnected (${code}: ${reason || 'No reason provided'})`);
      
      // Clear intervals
      clearInterval(pingInterval);
      
      // Clean up activity tracking
      lastActivity.delete(ws);
      
      if (clientSessionId) {
        // Cast to string since we know it's not null
        const sessionId = clientSessionId as string;
        
        if (sessions.has(sessionId)) {
          // Remove client from session
          const clients = sessions.get(sessionId)!;
          clients.delete(ws);
          
          console.log(`Client left session ${sessionId} (${clients.size} clients remaining)`);
          
          // Clean up empty session
          if (clients.size === 0) {
            console.log(`Removing empty session: ${sessionId}`);
            sessions.delete(sessionId);
          }
        }
      }
    });
    
    // Utility function for safer WebSocket sending
    function safeWSend(ws: WebSocket, data: string) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(data);
        } catch (error) {
          console.error('Error sending WebSocket message:', error);
          // Try to close the connection if it's in a bad state
          try {
            ws.close(1011, 'Send failed');
          } catch (e) {
            // Last resort
            ws.terminate();
          }
        }
      }
    }
    
    // Utility function to broadcast to all clients in a session
    function broadcastToSession(sessionId: string, data: string) {
      const clients = sessions.get(sessionId);
      if (!clients) return;
      
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          safeWSend(client, data);
        }
      });
    }
  });
  
  // When server is closing, clean up the interval
  httpServer.on('close', () => {
    clearInterval(connectionCleanupInterval);
  });
  
  return httpServer;
}
