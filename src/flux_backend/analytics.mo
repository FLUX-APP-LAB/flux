import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Time "mo:base/Time";
import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Float "mo:base/Float";
import Iter "mo:base/Iter";

module AnalyticsManager {
    public type MetricType = {
        #ViewCount;
        #LikeRate;
        #CommentRate;
        #ShareRate;
        #SubscriptionRate;
        #StreamDuration;
        #ChatActivity;
        #RevenueGenerated;
    };

    public type UserMetrics = {
        userId: Principal;
        totalViews: Nat;
        totalLikes: Nat;
        totalComments: Nat;
        totalShares: Nat;
        followerGrowth: [Nat]; // Daily growth over time
        engagementRate: Float;
        avgViewDuration: Float;
        peakOnlineTime: Int;
        topCategories: [Text];
        revenueGenerated: Nat;
        lastUpdated: Int;
    };

    public type ContentMetrics = {
        contentId: Text;
        views: Nat;
        uniqueViewers: Nat;
        avgWatchTime: Float;
        likeRatio: Float;
        commentRatio: Float;
        shareRatio: Float;
        retentionRate: Float;
        demographics: HashMap.HashMap<Text, Nat>;
        trafficSources: HashMap.HashMap<Text, Nat>;
        peakViewerTime: Int;
    };

    public type StreamMetrics = {
        streamId: Text;
        totalViewers: Nat;
        maxConcurrentViewers: Nat;
        avgViewerDuration: Float;
        chatMessagesPerMinute: Float;
        giftsReceived: Nat;
        bitsReceived: Nat;
        newFollowers: Nat;
        newSubscribers: Nat;
        raidsSent: Nat;
        raidsReceived: Nat;
    };

    public type RecommendationScore = {
        userId: Principal;
        contentId: Text;
        score: Float;
        reasons: [Text];
        timestamp: Int;
    };

    public type TrendingContent = {
        contentId: Text;
        trendingScore: Float;
        category: Text;
        engagement: Float;
        velocity: Float; // Rate of growth
        timestamp: Int;
    };

    public class AnalyticsManager() {
        private var userMetrics = HashMap.HashMap<Principal, UserMetrics>(0, Principal.equal, Principal.hash);
        private var contentMetrics = HashMap.HashMap<Text, ContentMetrics>(0, Text.equal, Text.hash);
        private var _streamMetrics = HashMap.HashMap<Text, StreamMetrics>(0, Text.equal, Text.hash);
        private var _recommendations = HashMap.HashMap<Principal, [RecommendationScore]>(0, Principal.equal, Principal.hash);
        private var trendingContent = HashMap.HashMap<Text, TrendingContent>(0, Text.equal, Text.hash);
        private var userViewHistory = HashMap.HashMap<Principal, [Text]>(0, Principal.equal, Principal.hash);
        private var userInteractions = HashMap.HashMap<Principal, [(Text, Float, Int)]>(0, Principal.equal, Principal.hash); // (contentId, watchTime, timestamp)

        public func recordView(_caller: Principal, userId: Principal, contentId: Text, watchTime: Float) : async Result.Result<(), Text> {
            // Record view metrics and update user/content analytics
            switch (contentMetrics.get(contentId)) {
                case (?existing) {
                    let updated = {
                        existing with
                        views = existing.views + 1;
                        avgWatchTime = (existing.avgWatchTime + watchTime) / 2;
                    };
                    contentMetrics.put(contentId, updated);
                };
                case null {
                    let newMetrics : ContentMetrics = {
                        contentId = contentId;
                        views = 1;
                        uniqueViewers = 1;
                        avgWatchTime = watchTime;
                        likeRatio = 0.0;
                        commentRatio = 0.0;
                        shareRatio = 0.0;
                        retentionRate = 0.0;
                        demographics = HashMap.HashMap<Text, Nat>(0, Text.equal, Text.hash);
                        trafficSources = HashMap.HashMap<Text, Nat>(0, Text.equal, Text.hash);
                        peakViewerTime = Time.now();
                    };
                    contentMetrics.put(contentId, newMetrics);
                };
            };
            
            // Update user's view history
            let currentHistory = switch (userViewHistory.get(userId)) {
                case (?history) history;
                case null [];
            };
            
            // Add new content to history (limit to last 100 items)
            let newHistory = Array.append<Text>([contentId], currentHistory);
            let limitedHistory = if (newHistory.size() > 100) {
                Array.subArray<Text>(newHistory, 0, 100)
            } else {
                newHistory
            };
            userViewHistory.put(userId, limitedHistory);
            
            // Update user interactions for recommendation algorithm
            let currentInteractions = switch (userInteractions.get(userId)) {
                case (?interactions) interactions;
                case null [];
            };
            
            let newInteraction = (contentId, watchTime, Time.now());
            let newInteractions = Array.append<(Text, Float, Int)>([newInteraction], currentInteractions);
            let limitedInteractions = if (newInteractions.size() > 200) {
                Array.subArray<(Text, Float, Int)>(newInteractions, 0, 200)
            } else {
                newInteractions
            };
            userInteractions.put(userId, limitedInteractions);
            
            #ok()
        };

