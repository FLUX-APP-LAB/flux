import { ActorSubclass } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

export interface BackendStream {
  id: string;
  creator: any;
  title: string;
  description: string;
  thumbnail?: Uint8Array;
  category: any;
  tags: string[];
  maturityRating: any;
  quality: any;
  isLive: boolean;
  viewerCount: number;
  chatEnabled: boolean;
  streamData?: any;
  createdAt: bigint;
  startedAt?: bigint;
  endedAt?: bigint;
}

export interface FrontendStream {
  id: string;
  title: string;
  thumbnail: string;
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
  };
  viewers: number;
  isLive: boolean;
  category: string;
  description: string;
  tags: string[];
  startedAt: string;
  streamUrl?: string;
  chatEnabled: boolean;
}

export interface StreamCreationData {
  title: string;
  description: string;
  category: string;
  tags: string[];
  maturityRating: string;
  quality: string;
}

export class StreamingService {
  constructor(private actor: ActorSubclass<any>) {}

  async createStream(
    title: string,
    description: string,
    category: string,
    tags: string[] = [],
    maturityRating: string = 'General',
    quality: string = 'P720'
  ): Promise<string | null> {
    try {
      // Convert category string to backend variant type
      const categoryVariant = this.getCategoryVariant(category);
      
      // Convert quality string to backend variant type  
      const qualityVariant = this.getQualityVariant(quality);

      // Call backend with individual parameters (not an object)
      const result = await this.actor.createStream(
        title,
        description,
        categoryVariant,
        tags,
        maturityRating,
        qualityVariant
      );
      
      if ('ok' in result) {
        return result.ok;
      } else {
        console.error('Failed to create stream:', result.err);
        return null;
      }
    } catch (error) {
      console.error('Error creating stream:', error);
      return null;
    }
  }

  async startStream(streamId: string): Promise<boolean> {
    try {
      const result = await this.actor.startStream(streamId);
      
      if ('ok' in result) {
        return true;
      } else {
        console.error('Failed to start stream:', result.err);
        return false;
      }
    } catch (error) {
      console.error('Error starting stream:', error);
      return false;
    }
  }

  async stopStream(streamId: string): Promise<boolean> {
    try {
      const result = await this.actor.stopStream(streamId);
      
      if ('ok' in result) {
        return true;
      } else {
        console.error('Failed to stop stream:', result.err);
        return false;
      }
    } catch (error) {
      console.error('Error stopping stream:', error);
      return false;
    }
  }

  async getLiveStreams(category?: string, language?: string, limit: number = 50): Promise<FrontendStream[]> {
    try {
      // Convert category to variant type if provided
      const categoryVariant = category ? this.getCategoryVariant(category) : null;
      
      const result = await this.actor.getLiveStreams(categoryVariant, language || null, limit);
      
      // Backend returns array directly, not wrapped in Result
      if (Array.isArray(result)) {
        return result.map((stream: BackendStream) => this.transformBackendToFrontend(stream));
      } else {
        console.error('Unexpected result format from getLiveStreams:', result);
        return [];
      }
    } catch (error) {
      console.error('Error getting live streams:', error);
      return [];
    }
  }

  async getStream(streamId: string): Promise<FrontendStream | null> {
    try {
      const result = await this.actor.getStream(streamId);
      
      if ('ok' in result) {
        return this.transformBackendToFrontend(result.ok);
      } else {
        console.error('Failed to get stream:', result.err);
        return null;
      }
    } catch (error) {
      console.error('Error getting stream:', error);
      return null;
    }
  }

  async shareStream(stream: FrontendStream): Promise<boolean> {
    try {
      const result = await this.actor.shareStream(stream.id);
      
      if ('ok' in result) {
        return true;
      } else {
        console.error('Failed to share stream:', result.err);
        return false;
      }
    } catch (error) {
      console.error('Error sharing stream:', error);
      return false;
    }
  }

  private transformBackendToFrontend(backendStream: BackendStream): FrontendStream {
    return {
      id: backendStream.id,
      title: backendStream.title,
      thumbnail: backendStream.thumbnail ? this.uint8ArrayToUrl(backendStream.thumbnail) : '/default-avatar.png',
      creator: {
        id: backendStream.creator.toString(),
        username: `user_${backendStream.creator.toString().slice(0, 8)}`,
        displayName: `User ${backendStream.creator.toString().slice(0, 8)}`,
        avatar: '/default-avatar.png',
        isVerified: false
      },
      viewers: backendStream.viewerCount,
      isLive: backendStream.isLive,
      category: this.transformCategory(backendStream.category),
      description: backendStream.description,
      tags: backendStream.tags,
      startedAt: backendStream.startedAt ? new Date(Number(backendStream.startedAt) / 1000000).toISOString() : new Date().toISOString(),
      chatEnabled: backendStream.chatEnabled
    };
  }

  private uint8ArrayToUrl(uint8Array: Uint8Array): string {
    const blob = new Blob([new Uint8Array(uint8Array)], { type: 'image/jpeg' });
    return URL.createObjectURL(blob);
  }

  private transformCategory(category: any): string {
    if (typeof category === 'object' && category !== null) {
      const keys = Object.keys(category);
      return keys.length > 0 ? keys[0] : 'General';
    }
    return category?.toString() || 'General';
  }

  // Helper method to convert category string to backend variant type
  private getCategoryVariant(category: string): any {
    const categoryMap: { [key: string]: any } = {
      'Gaming': { Gaming: null },
      'JustChatting': { JustChatting: null },
      'Music': { Music: null },
      'Art': { Art: null },
      'IRL': { IRL: null },
      'CryptoTrading': { CryptoTrading: null },
      'Education': { Education: null },
      'Sports': { Sports: null },
      'Technology': { Technology: null },
      'Cooking': { Cooking: null },
      'Fitness': { Fitness: null },
      'Creative': { Creative: null }
    };
    
    return categoryMap[category] || { Gaming: null }; // Default to Gaming
  }

  // Helper method to convert quality string to backend variant type
  private getQualityVariant(quality: string): any {
    const qualityMap: { [key: string]: any } = {
      'P240': { P240: null },
      'P360': { P360: null },
      'P480': { P480: null },
      'P720': { P720: null },
      'P1080': { P1080: null },
      'P1440': { P1440: null },
      'P2160': { P2160: null }
    };
    
    return qualityMap[quality] || { P720: null }; // Default to P720
  }
}
