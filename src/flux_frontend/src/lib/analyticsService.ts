import { ActorSubclass } from '@dfinity/agent';

export interface AnalyticsService {
  getUserEngagementTrends(userId: string, days: number): Promise<EngagementTrends | null>;
  getContentAnalytics(contentId: string): Promise<ContentAnalytics | null>;
  generateInsights(userId: string): Promise<UserInsights | null>;
}

export interface EngagementTrends {
  avgDailyViews: number;
  avgDailyEngagement: number;
  trendDirection: 'up' | 'down' | 'stable';
  peakDay: number;
  lowDay: number;
}

export interface ContentAnalytics {
  contentId: string;
  views: number;
  uniqueViewers: number;
  avgWatchTime: number;
  likeRatio: number;
  commentRatio: number;
  shareRatio: number;
  retentionRate: number;
  createdAt: number;
  lastViewedAt: number;
  totalWatchTime: number;
  completionRate: number;
  skipRate: number;
}

export interface UserInsights {
  insights: string[];
  recommendations: string[];
  performance: string;
}

export class AnalyticsService {
  constructor(private actor: ActorSubclass<any>) {}

  async getUserEngagementTrends(userId: string, days: number = 30): Promise<EngagementTrends | null> {
    try {
      const result = await this.actor.getUserEngagementTrends(userId, days);
      
      if ('ok' in result) {
        // Convert BigInt values to numbers
        const data = result.ok;
        return {
          avgDailyViews: Number(data.avgDailyViews),
          avgDailyEngagement: Number(data.avgDailyEngagement),
          trendDirection: data.trendDirection,
          peakDay: Number(data.peakDay),
          lowDay: Number(data.lowDay),
        };
      } else {
        console.error('Error getting engagement trends:', result.err);
        return null;
      }
    } catch (error) {
      console.error('Error getting engagement trends:', error);
      return null;
    }
  }

  async getContentAnalytics(contentId: string): Promise<ContentAnalytics | null> {
    try {
      const result = await this.actor.getContentAnalytics(contentId);
      
      if ('ok' in result) {
        // Convert BigInt values to numbers
        const data = result.ok;
        return {
          contentId: data.contentId,
          views: Number(data.views),
          uniqueViewers: Number(data.uniqueViewers),
          avgWatchTime: Number(data.avgWatchTime),
          likeRatio: Number(data.likeRatio),
          commentRatio: Number(data.commentRatio),
          shareRatio: Number(data.shareRatio),
          retentionRate: Number(data.retentionRate),
          createdAt: Number(data.createdAt),
          lastViewedAt: Number(data.lastViewedAt),
          totalWatchTime: Number(data.totalWatchTime),
          completionRate: Number(data.completionRate),
          skipRate: Number(data.skipRate),
        };
      } else {
        console.error('Error getting content analytics:', result.err);
        return null;
      }
    } catch (error) {
      console.error('Error getting content analytics:', error);
      return null;
    }
  }

  async generateInsights(userId: string): Promise<UserInsights | null> {
    try {
      const result = await this.actor.generateInsights(userId);
      
      if ('ok' in result) {
        return result.ok;
      } else {
        console.error('Error generating insights:', result.err);
        return null;
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      return null;
    }
  }

  async getTopPerformingContent(timeframe: number = 7 * 24 * 60 * 60 * 1000_000_000, limit: number = 10): Promise<any[]> {
    try {
      const result = await this.actor.getTopPerformingContent(timeframe, limit);
      if (Array.isArray(result)) {
        // Convert BigInt values to numbers
        return result.map((content: any) => ({
          ...content,
          views: Number(content.views),
          score: Number(content.score),
          engagement: Number(content.engagement),
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting top performing content:', error);
      return [];
    }
  }

  async recordUserAction(action: string, contentId?: string, metadata?: string): Promise<boolean> {
    try {
      const result = await this.actor.recordUserAction(action, contentId ? [contentId] : [], metadata ? [metadata] : []);
      return 'ok' in result;
    } catch (error) {
      console.error('Error recording user action:', error);
      return false;
    }
  }
}
