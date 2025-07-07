import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Bool "mo:base/Bool";
import Buffer "mo:base/Buffer";
import Iter "mo:base/Iter";
import Int "mo:base/Int";
import VideoManager "video";
import LiveStreamManager "livestream";
import TokenManager "token";
import EmoteManager "emote";
import AnalyticsManager "analytics";
import NotificationManager "notification";
import ContentModerationManager "contentmoderation";

actor UserManager {
    // Types
    type UserTier = {
        #Free;
        #Premium;
        #Creator;
        #Partner;
        #Admin;
    };

    type VerificationStatus = {
        #Unverified;
        #Pending;
        #Verified;
        #Rejected;
    };

    type Badge = {
        id: Text;
        name: Text;
        description: Text;
        icon: Blob;
        rarity: Text; // Common, Rare, Epic, Legendary
        requirement: Text;
        earnedAt: Int;
    };

    type SocialLinks = {
        twitter: ?Text;
        instagram: ?Text;
        youtube: ?Text;
        discord: ?Text;
        website: ?Text;
    };

    type UserPreferences = {
        theme: Text; // dark, light, auto
        language: Text;
        notifications: NotificationSettings;
        privacy: PrivacySettings;
        streaming: StreamingSettings;
    };

    type NotificationSettings = {
        emailNotifications: Bool;
        pushNotifications: Bool;
        followNotifications: Bool;
        subscriptionNotifications: Bool;
        liveStreamNotifications: Bool;
        mentionNotifications: Bool;
    };

    type PrivacySettings = {
        profileVisibility: Text; // public, followers, private
        showFollowers: Bool;
        showFollowing: Bool;
        allowDirectMessages: Text; // everyone, followers, none
        showOnlineStatus: Bool;
    };

    type StreamingSettings = {
        defaultStreamTitle: Text;
        defaultCategory: Text;
        autoStartRecording: Bool;
        subscriberOnlyMode: Bool;
        slowModeDefault: Nat;
        moderationLevel: Text; // strict, moderate, lenient
    };

    type UserStats = {
        totalViews: Nat;
        totalLikes: Nat;
        totalStreams: Nat;
        totalStreamTime: Nat;
        averageViewers: Nat;
        peakViewers: Nat;
        totalRevenue: Nat;
        followersGained30d: Nat;
        viewsGained30d: Nat;
    };

    type User = {
        id: Principal;
        username: Text;
        displayName: Text;
        email: ?Text;
        avatar: ?Blob;
        banner: ?Blob;
        bio: Text;
        location: ?Text;
        website: ?Text;
        socialLinks: SocialLinks;
        followers: [Principal];
        following: [Principal];
        blockedUsers: [Principal];
        subscribers: [Principal];
        coinBalance: Nat;
        bitsBalance: Nat;
        tier: UserTier;
        verificationStatus: VerificationStatus;
        badges: [Badge];
        preferences: UserPreferences;
        stats: UserStats;
        streamKey: ?Text;
        moderatedChannels: [Principal];
        partnershipInfo: ?PartnershipInfo;
        createdAt: Int;
        lastActive: Int;
        isActive: Bool;
        isSuspended: Bool;
        suspensionReason: ?Text;
        suspensionEndDate: ?Int;
    };

    type PartnershipInfo = {
        applicationDate: Int;
        approvalDate: ?Int;
        partnerLevel: Text; // Bronze, Silver, Gold, Platinum
        revenueShare: Nat;
        exclusivePerks: [Text];
        monthlyGuarantee: Nat;
    };

    type Subscription = {
        id: Text;
        subscriber: Principal;
        streamer: Principal;
        tier: Nat;
        startDate: Int;
        endDate: Int;
        autoRenew: Bool;
        totalPaid: Nat;
        giftedBy: ?Principal;
        isActive: Bool;
    };

    type UserRelationship = {
        #Following;
        #Follower;
        #Mutual;
        #Blocked;
        #Subscriber;
    };

    // State
    private stable var usersEntries : [(Principal, User)] = [];
    private stable var usernamesEntries : [(Text, Principal)] = [];
    private stable var subscriptionsEntries : [(Text, Subscription)] = [];
    private stable var userSessionsEntries : [(Principal, Int)] = [];
    private stable var suspendedUsersEntries : [(Principal, (Text, Int))] = [];
    
    private var users = HashMap.fromIter<Principal, User>(usersEntries.vals(), usersEntries.size(), Principal.equal, Principal.hash);
    private var usernames = HashMap.fromIter<Text, Principal>(usernamesEntries.vals(), usernamesEntries.size(), Text.equal, Text.hash);
    private var subscriptions = HashMap.fromIter<Text, Subscription>(subscriptionsEntries.vals(), subscriptionsEntries.size(), Text.equal, Text.hash);
    private var userSessions = HashMap.fromIter<Principal, Int>(userSessionsEntries.vals(), userSessionsEntries.size(), Principal.equal, Principal.hash);
    private var suspendedUsers = HashMap.fromIter<Principal, (Text, Int)>(suspendedUsersEntries.vals(), suspendedUsersEntries.size(), Principal.equal, Principal.hash);

    // Video Manager Instance
    private var videoManager = VideoManager.VideoManager();
    
    // LiveStream Manager Instance
    private var liveStreamManager = LiveStreamManager.LiveStreamManager();
    
    // Token Manager Instance
    private var tokenManager = TokenManager.TokenManager();
    
    // Emote Manager Instance
    private var emoteManager = EmoteManager.EmoteManager();
    
    // Analytics Manager Instance
    private var analyticsManager = AnalyticsManager.AnalyticsManager();
    
    // Notification Manager Instance
    private var notificationManager = NotificationManager.NotificationManager();
    
    // Content Moderation Manager Instance
    private var contentModerationManager = ContentModerationManager.ContentModerationManager();

    system func preupgrade() {
        usersEntries := Iter.toArray(users.entries());
        usernamesEntries := Iter.toArray(usernames.entries());
        subscriptionsEntries := Iter.toArray(subscriptions.entries());
        userSessionsEntries := Iter.toArray(userSessions.entries());
        suspendedUsersEntries := Iter.toArray(suspendedUsers.entries());
    };

    system func postupgrade() {
        usersEntries := [];
        usernamesEntries := [];
        subscriptionsEntries := [];
        userSessionsEntries := [];
        suspendedUsersEntries := [];
    };

    // Core User Functions
    public shared(msg) func createUser(username: Text, displayName: Text, email: ?Text) : async Result.Result<User, Text> {
        let caller = msg.caller;
        
        // Validate username
        if (Text.size(username) < 3 or Text.size(username) > 20) {
            return #err("Username must be between 3 and 20 characters");
        };
        
        // Check if username exists
        switch (usernames.get(username)) {
            case (?_existingUser) { return #err("Username already exists") };
            case null { };
        };
        
        // Check if user already exists
        switch (users.get(caller)) {
            case (?_existingUser) { return #err("User already exists") };
            case null { };
        };

        let newUser : User = {
            id = caller;
            username = username;
            displayName = displayName;
            email = email;
            avatar = null;
            banner = null;
            bio = "";
            location = null;
            website = null;
            socialLinks = {
                twitter = null;
                instagram = null;
                youtube = null;
                discord = null;
                website = null;
            };
            followers = [];
            following = [];
            blockedUsers = [];
            subscribers = [];
            coinBalance = 0;
            bitsBalance = 0;
            tier = #Free;
            verificationStatus = #Unverified;
            badges = [];
            preferences = {
                theme = "dark";
                language = "en";
                notifications = {
                    emailNotifications = true;
                    pushNotifications = true;
                    followNotifications = true;
                    subscriptionNotifications = true;
                    liveStreamNotifications = true;
                    mentionNotifications = true;
                };
                privacy = {
                    profileVisibility = "public";
                    showFollowers = true;
                    showFollowing = true;
                    allowDirectMessages = "followers";
                    showOnlineStatus = true;
                };
                streaming = {
                    defaultStreamTitle = "Live Stream";
                    defaultCategory = "Just Chatting";
                    autoStartRecording = false;
                    subscriberOnlyMode = false;
                    slowModeDefault = 0;
                    moderationLevel = "moderate";
                };
            };
            stats = {
                totalViews = 0;
                totalLikes = 0;
                totalStreams = 0;
                totalStreamTime = 0;
                averageViewers = 0;
                peakViewers = 0;
                totalRevenue = 0;
                followersGained30d = 0;
                viewsGained30d = 0;
            };
            streamKey = null;
            moderatedChannels = [];
            partnershipInfo = null;
            createdAt = Time.now();
            lastActive = Time.now();
            isActive = true;
            isSuspended = false;
            suspensionReason = null;
            suspensionEndDate = null;
        };

        users.put(caller, newUser);
        usernames.put(username, caller);
        #ok(newUser)
    };

    public shared(msg) func updateProfile(displayName: ?Text, bio: ?Text, avatar: ?Blob, banner: ?Blob, socialLinks: ?SocialLinks) : async Result.Result<User, Text> {
        let caller = msg.caller;
        
        switch (users.get(caller)) {
            case (?user) {
                let updatedUser = {
                    user with
                    displayName = switch (displayName) { case (?name) name; case null user.displayName };
                    bio = switch (bio) { case (?newBio) newBio; case null user.bio };
                    avatar = switch (avatar) { case (?newAvatar) ?newAvatar; case null user.avatar };
                    banner = switch (banner) { case (?newBanner) ?newBanner; case null user.banner };
                    socialLinks = switch (socialLinks) { case (?links) links; case null user.socialLinks };
                    lastActive = Time.now();
                };
                users.put(caller, updatedUser);
                #ok(updatedUser)
            };
            case null { #err("User not found") };
        }
    };

    public shared(msg) func followUser(targetUser: Principal) : async Result.Result<(), Text> {
        let caller = msg.caller;
        
        if (caller == targetUser) {
            return #err("Cannot follow yourself");
        };
        
        // Update follower's following list
        switch (users.get(caller)) {
            case (?user) {
                let updatedFollowing = Array.append(user.following, [targetUser]);
                let updatedUser = { user with following = updatedFollowing };
                users.put(caller, updatedUser);
            };
            case null { return #err("User not found") };
        };
        
        // Update target user's followers list
        switch (users.get(targetUser)) {
            case (?user) {
                let updatedFollowers = Array.append(user.followers, [caller]);
                let updatedUser = { user with followers = updatedFollowers };
                users.put(targetUser, updatedUser);
            };
            case null { return #err("Target user not found") };
        };
        
        #ok()
    };

    public shared(msg) func unfollowUser(targetUser: Principal) : async Result.Result<(), Text> {
        let caller = msg.caller;
        
        // Update follower's following list
        switch (users.get(caller)) {
            case (?user) {
                let updatedFollowing = Array.filter(user.following, func (id: Principal) : Bool { id != targetUser });
                let updatedUser = { user with following = updatedFollowing };
                users.put(caller, updatedUser);
            };
            case null { return #err("User not found") };
        };
        
        // Update target user's followers list
        switch (users.get(targetUser)) {
            case (?user) {
                let updatedFollowers = Array.filter(user.followers, func (id: Principal) : Bool { id != caller });
                let updatedUser = { user with followers = updatedFollowers };
                users.put(targetUser, updatedUser);
            };
            case null { return #err("Target user not found") };
        };
        
        #ok()
    };

    public shared(msg) func subscribe(streamer: Principal, tier: Nat, duration: Nat) : async Result.Result<Text, Text> {
        let caller = msg.caller;
        let subscriptionId = Principal.toText(caller) # "_" # Principal.toText(streamer) # "_" # Int.toText(Time.now());
        
        // Calculate cost based on tier and duration
        let cost = calculateSubscriptionCost(tier, duration);
        
        // Check user balance
        switch (users.get(caller)) {
            case (?user) {
                if (user.coinBalance < cost) {
                    return #err("Insufficient coins");
                };
                
                // Since we've verified user.coinBalance >= cost, this subtraction is safe
                assert(user.coinBalance >= cost);
                let newBalance = Nat.sub(user.coinBalance, cost);
                let updatedUser = { user with coinBalance = newBalance };
                users.put(caller, updatedUser);
            };
            case null { return #err("User not found") };
        };
        
        // Create subscription
        let subscription : Subscription = {
            id = subscriptionId;
            subscriber = caller;
            streamer = streamer;
            tier = tier;
            startDate = Time.now();
            endDate = Time.now() + (duration * 24 * 60 * 60 * 1000000000); // duration in days
            autoRenew = false;
            totalPaid = cost;
            giftedBy = null;
            isActive = true;
        };
        
        subscriptions.put(subscriptionId, subscription);
        
        // Update streamer's subscriber list
        switch (users.get(streamer)) {
            case (?user) {
                let updatedSubscribers = Array.append(user.subscribers, [caller]);
                let updatedUser = { user with subscribers = updatedSubscribers };
                users.put(streamer, updatedUser);
            };
            case null { return #err("Streamer not found") };
        };
        
        #ok(subscriptionId)
    };

    public shared(msg) func applyForPartnership(_description: Text, _averageViewers: Nat, _monthlyRevenue: Nat) : async Result.Result<(), Text> {
        let caller = msg.caller;
        
        switch (users.get(caller)) {
            case (?user) {
                // Check eligibility criteria
                if (user.stats.totalViews < 10000 or Array.size(user.followers) < 500) {
                    return #err("Does not meet minimum requirements");
                };
                
                let partnershipInfo : PartnershipInfo = {
                    applicationDate = Time.now();
                    approvalDate = null;
                    partnerLevel = "Bronze";
                    revenueShare = 70;
                    exclusivePerks = ["Custom Emotes", "Subscriber Badges"];
                    monthlyGuarantee = 0;
                };
                
                let updatedUser = { 
                    user with 
                    partnershipInfo = ?partnershipInfo;
                    verificationStatus = #Pending;
                };
                users.put(caller, updatedUser);
                #ok()
            };
            case null { #err("User not found") };
        }
    };

    public shared(msg) func updateUserPreferences(preferences: UserPreferences) : async Result.Result<(), Text> {
        let caller = msg.caller;
        
        switch (users.get(caller)) {
            case (?user) {
                let updatedUser = { user with preferences = preferences };
                users.put(caller, updatedUser);
                #ok()
            };
            case null { #err("User not found") };
        }
    };

    public shared(msg) func blockUser(targetUser: Principal) : async Result.Result<(), Text> {
        let caller = msg.caller;
        
        switch (users.get(caller)) {
            case (?user) {
                let updatedBlockedUsers = Array.append(user.blockedUsers, [targetUser]);
                let updatedUser = { user with blockedUsers = updatedBlockedUsers };
                users.put(caller, updatedUser);
                #ok()
            };
            case null { #err("User not found") };
        }
    };

    // Query Functions
    public query func getUser(userId: Principal) : async Result.Result<User, Text> {
        switch (users.get(userId)) {
            case (?user) { #ok(user) };
            case null { #err("User not found") };
        }
    };

    public query func getUserByUsername(username: Text) : async Result.Result<User, Text> {
        switch (usernames.get(username)) {
            case (?userId) {
                switch (users.get(userId)) {
                    case (?user) { #ok(user) };
                    case null { #err("User not found") };
                }
            };
            case null { #err("Username not found") };
        }
    };

    public query func getUserStats(userId: Principal) : async Result.Result<UserStats, Text> {
        switch (users.get(userId)) {
            case (?user) { #ok(user.stats) };
            case null { #err("User not found") };
        }
    };

    public query func getUserSubscriptions(userId: Principal) : async [Subscription] {
        let userSubs = Buffer.Buffer<Subscription>(0);
        for ((_, subscription) in subscriptions.entries()) {
            if (subscription.subscriber == userId and subscription.isActive) {
                userSubs.add(subscription);
            };
        };
        Buffer.toArray(userSubs)
    };

    public query func searchUsers(searchQuery: Text, limit: Nat) : async [User] {
        let results = Buffer.Buffer<User>(0);
        let lowerQuery = searchQuery; // Note: Text.toLowercase is not available in older versions
        var count = 0;
        
        label searchLoop for ((_, user) in users.entries()) {
            if (count >= limit) { break searchLoop };
            
            let lowerUsername = user.username;
            let lowerDisplayName = user.displayName;
            
            // Simple substring matching (case-sensitive for now)
            if (Text.contains(lowerUsername, #text lowerQuery) or 
                Text.contains(lowerDisplayName, #text lowerQuery)) {
                results.add(user);
                count += 1;
            };
        };
        
        Buffer.toArray(results)
    };

    // Private helper functions
    private func calculateSubscriptionCost(tier: Nat, duration: Nat) : Nat {
        let baseCost = switch (tier) {
            case 1 { 500 }; // $4.99 equivalent
            case 2 { 1000 }; // $9.99 equivalent
            case 3 { 2500 }; // $24.99 equivalent
            case _ { 500 };
        };
        baseCost * duration
    };

    // Admin functions
    public shared(_msg) func suspendUser(userId: Principal, reason: Text, duration: Nat) : async Result.Result<(), Text> {
        // TODO: Add admin authorization check
        // For now, anyone can suspend (should be restricted to admins)
        
        switch (users.get(userId)) {
            case (?user) {
                let suspensionEndDate = Time.now() + (duration * 24 * 60 * 60 * 1000000000); // duration in days
                let updatedUser = {
                    user with
                    isSuspended = true;
                    suspensionReason = ?reason;
                    suspensionEndDate = ?suspensionEndDate;
                };
                users.put(userId, updatedUser);
                suspendedUsers.put(userId, (reason, suspensionEndDate));
                #ok()
            };
            case null { #err("User not found") };
        }
    };

    public shared(_msg) func verifyUser(userId: Principal) : async Result.Result<(), Text> {
        // TODO: Add admin authorization check
        // For now, anyone can verify (should be restricted to admins)
        
        switch (users.get(userId)) {
            case (?user) {
                let updatedUser = {
                    user with
                    verificationStatus = #Verified;
                };
                users.put(userId, updatedUser);
                #ok()
            };
            case null { #err("User not found") };
        }
    };

    // Private helper functions
    private func _generateStreamKey(caller: Principal) : Text {
        "sk_" # Principal.toText(caller) # "_" # Int.toText(Time.now())
    };

    // Video functions 
    public shared(msg) func uploadVideo(
        title: Text,
        description: Text,
        videoData: Blob,
        thumbnail: ?Blob,
        videoType: VideoManager.VideoType,
        category: VideoManager.VideoCategory,
        tags: [Text],
        hashtags: [Text],
        settings: {
            isPrivate: Bool;
            isUnlisted: Bool;
            allowComments: Bool;
            allowDuets: Bool;
            allowRemix: Bool;
            isMonetized: Bool;
            ageRestricted: Bool;
            scheduledAt: ?Int;
        }
    ) : async Result.Result<Text, Text> {
        await videoManager.uploadVideo(
            msg.caller,
            title,
            description,
            videoData,
            thumbnail,
            videoType,
            category,
            tags,
            hashtags,
            settings
        )
    };

    public shared(msg) func createClip(
        streamId: Text,
        startTime: Nat,
        endTime: Nat,
        title: Text,
        description: Text
    ) : async Result.Result<Text, Text> {
        await videoManager.createClip(msg.caller, streamId, startTime, endTime, title, description)
    };

    public shared(msg) func likeVideo(videoId: Text) : async Result.Result<(), Text> {
        await videoManager.likeVideo(msg.caller, videoId)
    };

    public shared(msg) func addComment(videoId: Text, content: Text, parentCommentId: ?Text) : async Result.Result<Text, Text> {
        await videoManager.addComment(msg.caller, videoId, content, parentCommentId)
    };

    public shared(msg) func shareVideo(videoId: Text, platform: Text) : async Result.Result<(), Text> {
        await videoManager.shareVideo(msg.caller, videoId, platform)
    };

    public shared(msg) func recordView(videoId: Text, watchTime: Nat) : async Result.Result<(), Text> {
        await videoManager.recordView(msg.caller, videoId, watchTime)
    };

    public shared(msg) func createPlaylist(title: Text, description: Text, isPublic: Bool) : async Result.Result<Text, Text> {
        await videoManager.createPlaylist(msg.caller, title, description, isPublic)
    };

    public shared(msg) func addVideoToPlaylist(playlistId: Text, videoId: Text) : async Result.Result<(), Text> {
        await videoManager.addVideoToPlaylist(msg.caller, playlistId, videoId)
    };

    // Video query functions
    public query func getVideo(videoId: Text) : async Result.Result<VideoManager.Video, Text> {
        videoManager.getVideo(videoId)
    };

    public query func getVideosByUser(userId: Principal, limit: Nat, offset: Nat) : async [VideoManager.Video] {
        videoManager.getVideosByUser(userId, limit, offset)
    };

    public query func getTrendingVideos(category: ?VideoManager.VideoCategory, timeframe: Nat, limit: Nat) : async [VideoManager.Video] {
        videoManager.getTrendingVideos(category, timeframe, limit)
    };

    public query func getVideoFeed(userId: Principal, limit: Nat, offset: Nat) : async [VideoManager.Video] {
        videoManager.getVideoFeed(userId, limit, offset)
    };

    public query func searchVideos(searchQuery: Text, category: ?VideoManager.VideoCategory, limit: Nat) : async [VideoManager.Video] {
        videoManager.searchVideos(searchQuery, category, limit)
    };

    public query func getVideoComments(videoId: Text, limit: Nat, offset: Nat) : async [VideoManager.Comment] {
        videoManager.getVideoComments(videoId, limit, offset)
    };

    public query func getVideoAnalytics(videoId: Text) : async Result.Result<VideoManager.VideoAnalytics, Text> {
        videoManager.getVideoAnalytics(videoId)
    };

    public query func getUserPlaylists(userId: Principal) : async [VideoManager.Playlist] {
        videoManager.getUserPlaylists(userId)
    };

    // LiveStream Functions
    public shared(msg) func createStream(
        title: Text,
        description: Text,
        category: LiveStreamManager.StreamCategory,
        tags: [Text],
        maturityRating: Text,
        quality: LiveStreamManager.StreamQuality
    ) : async Result.Result<Text, Text> {
        await liveStreamManager.createStream(msg.caller, title, description, category, tags, maturityRating, quality)
    };

    public shared(msg) func startStream(streamId: Text) : async Result.Result<(), Text> {
        await liveStreamManager.startStream(msg.caller, streamId)
    };

    public shared(msg) func endStream(streamId: Text) : async Result.Result<(), Text> {
        await liveStreamManager.endStream(msg.caller, streamId)
    };

    public shared(msg) func sendChatMessage(streamId: Text, message: Text, bits: Nat) : async Result.Result<Text, Text> {
        await liveStreamManager.sendChatMessage(msg.caller, streamId, message, bits)
    };

    public query func getStream(streamId: Text) : async Result.Result<LiveStreamManager.LiveStream, Text> {
        liveStreamManager.getStream(streamId)
    };

    public query func getLiveStreams(category: ?LiveStreamManager.StreamCategory, language: ?Text, limit: Nat) : async [LiveStreamManager.LiveStream] {
        liveStreamManager.getLiveStreams(category, language, limit)
    };

    public query func getStreamsByUser(userId: Principal, limit: Nat) : async [LiveStreamManager.LiveStream] {
        liveStreamManager.getStreamsByUser(userId, limit)
    };

    // Token Management Functions
    public shared(msg) func purchaseAppCoins(icpAmount: Nat) : async Result.Result<Nat, Text> {
        await tokenManager.purchaseAppCoins(msg.caller, icpAmount)
    };

    public shared(msg) func purchaseBits(coinAmount: Nat) : async Result.Result<Nat, Text> {
        await tokenManager.purchaseBits(msg.caller, coinAmount)
    };

    public shared(msg) func processSubscription(streamer: Principal, tier: Nat) : async Result.Result<(), Text> {
        await tokenManager.processSubscription(msg.caller, streamer, tier)
    };

    public shared(msg) func sendGift(recipient: Principal, giftType: Text, amount: Nat) : async Result.Result<(), Text> {
        await tokenManager.sendGift(msg.caller, recipient, giftType, amount)
    };

    public shared(msg) func cheerWithBits(streamer: Principal, bitsAmount: Nat) : async Result.Result<(), Text> {
        await tokenManager.cheerWithBits(msg.caller, streamer, bitsAmount)
    };

    public shared(msg) func requestPayout(amount: Nat) : async Result.Result<Text, Text> {
        await tokenManager.requestPayout(msg.caller, amount)
    };

    public query func getBalance(user: Principal) : async ?TokenManager.TokenBalance {
        tokenManager.getBalance(user)
    };

    public query func getRevenueShare(creator: Principal) : async ?TokenManager.RevenueShare {
        tokenManager.getRevenueShare(creator)
    };

    public query func getTransactionHistory(user: Principal, limit: Nat) : async [TokenManager.Transaction] {
        tokenManager.getTransactionHistory(user, limit)
    };

    // Emote Management Functions
    public shared(msg) func createEmote(name: Text, imageData: Blob, tier: Nat, animated: Bool, category: EmoteManager.EmoteCategory) : async Result.Result<Text, Text> {
        await emoteManager.createEmote(msg.caller, name, imageData, tier, animated, category)
    };

    public shared(msg) func purchaseEmote(emoteId: Text) : async Result.Result<(), Text> {
        await emoteManager.purchaseEmote(msg.caller, emoteId)
    };

    public shared(msg) func mintNFT(emoteId: Text, recipientId: Principal) : async Result.Result<Text, Text> {
        await emoteManager.mintNFT(msg.caller, emoteId, recipientId)
    };

    public shared(msg) func listEmoteForSale(emoteId: Text, price: Nat) : async Result.Result<Text, Text> {
        await emoteManager.listEmoteForSale(msg.caller, emoteId, price)
    };

    public shared(msg) func buyEmoteFromMarketplace(listingId: Text) : async Result.Result<(), Text> {
        await emoteManager.buyEmoteFromMarketplace(msg.caller, listingId)
    };

    public query func getUserEmotes(user: Principal) : async [EmoteManager.Emote] {
        emoteManager.getUserEmotes(user)
    };

    public query func getEmotesByCategory(category: EmoteManager.EmoteCategory) : async [EmoteManager.Emote] {
        emoteManager.getEmotesByCategory(category)
    };

    public query func getMarketplaceListings() : async [EmoteManager.MarketplaceListing] {
        emoteManager.getMarketplaceListings()
    };

    // Analytics Management Functions
    public shared(msg) func recordAnalyticsView(userId: Principal, contentId: Text, watchTime: Float) : async Result.Result<(), Text> {
        await analyticsManager.recordView(msg.caller, userId, contentId, watchTime)
    };

    public shared(msg) func generateRecommendations(userId: Principal) : async [AnalyticsManager.RecommendationScore] {
        await analyticsManager.generateRecommendations(msg.caller, userId)
    };

    public shared(msg) func updateTrendingScores() : async Result.Result<(), Text> {
        await analyticsManager.updateTrendingScores(msg.caller)
    };

    public query func getTrendingContent(category: ?Text, timeframe: Nat) : async [AnalyticsManager.TrendingContent] {
        analyticsManager.getTrendingContent(category, timeframe)
    };

    public query func getCreatorAnalytics(userId: Principal) : async ?AnalyticsManager.UserMetrics {
        analyticsManager.getCreatorAnalytics(userId)
    };

    // Notification Management Functions
    public shared(msg) func sendNotification(
        recipient: Principal,
        sender: ?Principal,
        notificationType: NotificationManager.NotificationType,
        title: Text,
        message: Text,
        priority: NotificationManager.NotificationPriority,
        data: ?Text
    ) : async Result.Result<Text, Text> {
        await notificationManager.sendNotification(msg.caller, recipient, sender, notificationType, title, message, priority, data)
    };

    public shared(msg) func markAsRead(notificationId: Text) : async Result.Result<(), Text> {
        await notificationManager.markAsRead(msg.caller, notificationId)
    };

    public shared(msg) func updateNotificationPreferences(userId: Principal, prefs: NotificationManager.NotificationPreferences) : async Result.Result<(), Text> {
        await notificationManager.updatePreferences(msg.caller, userId, prefs)
    };

    public shared(msg) func subscribeToPush(userId: Principal, subscription: NotificationManager.PushSubscription) : async Result.Result<(), Text> {
        await notificationManager.subscribeToPush(msg.caller, userId, subscription)
    };

    public shared(msg) func broadcastAnnouncement(title: Text, message: Text) : async Result.Result<(), Text> {
        await notificationManager.broadcastAnnouncement(msg.caller, title, message)
    };

    public query func getUserNotifications(userId: Principal, limit: Nat, offset: Nat) : async [NotificationManager.Notification] {
        notificationManager.getUserNotifications(userId, limit, offset)
    };

    // Content Moderation Management Functions
    public shared(_msg) func scanContent(contentId: Text, contentType: Text, content: Text) : async ContentModerationManager.AutoModerationResult {
        await contentModerationManager.scanContent(contentId, contentType, content)
    };

    public shared(msg) func reportContent(
        contentId: Text,
        contentType: Text,
        reason: ContentModerationManager.ModerationReason,
        description: Text
    ) : async Result.Result<Text, Text> {
        await contentModerationManager.reportContent(contentId, contentType, msg.caller, reason, description)
    };

    public shared(msg) func reviewReport(
        reportId: Text,
        action: ContentModerationManager.ModerationAction,
        resolution: Text
    ) : async Result.Result<(), Text> {
        await contentModerationManager.reviewReport(reportId, msg.caller, action, resolution)
    };

    public shared(_msg) func addModerationRule(rule: ContentModerationManager.ModerationRule) : async Result.Result<(), Text> {
        await contentModerationManager.addModerationRule(rule)
    };

    public shared(_msg) func updateTrustScore(userId: Principal, adjustment: Float) : async Result.Result<(), Text> {
        await contentModerationManager.updateTrustScore(userId, adjustment)
    };

    // Additional Content Moderation Functions
    public func getModerationRules() : async [ContentModerationManager.ModerationRule] {
        await contentModerationManager.getModerationRules()
    };
    
    public func getAutoModerationResults(contentId: Text) : async ?ContentModerationManager.AutoModerationResult {
        await contentModerationManager.getAutoModerationResults(contentId)
    };
    
    public shared(_msg) func updateModerationRule(ruleId: Text, updates: {
        name: ?Text;
        description: ?Text;
        severity: ?Nat;
        threshold: ?Float;
        enabled: ?Bool;
    }) : async Result.Result<(), Text> {
        await contentModerationManager.updateModerationRule(ruleId, updates)
    };
    
    public shared(_msg) func deleteModerationRule(ruleId: Text) : async Result.Result<(), Text> {
        await contentModerationManager.deleteModerationRule(ruleId)
    };
    
    public func getUserTrustScore(userId: Principal) : async Float {
        await contentModerationManager.getUserTrustScore(userId)
    };
    
    public shared(_msg) func escalateReport(reportId: Text, priority: Text) : async Result.Result<(), Text> {
        await contentModerationManager.escalateReport(reportId, priority)
    };
    
    public func getHighPriorityReports() : async [ContentModerationManager.ModerationReport] {
        await contentModerationManager.getHighPriorityReports()
    };
    
    public func getReportsByStatus(status: Text) : async [ContentModerationManager.ModerationReport] {
        await contentModerationManager.getReportsByStatus(status)
    };
    
    public func getReportsByReason(reason: ContentModerationManager.ModerationReason) : async [ContentModerationManager.ModerationReport] {
        await contentModerationManager.getReportsByReason(reason)
    };
    
    public func getModerationStats() : async {
        totalReports: Nat;
        pendingReports: Nat;
        resolvedReports: Nat;
        flaggedContent: Nat;
        averageConfidence: Float;
    } {
        await contentModerationManager.getModerationStatsPublic()
    };
}