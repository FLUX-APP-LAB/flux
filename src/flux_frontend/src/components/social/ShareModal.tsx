import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, MessageCircle, Mail, Link, Facebook, Twitter, Instagram } from 'lucide-react';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  videoTitle: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  videoId,
  videoTitle,
}) => {
  const [copied, setCopied] = useState(false);
  const videoUrl = `https://flux.app/video/${videoId}`;

  const shareOptions = [
    {
      id: 'copy',
      label: 'Copy Link',
      icon: Copy,
      color: 'bg-flux-bg-tertiary',
      action: () => copyToClipboard(),
    },
    {
      id: 'message',
      label: 'Message',
      icon: MessageCircle,
      color: 'bg-flux-accent-green',
      action: () => shareViaMessage(),
    },
    {
      id: 'email',
      label: 'Email',
      icon: Mail,
      color: 'bg-flux-accent-red',
      action: () => shareViaEmail(),
    },
    {
      id: 'facebook',
      label: 'Facebook',
      icon: Facebook,
      color: 'bg-blue-600',
      action: () => shareToFacebook(),
    },
    {
      id: 'twitter',
      label: 'Twitter',
      icon: Twitter,
      color: 'bg-sky-500',
      action: () => shareToTwitter(),
    },
    {
      id: 'instagram',
      label: 'Instagram',
      icon: Instagram,
      color: 'bg-gradient-to-r from-purple-500 to-pink-500',
      action: () => shareToInstagram(),
    },
  ];

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(videoUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const shareViaMessage = () => {
    const text = `Check out this video: ${videoTitle}`;
    const url = `sms:?body=${encodeURIComponent(text + ' ' + videoUrl)}`;
    window.open(url);
  };

  const shareViaEmail = () => {
    const subject = `Check out this video: ${videoTitle}`;
    const body = `I thought you might enjoy this video:\n\n${videoTitle}\n${videoUrl}`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url);
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(videoUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareToTwitter = () => {
    const text = `Check out this video: ${videoTitle}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(videoUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareToInstagram = () => {
    toast('Copy the link and share it in your Instagram story or post!');
    copyToClipboard();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          className="bg-flux-bg-secondary w-full md:w-96 md:rounded-t-2xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-flux-text-primary">
              Share Video
            </h3>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Share Options Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {shareOptions.map((option) => (
              <motion.button
                key={option.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={option.action}
                className="flex flex-col items-center space-y-2 p-4 rounded-xl hover:bg-flux-bg-tertiary transition-colors"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${option.color}`}>
                  <option.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm text-flux-text-primary font-medium">
                  {option.label}
                </span>
              </motion.button>
            ))}
          </div>

          {/* URL Input */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-flux-text-primary">
              Video Link
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={videoUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-flux-bg-tertiary text-flux-text-primary rounded-lg focus:outline-none"
              />
              <Button
                size="sm"
                onClick={copyToClipboard}
                variant={copied ? 'secondary' : 'primary'}
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};