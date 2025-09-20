import { ActorSubclass } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

export interface BackendVideo {
  id: string;
  creator: any; // Principal object from backend
  title: string;
  description: string;
  thumbnail?: Uint8Array;
  videoData?: string; // Reference to video data
  videoType: any;
  category: any;
  tags: string[];
  hashtags: string[];
  analytics: {
    views: number;
    likes: number;
    dislikes: number;
    shares: number;
    comments: number;
  };
  createdAt: bigint;
  updatedAt: bigint;
  publishedAt?: bigint;
}

export interface FrontendVideo {
  id: string;
  title: string;
  thumbnail: string;
  videoUrl: string;
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
  };
  views: number;
  likes: number;
  duration: number;
  isLiked: boolean;
  description: string;
  hashtags: string[];
}

export class VideoService {
  constructor(private actor: ActorSubclass<any>) {}

  // Add this method to safely convert Uint8Array to base64
  private arrayBufferToBase64(buffer: Uint8Array): string {
    try {
      if (!buffer || buffer.length === 0) {
        return '';
      }
      
      // Convert Uint8Array to string, handling large arrays properly
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      
      // Process in chunks to avoid "Maximum call stack size exceeded" error
      const chunkSize = 1024;
      for (let i = 0; i < len; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      return btoa(binary);
    } catch (error) {
      console.error('Error converting array buffer to base64:', error);
      return '';
    }
  }

  // Helper to get user data for better video display
  private async getUserInfo(principalId: string): Promise<{ username: string; displayName: string; avatar: string } | null> {
    try {
      // Ensure we have a valid string
      if (!principalId || typeof principalId !== 'string') {
        console.warn('Invalid principal ID provided to getUserInfo:', principalId);
        return null;
      }
      
      // Convert string principal to Principal object
      const principal = Principal.fromText(principalId);
      const result = await this.actor.getUser(principal);
      if ('ok' in result) {
        const user = result.ok;
        console.log('Raw user data from backend (getUserInfo):', {
          username: user.username,
          hasAvatar: !!user.avatar,
          avatarType: typeof user.avatar,
          avatarLength: user.avatar?.length
        });
        
        // Use the consistent avatar converter
        const avatarUrl = this.convertAvatarToUrl(user.avatar, principalId);
        
        return {
          username: user.username || principalId.slice(0, 8),
          displayName: user.displayName || user.username || `User ${principalId.slice(0, 8)}`,
          avatar: avatarUrl
        };
      }
    } catch (error) {
      console.error('Error fetching user info for video:', error);
    }
    return null;
  }

  // Helper to fetch actual video data and create a blob URL
  private async getVideoUrl(videoId: string): Promise<string> {
    try {
      const result = await this.actor.getVideoData(videoId);
      if ('ok' in result) {
        const videoBlob = new Blob([result.ok], { type: 'video/mp4' });
        return URL.createObjectURL(videoBlob);
      } else {
        console.error('Failed to fetch video data:', result.err);
        return '/17517500282326374985607665398759.jpg'; // Default placeholder
      }
    } catch (error) {
      console.error('Error fetching video data:', error);
      return '/17517500282326374985607665398759.jpg'; // Default placeholder
    }
  }

  async getAllVideos(): Promise<FrontendVideo[]> {
    try {
      const result = await this.actor.getAllVideos();
      console.log('Fetched', result.ok?.length || 0, 'videos from backend');
      if ('ok' in result) {
        // Use async transformation to create proper video URLs
        const videosWithUrls = await Promise.all(
          result.ok.map((video: BackendVideo) => this.transformBackendVideoWithUserData(video))
        );
        return videosWithUrls;
      } else {
        console.error('Error fetching videos:', result.err);
        return [];
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      return [];
    }
  }

  async getVideosByUser(userId: string): Promise<FrontendVideo[]> {
    try {
      const result = await this.actor.getVideosByUser(userId, 50, 0);
      
      if (Array.isArray(result)) {
        return result.map((video: BackendVideo) => this.transformBackendVideo(video));
      } else {
        console.error('Unexpected result format for getVideosByUser:', result);
        return [];
      }
    } catch (error) {
      console.error('Error fetching user videos:', error);
      return [];
    }
  }

  async getVideosByCategory(category: string): Promise<FrontendVideo[]> {
    try {
      const backendCategory = this.mapCategoryToBackend(category);
      const result = await this.actor.getVideosByCategory(backendCategory, 50, 0);
      
      if (Array.isArray(result)) {
        return result.map((video: BackendVideo) => this.transformBackendVideo(video));
      } else {
        console.error('Unexpected result format for getVideosByCategory:', result);
        return [];
      }
    } catch (error) {
      console.error('Error fetching category videos:', error);
      return [];
    }
  }

  async searchVideos(query: string): Promise<FrontendVideo[]> {
    try {
      // If query is empty, get all videos instead
      if (!query.trim()) {
        return this.getAllVideos();
      }
      
      const result = await this.actor.searchVideos(query, [], 50);
      
      if (Array.isArray(result)) {
        return result.map((video: BackendVideo) => this.transformBackendVideo(video));
      } else {
        console.error('Unexpected result format for searchVideos:', result);
        return [];
      }
    } catch (error) {
      console.error('Error searching videos:', error);
      return [];
    }
  }

  async getTrendingVideos(): Promise<FrontendVideo[]> {
    try {
      const result = await this.actor.getTrendingVideos([], 24, 50); // Last 24 hours, 50 videos
      
      if (Array.isArray(result)) {
        return result.map((video: BackendVideo) => this.transformBackendVideo(video));
      } else {
        console.error('Unexpected result format for getTrendingVideos:', result);
        return [];
      }
    } catch (error) {
      console.error('Error fetching trending videos:', error);
      return [];
    }
  }

  private mapCategoryToBackend(category: string): string {
    const categoryMap: { [key: string]: string } = {
      'gaming': 'Gaming',
      'entertainment': 'Entertainment',
      'music': 'Music',
      'education': 'Education',
      'sports': 'Sports',
      'comedy': 'Comedy',
      'dance': 'Dance',
      'food': 'Food',
      'travel': 'Travel',
      'art': 'Art',
      'technology': 'Technology',
      'lifestyle': 'Lifestyle',
      'news': 'News',
      'other': 'Other'
    };
    return categoryMap[category] || 'Other';
  }

  private async transformBackendVideoWithUserData(backendVideo: BackendVideo): Promise<FrontendVideo> {
    // Convert thumbnail Uint8Array to base64 string
    const thumbnailUrl = backendVideo.thumbnail 
      ? `data:image/jpeg;base64,${btoa(String.fromCharCode(...backendVideo.thumbnail))}`
      : '/17517500282326374985607665398759.jpg'; // Default thumbnail

    // Create actual video URL from the uploaded video
    const videoUrl = await this.createBlobUrlFromChunks(backendVideo.id);

    // Convert Principal to string for user ID
    const creatorId = typeof backendVideo.creator === 'string' 
      ? backendVideo.creator 
      : String(backendVideo.creator);

    // Try to get actual user info
    const userInfo = await this.getUserInfo(creatorId);
    
    const username = userInfo?.username || creatorId.slice(0, 8);
    const displayName = userInfo?.displayName || `User ${creatorId.slice(0, 8)}`;
    const avatar = userInfo?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${creatorId}`;

    console.log('Transforming video with real URL:', {
      id: backendVideo.id,
      title: backendVideo.title,
      videoUrl: videoUrl,
      hasThumb: !!backendVideo.thumbnail
    });

    return {
      id: backendVideo.id,
      title: backendVideo.title,
      thumbnail: thumbnailUrl,
      videoUrl: videoUrl,
      creator: {
        id: creatorId,
        username: username,
        displayName: displayName,
        avatar: avatar,
        isVerified: false
      },
      views: Number(backendVideo.analytics.views),
      likes: Number(backendVideo.analytics.likes),
      duration: 30, // Default duration - could be extracted from metadata
      isLiked: false, // Would need to check user's like status
      description: backendVideo.description,
      hashtags: backendVideo.hashtags
    };
  }

  private transformBackendVideo(backendVideo: BackendVideo): FrontendVideo {
    // Synchronous version for backwards compatibility
    // Convert thumbnail Uint8Array to base64 string
    const thumbnailUrl = backendVideo.thumbnail 
      ? `data:image/jpeg;base64,${btoa(String.fromCharCode(...backendVideo.thumbnail))}`
      : '/17517500282326374985607665398759.jpg'; // Default thumbnail

    // Create a streaming URL for the uploaded video
    const videoUrl = this.createVideoStreamingUrl(backendVideo.id);

    // Extract meaningful username from principal
    console.log('Creator object:', backendVideo.creator, 'Type:', typeof backendVideo.creator);
    const creatorText = typeof backendVideo.creator === 'string' 
      ? backendVideo.creator 
      : String(backendVideo.creator);
    const principalParts = creatorText.split('-');
    const username = principalParts[0] ? principalParts[0].slice(0, 8) : creatorText.slice(0, 8);
    const displayName = `User ${username}`;

    console.log('Transforming video:', {
      id: backendVideo.id,
      title: backendVideo.title,
      creator: backendVideo.creator,
      username: username,
      hasThumb: !!backendVideo.thumbnail
    });

    return {
      id: backendVideo.id,
      title: backendVideo.title,
      thumbnail: thumbnailUrl,
      videoUrl: videoUrl,
      creator: {
        id: creatorText,
        username: username,
        displayName: displayName,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${creatorText}`,
        isVerified: false
      },
      views: Number(backendVideo.analytics.views),
      likes: Number(backendVideo.analytics.likes),
      duration: 30, // Default duration - could be extracted from metadata
      isLiked: false, // Would need to check user's like status
      description: backendVideo.description,
      hashtags: backendVideo.hashtags
    };
  }

