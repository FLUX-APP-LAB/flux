import { ActorSubclass } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

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
  followers: string[];
  following: string[];
  videoCount: number;
  createdAt: Date;
}

export class UserService {
  constructor(private actor: ActorSubclass<any>) {}

  async followUser(userId: string): Promise<boolean> {
    try {
      // Convert string principal to Principal object
      const principal = Principal.fromText(userId);
      const result = await this.actor.followUser(principal);
      return 'ok' in result;
    } catch (error) {
      console.error('Error following user:', error);
      return false;
    }
  }

  async unfollowUser(userId: string): Promise<boolean> {
    try {
      // Convert string principal to Principal object
      const principal = Principal.fromText(userId);
      const result = await this.actor.unfollowUser(principal);
      return 'ok' in result;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return false;
    }
  }

  async getUserRelationship(targetUserId: string): Promise<'Following' | 'Follower' | 'Mutual' | 'Subscriber' | 'Blocked' | 'None'> {
    try {
      // Convert string principal to Principal object
      const principal = Principal.fromText(targetUserId);
      const result = await this.actor.getUserRelationshipWithAuth(principal);
      if ('ok' in result) {
        switch (result.ok) {
          case '#Following': return 'Following';
          case '#Follower': return 'Follower';
          case '#Mutual': return 'Mutual';
          case '#Subscriber': return 'Subscriber';
          case '#Blocked': return 'Blocked';
          default: return 'None';
        }
      }
      return 'None';
    } catch (error) {
      console.error('Error getting user relationship:', error);
      return 'None';
    }
  }

  async getUser(userId: string): Promise<FrontendUser | null> {
    try {
      // Convert string principal to Principal object
      const principal = Principal.fromText(userId);
      const result = await this.actor.getUser(principal);
      if ('ok' in result) {
        return this.transformBackendUser(result.ok);
      }
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  private transformBackendUser(backendUser: BackendUser): FrontendUser {
    // Convert avatar Uint8Array to base64 string
    const avatarUrl = backendUser.avatar 
      ? `data:image/jpeg;base64,${btoa(String.fromCharCode(...backendUser.avatar))}`
      : `https://api.dicebear.com/7.x/avataaars/svg?seed=${backendUser.id}`;

    // Convert banner Uint8Array to base64 string
    const bannerUrl = backendUser.banner 
      ? `data:image/jpeg;base64,${btoa(String.fromCharCode(...backendUser.banner))}`
      : `https://picsum.photos/800/400?random=${backendUser.id}`;

    return {
      id: backendUser.id,
      username: backendUser.username,
      displayName: backendUser.displayName,
      bio: backendUser.bio,
      avatar: avatarUrl,
      banner: bannerUrl,
      followersCount: backendUser.followers.length,
      followingCount: backendUser.following.length,
      isVerified: backendUser.isVerified,
      isFollowing: false, // This would need to be determined from current user's following list
      followers: backendUser.followers,
      following: backendUser.following,
      videoCount: backendUser.videoCount,
      createdAt: new Date(Number(backendUser.createdAt) / 1000000), // Convert nanoseconds to milliseconds
    };
  }
}
