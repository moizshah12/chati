import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sidebar } from '@/components/chat/sidebar';
import { ChatArea } from '@/components/chat/chat-area';
import { useSocket } from '@/hooks/use-socket';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Room, MessageWithUser, User } from '@shared/schema';

interface ChatUser {
  id: number;
  username: string;
}

export default function Chat() {
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<MessageWithUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Socket connection
  const { socket, isConnected, joinRoom, sendChatMessage, startTyping, stopTyping } = useSocket(
    currentUser?.id,
    currentUser?.username
  );

  // Fetch rooms
  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ['/api/rooms'],
    enabled: !!currentUser
  });

  // Create room mutation
  const createRoomMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      const response = await apiRequest('POST', '/api/rooms', { name, description });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      toast({ title: 'Room created successfully!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to create room', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // User registration/login mutations
  const registerMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const response = await apiRequest('POST', '/api/users', { username, password });
      return response.json();
    },
    onSuccess: (user) => {
      setCurrentUser(user);
      toast({ title: 'Registration successful!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Registration failed', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const response = await apiRequest('POST', '/api/auth/login', { username, password });
      return response.json();
    },
    onSuccess: (user) => {
      setCurrentUser(user);
      toast({ title: 'Login successful!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Login failed', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Handle socket messages
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'room_messages':
            if (data.roomId === currentRoom?.id) {
              setMessages(data.messages);
            }
            break;
            
          case 'new_message':
            setMessages(prev => [...prev, data.message]);
            break;
            
          case 'typing_start':
            setTypingUsers(prev => 
              prev.includes(data.username) ? prev : [...prev, data.username]
            );
            break;
            
          case 'typing_stop':
            setTypingUsers(prev => prev.filter(user => user !== data.username));
            break;
            
          case 'online_users':
            setOnlineUsers(data.users);
            break;
            
          case 'room_created':
            queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
            break;
            
          case 'error':
            toast({ 
              title: 'Error', 
              description: data.message,
              variant: 'destructive' 
            });
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket, currentRoom?.id, queryClient, toast]);

  // Auto-select first room when rooms are loaded
  useEffect(() => {
    if (rooms.length > 0 && !currentRoom) {
      setCurrentRoom(rooms[0]);
    }
  }, [rooms, currentRoom]);

  // Join room when current room changes
  useEffect(() => {
    if (currentRoom && isConnected) {
      joinRoom(currentRoom.id);
    }
  }, [currentRoom, isConnected, joinRoom]);

  // Handle room selection
  const handleRoomSelect = (room: Room) => {
    setCurrentRoom(room);
    setIsMobileMenuOpen(false);
  };

  // Handle creating new room
  const handleCreateRoom = (name: string, description: string) => {
    createRoomMutation.mutate({ name, description });
  };

  // Handle sending message
  const handleSendMessage = (content: string) => {
    if (currentRoom && isConnected) {
      sendChatMessage(content);
    }
  };

  // Login/Register form
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#36393F] flex items-center justify-center">
        <div className="bg-[#2F3136] p-8 rounded-lg shadow-lg w-full max-w-md">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">
            {isLoginMode ? 'Login to ChatBot' : 'Join ChatBot'}
          </h1>
          
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const username = formData.get('username') as string;
              const password = formData.get('password') as string;
              
              if (isLoginMode) {
                loginMutation.mutate({ username, password });
              } else {
                registerMutation.mutate({ username, password });
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-[#DCDDDE] mb-2">
                Username
              </label>
              <input
                name="username"
                type="text"
                required
                className="w-full px-3 py-2 bg-[#36393F] border border-[#4F545C] rounded-lg text-[#DCDDDE] focus:outline-none focus:ring-2 focus:ring-[#5865F2]"
                placeholder="Enter your username"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#DCDDDE] mb-2">
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                className="w-full px-3 py-2 bg-[#36393F] border border-[#4F545C] rounded-lg text-[#DCDDDE] focus:outline-none focus:ring-2 focus:ring-[#5865F2]"
                placeholder="Enter your password"
              />
            </div>
            
            <button
              type="submit"
              disabled={loginMutation.isPending || registerMutation.isPending}
              className="w-full bg-[#5865F2] hover:bg-[#5865F2]/80 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loginMutation.isPending || registerMutation.isPending
                ? 'Please wait...'
                : isLoginMode
                ? 'Login'
                : 'Register'
              }
            </button>
          </form>
          
          <div className="mt-4 text-center">
            <button
              onClick={() => setIsLoginMode(!isLoginMode)}
              className="text-[#5865F2] hover:underline"
            >
              {isLoginMode 
                ? "Don't have an account? Register" 
                : 'Already have an account? Login'
              }
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#36393F] text-[#DCDDDE] font-inter">
      {/* Connection Status */}
      {!isConnected && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium z-50">
          Disconnected - Reconnecting...
        </div>
      )}

      <div className="flex h-screen">
        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden">
            <div className="fixed inset-y-0 left-0 w-80 transform transition-transform duration-300 ease-in-out">
              <Sidebar
                rooms={rooms}
                currentRoom={currentRoom}
                onRoomSelect={handleRoomSelect}
                onCreateRoom={handleCreateRoom}
                currentUser={currentUser}
                onlineUsers={onlineUsers}
              />
            </div>
          </div>
        )}

        {/* Desktop Sidebar */}
        <Sidebar
          rooms={rooms}
          currentRoom={currentRoom}
          onRoomSelect={handleRoomSelect}
          onCreateRoom={handleCreateRoom}
          currentUser={currentUser}
          onlineUsers={onlineUsers}
          className="hidden lg:flex"
        />

        {/* Chat Area */}
        <ChatArea
          currentRoom={currentRoom}
          messages={messages}
          typingUsers={typingUsers}
          onSendMessage={handleSendMessage}
          onStartTyping={startTyping}
          onStopTyping={stopTyping}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
      </div>
    </div>
  );
}
