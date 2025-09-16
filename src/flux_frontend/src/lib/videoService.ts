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
        return {
          username: user.username || principalId.slice(0, 8),
          displayName: user.displayName || `User ${principalId.slice(0, 8)}`,
          avatar: user.avatar?.[0] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${principalId}`
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
      const result = await this.actor.getVideoComments(videoId, 1, 0);
      // This is a simplified count - in a real implementation, you'd want a dedicated count endpoint
      return Array.isArray(result) ? result.length : 0;
    } catch (error) {
      console.error('Error getting video comments count:', error);
      return 0;
    }
  }

  async checkUserLikedVideo(videoId: string): Promise<boolean> {
    try {
      // For now, we'll use a simple approach - in a real implementation,
      // you'd want a dedicated backend method to check if user liked a video
      // This is a placeholder that returns false
      // TODO: Implement getUserVideoLikes or similar in backend
      return false;
    } catch (error) {
      console.error('Error checking if user liked video:', error);
      return false;
    }
  }
}