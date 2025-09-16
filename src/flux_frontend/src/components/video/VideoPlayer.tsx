import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Heart, MessageCircle, Share, MoreHorizontal } from 'lucide-react';
import { cn, formatNumber } from '../../lib/utils';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { CommentModal } from '../social/CommentModal';
import { ShareModal } from '../social/ShareModal';
import { Video } from '../../store/appStore';
import { useAppStore } from '../../store/appStore';
import { VideoService } from '../../lib/videoService';
import { UserService } from '../../lib/userService';
import { useWallet } from '../../hooks/useWallet';
import { toast } from 'react-hot-toast';

interface VideoPlayerProps {
  video: Video;
  isActive: boolean;
  onVideoEnd?: () => void;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  isActive,
  onVideoEnd,
  className
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [isLiked, setIsLiked] = useState(video.isLiked);
  const [likes, setLikes] = useState(video.likes);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const { toggleVideoLike, toggleFollowUser, isFollowingUser: isFollowingUserInStore } = useAppStore();
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

  // Load comments count, like status, and follow status when video changes
  useEffect(() => {
    const loadVideoData = async () => {
      if (!newAuthActor) return;

      setIsLoadingData(true);
      try {
        const videoService = new VideoService(newAuthActor);
        const userService = new UserService(newAuthActor);

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

        // Check if user is following the video creator
        const relationship = await userService.getUserRelationship(video.creator.id);
        const isFollowing = relationship === 'Following' || relationship === 'Mutual' || relationship === 'Subscriber';
        setIsFollowingUser(isFollowing);
        
        // Update store with follow status
        if (isFollowing && !isFollowingUserInStore(video.creator.id)) {
          toggleFollowUser(video.creator.id);
        } else if (!isFollowing && isFollowingUserInStore(video.creator.id)) {
          toggleFollowUser(video.creator.id);
        }
      } catch (error) {
        console.error('Error loading video data:', error);
        toast.error('Failed to load video data');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadVideoData();
  }, [video.id, video.creator.id, newAuthActor]);

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
          toggleVideoLike(video.id);
          toast.success('Video unliked');
        } else {
          toast.error('Failed to unlike video');
        }
      } else {
        // User wants to like
        success = await videoService.likeVideo(video.id);
        console.log('Like video result:', success);
        if (success) {
          toggleVideoLike(video.id);
          toast.success('Video liked!');
        } else {
          toast.error('Failed to like video');
        }
      }
    } catch (error) {
      console.error('Error liking/unliking video:', error);
      toast.error('Failed to like video');
    } finally {
      setIsLiking(false);
    }
  };

  const handleFollow = async () => {
    if (!newAuthActor) return;

    try {
      const userService = new UserService(newAuthActor);
      let success = false;

      if (isFollowingUser) {
        success = await userService.unfollowUser(video.creator.id);
        if (success) {
          setIsFollowingUser(false);
          toggleFollowUser(video.creator.id); // Update store
          toast.success('Unfollowed user');
        }
      } else {
        success = await userService.followUser(video.creator.id);
        if (success) {
          setIsFollowingUser(true);
          toggleFollowUser(video.creator.id); // Update store
          toast.success('Following user');
        }
      }

      if (!success) {
        toast.error(isFollowingUser ? 'Failed to unfollow user' : 'Failed to follow user');
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
      toast.error('Failed to follow user');
    }
  };

  const handleCommentAdded = async () => {
    if (!newAuthActor) return;

    try {
      const videoService = new VideoService(newAuthActor);
      const count = await videoService.getVideoCommentsCount(video.id);
      setCommentsCount(count);
    } catch (error) {
      console.error('Error refreshing comment count:', error);
    }
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const handleVideoClick = () => {
    handlePlayPause();
  };

  const handleDoubleClick = () => {
    handleLike();
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    console.log('Video error for:', video.src, 'Error:', video.error);
    
    setVideoError(true);
    setIsPlaying(false);
    
    // Prevent repeated error attempts by removing the src
    video.removeAttribute('src');
    video.load(); // Reset the video element
    
    // Show controls to indicate there's an issue
    setShowControls(true);
  };

  const handleVideoLoadStart = () => {
    // Only log if it's a valid video URL
    if (video.videoUrl && 
        video.videoUrl.startsWith('http') && 
        !video.videoUrl.includes('#video-') &&
        !video.videoUrl.endsWith('/')) {
      console.log('Loading video:', video.videoUrl);
      setVideoError(false);
    }
  };

  const handleVideoCanPlay = () => {
    setVideoLoaded(true);
    setVideoError(false);
  };

  const handleVideoLoadedData = () => {
    setVideoLoaded(true);
  };

  return (
    <div className={cn("relative w-full h-full bg-black overflow-hidden", className)}>
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        src={hasValidVideoUrl ? video.videoUrl : undefined}
        poster={video.thumbnail}
        loop
        muted={isMuted}
        playsInline
        onEnded={onVideoEnd}
        onClick={handleVideoClick}
        onDoubleClick={handleDoubleClick}
        onError={handleVideoError}
        onLoadStart={handleVideoLoadStart}
        onCanPlay={handleVideoCanPlay}
        onLoadedData={handleVideoLoadedData}
        crossOrigin="anonymous"
        preload={isActive ? "auto" : "none"}
        controls={false}
      />

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/20 pointer-events-none" />

      {/* Video Placeholder Overlay for videos without actual video data */}
      {!hasValidVideoUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center text-white p-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-2 mx-auto">
              <Play className="w-8 h-8 text-white ml-1" />
            </div>
            <p className="text-sm opacity-80">Video Preview</p>
          </div>
        </div>
      )}

      {/* Video Loading Overlay */}
      {hasValidVideoUrl && !videoLoaded && !videoError && isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="text-center text-white p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-sm opacity-80">Loading video...</p>
          </div>
        </div>
      )}

      {/* Video Error Overlay */}
      {videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center text-white p-4">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-2 mx-auto">
              <Play className="w-8 h-8 text-white ml-1" />
            </div>
            <p className="text-sm opacity-80">Video unavailable</p>
          </div>
        </div>
      )}

      {/* Play/Pause Control */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-black/50 rounded-full p-4 pointer-events-auto"
              onClick={handlePlayPause}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white ml-1" />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="flex items-end justify-between">
          {/* Left side - Creator info and title */}
          <div className="flex-1 mr-4">
            <div className="flex items-center space-x-3 mb-2">
              <Avatar
                src={video.creator.avatar}
                alt={video.creator.displayName}
                size="md"
                isLive={video.creator.isLiveStreaming}
              />
              <div>
                <p className="text-white font-semibold">{video.creator.displayName}</p>
                <p className="text-white/70 text-sm">@{video.creator.username}</p>
              </div>
              <Button 
                size="sm" 
                variant={isFollowingUser ? "secondary" : "primary"}
                onClick={handleFollow}
                disabled={!newAuthActor || isLoadingData}
              >
                {isLoadingData ? 'Loading...' : (isFollowingUser ? 'Following' : 'Follow')}
              </Button>
            </div>
            <p className="text-white text-sm mb-1">{video.title}</p>
            <p className="text-white/70 text-xs">{formatNumber(video.views)} views</p>
          </div>

          {/* Right side - Action buttons */}
          <div className="flex flex-col space-y-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleLike}
              disabled={!newAuthActor || isLiking}
              className="flex flex-col items-center space-y-1 disabled:opacity-50"
            >
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                isLiked ? "bg-flux-accent-red" : "bg-black/30"
              )}>
                {isLiking ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Heart className={cn("w-6 h-6", isLiked ? "text-white fill-current" : "text-white")} />
                )}
              </div>
              <span className="text-white text-xs">{formatNumber(likes)}</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowComments(true)}
              className="flex flex-col items-center space-y-1"
            >
              <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-xs">
                {isLoadingData ? '...' : formatNumber(commentsCount)}
              </span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowShare(true)}
              className="flex flex-col items-center space-y-1"
            >
              <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center">
                <Share className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-xs">Share</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleMute}
              className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center"
            >
              {isMuted ? (
                <VolumeX className="w-6 h-6 text-white" />
              ) : (
                <Volume2 className="w-6 h-6 text-white" />
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center"
            >
              <MoreHorizontal className="w-6 h-6 text-white" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CommentModal
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        videoId={video.id}
        onCommentAdded={handleCommentAdded}
      />

      <ShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        videoId={video.id}
        videoTitle={video.title}
      />
    </div>
  );
};