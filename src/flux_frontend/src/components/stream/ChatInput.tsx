import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "Type a message...",
  maxLength = 500,
  className = '',
  onTypingStart,
  onTypingStop
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Common emotes
  const commonEmotes = [
    { name: 'smile', emoji: '😊' },
    { name: 'laugh', emoji: '😂' },
    { name: 'heart', emoji: '❤️' },
    { name: 'fire', emoji: '🔥' },
    { name: 'thumbsup', emoji: '👍' },
    { name: 'clap', emoji: '👏' },
    { name: 'party', emoji: '🎉' },
    { name: 'cool', emoji: '😎' }
  ];

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSendMessage(trimmedMessage);
      setMessage('');
      handleTypingStop();
      
      // Focus back to input after sending
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      setMessage(newValue);
      
      // Handle typing indicators
      if (newValue.trim() && !isTyping) {
        handleTypingStart();
      } else if (!newValue.trim() && isTyping) {
        handleTypingStop();
      }
    }
  };

  const handleTypingStart = () => {
    if (!isTyping) {
      setIsTyping(true);
      onTypingStart?.();
    }
    
    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 3000);
  };

  const handleTypingStop = () => {
    if (isTyping) {
      setIsTyping(false);
      onTypingStop?.();
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const insertEmote = (emoji: string) => {
    const newMessage = message + emoji;
    if (newMessage.length <= maxLength) {
      setMessage(newMessage);
      inputRef.current?.focus();
    }
  };

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`border-t border-gray-700 p-4 bg-gray-800/50 ${className}`}>
      {/* Emote bar */}
      <div className="flex gap-1 mb-3 overflow-x-auto pb-2">
        {commonEmotes.map((emote) => (
          <button
            key={emote.name}
            onClick={() => insertEmote(emote.emoji)}
            className="flex-shrink-0 w-8 h-8 hover:bg-gray-700 rounded-lg transition-colors duration-200 flex items-center justify-center text-lg"
            title={emote.name}
            disabled={disabled}
          >
            {emote.emoji}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={disabled ? "Chat is disabled" : placeholder}
            disabled={disabled}
            className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            maxLength={maxLength}
          />
          
          {/* Character counter */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
            {message.length}/{maxLength}
          </div>
        </div>
        
        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg 
            className="w-4 h-4" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
          Send
        </Button>
      </div>

      {/* Typing indicator */}
      {isTyping && (
        <div className="mt-2 text-xs text-gray-400 italic">
          Typing...
        </div>
      )}
    </div>
  );
};