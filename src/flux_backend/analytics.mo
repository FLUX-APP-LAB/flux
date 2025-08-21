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
        sessionCount: Nat;
        bounceRate: Float;
        conversionRate: Float;
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
        createdAt: Int;
        lastViewedAt: Int;
        totalWatchTime: Float;
        completionRate: Float;
        skipRate: Float;
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
            // Input validation
            if (Text.size(contentId) == 0) {
                return #err("Content ID cannot be empty");
            };
            
            if (watchTime < 0) {
                return #err("Watch time cannot be negative");
            };
            
            if (watchTime > 86400) { // 24 hours in seconds
                return #err("Watch time cannot exceed 24 hours");
            };
            
            let now = Time.now();
            
            // Record view metrics and update user/content analytics
            switch (contentMetrics.get(contentId)) {
                case (?existing) {
                    // Calculate new average watch time properly
                    let totalWatchTime = existing.totalWatchTime + watchTime;
                    let newAvgWatchTime = totalWatchTime / Float.fromInt(existing.views + 1);
                    
                    // Calculate retention rate (simplified)
                    let retentionRate = if (watchTime > 30.0) { // 30 seconds threshold
                        (existing.retentionRate * Float.fromInt(existing.views) + 1.0) / Float.fromInt(existing.views + 1)
                    } else {
                        (existing.retentionRate * Float.fromInt(existing.views)) / Float.fromInt(existing.views + 1)
                    };
                    
                    let updated = {
                        existing with
                        views = existing.views + 1;
                        avgWatchTime = newAvgWatchTime;
                        totalWatchTime = totalWatchTime;
                        retentionRate = retentionRate;
                        lastViewedAt = now;
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
                        retentionRate = if (watchTime > 30.0) 1.0 else 0.0;
                        demographics = HashMap.HashMap<Text, Nat>(0, Text.equal, Text.hash);
                        trafficSources = HashMap.HashMap<Text, Nat>(0, Text.equal, Text.hash);
                        peakViewerTime = now;
                        createdAt = now;
                        lastViewedAt = now;
                        totalWatchTime = watchTime;
                        completionRate = 0.0;
                        skipRate = 0.0;
                    };
                    contentMetrics.put(contentId, newMetrics);
                };
            };
            
            // Update user metrics
            switch (userMetrics.get(userId)) {
                case (?existing) {
                    let updated = {
                        existing with
                        totalViews = existing.totalViews + 1;
                        avgViewDuration = (existing.avgViewDuration * Float.fromInt(existing.totalViews) + watchTime) / Float.fromInt(existing.totalViews + 1);
                        lastUpdated = now;
                        sessionCount = existing.sessionCount + 1;
                    };
                    userMetrics.put(userId, updated);
                };
                case null {
                    let newUserMetrics : UserMetrics = {
                        userId = userId;
                        totalViews = 1;
                        totalLikes = 0;
                        totalComments = 0;
                        totalShares = 0;
                        followerGrowth = [];
                        engagementRate = 0.0;
                        avgViewDuration = watchTime;
                        peakOnlineTime = now;
                        topCategories = [];
                        revenueGenerated = 0;
                        lastUpdated = now;
                        sessionCount = 1;
                        bounceRate = 0.0;
                        conversionRate = 0.0;
                    };
                    userMetrics.put(userId, newUserMetrics);
                };
            };
            
            // Update user's view history
            let currentHistory = switch (userViewHistory.get(userId)) {
                case (?history) history;
                case null [];
            };
            
            // Check if this is a unique view for this content
            let isUniqueView = Array.find<Text>(currentHistory, func(id) { Text.equal(id, contentId) }) == null;
            
            // Add new content to history (limit to last 100 items)
            let newHistory = if (isUniqueView) {
                let combined = Array.append<Text>([contentId], currentHistory);
                if (combined.size() > 100) {
                    Array.subArray<Text>(combined, 0, 100)
                } else {
                    combined
                }
            } else {
                currentHistory
            };
            userViewHistory.put(userId, newHistory);
            
            // Update unique viewers count if this is a new viewer for this content
            if (isUniqueView) {
                switch (contentMetrics.get(contentId)) {
                    case (?existing) {
                        let updated = {
                            existing with
                            uniqueViewers = existing.uniqueViewers + 1;
                        };
                        contentMetrics.put(contentId, updated);
                    };
                    case null { };
                };
            };
            
            // Update user interactions for recommendation algorithm
            let currentInteractions = switch (userInteractions.get(userId)) {
                case (?interactions) interactions;
                case null [];
            };
            
            let newInteraction = (contentId, watchTime, now);
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
            // Enhanced AI-powered recommendation algorithm
            let userHistory = getUserViewHistory(userId);
            
            if (userHistory.size() == 0) {
                // For new users, recommend trending content
                let trending = getTrendingContent(null, 7 * 24 * 60 * 60 * 1000_000_000); // Last 7 days
                let limitedTrending = if (trending.size() > 10) {
                    Array.subArray(trending, 0, 10)
                } else {
                    trending
                };
                
                return Array.map<TrendingContent, RecommendationScore>(limitedTrending, func(content) {
                    {
                        userId = userId;
                        contentId = content.contentId;
                        score = content.trendingScore;
                        reasons = ["Trending content for new users"];
                        timestamp = Time.now();
                    }
                });
            };
            
            let similarities = calculateUserSimilarities(userId);
            let contentScores = calculateContentScores(userId, userHistory, similarities);
            
            // Add diversity to recommendations
            let diversifiedScores = addRecommendationDiversity(contentScores, userHistory);
            
            diversifiedScores
        };

        public func getTrendingContent(category: ?Text, timeframe: Nat) : [TrendingContent] {
            // Enhanced trending algorithm with better scoring
            let now = Time.now();
            let cutoff = now - timeframe;
            
            var trendingItems: [TrendingContent] = [];
            
            for ((_, content) in trendingContent.entries()) {
                if (content.timestamp >= cutoff) {
                    let matchesCategory = switch (category) {
                        case (?cat) Text.equal(content.category, cat);
                        case null true;
                    };
                    
                    if (matchesCategory) {
                        trendingItems := Array.append(trendingItems, [content]);
                    };
                };
            };
            
            // Sort by trending score with decay factor for time
            let sortedTrending = Array.sort<TrendingContent>(trendingItems, func(a, b) {
                // Apply time decay factor
                let aAge = Float.fromInt(now - a.timestamp) / Float.fromInt(24 * 60 * 60 * 1000_000_000);
                let bAge = Float.fromInt(now - b.timestamp) / Float.fromInt(24 * 60 * 60 * 1000_000_000);
                
                let aDecayFactor = 1.0 / (1.0 + (aAge * 0.1)); // 10% decay per day
                let bDecayFactor = 1.0 / (1.0 + (bAge * 0.1));
                
                let aAdjustedScore = a.trendingScore * aDecayFactor;
                let bAdjustedScore = b.trendingScore * bDecayFactor;
                
                if (aAdjustedScore > bAdjustedScore) { #less } 
                else if (aAdjustedScore < bAdjustedScore) { #greater } 
                else { #equal }
            });
            
            sortedTrending
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

        // Advanced Analytics Functions
        public func recordUserAction(userId: Principal, action: Text, contentId: ?Text, metadata: ?Text) : async Result.Result<(), Text> {
            // Validate inputs
            if (Text.size(action) == 0) {
                return #err("Action cannot be empty");
            };
            
            let now = Time.now();
            
            // Update user metrics based on action type
            switch (userMetrics.get(userId)) {
                case (?existing) {
                    let updated = switch (action) {
                        case ("like") {
                            existing with 
                            totalLikes = existing.totalLikes + 1;
                            lastUpdated = now;
                        };
                        case ("comment") {
                            existing with 
                            totalComments = existing.totalComments + 1;
                            lastUpdated = now;
                        };
                        case ("share") {
                            existing with 
                            totalShares = existing.totalShares + 1;
                            lastUpdated = now;
                        };
                        case (_) {
                            existing with lastUpdated = now;
                        };
                    };
                    
                    // Recalculate engagement rate
                    let totalActions = updated.totalLikes + updated.totalComments + updated.totalShares;
                    let engagementRate = if (updated.totalViews > 0) {
                        Float.fromInt(totalActions) / Float.fromInt(updated.totalViews)
                    } else {
                        0.0
                    };
                    
                    let finalUpdated = { updated with engagementRate = engagementRate };
                    userMetrics.put(userId, finalUpdated);
                };
                case null {
                    // Create new user metrics if they don't exist
                    let newMetrics = createDefaultUserMetrics(userId, now);
                    userMetrics.put(userId, newMetrics);
                };
            };
            
            // Update content metrics if contentId is provided
            switch (contentId) {
                case (?cId) {
                    switch (contentMetrics.get(cId)) {
                        case (?existing) {
                            let updated = switch (action) {
                                case ("like") {
                                    let newLikeRatio = if (existing.views > 0) {
                                        (existing.likeRatio * Float.fromInt(existing.views) + 1.0) / Float.fromInt(existing.views)
                                    } else {
                                        1.0
                                    };
                                    existing with likeRatio = newLikeRatio;
                                };
                                case ("comment") {
                                    let newCommentRatio = if (existing.views > 0) {
                                        (existing.commentRatio * Float.fromInt(existing.views) + 1.0) / Float.fromInt(existing.views)
                                    } else {
                                        1.0
                                    };
                                    existing with commentRatio = newCommentRatio;
                                };
                                case ("share") {
                                    let newShareRatio = if (existing.views > 0) {
                                        (existing.shareRatio * Float.fromInt(existing.views) + 1.0) / Float.fromInt(existing.views)
                                    } else {
                                        1.0
                                    };
                                    existing with shareRatio = newShareRatio;
                                };
                                case (_) existing;
                            };
                            contentMetrics.put(cId, updated);
                        };
                        case null { };
                    };
                };
                case null { };
            };
            
            #ok()
        };

        public func getContentAnalytics(contentId: Text) : async Result.Result<ContentMetrics, Text> {
            if (Text.size(contentId) == 0) {
                return #err("Content ID cannot be empty");
            };
            
            switch (contentMetrics.get(contentId)) {
                case (?metrics) #ok(metrics);
                case null #err("Content not found");
            }
        };

        public func getUserEngagementTrends(userId: Principal, days: Nat) : async Result.Result<{
            avgDailyViews: Float;
            avgDailyEngagement: Float;
            trendDirection: Text; // "up", "down", "stable"
            peakDay: Int;
            lowDay: Int;
        }, Text> {
            if (days == 0 or days > 365) {
                return #err("Days must be between 1 and 365");
            };
            
            switch (userMetrics.get(userId)) {
                case (?metrics) {
                    // Simplified trend calculation (in real implementation, you'd track daily data)
                    let avgDailyViews = Float.fromInt(metrics.totalViews) / Float.fromInt(days);
                    let avgDailyEngagement = metrics.engagementRate;
                    
                    // Determine trend direction based on recent activity
                    let now = Time.now();
                    let daysSinceUpdate = (now - metrics.lastUpdated) / (24 * 60 * 60 * 1000_000_000);
                    
                    let trendDirection = if (daysSinceUpdate < 1) {
                        "up"
                    } else if (daysSinceUpdate > 7) {
                        "down"
                    } else {
                        "stable"
                    };
                    
                    #ok({
                        avgDailyViews = avgDailyViews;
                        avgDailyEngagement = avgDailyEngagement;
                        trendDirection = trendDirection;
                        peakDay = metrics.peakOnlineTime;
                        lowDay = metrics.lastUpdated;
                    })
                };
                case null #err("User not found");
            }
        };

        public func getTopPerformingContent(timeframe: Nat, limit: Nat) : async [{
            contentId: Text;
            score: Float;
            views: Nat;
            engagement: Float;
        }] {
            let now = Time.now();
            let cutoff = now - timeframe;
            
            // Filter content by timeframe and calculate performance scores
            var contentScores: [(Text, Float, Nat, Float)] = [];
            
            for ((contentId, metrics) in contentMetrics.entries()) {
                if (metrics.lastViewedAt >= cutoff) {
                    // Calculate performance score
                    let viewScore = Float.fromInt(metrics.views) / 1000.0;
                    let engagementScore = metrics.likeRatio + metrics.commentRatio + metrics.shareRatio;
                    let retentionScore = metrics.retentionRate;
                    let watchTimeScore = metrics.avgWatchTime / 300.0; // Normalize to 5 minutes
                    
                    let totalScore = (viewScore * 0.3) + (engagementScore * 0.4) + (retentionScore * 0.2) + (watchTimeScore * 0.1);
                    
                    contentScores := Array.append(contentScores, [(contentId, totalScore, metrics.views, engagementScore)]);
                };
            };
            
            // Sort by score and limit results
            let sortedContent = Array.sort<(Text, Float, Nat, Float)>(contentScores, func(a, b) {
                if (a.1 > b.1) { #less } else if (a.1 < b.1) { #greater } else { #equal }
            });
            
            let limitedContent = if (sortedContent.size() > limit) {
                Array.subArray<(Text, Float, Nat, Float)>(sortedContent, 0, limit)
            } else {
                sortedContent
            };
            
            Array.map<(Text, Float, Nat, Float), {contentId: Text; score: Float; views: Nat; engagement: Float}>(
                limitedContent,
                func((contentId, score, views, engagement)) {
                    {
                        contentId = contentId;
                        score = score;
                        views = views;
                        engagement = engagement;
                    }
                }
            )
        };

        public func generateInsights(userId: Principal) : async Result.Result<{
            insights: [Text];
            recommendations: [Text];
            performance: Text;
        }, Text> {
            switch (userMetrics.get(userId)) {
                case (?metrics) {
                    var insights: [Text] = [];
                    var recommendations: [Text] = [];
                    
                    // Generate insights based on metrics
                    if (metrics.engagementRate > 0.1) {
                        insights := Array.append(insights, ["High engagement rate - your content resonates well with viewers"]);
                    } else {
                        insights := Array.append(insights, ["Engagement rate could be improved"]);
                        recommendations := Array.append(recommendations, ["Try asking questions in your content to encourage comments"]);
                    };
                    
                    if (metrics.avgViewDuration > 120.0) {
                        insights := Array.append(insights, ["Great retention - viewers watch your content for extended periods"]);
                    } else {
                        recommendations := Array.append(recommendations, ["Consider improving content quality to increase watch time"]);
                    };
                    
                    if (metrics.totalViews > 1000) {
                        insights := Array.append(insights, ["You're gaining traction with over 1K views!"]);
                    };
                    
                    // Determine overall performance
                    let performance = if (metrics.engagementRate > 0.15 and metrics.avgViewDuration > 180.0) {
                        "Excellent"
                    } else if (metrics.engagementRate > 0.08 and metrics.avgViewDuration > 90.0) {
                        "Good"
                    } else if (metrics.engagementRate > 0.03) {
                        "Average"
                    } else {
                        "Needs Improvement"
                    };
                    
                    #ok({
                        insights = insights;
                        recommendations = recommendations;
                        performance = performance;
                    })
                };
                case null #err("User metrics not found");
            }
        };

        public func clearOldData(daysCutoff: Nat) : async Result.Result<{
            removedInteractions: Nat;
            removedHistory: Nat;
        }, Text> {
            if (daysCutoff < 30) {
                return #err("Cannot clear data newer than 30 days");
            };
            
            let now = Time.now();
            let cutoff = now - (daysCutoff * 24 * 60 * 60 * 1000_000_000);
            
            var removedInteractions = 0;
            var removedHistory = 0;
            
            // Clean up old user interactions
            for ((userId, interactions) in userInteractions.entries()) {
                let filteredInteractions = Array.filter<(Text, Float, Int)>(interactions, func((_, _, timestamp)) {
                    timestamp >= cutoff
                });
                
                if (filteredInteractions.size() < interactions.size()) {
                    removedInteractions := removedInteractions + (interactions.size() - filteredInteractions.size());
                    userInteractions.put(userId, filteredInteractions);
                };
            };
            
            #ok({
                removedInteractions = removedInteractions;
                removedHistory = removedHistory;
            })
        };

        private func createDefaultUserMetrics(userId: Principal, timestamp: Int) : UserMetrics {
            {
                userId = userId;
                totalViews = 0;
                totalLikes = 0;
                totalComments = 0;
                totalShares = 0;
                followerGrowth = [];
                engagementRate = 0.0;
                avgViewDuration = 0.0;
                peakOnlineTime = timestamp;
                topCategories = [];
                revenueGenerated = 0;
                lastUpdated = timestamp;
                sessionCount = 0;
                bounceRate = 0.0;
                conversionRate = 0.0;
            }
        };

        private func addRecommendationDiversity(recommendations: [RecommendationScore], userHistory: [Text]) : [RecommendationScore] {
            // Add diversity to prevent echo chambers
            var diversified: [RecommendationScore] = [];
            var usedCategories: [Text] = [];
            
            // First pass: Add top recommendations from different categories
            for (rec in recommendations.vals()) {
                switch (contentMetrics.get(rec.contentId)) {
                    case (?metrics) {
                        // For simplicity, using content type as category
                        let category = "general"; // In real implementation, extract from content
                        let categoryExists = Array.find<Text>(usedCategories, func(cat) { Text.equal(cat, category) }) != null;
                        
                        if (not categoryExists or diversified.size() < 5) {
                            diversified := Array.append(diversified, [rec]);
                            if (not categoryExists) {
                                usedCategories := Array.append(usedCategories, [category]);
                            };
                        };
                    };
                    case null { };
                };
                
                if (diversified.size() >= 15) {
                    break;
                };
            };
            
            // Second pass: Fill remaining slots with highest-scoring content
            if (diversified.size() < 20) {
                let remaining = 20 - diversified.size();
                let existingIds = Array.map<RecommendationScore, Text>(diversified, func(rec) = rec.contentId);
                
                var added = 0;
                for (rec in recommendations.vals()) {
                    if (added >= remaining) break;
                    
                    let alreadyIncluded = Array.find<Text>(existingIds, func(id) { Text.equal(id, rec.contentId) }) != null;
                    if (not alreadyIncluded) {
                        diversified := Array.append(diversified, [rec]);
                        added += 1;
                    };
                };
            };
            
            diversified
        };
    };
}