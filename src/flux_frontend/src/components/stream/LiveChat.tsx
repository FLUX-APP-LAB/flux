import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useAppStore } from '../../store/appStore';
import { useWallet } from '../../hooks/useWallet';
import type { ChatMessage as ChatMessageType, ChatUser } from '../../store/appStore';

interface LiveChatProps {
  streamId: string;
  onSendMessage?: (message: string) => void;
  className?: string;
  isStreamer?: boolean;
}

export const LiveChat: React.FC<LiveChatProps> = ({
  streamId,
  onSendMessage,
  className = '',
  isStreamer = false
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [userCount, setUserCount] = useState(0);
  
  const {
    chatRooms,
    currentUser,
    initializeChatRoom,
    addChatMessage,
    updateChatUser,
    addTypingUser,
    removeTypingUser,
    setCurrentChatRoom,
    typingUsers
  } = useAppStore();

  const { principal } = useWallet();
  const chatRoom = chatRooms.get(streamId);

  // Initialize chat room on mount
  useEffect(() => {
    initializeChatRoom(streamId);
    setCurrentChatRoom(streamId);
    
    return () => {
      setCurrentChatRoom(null);
    };
  }, [streamId, initializeChatRoom, setCurrentChatRoom]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatRoom?.messages, autoScroll]);

  // Update user count
  useEffect(() => {
    if (chatRoom) {
      setUserCount(chatRoom.activeUsers.length);
    }
  }, [chatRoom?.activeUsers]);

  // Add current user to chat room
  useEffect(() => {
    if (currentUser && chatRoom) {
      const chatUser: ChatUser = {
        id: currentUser.id,
        username: currentUser.username,
        displayName: currentUser.displayName,
        avatar: currentUser.avatar,
        badges: isStreamer ? ['Streamer'] : currentUser.tier ? [currentUser.tier] : undefined,
        isTyping: false
      };
      updateChatUser(streamId, chatUser);
    }
  }, [currentUser, streamId, updateChatUser, isStreamer]);

  const handleSendMessage = (messageText: string) => {
    if (!currentUser || !chatRoom) return;

    const message: ChatMessageType = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: currentUser.id,
      username: currentUser.username,
      displayName: currentUser.displayName,
      avatar: currentUser.avatar,
      message: messageText,
      timestamp: new Date(),
      badges: isStreamer ? ['Streamer'] : currentUser.tier ? [currentUser.tier] : undefined,
      messageType: isStreamer ? 'moderator' : 'normal'
    };

    addChatMessage(streamId, message);
    onSendMessage?.(messageText);
  };

  const handleTypingStart = () => {
    if (currentUser) {
      addTypingUser(currentUser.id);
    }
  };

  const handleTypingStop = () => {
    if (currentUser) {
      removeTypingUser(currentUser.id);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop === element.clientHeight;
    setAutoScroll(isAtBottom);
  };

  const scrollToBottom = () => {
    setAutoScroll(true);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getTypingIndicator = () => {
    const typingUsersList = Array.from(typingUsers).filter(userId => 
      userId !== currentUser?.id && 
      chatRoom?.activeUsers.some(user => user.id === userId)
    );

    if (typingUsersList.length === 0) return null;

    const typingUserNames = typingUsersList
      .map(userId => chatRoom?.activeUsers.find(user => user.id === userId)?.displayName)
      .filter(Boolean)
      .slice(0, 3); // Show max 3 names

    if (typingUserNames.length === 1) {
      return `${typingUserNames[0]} is typing...`;
    } else if (typingUserNames.length === 2) {
      return `${typingUserNames[0]} and ${typingUserNames[1]} are typing...`;
    } else if (typingUserNames.length === 3) {
      return `${typingUserNames[0]}, ${typingUserNames[1]} and ${typingUserNames[2]} are typing...`;
    } else {
      return `${typingUserNames.length} people are typing...`;
    }
  };

  if (!chatRoom) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center text-gray-400">
          <div className="w-8 h-8 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin mx-auto mb-2"></div>
          <p>Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col bg-gray-900/50 border border-gray-700 rounded-xl overflow-hidden ${className}`}>
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-700 bg-gray-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold">Live Chat</h3>
              <p className="text-xs text-gray-400">{userCount} viewer{userCount !== 1 ? 's' : ''}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Chat settings for streamers */}
            {isStreamer && (
              <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors duration-200" title="Chat Settings">
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            
            {/* Scroll to bottom button */}
            {!autoScroll && (
              <button 
                onClick={scrollToBottom}
                className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors duration-200"
                title="Scroll to bottom"
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-1"
        onScroll={handleScroll}
      >
        {chatRoom.messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm">Be the first to say something!</p>
            <p className="text-xs text-gray-600 mt-1">Welcome to the chat</p>
          </div>
        ) : (
          chatRoom.messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isOwnMessage={message.userId === currentUser?.id}
            />
          ))
        )}
        
        {/* Typing indicator */}
        {getTypingIndicator() && (
          <div className="text-sm text-gray-400 italic px-3 py-2">
            {getTypingIndicator()}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={!chatRoom.settings.enabled}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
      />
    </div>
  );
};