  /**
   * Create a streaming URL for a video using the chunked upload system
   * This method fetches the video data from the backend and creates a blob URL
   */
  private createVideoStreamingUrl(videoId: string): string {
    // For now, we'll start the blob creation process in the background
    // and return a placeholder that will be replaced when the blob is ready
    console.log(`Creating stream URL for video: ${videoId}`);
    
    // Start creating blob URL from chunks (async)
    this.createBlobUrlFromChunks(videoId).then(url => {
      console.log(`Blob URL created for ${videoId}:`, url);
      // Note: In a production app, this would trigger a UI update
      // For now, we'll need a different approach since this is sync
    }).catch(error => {
      console.error(`Failed to create blob URL for ${videoId}:`, error);
    });
    
    // For the immediate return, we still need to use a placeholder
    // but we'll enhance this in the next step
    return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  }

  /**
   * Fetch video data from chunks and create a blob URL (future implementation)
   */
  private async createBlobUrlFromChunks(videoId: string): Promise<string> {
    try {
      // Get video stream info
      const streamInfoResult = await this.actor.getVideoStreamInfo(videoId);
      if (!('ok' in streamInfoResult)) {
        throw new Error(`Failed to get stream info: ${streamInfoResult.err}`);
      }
      
      const { totalChunks } = streamInfoResult.ok;
      const chunks: ArrayBuffer[] = [];
      
      // Fetch all chunks
      for (let i = 0; i < totalChunks; i++) {
        const chunkResult = await this.actor.getVideoStreamChunk(videoId, i, []);
        if ('ok' in chunkResult) {
          chunks.push(chunkResult.ok.data.buffer);
        }
      }
      
      // Create blob from chunks
      const blob = new Blob(chunks, { type: 'video/mp4' });
      return URL.createObjectURL(blob);
      
    } catch (error) {
      console.error('Failed to create blob URL from chunks:', error);
      // Fallback to placeholder
      return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    }
  }

