import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Hash, Settings, Bot, User } from 'lucide-react';
import type { Room, User as UserType } from '@shared/schema';

interface SidebarProps {
  rooms: Room[];
  currentRoom: Room | null;
  onRoomSelect: (room: Room) => void;
  onCreateRoom: (name: string, description: string) => void;
  currentUser: UserType | null;
  onlineUsers: UserType[];
  className?: string;
}

export function Sidebar({ 
  rooms, 
  currentRoom, 
  onRoomSelect, 
  onCreateRoom, 
  currentUser,
  onlineUsers,
  className = ""
}: SidebarProps) {
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');

  const handleCreateRoom = () => {
    if (newRoomName.trim()) {
      onCreateRoom(newRoomName.trim(), newRoomDescription.trim());
      setNewRoomName('');
      setNewRoomDescription('');
      setIsCreateRoomOpen(false);
    }
  };

  return (
    <div className={`flex flex-col w-80 bg-[#2F3136] border-r border-[#4F545C] ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#4F545C]">
        <h1 className="text-xl font-bold text-white">ChatBot</h1>
        <Button variant="ghost" size="icon" className="text-[#DCDDDE] hover:bg-[#40444B]">
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* User Profile */}
      {currentUser && (
        <div className="p-4 border-b border-[#4F545C]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-medium text-white">{currentUser.username}</div>
              <div className="text-sm text-[#72767D]">Online</div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Rooms List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#72767D] uppercase tracking-wide">Chat Rooms</h3>
            <Dialog open={isCreateRoomOpen} onOpenChange={setIsCreateRoomOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="p-1 text-[#DCDDDE] hover:bg-[#40444B]">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Room</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Room Name</label>
                    <Input
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="e.g., gaming"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description (optional)</label>
                    <Input
                      value={newRoomDescription}
                      onChange={(e) => setNewRoomDescription(e.target.value)}
                      placeholder="What's this room about?"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleCreateRoom} className="flex-1">
                      Create Room
                    </Button>
                    <Button variant="outline" onClick={() => setIsCreateRoomOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="space-y-1">
            {rooms.map((room) => (
              <div
                key={room.id}
                onClick={() => onRoomSelect(room)}
                className={`flex items-center px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  currentRoom?.id === room.id
                    ? 'bg-[#5865F2] text-white'
                    : 'hover:bg-[#40444B] text-[#DCDDDE]'
                }`}
              >
                <Hash className="w-5 h-5 mr-3" />
                <span className="font-medium">{room.name}</span>
                {room.name === 'ai-playground' && (
                  <Bot className="w-4 h-4 ml-auto text-[#57F287]" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Online Users */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-[#72767D] uppercase tracking-wide mb-3">
            Online - {onlineUsers.length}
          </h3>
          <div className="space-y-2">
            {onlineUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center space-x-3 px-2 py-1 rounded hover:bg-[#40444B] cursor-pointer transition-colors"
              >
                {user.username === 'AI Assistant' ? (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5865F2] to-[#57F287] flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
                <div>
                  <div className={`text-sm font-medium ${
                    user.username === 'AI Assistant' ? 'text-[#57F287]' : 'text-[#DCDDDE]'
                  }`}>
                    {user.username}
                  </div>
                  <div className="text-xs text-[#72767D]">
                    {user.username === 'AI Assistant' ? 'Bot • Always active' : 'Active now'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
