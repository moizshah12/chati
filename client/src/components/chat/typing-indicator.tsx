interface TypingIndicatorProps {
  usernames: string[];
}

export function TypingIndicator({ usernames }: TypingIndicatorProps) {
  if (usernames.length === 0) return null;

  const getTypingText = () => {
    if (usernames.length === 1) {
      return `${usernames[0]} is typing...`;
    } else if (usernames.length === 2) {
      return `${usernames[0]} and ${usernames[1]} are typing...`;
    } else {
      return `${usernames.length} people are typing...`;
    }
  };

  return (
    <div className="flex items-center space-x-2 text-[#72767D] text-sm px-4 py-2">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-[#72767D] rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-2 h-2 bg-[#72767D] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
        <div className="w-2 h-2 bg-[#72767D] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
      </div>
      <span>{getTypingText()}</span>
    </div>
  );
}
