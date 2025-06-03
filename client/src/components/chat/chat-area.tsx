import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Hash, Menu, Users, Search, Send, Smile } from 'lucide-react';
import { Message } from './message';
import { TypingIndicator } from './typing-indicator';
import type { Room, MessageWithUser } from '@shared/schema';

interface ChatAreaProps {
  currentRoom: Room | null;
  messages: MessageWithUser[];
  typingUsers: string[];
  onSendMessage: (content: string) => void;
  onStartTyping: () => void;
  onStopTyping: () => void;
  onToggleMobileMenu: () => void;
}

export function ChatArea({
  currentRoom,
  messages,
  typingUsers,
  onSendMessage,
  onStartTyping,
  onStopTyping,
  onToggleMobileMenu
}: ChatAreaProps) {
  const [messageContent, setMessageContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing indicators
  useEffect(() => {
    if (isTyping) {
      onStartTyping();
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        onStopTyping();
      }, 2000);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isTyping, onStartTyping, onStopTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessageContent(value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }

    // Start typing indicator if not already typing
    if (value.trim() && !isTyping) {
      setIsTyping(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = () => {
    const trimmedContent = messageContent.trim();
    if (trimmedContent && currentRoom) {
      onSendMessage(trimmedContent);
      setMessageContent('');
      setIsTyping(false);
      onStopTyping();
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  if (!currentRoom) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#36393F]">
        <div className="text-center">
          <Hash className="w-16 h-16 text-[#72767D] mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">Welcome to ChatBot</h3>
          <p className="text-[#72767D]">Select a room to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#4F545C] bg-[#2F3136]">
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-[#DCDDDE] hover:bg-[#40444B]"
            onClick={onToggleMobileMenu}
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <Hash className="text-2xl text-[#72767D]" />
            <h2 className="text-xl font-semibold text-white">{currentRoom.name}</h2>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="text-[#DCDDDE] hover:bg-[#40444B]">
            <Users className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-[#DCDDDE] hover:bg-[#40444B]">
            <Search className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-[#36393F]">
        {/* Room Welcome */}
        <div className="text-center py-8">
          <Hash className="w-16 h-16 text-[#72767D] mx-auto mb-2" />
          <h3 className="text-2xl font-bold text-white mb-2">Welcome to #{currentRoom.name}</h3>
          <p className="text-[#72767D]">
            {currentRoom.description || `This is the start of the #${currentRoom.name} channel.`}
          </p>
        </div>

        {/* Messages */}
        <div className="space-y-1">
          {messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}
        </div>

        {/* Typing Indicator */}
        <TypingIndicator usernames={typingUsers} />

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 bg-[#2F3136] border-t border-[#4F545C]">
        <div className="flex items-end space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                placeholder={`Message #${currentRoom.name}`}
                className="w-full bg-[#36393F] text-[#DCDDDE] rounded-lg px-4 py-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-[#5865F2] border border-[#4F545C] placeholder-[#72767D]"
                rows={1}
                value={messageContent}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
              />
              
              {/* Emoji Button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-3 top-3 text-[#72767D] hover:text-[#DCDDDE]"
              >
                <Smile className="w-5 h-5" />
              </Button>
            </div>
            
            {/* AI Commands Helper */}
            <div className="text-xs text-[#72767D] mt-2 flex items-center space-x-4">
              <span>Tip: Use @AI to mention the bot</span>
              <span>•</span>
              <span>Try /help for commands</span>
            </div>
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!messageContent.trim()}
            className="bg-[#5865F2] hover:bg-[#5865F2]/80 text-white p-3 rounded-lg transition-colors flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
