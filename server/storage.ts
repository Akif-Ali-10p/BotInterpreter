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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private messages: Map<string, Message[]>;
  private settings: Map<string, Settings>;
  currentUserId: number;
  currentMessageId: number;
  currentSettingsId: number;

  constructor() {
    this.users = new Map();
    this.messages = new Map();
    this.settings = new Map();
    this.currentUserId = 1;
    this.currentMessageId = 1;
    this.currentSettingsId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Message methods
  async getMessages(sessionId: string): Promise<Message[]> {
    return this.messages.get(sessionId) || [];
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const message: Message = { 
      ...insertMessage, 
      id,
      timestamp: new Date() 
    };
    
    const sessionMessages = this.messages.get(insertMessage.sessionId) || [];
    sessionMessages.push(message);
    this.messages.set(insertMessage.sessionId, sessionMessages);
    
    return message;
  }

  async clearMessages(sessionId: string): Promise<void> {
    this.messages.set(sessionId, []);
  }

  // Settings methods
  async getSettings(userId: string): Promise<Settings | undefined> {
    return this.settings.get(userId);
  }

  async createOrUpdateSettings(partialSettings: Partial<InsertSettings> & { userId: string }): Promise<Settings> {
    const existingSettings = this.settings.get(partialSettings.userId);
    
    if (existingSettings) {
      const updatedSettings = { ...existingSettings, ...partialSettings };
      this.settings.set(partialSettings.userId, updatedSettings);
      return updatedSettings;
    } else {
      const id = this.currentSettingsId++;
      const defaultSettings: Settings = {
        id,
        userId: partialSettings.userId,
        autoDetect: true,
        speechRate: "1.0",
        voiceSelection: "default",
        darkMode: false,
        saveHistory: true,
        person1Language: "en-US",
        person2Language: "es-ES",
        ...partialSettings
      };
      this.settings.set(partialSettings.userId, defaultSettings);
      return defaultSettings;
    }
  }
}

export const storage = new MemStorage();