        public func generateRecommendations(_caller: Principal, userId: Principal) : async [RecommendationScore] {
            // AI-powered recommendation algorithm
            // Analyze user behavior, preferences, and engagement patterns
            let userHistory = getUserViewHistory(userId);
            let similarities = calculateUserSimilarities(userId);
            let contentScores = calculateContentScores(userId, userHistory, similarities);
            contentScores
        };

        public func getTrendingContent(category: ?Text, timeframe: Nat) : [TrendingContent] {
            // Calculate trending content based on engagement velocity
            let now = Time.now();
            let cutoff = now - timeframe;
            
            Array.filter<TrendingContent>(
                Array.map<(Text, TrendingContent), TrendingContent>(
                    Iter.toArray(trendingContent.entries()),
                    func((id, content)) = content
                ),
                func(content) = content.timestamp >= cutoff and (
                    switch (category) {
                        case (?cat) content.category == cat;
                        case null true;
                    }
                )
            )
        };

        public func getCreatorAnalytics(userId: Principal) : ?UserMetrics {
            userMetrics.get(userId)
        };

        public func updateTrendingScores(_caller: Principal) : async Result.Result<(), Text> {
            // Periodic update of trending scores based on engagement velocity
            // Calculate trending scores for all content based on recent engagement
            let now = Time.now();
            let _timeWindow = 24 * 60 * 60 * 1000_000_000; // 24 hours in nanoseconds
            
            // Iterate through all content metrics
            for ((contentId, metrics) in contentMetrics.entries()) {
                // Calculate engagement velocity (views per hour)
                let timeDiff = now - metrics.peakViewerTime;
                let hoursElapsed = if (timeDiff > 0) {
                    Float.fromInt(timeDiff / (60 * 60 * 1000_000_000))
                } else {
                    1.0
                };
                
                let velocity = Float.fromInt(metrics.views) / hoursElapsed;
                
                // Calculate overall engagement score
                let engagementScore = metrics.likeRatio + metrics.commentRatio + metrics.shareRatio;
                
                // Calculate trending score (weighted combination of velocity and engagement)
                let trendingScore = (velocity * 0.6) + (engagementScore * 0.4);
                
                // Update or create trending content entry
                let trendingEntry : TrendingContent = {
                    contentId = contentId;
                    trendingScore = trendingScore;
                    category = "general"; // Default category, could be enhanced
                    engagement = engagementScore;
                    velocity = velocity;
                    timestamp = now;
                };
                
                trendingContent.put(contentId, trendingEntry);
            };
            
            #ok()
        };

        private func getUserViewHistory(userId: Principal) : [Text] {
            // Retrieve user's viewing history
            switch (userViewHistory.get(userId)) {
                case (?history) history;
                case null [];
            }
        };