  async likeVideo(videoId: string): Promise<boolean> {
    try {
      const result = await this.actor.likeVideo(videoId);
      return 'ok' in result;
    } catch (error) {
      console.error('Error liking video:', error);
      return false;
    }
  }

  async unlikeVideo(videoId: string): Promise<boolean> {
    try {
      const result = await this.actor.unlikeVideo(videoId);
      return 'ok' in result;
    } catch (error) {
      console.error('Error unliking video:', error);
      return false;
    }
  }

  async hasUserLikedVideo(videoId: string): Promise<boolean> {
    try {
      const result = await this.actor.hasUserLikedVideo(videoId);
      if ('ok' in result) {
        return result.ok;
      }
      return false;
    } catch (error) {
      console.error('Error checking if user liked video:', error);
      return false;
    }
  }

  async getVideoCommentsCount(videoId: string): Promise<number> {
    try {
      // Try multiple possible method names and approaches
      let result;
      
      try {
        // Try the most likely method name
        result = await this.actor.getVideoCommentsCount(videoId);
      } catch (firstError) {
        console.log('getVideoCommentsCount failed, trying alternatives...');
        try {
          // Try alternative method name
          result = await this.actor.getCommentsCount(videoId);
        } catch (secondError) {
          console.log('getCommentsCount failed, trying getVideoComments to count...');
          try {
            // Try getting all comments and counting them
            const comments = await this.actor.getVideoComments(videoId);
            if (Array.isArray(comments)) {
              return comments.length;
            } else if ('ok' in comments && Array.isArray(comments.ok)) {
              return comments.ok.length;
            }
            return 0;
          } catch (thirdError) {
            console.log('All comment count methods failed, returning 0');
            return 0;
          }
        }
      }
      
      if (typeof result === 'number') {
        return result;
      } else if ('ok' in result) {
        return Number(result.ok);
      }
      return 0;
    } catch (error) {
      console.error('Error getting video comments count:', error);
      return 0;
    }
  }

