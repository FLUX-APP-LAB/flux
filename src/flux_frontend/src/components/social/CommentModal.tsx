import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Heart, Reply } from 'lucide-react';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { useAppStore } from '../../store/appStore';
import { formatNumber } from '../../lib/utils';
import { getSafeAvatar } from '../../lib/imageUtils';
import { CommentService, FrontendComment } from '../../lib/commentService';
import { useWallet } from '../../hooks/useWallet';
import { toast } from 'react-hot-toast';

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  onCommentAdded?: () => void;
}

export const CommentModal: React.FC<CommentModalProps> = ({
  isOpen,
  onClose,
  videoId,
  onCommentAdded
}) => {
  const [comments, setComments] = useState<FrontendComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { currentUser } = useAppStore();
  const { newAuthActor } = useWallet();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Load comments when modal opens
  useEffect(() => {
    if (isOpen && newAuthActor) {
      loadComments();
    }
  }, [isOpen, newAuthActor, videoId]);

  const loadComments = async () => {
    if (!newAuthActor) return;
    
    setLoading(true);
    try {
      const commentService = new CommentService(newAuthActor);
      
      // Debug: Get all comments first
      console.log('=== DEBUG: Loading comments ===');
      const allComments = await commentService.getAllComments();
      console.log('All comments in system:', allComments);
      console.log('Looking for videoId:', videoId);
      
      const fetchedComments = await commentService.getVideoCommentsWithUserData(videoId);
      console.log('Filtered comments for video:', fetchedComments);
      setComments(fetchedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentUser || !newAuthActor) return;

    setSubmitting(true);
    try {
      const commentService = new CommentService(newAuthActor);
      const success = await commentService.addComment(videoId, newComment.trim(), replyingTo || undefined);
      
      if (success) {
        toast.success('Comment added successfully!');
        setNewComment('');
        setReplyingTo(null);
        // Reload comments to show the new one
        await loadComments();
        // Notify parent component to refresh comment count
        onCommentAdded?.();
      } else {
        toast.error('Failed to add comment');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!newAuthActor) return;

    try {
      const commentService = new CommentService(newAuthActor);
      const success = await commentService.toggleCommentLike(commentId);
      
      if (success) {
        // Update local state to reflect the like change
        setComments(comments.map(comment => 
          comment.id === commentId 
            ? { 
                ...comment, 
                isLiked: !comment.isLiked,
                likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1
              }
            : comment
        ));
        toast.success('Comment liked!');
      } else {
        toast.error('Failed to like comment');
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      toast.error('Failed to like comment');
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
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
          className="bg-flux-bg-secondary w-full md:w-96 md:rounded-t-2xl max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-flux-bg-tertiary">
            <h3 className="text-lg font-semibold text-flux-text-primary">
              Comments ({comments.length})
            </h3>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-flux-text-secondary">Loading comments...</div>
              </div>
            ) : comments.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-flux-text-secondary">No comments yet. Be the first to comment!</div>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex space-x-3">
                  <Avatar
                    src={comment.user.avatar}
                    alt={comment.user.displayName}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-flux-text-primary text-sm">
                        {comment.user.displayName}
                      </span>
                      <span className="text-flux-text-secondary text-xs">
                        {formatTimeAgo(comment.timestamp)}
                      </span>
                    </div>
                    <p className="text-flux-text-primary text-sm mb-2">
                      {comment.text}
                    </p>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handleLikeComment(comment.id)}
                        className="flex items-center space-x-1 text-flux-text-secondary hover:text-flux-accent-red transition-colors"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            comment.isLiked ? 'fill-current text-flux-accent-red' : ''
                          }`}
                        />
                        <span className="text-xs">{formatNumber(comment.likes)}</span>
                      </button>
                      <button
                        onClick={() => setReplyingTo(comment.id)}
                        className="flex items-center space-x-1 text-flux-text-secondary hover:text-flux-text-primary transition-colors"
                      >
                        <Reply className="w-4 h-4" />
                        <span className="text-xs">Reply</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment Input */}
          <div className="p-4 border-t border-flux-bg-tertiary">
            <div className="flex items-center space-x-3">
              <Avatar
                src={currentUser?.avatar}
                alt={currentUser?.displayName || ''}
                size="sm"
              />
              <div className="flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment()}
                  placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'}
                  className="w-full px-3 py-2 bg-flux-bg-tertiary text-flux-text-primary rounded-full focus:outline-none focus:ring-2 focus:ring-flux-primary"
                  maxLength={500}
                />
              </div>
              <Button
                size="sm"
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || submitting}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};