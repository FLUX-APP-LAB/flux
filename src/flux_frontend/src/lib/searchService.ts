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
  totalMatches?: number;
  hasMore?: boolean;
}

export interface UserSearchResult {
  users: FrontendUser[];
  totalMatches: number;
  hasMore: boolean;
}

export interface UserActivitySummary {
  profile: {
    username: string;
    displayName: string;
    tier: string;
    verificationStatus: string;
    createdAt: number;
    lastActive: number;
  };
  stats: {
    totalViews: number;
    totalLikes: number;
    totalStreams: number;
    totalStreamTime: number;
    averageViewers: number;
    peakViewers: number;
    totalRevenue: number;
    followersGained30d: number;
    viewsGained30d: number;
  };
  relationships: {
    followers: number;
    following: number;
    subscribers: number;
  };
  activity: {
    isOnline: boolean;
    daysSinceLastActive: number;
    engagementLevel: string;
  };
}

export interface TopUser {
  userId: string;
  username: string;
  displayName: string;
  value: number;
  tier: string;
}

export interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  totalSubscriptions: number;
  totalRevenue: number;
  verifiedUsers: number;
  partneredUsers: number;
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
      followersCount: Number(backendUser.followers.length), // Convert to number
      followingCount: Number(backendUser.following.length), // Convert to number
      followers: backendUser.followers,  // Include all followers
      following: backendUser.following,  // Include all users this user follows
      isVerified: backendUser.isVerified,
      isFollowing: this.currentUserId ? backendUser.followers.includes(this.currentUserId) : false,
      videoCount: Number(backendUser.videoCount), // Convert to number
      createdAt: new Date(Number(backendUser.createdAt) / 1000000), // Convert nanoseconds to milliseconds
    };
  }

  async searchAll(query: string): Promise<SearchResult> {
    try {
      const [videoResults, userResults] = await Promise.all([
        this.searchVideos(query),
        this.searchUsersSimple(query) // Use simple version for searchAll
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

  async searchUsers(query: string, limit: number = 20, offset: number = 0): Promise<UserSearchResult> {
    try {
      const result = await this.actor.searchUsers(query, limit, offset);
      
      if (result && typeof result === 'object' && 'users' in result) {
        // New API format with pagination
        return {
          users: result.users.map((user: BackendUser) => this.transformUser(user)),
          totalMatches: result.totalMatches || 0,
          hasMore: result.hasMore || false
        };
      } else if (Array.isArray(result)) {
        // Fallback for old API format
        return {
          users: result.map((user: BackendUser) => this.transformUser(user)),
          totalMatches: result.length,
          hasMore: false
        };
      } else {
        console.error('Unexpected result format for searchUsers:', result);
        return {
          users: [],
          totalMatches: 0,
          hasMore: false
        };
      }
    } catch (error) {
      console.error('Error searching users:', error);
      return {
        users: [],
        totalMatches: 0,
        hasMore: false
      };
    }
  }

  async searchUsersSimple(query: string, limit: number = 20): Promise<FrontendUser[]> {
    const result = await this.searchUsers(query, limit, 0);
    return result.users;
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
      const result = await this.searchUsersSimple('', limit);
      
      return result
        .filter(user => user.id !== this.currentUserId) // Don't suggest current user
        .sort((a, b) => b.followersCount - a.followersCount); // Sort by followers
    } catch (error) {
      console.error('Error getting suggested users:', error);
      return [];
    }
  }

  async getUserActivitySummary(userId: string): Promise<UserActivitySummary | null> {
    try {
      const result = await this.actor.getUserActivitySummary(userId);
      
      if ('ok' in result) {
        // Convert BigInt values to numbers in the user activity summary
        const data = result.ok;
        return {
          profile: {
            username: data.profile.username,
            displayName: data.profile.displayName,
            tier: data.profile.tier,
            verificationStatus: data.profile.verificationStatus,
            createdAt: Number(data.profile.createdAt),
            lastActive: Number(data.profile.lastActive),
          },
          stats: {
            totalViews: Number(data.stats.totalViews),
            totalLikes: Number(data.stats.totalLikes),
            totalStreams: Number(data.stats.totalStreams),
            totalStreamTime: Number(data.stats.totalStreamTime),
            averageViewers: Number(data.stats.averageViewers),
            peakViewers: Number(data.stats.peakViewers),
            totalRevenue: Number(data.stats.totalRevenue),
            followersGained30d: Number(data.stats.followersGained30d),
            viewsGained30d: Number(data.stats.viewsGained30d),
          },
          relationships: {
            followers: Number(data.relationships.followers),
            following: Number(data.relationships.following),
            subscribers: Number(data.relationships.subscribers),
          },
          activity: {
            isOnline: data.activity.isOnline,
            daysSinceLastActive: Number(data.activity.daysSinceLastActive),
            engagementLevel: data.activity.engagementLevel,
          },
        };
      } else {
        console.error('Error getting user activity summary:', result.err);
        return null;
      }
    } catch (error) {
      console.error('Error getting user activity summary:', error);
      return null;
    }
  }

  async getTopUsers(metric: string = 'followers', limit: number = 10): Promise<TopUser[]> {
    try {
      const result = await this.actor.getTopUsers(metric, limit);
      if (Array.isArray(result)) {
        // Convert BigInt values to numbers
        return result.map((user: any) => ({
          userId: user.userId,
          username: user.username,
          displayName: user.displayName,
          value: Number(user.value),
          tier: user.tier,
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting top users:', error);
      return [];
    }
  }

  async getPlatformStats(): Promise<PlatformStats | null> {
    try {
      const result = await this.actor.getPlatformStats();
      if (result) {
        // Convert BigInt values to numbers
        return {
          totalUsers: Number(result.totalUsers),
          activeUsers: Number(result.activeUsers),
          totalSubscriptions: Number(result.totalSubscriptions),
          totalRevenue: Number(result.totalRevenue),
          verifiedUsers: Number(result.verifiedUsers),
          partneredUsers: Number(result.partneredUsers),
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting platform stats:', error);
      return null;
    }
  }

  async getSubscriptionStats(userId: string): Promise<any> {
    try {
      const result = await this.actor.getSubscriptionStats(userId);
      return result || null;
    } catch (error) {
      console.error('Error getting subscription stats:', error);
      return null;
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