import { ActorSubclass } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

export interface BackendComment {
  id: string;
  videoId: string;
  user: any; // Principal
  content: string;
  timestamp: bigint;
  likes: bigint;
  dislikes: bigint;
  replies: BackendComment[];
  isEdited: boolean;
  isPinned: boolean;
  isModerated: boolean;
}

export interface FrontendComment {
  id: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
  text: string;
  likes: number;
  isLiked: boolean;
  timestamp: Date;
  replies?: FrontendComment[];
}

export class CommentService {
  constructor(private actor: ActorSubclass<any>) {}

  async getVideoComments(videoId: string, limit: number = 20, offset: number = 0): Promise<FrontendComment[]> {
    try {
      console.log('Fetching comments (simple) for video:', videoId, 'limit:', limit, 'offset:', offset);
      const result = await this.actor.getVideoComments(videoId, limit, offset);
      console.log('Raw comments result (simple):', result);
      
      if (Array.isArray(result)) {
        console.log('Comments array length (simple):', result.length);
        const transformedComments = result.map((comment: BackendComment) => this.transformBackendComment(comment));
        console.log('Transformed comments (simple):', transformedComments);
        return transformedComments;
      } else {
        console.error('Unexpected result format for getVideoComments:', result);
        return [];
      }
    } catch (error) {
      console.error('Error fetching video comments:', error);
      return [];
    }
  }

  async addComment(videoId: string, content: string, parentCommentId?: string): Promise<boolean> {
    try {
      console.log('Adding comment:', { videoId, content, parentCommentId });
      const result = await this.actor.addComment(videoId, content, parentCommentId ? [parentCommentId] : []);
      console.log('Comment result:', result);
      return 'ok' in result;
    } catch (error) {
      console.error('Error adding comment:', error);
      return false;
    }
  }

  async likeComment(commentId: string): Promise<boolean> {
    try {
      const result = await this.actor.likeComment(commentId);
      return 'ok' in result;
    } catch (error) {
      console.error('Error liking comment:', error);
      return false;
    }
  }

  async toggleCommentLike(commentId: string): Promise<boolean> {
    try {
      const result = await this.actor.toggleCommentLike(commentId);
      return 'ok' in result;
    } catch (error) {
      console.error('Error toggling comment like:', error);
      return false;
    }
  }

  private transformBackendComment(backendComment: BackendComment): FrontendComment {
    // Convert Principal to string for user ID
    const userId = typeof backendComment.user === 'string' 
      ? backendComment.user 
      : String(backendComment.user);

    // Extract meaningful username from principal
    const principalParts = userId.split('-');
    const username = principalParts[0] ? principalParts[0].slice(0, 8) : userId.slice(0, 8);
    const displayName = `User ${username}`;

    return {
      id: backendComment.id,
      user: {
        id: userId,
        username: username,
        displayName: displayName,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
      },
      text: backendComment.content,
      likes: Number(backendComment.likes), // Convert BigInt to number
      isLiked: false, // This would need to be determined from backend user data
      timestamp: new Date(Number(backendComment.timestamp) / 1000000), // Convert nanoseconds to milliseconds
      replies: backendComment.replies?.map(reply => this.transformBackendComment(reply)),
    };
  }

  // Helper to get user info for better comment display
  private async getUserInfo(principalId: string): Promise<{ username: string; displayName: string; avatar: string } | null> {
    try {
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
      console.error('Error fetching user info for comment:', error);
    }
    return null;
  }

  private async transformBackendCommentWithUserData(backendComment: BackendComment): Promise<FrontendComment> {
    // Convert Principal to string for user ID
    const userId = typeof backendComment.user === 'string' 
      ? backendComment.user 
      : String(backendComment.user);

    // Try to get actual user info, but don't fail if it doesn't work
    let userInfo = null;
    try {
      userInfo = await this.getUserInfo(userId);
    } catch (error) {
      console.warn('Failed to fetch user info for comment, using fallback:', error);
    }
    
    const username = userInfo?.username || userId.slice(0, 8);
    const displayName = userInfo?.displayName || `User ${userId.slice(0, 8)}`;
    const avatar = userInfo?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;

    return {
      id: backendComment.id,
      user: {
        id: userId,
        username: username,
        displayName: displayName,
        avatar: avatar,
      },
      text: backendComment.content,
      likes: Number(backendComment.likes), // Convert BigInt to number
      isLiked: await this.checkIfUserLikedComment(backendComment.id), // Check if current user liked this comment
      timestamp: new Date(Number(backendComment.timestamp) / 1000000), // Convert nanoseconds to milliseconds
      replies: backendComment.replies ? await Promise.all(
        backendComment.replies.map(reply => this.transformBackendCommentWithUserData(reply))
      ) : undefined,
    };
  }

  private async checkIfUserLikedComment(commentId: string): Promise<boolean> {
    try {
      // This would need a backend method to check if current user liked a comment
      // For now, we'll return false as a placeholder
      // TODO: Implement getUserCommentLikes or similar in backend
      return false;
    } catch (error) {
      console.error('Error checking comment like status:', error);
      return false;
    }
  }

  async getVideoCommentsWithUserData(videoId: string, limit: number = 20, offset: number = 0): Promise<FrontendComment[]> {
    try {
      console.log('Fetching comments for video:', videoId, 'limit:', limit, 'offset:', offset);
      const result = await this.actor.getVideoComments(videoId, limit, offset);
      console.log('Raw comments result:', result);
      
      if (Array.isArray(result)) {
        console.log('Comments array length:', result.length);
        
        // Process comments with individual error handling to prevent one bad comment from breaking all
        const commentsWithUserData = await Promise.allSettled(
          result.map((comment: BackendComment) => this.transformBackendCommentWithUserData(comment))
        );
        
        // Filter out failed comments and log warnings
        const successfulComments = commentsWithUserData
          .filter((result): result is PromiseFulfilledResult<FrontendComment> => result.status === 'fulfilled')
          .map(result => result.value);
        
        const failedComments = commentsWithUserData.filter(result => result.status === 'rejected');
        if (failedComments.length > 0) {
          console.warn(`Failed to process ${failedComments.length} comments:`, failedComments);
        }
        
        console.log('Transformed comments:', successfulComments);
        return successfulComments;
      } else {
        console.error('Unexpected result format for getVideoComments:', result);
        return [];
      }
    } catch (error) {
      console.error('Error fetching video comments:', error);
      return [];
    }
  }

  // Debug function to get all comments
  async getAllComments(): Promise<BackendComment[]> {
    try {
      console.log('Fetching all comments for debugging...');
      const result = await this.actor.getAllComments();
      console.log('All comments result:', result);
      return result;
    } catch (error) {
      console.error('Error fetching all comments:', error);
      return [];
    }
  }
}
