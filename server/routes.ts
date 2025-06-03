import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import OpenAI from "openai";
import { storage } from "./storage";
import { insertMessageSchema, insertRoomSchema, insertUserSchema } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

interface ConnectedClient {
  ws: WebSocket;
  userId?: number;
  username?: string;
  currentRoom?: number;
}

const connectedClients = new Map<WebSocket, ConnectedClient>();

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser(userData);
      res.json({ id: user.id, username: user.username });
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      
      if (user && user.password === password) {
        res.json({ id: user.id, username: user.username });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Room routes
  app.get("/api/rooms", async (req, res) => {
    try {
      const rooms = await storage.getAllRooms();
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });

  app.post("/api/rooms", async (req, res) => {
    try {
      const roomData = insertRoomSchema.parse(req.body);
      
      // Check if room already exists
      const existingRoom = await storage.getRoomByName(roomData.name);
      if (existingRoom) {
        return res.status(400).json({ message: "Room already exists" });
      }

      const room = await storage.createRoom(roomData);
      
      // Broadcast new room to all clients
      broadcastToAll({
        type: "room_created",
        room
      });

      res.json(room);
    } catch (error) {
      res.status(400).json({ message: "Invalid room data" });
    }
  });

  // Message routes
  app.get("/api/rooms/:roomId/messages", async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const messages = await storage.getMessagesByRoom(roomId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    
    connectedClients.set(ws, { ws });

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await handleWebSocketMessage(ws, message);
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      const client = connectedClients.get(ws);
      if (client?.username) {
        broadcastToRoom(client.currentRoom, {
          type: 'user_left',
          username: client.username
        }, ws);
      }
      connectedClients.delete(ws);
      console.log('WebSocket connection closed');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      connectedClients.delete(ws);
    });
  });

  async function handleWebSocketMessage(ws: WebSocket, message: any) {
    const client = connectedClients.get(ws);
    if (!client) {
      console.log('No client found for WebSocket');
      return;
    }

    console.log('Received WebSocket message:', message.type, message);

    switch (message.type) {
      case 'join':
        await handleJoin(ws, message);
        break;
      case 'join_room':
        await handleJoinRoom(ws, message);
        break;
      case 'send_message':
        console.log('Handling send_message for client:', client.userId, client.currentRoom);
        await handleSendMessage(ws, message);
        break;
      case 'typing_start':
        handleTypingStart(ws, message);
        break;
      case 'typing_stop':
        handleTypingStop(ws, message);
        break;
      default:
        console.log('Unknown message type:', message.type);
        ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
    }
  }

  async function handleJoin(ws: WebSocket, message: any) {
    const client = connectedClients.get(ws);
    if (!client) return;

    const { userId, username } = message;
    client.userId = userId;
    client.username = username;

    ws.send(JSON.stringify({
      type: 'joined',
      userId,
      username
    }));

    // Send list of online users
    const onlineUsers = Array.from(connectedClients.values())
      .filter(c => c.username && c.userId)
      .map(c => ({ id: c.userId, username: c.username }));

    ws.send(JSON.stringify({
      type: 'online_users',
      users: onlineUsers
    }));
  }

  async function handleJoinRoom(ws: WebSocket, message: any) {
    const client = connectedClients.get(ws);
    if (!client) return;

    const { roomId } = message;
    client.currentRoom = roomId;

    // Send recent messages for the room
    const messages = await storage.getMessagesByRoom(roomId);
    ws.send(JSON.stringify({
      type: 'room_messages',
      roomId,
      messages
    }));

    // Notify others in the room
    if (client.username) {
      broadcastToRoom(roomId, {
        type: 'user_joined_room',
        username: client.username
      }, ws);
    }
  }

  async function handleSendMessage(ws: WebSocket, message: any) {
    const client = connectedClients.get(ws);
    console.log('handleSendMessage - client state:', {
      hasClient: !!client,
      userId: client?.userId,
      currentRoom: client?.currentRoom
    });
    
    if (!client || !client.userId || !client.currentRoom) {
      console.log('Missing required client data - cannot send message');
      ws.send(JSON.stringify({ type: 'error', message: 'Not properly connected to room' }));
      return;
    }

    try {
      const { content } = message;
      console.log('Sending message content:', content);
      
      // Create and save the message
      const messageData = insertMessageSchema.parse({
        content,
        userId: client.userId,
        roomId: client.currentRoom,
        isBot: false
      });

      console.log('Message data to save:', messageData);
      const savedMessage = await storage.createMessage(messageData);
      console.log('Message saved successfully:', savedMessage);

      // Broadcast message to all clients in the room
      broadcastToRoom(client.currentRoom, {
        type: 'new_message',
        message: savedMessage
      });

      console.log('Message broadcasted to room:', client.currentRoom);

      // Check if message mentions AI or is a command
      if (content.includes('@AI') || content.startsWith('/')) {
        setTimeout(() => {
          handleAIResponse(content, client.currentRoom!);
        }, 1000);
      }

    } catch (error) {
      console.error('Error saving message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to send message' }));
    }
  }

  async function handleAIResponse(originalMessage: string, roomId: number) {
    try {
      // Get AI bot user
      const botUser = await storage.getUserByUsername("AI Assistant");
      if (!botUser) return;

      // Show typing indicator
      broadcastToRoom(roomId, {
        type: 'typing_start',
        username: 'AI Assistant'
      });

      let aiResponse = "";

      // Handle specific commands
      if (originalMessage.startsWith('/help')) {
        aiResponse = "Here are some commands you can use:\n• @AI [question] - Ask me anything\n• /help - Show this help message\n• /joke - Get a random joke\n• /weather - Ask about weather (I'll explain my limitations)\n\nI'm here to help with questions, creative writing, programming, and general knowledge!";
      } else if (originalMessage.startsWith('/joke')) {
        aiResponse = "Why don't scientists trust atoms? Because they make up everything! 😄\n\nWant another joke? Just ask!";
      } else {
        // Generate AI response using OpenAI
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a helpful AI assistant in a chat room. Be friendly, concise, and engaging. Use emojis occasionally. If someone asks about weather or real-time data, explain that you don't have access to that information but offer to help with other things."
            },
            {
              role: "user",
              content: originalMessage.replace('@AI', '').trim()
            }
          ],
          max_tokens: 200
        });

        aiResponse = response.choices[0].message.content || "I'm sorry, I couldn't generate a response right now. Please try again!";
      }

      // Stop typing indicator
      broadcastToRoom(roomId, {
        type: 'typing_stop',
        username: 'AI Assistant'
      });

      // Create AI message
      const aiMessageData = insertMessageSchema.parse({
        content: aiResponse,
        userId: botUser.id,
        roomId,
        isBot: true
      });

      const savedAIMessage = await storage.createMessage(aiMessageData);

      // Broadcast AI response
      broadcastToRoom(roomId, {
        type: 'new_message',
        message: savedAIMessage
      });

    } catch (error) {
      console.error('AI response error:', error);
      
      // Stop typing indicator on error
      broadcastToRoom(roomId, {
        type: 'typing_stop',
        username: 'AI Assistant'
      });

      // Send error response
      try {
        const botUser = await storage.getUserByUsername("AI Assistant");
        if (botUser) {
          const errorMessage = await storage.createMessage({
            content: "I'm experiencing some technical difficulties right now. Please try again later! 🤖",
            userId: botUser.id,
            roomId,
            isBot: true
          });

          broadcastToRoom(roomId, {
            type: 'new_message',
            message: errorMessage
          });
        }
      } catch (err) {
        console.error('Error sending AI error message:', err);
      }
    }
  }

  function handleTypingStart(ws: WebSocket, message: any) {
    const client = connectedClients.get(ws);
    if (!client || !client.username || !client.currentRoom) return;

    broadcastToRoom(client.currentRoom, {
      type: 'typing_start',
      username: client.username
    }, ws);
  }

  function handleTypingStop(ws: WebSocket, message: any) {
    const client = connectedClients.get(ws);
    if (!client || !client.username || !client.currentRoom) return;

    broadcastToRoom(client.currentRoom, {
      type: 'typing_stop',
      username: client.username
    }, ws);
  }

  function broadcastToRoom(roomId: number | undefined, message: any, excludeWs?: WebSocket) {
    if (!roomId) return;
    
    connectedClients.forEach((client) => {
      if (client.currentRoom === roomId && client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  function broadcastToAll(message: any, excludeWs?: WebSocket) {
    connectedClients.forEach((client) => {
      if (client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  return httpServer;
}