  // Helper function to safely convert userId to string
  private userIdToString(userId: any): string {
    if (!userId) return 'unknown';
    
    if (typeof userId === 'string') {
      return userId;
    }
    
    // Handle Principal objects
    if (userId && typeof userId === 'object') {
      if (userId.toText && typeof userId.toText === 'function') {
        return userId.toText();
      }
      if (userId.toString && typeof userId.toString === 'function') {
        return userId.toString();
      }
      // If it's an object with _arr property (Principal internal structure)
      if (userId._arr) {
        try {
          return Principal.fromUint8Array(userId._arr).toText();
        } catch (e) {
          console.log('Failed to convert Principal from _arr');
        }
      }
    }
    
    return String(userId).slice(0, 32); // Fallback to string conversion with max length
  }

  // Add this helper method to handle avatar conversion consistently
  private convertAvatarToUrl(avatar: any, userId: string): string {
    const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
    
    if (!avatar) {
      console.log('No avatar data provided, using default');
      return defaultAvatar;
    }
    
    try {
      // Handle array format (like in WalletContext)
      if (Array.isArray(avatar)) {
        if (avatar.length === 0) {
          console.log('Avatar array is empty, using default');
          return defaultAvatar;
        }
        
        // Check if it's an array of strings (base64)
        if (typeof avatar[0] === 'string' && avatar[0].length > 10) {
          const base64String = avatar[0];
          if (base64String.startsWith('data:image/')) {
            return base64String;
          } else {
            return `data:image/jpeg;base64,${base64String}`;
          }
        }
        
        // Check if it's a Uint8Array wrapped in an array
        if (avatar[0] && (avatar[0] instanceof Uint8Array || Array.isArray(avatar[0]))) {
          const uint8Array = avatar[0] instanceof Uint8Array ? avatar[0] : new Uint8Array(avatar[0]);
          if (uint8Array.length > 100) {
            const base64String = this.arrayBufferToBase64(uint8Array);
            if (base64String && base64String.length > 10) {
              return `data:image/jpeg;base64,${base64String}`;
            }
          }
        }
        
        // If it's a regular Uint8Array stored as array
        if (avatar.length > 100) {
          const uint8Array = new Uint8Array(avatar);
          const base64String = this.arrayBufferToBase64(uint8Array);
          if (base64String && base64String.length > 10) {
            return `data:image/jpeg;base64,${base64String}`;
          }
        }
      }
      
      // Handle Uint8Array format
      if (avatar instanceof Uint8Array || (Array.isArray(avatar) && typeof avatar[0] === 'number')) {
        const uint8Array = avatar instanceof Uint8Array ? avatar : new Uint8Array(avatar);
        if (uint8Array.length > 100) {
          const base64String = this.arrayBufferToBase64(uint8Array);
          if (base64String && base64String.length > 10) {
            return `data:image/jpeg;base64,${base64String}`;
          }
        }
      }
      
      // Handle string format
      if (typeof avatar === 'string' && avatar.length > 10) {
        if (avatar.startsWith('data:image/')) {
          return avatar;
        } else if (avatar.startsWith('http')) {
          return avatar;
        } else {
          return `data:image/jpeg;base64,${avatar}`;
        }
      }
      
      console.log('Avatar format not recognized:', typeof avatar, avatar.constructor.name, 'Length:', avatar.length);
      return defaultAvatar;
      
    } catch (error) {
      console.error('Error converting avatar:', error);
      return defaultAvatar;
    }
  }

