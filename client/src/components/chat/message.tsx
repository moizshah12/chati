import { formatDistanceToNow } from 'date-fns';
import { Bot, User } from 'lucide-react';
import type { MessageWithUser } from '@shared/schema';

interface MessageProps {
  message: MessageWithUser;
}

export function Message({ message }: MessageProps) {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex items-start space-x-3 hover:bg-[#2F3136] hover:bg-opacity-30 px-4 py-2 rounded-lg transition-colors">
      {/* Avatar */}
      {message.isBot ? (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5865F2] to-[#57F287] flex items-center justify-center mt-1">
          <Bot className="w-5 h-5 text-white" />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center mt-1">
          <User className="w-5 h-5 text-white" />
        </div>
      )}

      {/* Message Content */}
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-1">
          <span className={`font-semibold ${
            message.isBot ? 'text-[#57F287]' : 'text-white'
          }`}>
            {message.user?.username || 'Unknown User'}
          </span>
          {message.isBot && (
            <span className="bg-[#57F287] text-xs px-2 py-1 rounded text-black font-medium">
              BOT
            </span>
          )}
          <span className="text-xs text-[#72767D]">
            {formatTime(message.createdAt)}
          </span>
        </div>
        
        {message.isBot ? (
          <div className="bg-gradient-to-r from-[#5865F2] to-[#57F287] bg-opacity-10 border-l-4 border-[#57F287] pl-4 py-2 rounded-r-lg">
            <p className="text-[#DCDDDE] whitespace-pre-wrap">{message.content}</p>
          </div>
        ) : (
          <p className="text-[#DCDDDE] whitespace-pre-wrap">{message.content}</p>
        )}
      </div>
    </div>
  );
}
