import { 
  messages, 
  type Message, 
  type InsertMessage,
  settings,
  type Settings,
  type InsertSettings,
  users,
  type User,
  type InsertUser
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Message management
  getMessages(sessionId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  clearMessages(sessionId: string): Promise<void>;
  
  // Settings management
  getSettings(userId: string): Promise<Settings | undefined>;
  createOrUpdateSettings(settings: Partial<InsertSettings> & { userId: string }): Promise<Settings>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Message methods
  async getMessages(sessionId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(messages.timestamp);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const messageWithTimestamp = {
      ...insertMessage,
      timestamp: new Date()
    };
    
    const [message] = await db
      .insert(messages)
      .values(messageWithTimestamp)
      .returning();
    
    return message;
  }

  async clearMessages(sessionId: string): Promise<void> {
    await db
      .delete(messages)
      .where(eq(messages.sessionId, sessionId));
  }

  // Settings methods
  async getSettings(userId: string): Promise<Settings | undefined> {
    const [setting] = await db
      .select()
      .from(settings)
      .where(eq(settings.userId, userId));
    
    return setting || undefined;
  }

  async createOrUpdateSettings(partialSettings: Partial<InsertSettings> & { userId: string }): Promise<Settings> {
    // Check if settings already exist for this user
    const existingSettings = await this.getSettings(partialSettings.userId);
    
    if (existingSettings) {
      // Update existing settings
      const [updatedSettings] = await db
        .update(settings)
        .set(partialSettings)
        .where(eq(settings.id, existingSettings.id))
        .returning();
      
      return updatedSettings;
    } else {
      // Create new settings with defaults and merge with partialSettings
      const defaultValues = {
        autoDetect: true,
        speechRate: "1.0",
        voiceSelection: "default",
        darkMode: false,
        saveHistory: true,
        person1Language: "en-US",
        person2Language: "es-ES"
      };
      
      // Combine defaults with partial settings, ensuring userId is only specified once
      const defaultSettings = { ...defaultValues, ...partialSettings };
      
      const [newSettings] = await db
        .insert(settings)
        .values(defaultSettings)
        .returning();
      
      return newSettings;
    }
  }
}

export const storage = new DatabaseStorage();
