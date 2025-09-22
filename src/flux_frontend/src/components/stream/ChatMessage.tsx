import React from 'react';
import type { ChatMessage as ChatMessageType } from '../../store/appStore';

interface ChatMessageProps {
  message: ChatMessageType;
  isOwnMessage?: boolean;
  className?: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  isOwnMessage = false, 
  className = '' 
}) => {
  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderBadges = () => {
    if (!message.badges || message.badges.length === 0) return null;
    
    return (
      <div className="flex gap-1 mr-2">
        {message.badges.map((badge, index) => (
          <span
            key={index}
            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white"
          >
            {badge}
          </span>
        ))}
      </div>
    );
  };

  const getMessageStyles = () => {
    switch (message.messageType) {
      case 'system':
        return 'bg-blue-900/20 border-blue-500/30 text-blue-200';
      case 'moderator':
        return 'bg-green-900/20 border-green-500/30 text-green-200';
      case 'highlight':
        return 'bg-yellow-900/20 border-yellow-500/30 text-yellow-200';
      default:
        return isOwnMessage 
          ? 'bg-purple-900/20 border-purple-500/30' 
          : 'bg-gray-800/50 border-gray-700/50';
    }
  };

  const processMessageWithEmotes = (text: string) => {
    if (!message.emotes) return text;
    
    let processedText = text;
    Object.entries(message.emotes).forEach(([emoteName, emoteUrl]) => {
      const emoteRegex = new RegExp(`:${emoteName}:`, 'g');
      processedText = processedText.replace(
        emoteRegex,
        `<img src="${emoteUrl}" alt="${emoteName}" class="inline-block w-5 h-5 mx-1" />`
      );
    });
    
    return processedText;
  };

  return (
    <div className={`group mb-3 ${className}`}>
      <div className={`rounded-xl p-3 border transition-all duration-200 hover:shadow-md ${getMessageStyles()}`}>
        {/* Header with avatar, name, badges, and timestamp */}
        <div className="flex items-center mb-2">
          <img
            src={message.avatar}
            alt={message.displayName}
            className="w-6 h-6 rounded-full border border-gray-600 mr-2"
          />
          
          {renderBadges()}
          
          <span className="text-sm font-semibold text-white mr-2">
            {message.displayName}
          </span>
          
          <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>
        
        {/* Message content */}
        <div className="ml-8">
          <div 
            className="text-gray-200 text-sm leading-relaxed break-words"
            dangerouslySetInnerHTML={{ 
              __html: processMessageWithEmotes(message.message) 
            }}
          />
        </div>
      </div>
    </div>
  );
};