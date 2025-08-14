import { ActorSubclass } from '@dfinity/agent';

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
      const result = await this.actor.getUser(principalId);
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

    // Try to get actual user info
    const userInfo = await this.getUserInfo(backendVideo.creator);
    
    const username = userInfo?.username || backendVideo.creator.slice(0, 8);
    const displayName = userInfo?.displayName || `User ${backendVideo.creator.slice(0, 8)}`;
    const avatar = userInfo?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${backendVideo.creator}`;

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
        id: backendVideo.creator,
        username: username,
        displayName: displayName,
        avatar: avatar,
        isVerified: false
      },
      views: backendVideo.analytics.views,
      likes: backendVideo.analytics.likes,
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
        id: backendVideo.creator,
        username: username,
        displayName: displayName,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${backendVideo.creator}`,
        isVerified: false
      },
      views: backendVideo.analytics.views,
      likes: backendVideo.analytics.likes,
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
}