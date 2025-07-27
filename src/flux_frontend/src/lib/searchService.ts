import { ActorSubclass } from '@dfinity/agent';

export interface BackendUser {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatar?: Uint8Array;
  banner?: Uint8Array;
  following: string[];
  followers: string[];
  createdAt: bigint;
  isVerified: boolean;
  subscriberCount: number;
  videoCount: number;
}

export interface FrontendUser {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
  banner: string;
  followersCount: number;
  followingCount: number;
  isVerified: boolean;
  isFollowing: boolean;
  followers: string[];  // Array of user IDs who follow this user
  following: string[];  // Array of user IDs this user follows
  videoCount: number;
  createdAt: Date;
}

export interface SearchResult {
  videos: any[];
  users: FrontendUser[];
  hashtags: Array<{
    tag: string;
    count: number;
    growth: string;
  }>;
}

export class SearchService {
  constructor(private actor: ActorSubclass<any>, private currentUserId?: string) {}

  // Transform backend user to frontend format
  private transformUser(backendUser: BackendUser): FrontendUser {
    return {
      id: backendUser.id,
      username: backendUser.username,
      displayName: backendUser.displayName,
      bio: backendUser.bio,
      avatar: backendUser.avatar ? 
        `data:image/jpeg;base64,${btoa(String.fromCharCode(...backendUser.avatar))}` :
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${backendUser.id}`,
      banner: backendUser.banner ? 
        `data:image/jpeg;base64,${btoa(String.fromCharCode(...backendUser.banner))}` :
        '/17517500282326374985607665398759.jpg',
      followersCount: backendUser.followers.length,
      followingCount: backendUser.following.length,
      followers: backendUser.followers,  // Include all followers
      following: backendUser.following,  // Include all users this user follows
      isVerified: backendUser.isVerified,
      isFollowing: this.currentUserId ? backendUser.followers.includes(this.currentUserId) : false,
      videoCount: backendUser.videoCount,
      createdAt: new Date(Number(backendUser.createdAt) / 1000000), // Convert nanoseconds to milliseconds
    };
  }

  async searchAll(query: string): Promise<SearchResult> {
    try {
      const [videoResults, userResults] = await Promise.all([
        this.searchVideos(query),
        this.searchUsers(query)
      ]);

      // Extract hashtags from video results
      const hashtags = this.extractHashtags(videoResults);

      return {
        videos: videoResults,
        users: userResults,
        hashtags: hashtags
      };
    } catch (error) {
      console.error('Error performing search:', error);
      return {
        videos: [],
        users: [],
        hashtags: []
      };
    }
  }

  async searchUsers(query: string, limit: number = 20): Promise<FrontendUser[]> {
    try {
      const result = await this.actor.searchUsers(query, limit);
      
      if (Array.isArray(result)) {
        return result.map((user: BackendUser) => this.transformUser(user));
      } else {
        console.error('Unexpected result format for searchUsers:', result);
        return [];
      }
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  async searchVideos(query: string, limit: number = 50): Promise<any[]> {
    try {
      const result = await this.actor.searchVideos(query, null, limit);
      
      if (Array.isArray(result)) {
        // Transform videos using the existing video service logic
        // For now, return raw results - you could integrate with VideoService here
        return result;
      } else {
        console.error('Unexpected result format for searchVideos:', result);
        return [];
      }
    } catch (error) {
      console.error('Error searching videos:', error);
      return [];
    }
  }

  async getSuggestedUsers(limit: number = 10): Promise<FrontendUser[]> {
    try {
      // For now, use search with empty query to get users
      // In a real app, you'd want a dedicated "suggested users" endpoint
      const result = await this.actor.searchUsers('', limit);
      
      if (Array.isArray(result)) {
        return result
          .map((user: BackendUser) => this.transformUser(user))
          .filter(user => user.id !== this.currentUserId) // Don't suggest current user
          .sort((a, b) => b.followersCount - a.followersCount); // Sort by followers
      } else {
        return [];
      }
    } catch (error) {
      console.error('Error getting suggested users:', error);
      return [];
    }
  }

  async getUserByUsername(username: string): Promise<FrontendUser | null> {
    try {
      const result = await this.actor.getUserByUsername(username);
      
      if ('ok' in result) {
        return this.transformUser(result.ok);
      } else {
        console.error('User not found:', result.err);
        return null;
      }
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  }

  async followUser(userId: string): Promise<boolean> {
    try {
      const result = await this.actor.followUser(userId);
      return 'ok' in result;
    } catch (error) {
      console.error('Error following user:', error);
      return false;
    }
  }

  async unfollowUser(userId: string): Promise<boolean> {
    try {
      const result = await this.actor.unfollowUser(userId);
      return 'ok' in result;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return false;
    }
  }

  private extractHashtags(videos: any[]): Array<{ tag: string; count: number; growth: string }> {
    const hashtagCounts = new Map<string, number>();
    
    videos.forEach(video => {
      if (video.hashtags && Array.isArray(video.hashtags)) {
        video.hashtags.forEach((tag: string) => {
          const count = hashtagCounts.get(tag) || 0;
          hashtagCounts.set(tag, count + 1);
        });
      }
    });

    // Convert to array and sort by count
    const hashtagArray = Array.from(hashtagCounts.entries())
      .map(([tag, count]) => ({
        tag: `#${tag}`,
        count,
        growth: `+${Math.floor(Math.random() * 20)}%` // Mock growth for now
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 hashtags

    return hashtagArray;
  }
}