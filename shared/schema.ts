import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema for authentication (if needed later)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Message schema for storing conversation history
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  speakerId: integer("speaker_id").notNull(), // 1 or 2 for person1/person2
  originalText: text("original_text").notNull(),
  translatedText: text("translated_text").notNull(),
  originalLanguage: text("original_language").notNull(),
  targetLanguage: text("target_language").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Settings schema for user preferences
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(), // Can be a session ID if not using authentication
  autoDetect: boolean("auto_detect").notNull().default(true),
  speechRate: text("speech_rate").notNull().default("1.0"),
  voiceSelection: text("voice_selection").notNull().default("default"),
  darkMode: boolean("dark_mode").notNull().default(false),
  saveHistory: boolean("save_history").notNull().default(true),
  person1Language: text("person1_language").notNull().default("en-US"),
  person2Language: text("person2_language").notNull().default("es-ES"),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
});

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;
