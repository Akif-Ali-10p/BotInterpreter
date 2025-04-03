import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { storage } from "./storage";
import { insertMessageSchema, insertSettingsSchema } from "@shared/schema";
import { z } from "zod";
import { mockTranslate, mockDetect } from "./mockTranslation";

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

  // POST translate endpoint using mock translation
  app.post("/api/translate", async (req: Request, res: Response) => {
    try {
      const { text, source, target } = req.body;
      
      if (!text || !target) {
        return res.status(400).json({ 
          message: "Missing required fields. 'text' and 'target' are required." 
        });
      }

      // Use mock translation service instead of external API
      const result = await mockTranslate(text, source, target);
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        message: "Translation failed", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // POST detect language endpoint using mock detection
  app.post("/api/detect", async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      // Use mock language detection service
      const result = await mockDetect(text);
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
    path: '/ws' 
  });
  
  // Keep track of sessions and their connections
  const sessions = new Map<string, WebSocket[]>();
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    let clientSessionId: string | null = null;
    
    // Handle messages from clients
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        
        switch (data.type) {
          case 'join':
            // Client is joining a session
            clientSessionId = data.sessionId;
            
            // Make sure clientSessionId is a string
            if (clientSessionId) {
              // Add client to session
              if (!sessions.has(clientSessionId)) {
                sessions.set(clientSessionId, []);
              }
              sessions.get(clientSessionId)!.push(ws);
            }
            
            console.log(`Client joined session: ${clientSessionId}`);
            break;
            
          case 'speech':
            // Real-time speech transcription
            if (!clientSessionId) {
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'Not joined to a session' 
              }));
              break;
            }
            
            const { text, speakerId, language, targetLanguage } = data;
            
            try {
              // First detect language if not provided
              let sourceLanguage = language;
              if (!sourceLanguage) {
                const detection = await mockDetect(text);
                sourceLanguage = detection.language;
              }
              
              // Then translate
              const translation = await mockTranslate(text, sourceLanguage, targetLanguage);
              
              // Create message object
              const message = {
                sessionId: clientSessionId,
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
              const clients = sessions.get(clientSessionId)!;
              const messageToSend = JSON.stringify({
                type: 'translation',
                message: savedMessage
              });
              
              for (const client of clients) {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(messageToSend);
                }
              }
            } catch (error) {
              console.error('Error processing real-time speech:', error);
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'Failed to process speech' 
              }));
            }
            break;
            
          case 'continuous':
            // Real-time continuous transcription without saving to database
            if (!clientSessionId) {
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'Not joined to a session' 
              }));
              break;
            }
            
            const { interimText, finalSpeakerId, targetLang } = data;
            
            // Broadcast the interim text to all clients in the session
            const sessionClients = sessions.get(clientSessionId)!;
            const interimData = JSON.stringify({
              type: 'interim',
              speakerId: finalSpeakerId,
              text: interimText
            });
            
            for (const client of sessionClients) {
              if (client.readyState === WebSocket.OPEN) {
                client.send(interimData);
              }
            }
            break;
            
          default:
            console.warn(`Unknown message type: ${data.type}`);
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });
    
    // Handle client disconnection
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      if (clientSessionId && sessions.has(clientSessionId)) {
        // Remove client from session
        const clients = sessions.get(clientSessionId)!;
        const index = clients.indexOf(ws);
        if (index !== -1) {
          clients.splice(index, 1);
        }
        
        // Clean up empty session
        if (clients.length === 0) {
          sessions.delete(clientSessionId);
        }
      }
    });
  });
  
  return httpServer;
}