        private func calculateUserSimilarities(userId: Principal) : [Principal] {
            // Calculate similar users based on viewing patterns
            let targetHistory = getUserViewHistory(userId);
            let _targetInteractions = switch (userInteractions.get(userId)) {
                case (?interactions) interactions;
                case null [];
            };
            
            if (targetHistory.size() == 0) {
                return [];
            };
            
            // Calculate similarity with other users
            var similarities: [(Principal, Float)] = [];
            
            for ((otherUserId, otherHistory) in userViewHistory.entries()) {
                if (not Principal.equal(userId, otherUserId)) {
                    // Calculate Jaccard similarity (intersection over union)
                    let intersection = Array.filter<Text>(targetHistory, func(content) {
                        Array.find<Text>(otherHistory, func(other) { Text.equal(content, other) }) != null
                    });
                    
                    let union = Array.append<Text>(targetHistory, Array.filter<Text>(otherHistory, func(content) {
                        Array.find<Text>(targetHistory, func(target) { Text.equal(content, target) }) == null
                    }));
                    
                    let similarity = if (union.size() > 0) {
                        Float.fromInt(intersection.size()) / Float.fromInt(union.size())
                    } else {
                        0.0
                    };
                    
                    if (similarity > 0.1) { // Only include users with meaningful similarity
                        similarities := Array.append<(Principal, Float)>(similarities, [(otherUserId, similarity)]);
                    };
                };
            };
            
            // Sort by similarity and return top 10
            let sortedSimilarities = Array.sort<(Principal, Float)>(similarities, func(a, b) {
                if (a.1 > b.1) { #less } else if (a.1 < b.1) { #greater } else { #equal }
            });
            
            let topSimilar = if (sortedSimilarities.size() > 10) {
                Array.subArray<(Principal, Float)>(sortedSimilarities, 0, 10)
            } else {
                sortedSimilarities
            };
            
            Array.map<(Principal, Float), Principal>(topSimilar, func((user, _)) = user)
        };

        private func calculateContentScores(userId: Principal, history: [Text], similarities: [Principal]) : [RecommendationScore] {
            // Calculate recommendation scores based on user history and similar users
            var scores: [RecommendationScore] = [];
            
            if (similarities.size() == 0) {
                return scores;
            };
            
            // Get content from similar users that the target user hasn't seen
            var candidateContent: [(Text, Float)] = [];
            
            for (similarUser in similarities.vals()) {
                let similarHistory = getUserViewHistory(similarUser);
                
                // Find content that similar users have watched but target user hasn't
                for (contentId in similarHistory.vals()) {
                    let alreadyWatched = Array.find<Text>(history, func(h) { Text.equal(h, contentId) }) != null;
                    
                    if (not alreadyWatched) {
                        // Calculate score based on content metrics
                        let contentScore = switch (contentMetrics.get(contentId)) {
                            case (?metrics) {
                                let qualityScore = metrics.avgWatchTime / 100.0; // Normalize watch time
                                let engagementScore = metrics.likeRatio + metrics.commentRatio;
                                let popularityScore = Float.fromInt(metrics.views) / 1000.0; // Normalize views
                                
                                // Weighted combination
                                (qualityScore * 0.4) + (engagementScore * 0.3) + (popularityScore * 0.3)
                            };
                            case null 0.0;
                        };
                        
                        candidateContent := Array.append<(Text, Float)>(candidateContent, [(contentId, contentScore)]);
                    };
                };
            };
            
            // Remove duplicates and sort by score
            var uniqueContent: [(Text, Float)] = [];
            for ((contentId, score) in candidateContent.vals()) {
                let exists = Array.find<(Text, Float)>(uniqueContent, func((id, _)) { Text.equal(id, contentId) }) != null;
                if (not exists) {
                    uniqueContent := Array.append<(Text, Float)>(uniqueContent, [(contentId, score)]);
                };
            };
            
            let sortedContent = Array.sort<(Text, Float)>(uniqueContent, func(a, b) {
                if (a.1 > b.1) { #less } else if (a.1 < b.1) { #greater } else { #equal }
            });
            
            // Take top 20 recommendations
            let topContent = if (sortedContent.size() > 20) {
                Array.subArray<(Text, Float)>(sortedContent, 0, 20)
            } else {
                sortedContent
            };
            
            // Convert to RecommendationScore format
            let now = Time.now();
            Array.map<(Text, Float), RecommendationScore>(topContent, func((contentId, score)) {
                {
                    userId = userId;
                    contentId = contentId;
                    score = score;
                    reasons = ["Similar users liked this content"];
                    timestamp = now;
                }
            })
        };
    };
}