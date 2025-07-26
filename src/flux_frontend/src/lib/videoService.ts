import { ActorSubclass } from '@dfinity/agent';

export interface BackendVideo {
  id: string;
  creator: string;
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
      // Use the dedicated getAllVideos function
      const result = await this.actor.getAllVideos();
      
      if ('ok' in result && Array.isArray(result.ok)) {
        console.log(`Fetched ${result.ok.length} videos from backend`);
        return result.ok.map((video: BackendVideo) => this.transformBackendVideo(video));
      } else if ('err' in result) {
        console.error('Error fetching videos from backend:', result.err);
        return [];
      } else {
        console.error('Unexpected result format for getAllVideos:', result);
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
      
      const result = await this.actor.searchVideos(query, null, 50);
      
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
      const result = await this.actor.getTrendingVideos(null, 24, 50); // Last 24 hours, 50 videos
      
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

    // For now, use a placeholder video URL since proper video streaming would require more complex setup
    const videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

    // Try to get actual user info
    const userInfo = await this.getUserInfo(backendVideo.creator);
    
    const username = userInfo?.username || backendVideo.creator.slice(0, 8);
    const displayName = userInfo?.displayName || `User ${backendVideo.creator.slice(0, 8)}`;
    const avatar = userInfo?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${backendVideo.creator}`;

    console.log('Transforming video with user data:', {
      id: backendVideo.id,
      title: backendVideo.title,
      creator: backendVideo.creator,
      username: username,
      displayName: displayName,
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

    // For now, use a placeholder video URL since proper video streaming would require more complex setup
    const videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

    // Extract meaningful username from principal
    const principalParts = backendVideo.creator.split('-');
    const username = principalParts[0] ? principalParts[0].slice(0, 8) : backendVideo.creator.slice(0, 8);
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
}
