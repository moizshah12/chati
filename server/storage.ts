import { users, rooms, messages, type User, type InsertUser, type Room, type InsertRoom, type Message, type InsertMessage, type MessageWithUser } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Rooms
  getRoom(id: number): Promise<Room | undefined>;
  getRoomByName(name: string): Promise<Room | undefined>;
  getAllRooms(): Promise<Room[]>;
  createRoom(room: InsertRoom): Promise<Room>;
  
  // Messages
  getMessagesByRoom(roomId: number, limit?: number): Promise<MessageWithUser[]>;
  createMessage(message: InsertMessage): Promise<MessageWithUser>;
}

export class DatabaseStorage implements IStorage {
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

  async getRoom(id: number): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room || undefined;
  }

  async getRoomByName(name: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.name, name));
    return room || undefined;
  }

  async getAllRooms(): Promise<Room[]> {
    return await db.select().from(rooms);
  }

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const [room] = await db
      .insert(rooms)
      .values(insertRoom)
      .returning();
    return room;
  }

  async getMessagesByRoom(roomId: number, limit: number = 50): Promise<MessageWithUser[]> {
    const result = await db
      .select({
        id: messages.id,
        content: messages.content,
        roomId: messages.roomId,
        userId: messages.userId,
        isBot: messages.isBot,
        createdAt: messages.createdAt,
        user: {
          id: users.id,
          username: users.username,
          password: users.password
        }
      })
      .from(messages)
      .leftJoin(users, eq(messages.userId, users.id))
      .where(eq(messages.roomId, roomId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    return result
      .reverse()
      .map(row => ({
        id: row.id,
        content: row.content,
        roomId: row.roomId,
        userId: row.userId,
        isBot: row.isBot,
        createdAt: row.createdAt,
        user: row.user && row.user.id ? row.user : null
      }));
  }

  async createMessage(insertMessage: InsertMessage): Promise<MessageWithUser> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();

    // Get the user if userId exists
    let user: User | null = null;
    if (message.userId) {
      const [foundUser] = await db.select().from(users).where(eq(users.id, message.userId));
      user = foundUser || null;
    }

    return {
      ...message,
      user
    };
  }
}

export const storage = new DatabaseStorage();
