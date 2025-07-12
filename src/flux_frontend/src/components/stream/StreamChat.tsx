import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Smile, Gift } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { ChatMessage } from '../../store/appStore';

interface StreamChatProps {
  streamId: string;
  className?: string;
}

const mockMessages: ChatMessage[] = [
  { id: '1', username: 'viewer1', message: 'Amazing stream! 🔥', timestamp: new Date(), badges: ['subscriber'] },
  { id: '2', username: 'viewer2', message: 'Can you show that again?', timestamp: new Date() },
  { id: '3', username: 'viewer3', message: 'First time here, loving it!', timestamp: new Date() },
  { id: '4', username: 'viewer4', message: 'GG! 🎮', timestamp: new Date(), badges: ['moderator'] },
  { id: '5', username: 'viewer5', message: 'How long have you been streaming?', timestamp: new Date() },
];

export const StreamChat: React.FC<StreamChatProps> = ({ streamId, className }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [messageInput, setMessageInput] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        username: 'currentuser',
        message: messageInput,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, newMessage]);
      setMessageInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'moderator': return 'bg-flux-accent-green';
      case 'subscriber': return 'bg-flux-primary';
      case 'vip': return 'bg-flux-accent-gold';
      default: return 'bg-flux-bg-tertiary';
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-flux-bg-secondary", className)}>
      {/* Chat Header */}
      <div className="p-4 border-b border-flux-bg-tertiary">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-flux-text-primary">Stream Chat</h3>
          <div className="flex items-center space-x-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-flux-accent-green" : "bg-flux-accent-red"
            )} />
            <span className="text-flux-text-secondary text-sm">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex items-start space-x-3"
            >
              <Avatar
                src={`https://images.pexels.com/photos/${Math.floor(Math.random() * 1000000)}/pexels-photo-${Math.floor(Math.random() * 1000000)}.jpeg?auto=compress&cs=tinysrgb&w=32&h=32&fit=crop`}
                alt={message.username}
                size="xs"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-flux-text-primary text-sm">
                    {message.username}
                  </span>
                  {message.badges?.map((badge) => (
                    <span
                      key={badge}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-xs font-medium text-white",
                        getBadgeColor(badge)
                      )}
                    >
                      {badge}
                    </span>
                  ))}
                  <span className="text-flux-text-secondary text-xs">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-flux-text-primary text-sm break-words">
                  {message.message}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-flux-bg-tertiary">
        <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
            <textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Say something nice..."
              className="w-full px-3 py-2 bg-flux-bg-tertiary text-flux-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-flux-primary resize-none"
              rows={1}
              maxLength={500}
              style={{ height: 'auto', minHeight: '40px', maxHeight: '120px', overflowY: 'auto' }}
              onInput={e => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${target.scrollHeight}px`;
              }}
            />
            </div>
          <Button size="sm" variant="ghost">
            <Smile className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost">
            <Gift className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={handleSendMessage} disabled={!messageInput.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-flux-text-secondary text-xs">
            {messageInput.length}/500
          </span>
          <span className="text-flux-text-secondary text-xs">
            {messages.length} viewers chatting
          </span>
        </div>
      </div>
    </div>
  );
};