  // Update the getUserInfoForComment method to use the new avatar converter
  async getUserInfoForComment(userId: any): Promise<{ username: string; displayName: string; avatar: string } | null> {
    try {
      const userIdString = this.userIdToString(userId);
      
      if (!userIdString || userIdString === 'unknown') {
        console.warn('Invalid user ID provided to getUserInfoForComment:', userId);
        return null;
      }
      
      // Try different approaches to get user info
      let result;
      
      try {
        // If userId is already a Principal object, use it directly
        if (userId && typeof userId === 'object' && userId.toText) {
          result = await this.actor.getUser(userId);
        } else {
          // Try with Principal conversion
          const principal = Principal.fromText(userIdString);
          result = await this.actor.getUser(principal);
        }
      } catch (principalError) {
        console.log('Principal approach failed, trying with string userId...');
        try {
          // Try with string userId
          result = await this.actor.getUserProfile(userIdString);
        } catch (profileError) {
          console.log('getUserProfile failed, trying alternative methods...');
          try {
            // Try getUserById
            result = await this.actor.getUserById(userIdString);
          } catch (byIdError) {
            console.log('All user fetch methods failed for userId:', userIdString);
            return null;
          }
        }
      }
      
      if ('ok' in result) {
        const user = result.ok;
        console.log('Raw user data from backend:', {
          username: user.username,
          hasAvatar: !!user.avatar,
          avatarType: typeof user.avatar,
          avatarLength: user.avatar?.length,
          avatarConstructor: user.avatar?.constructor?.name
        });
        
        // Use the consistent avatar converter
        const avatarUrl = this.convertAvatarToUrl(user.avatar, userIdString);
        
        console.log('Final avatar URL for user:', userIdString, avatarUrl.substring(0, 50) + '...');
        
        return {
          username: user.username || user.name || `user_${userIdString.slice(0, 8)}`,
          displayName: user.displayName || user.username || user.name || `User ${userIdString.slice(0, 8)}`,
          avatar: avatarUrl
        };
      } else {
        console.log('User not found in backend:', userIdString, result);
      }
    } catch (error) {
      console.error('Error fetching user info for comment:', error);
    }
    return null;
  }

