import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema, insertSettingsSchema } from "@shared/schema";
import { z } from "zod";

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

  // POST translate endpoint using LibreTranslate API
  app.post("/api/translate", async (req: Request, res: Response) => {
    try {
      const { text, source, target } = req.body;
      
      if (!text || !target) {
        return res.status(400).json({ 
          message: "Missing required fields. 'text' and 'target' are required." 
        });
      }

      // Use LibreTranslate API (free and open-source)
      const response = await fetch("https://libretranslate.de/translate", {
        method: "POST",
        body: JSON.stringify({
          q: text,
          source: source || "auto", // Auto detect if not specified
          target: target,
          format: "text",
          api_key: ""  // Free tier
        }),
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) {
        const errorData = await response.text();
        return res.status(response.status).json({ 
          message: "Translation service error", 
          details: errorData 
        });
      }

      const data = await response.json();
      res.json({ 
        translatedText: data.translatedText,
        detectedLanguage: data.detectedLanguage?.language || source
      });
    } catch (error) {
      res.status(500).json({ 
        message: "Translation failed", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // POST detect language endpoint
  app.post("/api/detect", async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      // Use LibreTranslate API for language detection
      const response = await fetch("https://libretranslate.de/detect", {
        method: "POST",
        body: JSON.stringify({
          q: text
        }),
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) {
        const errorData = await response.text();
        return res.status(response.status).json({ 
          message: "Language detection error", 
          details: errorData 
        });
      }

      const detections = await response.json();
      // Return the highest confidence detection
      res.json(detections[0] || { language: "en", confidence: 0 });
    } catch (error) {
      res.status(500).json({ 
        message: "Language detection failed", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
