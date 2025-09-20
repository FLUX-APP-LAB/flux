import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, MoreHorizontal, Play, Pause, Volume2, VolumeX, X, Send } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { useAppStore } from '../../store/appStore';
import { useWallet } from '../../hooks/useWallet';
import { UserService } from '../../lib/userService';
import { VideoService } from '../../lib/videoService';

interface Comment {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  content: string;
  createdAt: Date;
  likes: number;
  isLiked: boolean;
}

interface VideoPlayerProps {
  video: any;
  isActive: boolean;
  onVideoEnd: () => void;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, isActive, onVideoEnd, className }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [isLiked, setIsLiked] = useState(video.isLiked);
  const [likes, setLikes] = useState(video.likes);
  const [commentsCount, setCommentsCount] = useState(video.comments || 0);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isCheckingFollow, setIsCheckingFollow] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Comment states
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  
  const { currentUser, setActivePage, setSelectedUser, toggleVideoLike } = useAppStore();
  const { newAuthActor } = useWallet();

  // Check if we have a valid video URL (including blob URLs)
  const hasValidVideoUrl = video.videoUrl && 
    (video.videoUrl.startsWith('http') || video.videoUrl.startsWith('blob:')) && 
    !video.videoUrl.includes('#video-') &&
    !video.videoUrl.endsWith('/') &&
    video.videoUrl.length > 10;

  // Console log the video URL for debugging
  console.log('Video URL for video:', video.id, '- URL:', video.videoUrl, '- Valid:', hasValidVideoUrl);

  useEffect(() => {
    if (isActive && videoRef.current && hasValidVideoUrl) {
      videoRef.current.currentTime = 0;
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [isActive, hasValidVideoUrl]);

  // Sync like state with video prop
  useEffect(() => {
    console.log('Video like state updated:', { videoId: video.id, isLiked: video.isLiked, likes: video.likes });
    setIsLiked(video.isLiked);
    setLikes(video.likes);
  }, [video.isLiked, video.likes]);

  // Check follow status when video changes
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!currentUser || !newAuthActor || !video.creator || currentUser.id === video.creator.id) {
        return;
      }

      setIsCheckingFollow(true);
      try {
        const userService = new UserService(newAuthActor);
        const followStatus = await userService.isFollowing(video.creator.id);
        setIsFollowing(followStatus);
      } catch (error) {
        console.error('Error checking follow status:', error);
      } finally {
        setIsCheckingFollow(false);
      }
    };

    checkFollowStatus();
  }, [currentUser, newAuthActor, video.creator]);

  // Load comments count, like status when video changes
  useEffect(() => {
    const loadVideoData = async () => {
      if (!newAuthActor) return;

      setIsLoadingData(true);
      try {
        const videoService = new VideoService(newAuthActor);

        // Load comments count
        const count = await videoService.getVideoCommentsCount(video.id);
        setCommentsCount(count);

        // Check if user has liked this video
        const hasLiked = await videoService.hasUserLikedVideo(video.id);
        console.log('User has liked video:', hasLiked);
        // Update the video in the store with the correct like status
        if (hasLiked !== video.isLiked) {
          toggleVideoLike(video.id);
        }
      } catch (error) {
        console.error('Error loading video data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadVideoData();
  }, [video.id, newAuthActor]);

  // Load comments when comments panel opens
  useEffect(() => {
    if (showComments && !isLoadingComments && comments.length === 0) {
      loadComments();
    }
  }, [showComments]);

  const loadComments = async () => {
    if (!newAuthActor) return;

    setIsLoadingComments(true);
    try {
      const videoService = new VideoService(newAuthActor);
      const videoComments = await videoService.getVideoComments(video.id);
      
      console.log('Loaded comments:', videoComments);
      
      // Transform backend comments to frontend format
      const transformedComments = videoComments.map((comment: any) => {
        // Safely handle userId conversion
        const userIdSafe = comment.userId || comment.user || comment.author || 'unknown';
        const userIdString = typeof userIdSafe === 'string' ? userIdSafe : 
                            (userIdSafe?.toText ? userIdSafe.toText() : String(userIdSafe));
        
        // Use the enhanced data from VideoService
        const finalComment = {
          id: comment.id || `temp_${Date.now()}_${Math.random()}`,
          userId: userIdString,
          username: comment.username || `user_${userIdString.slice(0, 8)}`,
          displayName: comment.displayName || comment.username || `User ${userIdString.slice(0, 8)}`,
          avatar: comment.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userIdString}`,
          content: comment.content || comment.text || '',
          createdAt: comment.createdAt ? 
            (typeof comment.createdAt === 'number' ? new Date(comment.createdAt) : 
             typeof comment.createdAt === 'bigint' ? new Date(Number(comment.createdAt) / 1000000) :
             new Date(comment.createdAt)) : new Date(),
          likes: comment.likes || 0,
          isLiked: comment.isLiked || false
        };
        
        console.log('Final comment for UI:', finalComment);
        return finalComment;
      });
      
      setComments(transformedComments);
      
      // Update comments count based on actual loaded comments
      if (transformedComments.length !== commentsCount) {
        setCommentsCount(transformedComments.length);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      // Set empty comments array on error
      setComments([]);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newAuthActor || !currentUser || !newComment.trim() || isSubmittingComment) return;

    // Create optimistic comment with current user's real data
    const tempCommentObj: Comment = {
      id: `temp_${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      displayName: currentUser.displayName,
      avatar: currentUser.avatar,
      content: newComment.trim(),
      createdAt: new Date(),
      likes: 0,
      isLiked: false
    };
    
    setComments(prev => [tempCommentObj, ...prev]);
    setCommentsCount((prev: number) => prev + 1);
    const originalComment = newComment;
    setNewComment('');

    setIsSubmittingComment(true);
    try {
      const videoService = new VideoService(newAuthActor);
      const success = await videoService.addComment(video.id, originalComment.trim());
      
      if (success) {
        console.log('Comment added successfully');
        // Reload comments after a delay to get the actual data from backend with proper IDs
        setTimeout(() => loadComments(), 2000);
      } else {
        console.log('Comment add failed or not implemented - keeping optimistic update');
        // Keep the o
        
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      // Keep the optimistic update and don't show error to user
      console.log('Keeping optimistic comment update despite error');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCommentLike = async (commentId: string) => {
    if (!newAuthActor) return;

    try {
      const videoService = new VideoService(newAuthActor);
      const comment = comments.find(c => c.id === commentId);
      if (!comment) return;

      let success = false;
      if (comment.isLiked) {
        success = await videoService.unlikeComment(commentId);
      } else {
        success = await videoService.likeComment(commentId);
      }

      if (success) {
        setComments(prev => prev.map(c => 
          c.id === commentId 
            ? { 
                ...c, 
                isLiked: !c.isLiked, 
                likes: c.isLiked ? Number(c.likes) - 1 : Number(c.likes) + 1 
              }
            : c
        ));
      }
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !hasValidVideoUrl) return;

    if (isPlaying) {
      // Add a small delay to prevent rapid play/pause cycles
      const playTimeout = setTimeout(() => {
        if (videoElement && isPlaying) {
          videoElement.play().catch(error => {
            console.log('Video play failed:', error);
            setIsPlaying(false);
          });
        }
      }, 100);
      
      return () => clearTimeout(playTimeout);
    } else {
      videoElement.pause();
    }
  }, [isPlaying, hasValidVideoUrl]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    showControlsTemporarily();
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
    showControlsTemporarily();
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    setTimeout(() => setShowControls(false), 3000);
  };

  // Handle follow/unfollow
  const handleFollow = async () => {
    if (!currentUser || !newAuthActor || !video.creator || isFollowLoading) {
      return;
    }

    setIsFollowLoading(true);
    try {
      const userService = new UserService(newAuthActor);
      
      if (isFollowing) {
        const success = await userService.unfollowUser(video.creator.id);
        if (success) {
          setIsFollowing(false);
        } else {
          console.error('Failed to unfollow user');
          // Re-check the actual follow status from backend
          const actualStatus = await userService.isFollowing(video.creator.id);
          setIsFollowing(actualStatus);
        }
      } else {
        const success = await userService.followUser(video.creator.id);
        if (success) {
          setIsFollowing(true);
        } else {
          console.error('Failed to follow user');
          // Re-check the actual follow status from backend
          const actualStatus = await userService.isFollowing(video.creator.id);
          setIsFollowing(actualStatus);
        }
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      // Re-check the actual follow status from backend on error
      try {
        const userService = new UserService(newAuthActor);
        const actualStatus = await userService.isFollowing(video.creator.id);
        setIsFollowing(actualStatus);
      } catch (recheckError) {
        console.error('Error rechecking follow status:', recheckError);
      }
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleLike = async () => {
    if (!newAuthActor || isLiking) return;

    console.log('Handling like for video:', video.id, 'Current like state:', isLiked);
    setIsLiking(true);
    try {
      const videoService = new VideoService(newAuthActor);
      let success = false;
      
      if (isLiked) {
        // User wants to unlike
        success = await videoService.unlikeVideo(video.id);
        console.log('Unlike video result:', success);
        if (success) {
          setIsLiked(false);
          setLikes((prev: number) => Math.max(0, prev - 1));
          toggleVideoLike(video.id); // Update store
        }
      } else {
        // User wants to like
        success = await videoService.likeVideo(video.id);
        console.log('Like video result:', success);
        if (success) {
          setIsLiked(true);
          setLikes((prev: number) => prev + 1);
          toggleVideoLike(video.id); // Update store
        }
      }
    } catch (error) {
      console.error('Error handling like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  // Handle profile picture click
  const handleProfileClick = () => {
    if (video.creator) {
      setSelectedUser(video.creator);
      setActivePage('profile');
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVideoClick = () => {
    setShowControls(!showControls);
    setTimeout(() => setShowControls(false), 3000);
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    onVideoEnd();
  };

  // Update the follow button logic to show "Following" when already following
  const getFollowButtonText = () => {
    if (isFollowLoading) return '...';
    if (isCheckingFollow) return '...';
    return isFollowing ? 'Following' : 'Follow';
  };

  const getFollowButtonStyle = () => {
    if (isFollowing) {
      return "border-green-500 text-green-500 hover:bg-green-500 hover:text-white";
    }
    return "border-white text-white hover:bg-white hover:text-black";
  };

  // Show follow button for all users except self, regardless of follow status
  const shouldShowFollowButton = currentUser && video.creator && currentUser.id !== video.creator.id;

  return (
    <div className={`relative ${className}`}>
      {/* Video */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        src={video.videoUrl}
        loop={false}
        muted={isMuted}
        onClick={handleVideoClick}
        onEnded={handleVideoEnd}
        preload="metadata"
      />

      {/* Play/Pause Overlay */}
      {showControls && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <button
            onClick={togglePlay}
            className="bg-black/50 rounded-full p-4 pointer-events-auto"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white" />
            )}
          </button>
        </motion.div>
      )}

      {/* Comments Panel */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="absolute top-0 right-0 w-80 h-full bg-black/90 backdrop-blur-sm z-50 flex flex-col"
          >
            {/* Comments Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-white font-semibold">Comments ({commentsCount})</h3>
              <button 
                onClick={() => setShowComments(false)}
                className="text-white hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoadingComments ? (
                <div className="text-white text-center py-8">Loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="text-gray-400 text-center py-8">No comments yet. Be the first to comment!</div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3">
                    <Avatar src={comment.avatar} alt={comment.displayName} size="sm" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-white font-medium text-sm">{comment.displayName}</span>
                        <span className="text-gray-400 text-xs">
                          {comment.createdAt.toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-white text-sm mb-2">{comment.content}</p>
                      <button
                        onClick={() => handleCommentLike(comment.id)}
                        className={`flex items-center space-x-1 text-xs ${
                          comment.isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                        }`}
                      >
                        <Heart className={`w-3 h-3 ${comment.isLiked ? 'fill-current' : ''}`} />
                        <span>{comment.likes}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input */}
            {currentUser && (
              <div className="p-4 border-t border-gray-700">
                <div className="flex space-x-3">
                  <Avatar src={currentUser.avatar} alt={currentUser.displayName} size="sm" />
                  <div className="flex-1">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="w-full bg-gray-800 text-white text-sm rounded-lg p-2 resize-none border border-gray-600 focus:border-blue-500 focus:outline-none"
                      rows={2}
                      maxLength={500}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-gray-400 text-xs">{newComment.length}/500</span>
                      <Button
                        size="sm"
                        onClick={handleSubmitComment}
                        disabled={!newComment.trim() || isSubmittingComment}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isSubmittingComment ? (
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-end justify-between p-4">
          {/* Left side - Video info */}
          <div className="flex-1 mr-4">
            <div className="flex items-center space-x-3 mb-2">
              {/* Clickable Profile Picture */}
              <button 
                onClick={handleProfileClick}
                className="transition-transform hover:scale-105"
              >
                <Avatar
                  src={video.creator?.avatar}
                  alt={video.creator?.displayName || 'Creator'}
                  size="md"
                />
              </button>
              
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handleProfileClick}
                  className="text-white font-semibold hover:underline"
                >
                  {video.creator?.displayName || 'Unknown Creator'}
                </button>
                
                {/* Follow Button - Show for all users except self */}
                {shouldShowFollowButton && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleFollow}
                    disabled={isFollowLoading || isCheckingFollow}
                    className={`px-3 py-1 text-xs border ${getFollowButtonStyle()}`}
                  >
                    {getFollowButtonText()}
                  </Button>
                )}
              </div>
            </div>
            
            <p className="text-white text-sm mb-1">{video.title}</p>
            <p className="text-white/70 text-xs">{video.description}</p>
          </div>

          {/* Right side - Action buttons */}
          <div className="flex flex-col items-center space-y-4">
            <button 
              onClick={handleLike}
              disabled={isLiking}
              className={`transition-colors ${isLiked ? 'text-red-500' : 'text-white hover:text-red-500'}`}
            >
              <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-xs block mt-1">{likes || 0}</span>
            </button>
            
            <button 
              onClick={() => setShowComments(!showComments)}
              className="text-white hover:text-blue-500 transition-colors"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-xs block mt-1">{commentsCount || 0}</span>
            </button>
            
            <button 
              onClick={() => setShowShare(!showShare)}
              className="text-white hover:text-green-500 transition-colors"
            >
              <Share2 className="w-6 h-6" />
              <span className="text-xs block mt-1">Share</span>
            </button>
            
            <button 
              onClick={toggleMute}
              className="text-white hover:text-yellow-500 transition-colors"
            >
              {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </button>
            
            <button className="text-white hover:text-gray-300 transition-colors">
              <MoreHorizontal className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};