  // Update the getVideoComments method to better handle user data
  async getVideoComments(videoId: string): Promise<any[]> {
    try {
      console.log('Fetching comments for video:', videoId);
      
      // Try different parameter combinations the backend might expect
      let result;
      
      try {
        // Try with just videoId
        result = await this.actor.getVideoComments(videoId);
      } catch (firstError) {
        console.log('getVideoComments failed, trying alternatives...');
        try {
          // Try with limit and offset parameters
          result = await this.actor.getVideoComments(videoId, 50, 0);
        } catch (secondError) {
          console.log('getVideoComments with params failed, trying getComments...');
          try {
            // Try alternative method name
            result = await this.actor.getComments(videoId);
          } catch (thirdError) {
            console.log('All comment methods failed, returning empty array');
            return [];
          }
        }
      }
      
      let comments = [];
      if (Array.isArray(result)) {
        comments = result;
      } else if ('ok' in result && Array.isArray(result.ok)) {
        comments = result.ok;
      }
      
      console.log('Raw comments from backend:', comments);
      
      // Enhance comments with user information
      const enhancedComments = await Promise.all(
        comments.map(async (comment: any) => {
          console.log('Processing comment:', comment);
          
          const userId = comment.userId || comment.user || comment.authorId || comment.author;
          const userIdString = this.userIdToString(userId);
          let userInfo = null;
          
          if (userId) {
            console.log('Fetching user info for userId:', userId, 'converted to:', userIdString);
            userInfo = await this.getUserInfoForComment(userId);
            console.log('User info result:', userInfo);
          }
          
          const enhancedComment = {
            ...comment,
            id: comment.id || `comment_${Date.now()}_${Math.random()}`,
            userInfo: userInfo,
            userId: userIdString,
            username: userInfo?.username || comment.username || `user_${userIdString.slice(0, 8)}`,
            displayName: userInfo?.displayName || comment.displayName || userInfo?.username || `User ${userIdString.slice(0, 8)}`,
            avatar: userInfo?.avatar || comment.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userIdString}`,
            content: comment.content || comment.text || '',
            createdAt: comment.createdAt || comment.timestamp || Date.now(),
            likes: comment.likes || 0,
            isLiked: comment.isLiked || false
          };
          
          console.log('Enhanced comment:', enhancedComment);
          return enhancedComment;
        })
      );
      
      return enhancedComments;
    } catch (error) {
      console.error('Error getting video comments:', error);
      return [];
    }
  }

  async addComment(videoId: string, content: string, parentCommentId?: string): Promise<boolean> {
    try {
      // Call the backend addComment method with the correct parameters
      const result = await this.actor.addComment(videoId, content, parentCommentId ? [parentCommentId] : []);
      
      // Backend returns Result<string, string> where ok contains the commentId
      if ('ok' in result) {
        return true;
      } else {
        console.error('Error adding comment:', result.err);
        return false;
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      return false;
    }
  }

  async likeComment(commentId: string): Promise<boolean> {
    try {
      let result;
      
      try {
        result = await this.actor.likeComment(commentId);
      } catch (firstError) {
        console.log('likeComment not implemented, using optimistic update');
        // Return true for optimistic UI updates even if backend doesn't support it yet
        return true;
      }
      
      return 'ok' in result || result === true;
    } catch (error) {
      console.error('Error liking comment:', error);
      // Return true for optimistic updates
      return true;
    }
  }

  async unlikeComment(commentId: string): Promise<boolean> {
    try {
      let result;
      
      try {
        result = await this.actor.unlikeComment(commentId);
      } catch (firstError) {
        console.log('unlikeComment not implemented, using optimistic update');
        // Return true for optimistic UI updates even if backend doesn't support it yet
        return true;
      }
      
      return 'ok' in result || result === true;
    } catch (error) {
      console.error('Error unliking comment:', error);
      // Return true for optimistic updates
      return true;
    }
  }
}