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
import Float "mo:base/Float";
import Char "mo:base/Char";
import VideoManager "video";
import LiveStreamManager "livestream";
import TokenManager "token";
import EmoteManager "emote";
import AnalyticsManager "analytics";
import NotificationManager "notification";
import ContentModerationManager "contentmoderation";
import WebRTCManager "webrtc";
import ChunkedUploadManager "chunkedupload";

persistent actor UserManager {
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

    type UserError = {
        #NotFound;
        #AlreadyExists;
        #Unauthorized;
        #InvalidInput: Text;
        #InsufficientFunds;
        #AlreadyFollowing;
        #AlreadySubscribed;
        #CannotFollowSelf;
        #Suspended;
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
        avatar: ?Text;
        banner: ?Text;
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
    private var usersEntries : [(Principal, User)] = [];
    private var usernamesEntries : [(Text, Principal)] = [];
    private var subscriptionsEntries : [(Text, Subscription)] = [];
    private var userSessionsEntries : [(Principal, Int)] = [];
    private var suspendedUsersEntries : [(Principal, (Text, Int))] = [];
    
    private transient var users = HashMap.fromIter<Principal, User>(usersEntries.vals(), usersEntries.size(), Principal.equal, Principal.hash);
    private transient var usernames = HashMap.fromIter<Text, Principal>(usernamesEntries.vals(), usernamesEntries.size(), Text.equal, Text.hash);
    private transient var subscriptions = HashMap.fromIter<Text, Subscription>(subscriptionsEntries.vals(), subscriptionsEntries.size(), Text.equal, Text.hash);
    private transient var userSessions = HashMap.fromIter<Principal, Int>(userSessionsEntries.vals(), userSessionsEntries.size(), Principal.equal, Principal.hash);
    private transient var suspendedUsers = HashMap.fromIter<Principal, (Text, Int)>(suspendedUsersEntries.vals(), suspendedUsersEntries.size(), Principal.equal, Principal.hash);

    // Video Manager Instance
    private transient var videoManager = VideoManager.VideoManager();
    
    // LiveStream Manager Instance
    private transient var liveStreamManager = LiveStreamManager.LiveStreamManager();
    
    // Token Manager Instance
    private transient var tokenManager = TokenManager.TokenManager();
    
    // Emote Manager Instance
    private transient var emoteManager = EmoteManager.EmoteManager();
    
    // Analytics Manager Instance
    private transient var analyticsManager = AnalyticsManager.AnalyticsManager();
    
    // Notification Manager Instance
    private transient var notificationManager = NotificationManager.NotificationManager();
    
    // Content Moderation Manager Instance
    private transient var contentModerationManager = ContentModerationManager.ContentModerationManager();
    
    // WebRTC Signaling Service Instance
    private transient var webRTCService = WebRTCManager.WebRTCSignalingService();
    
    // Chunked Upload Service Instance
    private transient var chunkedUploadService = ChunkedUploadManager.ChunkedUploadService();

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
    public shared(msg) func createUser(username: Text, displayName: Text, email: ?Text, avatar: ?Text) : async Result.Result<User, Text> {
        let caller = msg.caller;
        
        // Enhanced validation
        switch (validateUsername(username)) {
            case (#err(msg)) { return #err(msg) };
            case (#ok()) { };
        };
        
        // Validate display name
        if (Text.size(displayName) == 0 or Text.size(displayName) > 50) {
            return #err("Display name must be between 1 and 50 characters");
        };
        
        // Validate email if provided
        switch (email) {
            case (?emailAddr) {
                if (not validateEmail(emailAddr)) {
                    return #err("Invalid email format");
                };
            };
            case null { };
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
            avatar = avatar;
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

    public shared(msg) func updateProfile(displayName: ?Text, bio: ?Text, avatar: ?Text, banner: ?Text, socialLinks: ?SocialLinks) : async Result.Result<User, Text> {
        let caller = msg.caller;
        
        // Validate inputs
        switch (displayName) {
            case (?name) {
                if (Text.size(name) == 0 or Text.size(name) > 50) {
                    return #err("Display name must be between 1 and 50 characters");
                };
            };
            case null { };
        };
        
        switch (bio) {
            case (?bioText) {
                if (Text.size(bioText) > 500) {
                    return #err("Bio must be no more than 500 characters");
                };
            };
            case null { };
        };
        
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
        
        // Check if target user exists
        switch (users.get(targetUser)) {
            case null { return #err("Target user not found") };
            case (?_) { };
        };
        
        // Check if already following
        if (isUserFollowing(caller, targetUser)) {
            return #err("Already following this user");
        };
        
        // Update follower's following list
        switch (users.get(caller)) {
            case (?user) {
                let updatedFollowing = Array.append(user.following, [targetUser]);
                let updatedUser = { user with following = updatedFollowing; lastActive = Time.now() };
                users.put(caller, updatedUser);
            };
            case null { return #err("User not found") };
        };
        
        // Update target user's followers list and stats
        switch (users.get(targetUser)) {
            case (?user) {
                let updatedFollowers = Array.append(user.followers, [caller]);
                let updatedStats = {
                    user.stats with
                    followersGained30d = user.stats.followersGained30d + 1;
                };
                let updatedUser = { 
                    user with 
                    followers = updatedFollowers;
                    stats = updatedStats;
                };
                users.put(targetUser, updatedUser);
                
                // Record analytics
                ignore analyticsManager.recordUserAction(targetUser, "follower_gained", null, ?("New follower: " # Principal.toText(caller)));
            };
            case null { 
                // This should not happen since we checked above, but handle gracefully
                return #err("Target user not found during update");
            };
        };
        
        #ok()
    };

    public shared(msg) func unfollowUser(targetUser: Principal) : async Result.Result<(), Text> {
        let caller = msg.caller;
        
        // Check if currently following
        if (not isUserFollowing(caller, targetUser)) {
            return #err("Not currently following this user");
        };
        
        // Update follower's following list
        switch (users.get(caller)) {
            case (?user) {
                let updatedFollowing = Array.filter(user.following, func (id: Principal) : Bool { id != targetUser });
                let updatedUser = { user with following = updatedFollowing; lastActive = Time.now() };
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
        
        if (caller == streamer) {
            return #err("Cannot subscribe to yourself");
        };
        
        // Validate inputs
        if (tier < 1 or tier > 3) {
            return #err("Invalid subscription tier (must be 1-3)");
        };
        
        if (duration < 1 or duration > 365) {
            return #err("Invalid duration (must be 1-365 days)");
        };
        
        // Check if streamer exists
        switch (users.get(streamer)) {
            case null { return #err("Streamer not found") };
            case (?_) { };
        };
        
        // Check if already subscribed
        if (isUserSubscribed(caller, streamer)) {
            return #err("Already subscribed to this streamer");
        };
        
        let subscriptionId = Principal.toText(caller) # "_" # Principal.toText(streamer) # "_" # Int.toText(Time.now());
        
        // Calculate cost based on tier and duration
        let cost = calculateSubscriptionCost(tier, duration);
        
        // Check user balance and deduct coins
        switch (users.get(caller)) {
            case (?user) {
                if (user.coinBalance < cost) {
                    return #err("Insufficient coins");
                };
                
                // Convert to Int for safe subtraction, then back to Nat
                let balanceInt : Int = user.coinBalance;
                let costInt : Int = cost;
                let resultInt = balanceInt - costInt;
                let newBalance = Int.abs(resultInt);
                let updatedUser = { user with coinBalance = newBalance; lastActive = Time.now() };
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
        
        // Update streamer's subscriber list and revenue stats
        switch (users.get(streamer)) {
            case (?user) {
                let updatedSubscribers = Array.append(user.subscribers, [caller]);
                let updatedStats = {
                    user.stats with
                    totalRevenue = user.stats.totalRevenue + cost;
                };
                let updatedUser = { 
                    user with 
                    subscribers = updatedSubscribers;
                    stats = updatedStats;
                };
                users.put(streamer, updatedUser);
                
                // Record analytics
                ignore analyticsManager.recordUserAction(streamer, "subscription_received", ?subscriptionId, ?("Tier " # Nat.toText(tier) # " subscription"));
                ignore analyticsManager.recordUserAction(caller, "subscription_purchased", ?subscriptionId, ?("Subscribed to " # Principal.toText(streamer)));
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
        
        if (caller == targetUser) {
            return #err("Cannot block yourself");
        };
        
        // Check if target user exists
        switch (users.get(targetUser)) {
            case null { return #err("Target user not found") };
            case (?_) { };
        };
        
        switch (users.get(caller)) {
            case (?user) {
                // Check if already blocked
                if (Array.find(user.blockedUsers, func (id: Principal) : Bool { id == targetUser }) != null) {
                    return #err("User already blocked");
                };
                
                let updatedBlockedUsers = Array.append(user.blockedUsers, [targetUser]);
                
                // Also remove from following/followers if they exist
                let updatedFollowing = Array.filter(user.following, func (id: Principal) : Bool { id != targetUser });
                let updatedFollowers = Array.filter(user.followers, func (id: Principal) : Bool { id != targetUser });
                
                let updatedUser = { 
                    user with 
                    blockedUsers = updatedBlockedUsers;
                    following = updatedFollowing;
                    followers = updatedFollowers;
                    lastActive = Time.now();
                };
                users.put(caller, updatedUser);
                
                // Remove caller from target user's followers/following lists
                switch (users.get(targetUser)) {
                    case (?targetUserData) {
                        let targetUpdatedFollowing = Array.filter(targetUserData.following, func (id: Principal) : Bool { id != caller });
                        let targetUpdatedFollowers = Array.filter(targetUserData.followers, func (id: Principal) : Bool { id != caller });
                        let targetUpdatedUser = { 
                            targetUserData with 
                            following = targetUpdatedFollowing;
                            followers = targetUpdatedFollowers;
                        };
                        users.put(targetUser, targetUpdatedUser);
                    };
                    case null { };
                };
                
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
        let now = Time.now();
        
        for ((_, subscription) in subscriptions.entries()) {
            if (subscription.subscriber == userId) {
                // Only include active subscriptions that haven't expired
                if (subscription.isActive and subscription.endDate > now) {
                    userSubs.add(subscription);
                };
            };
        };
        Buffer.toArray(userSubs)
    };

    public query func getStreamerSubscriptions(streamerId: Principal, includeExpired: Bool) : async {
        active: [Subscription];
        expired: [Subscription];
        totalRevenue: Nat;
    } {
        let activeSubs = Buffer.Buffer<Subscription>(0);
        let expiredSubs = Buffer.Buffer<Subscription>(0);
        let now = Time.now();
        var totalRevenue = 0;
        
        for ((_, subscription) in subscriptions.entries()) {
            if (subscription.streamer == streamerId) {
                totalRevenue += subscription.totalPaid;
                
                if (subscription.isActive and subscription.endDate > now) {
                    activeSubs.add(subscription);
                } else if (includeExpired) {
                    expiredSubs.add(subscription);
                };
            };
        };
        
        {
            active = Buffer.toArray(activeSubs);
            expired = Buffer.toArray(expiredSubs);
            totalRevenue = totalRevenue;
        }
    };

    public query func getSubscriptionStats(userId: Principal) : async {
        totalSubscriptions: Nat;
        activeSubscriptions: Nat;
        totalSpent: Nat;
        currentMonthlySpend: Nat;
    } {
        var totalSubs = 0;
        var activeSubs = 0;
        var totalSpent = 0;
        var monthlySpend = 0;
        let now = Time.now();
        let monthAgo = now - (30 * 24 * 60 * 60 * 1000000000); // 30 days ago
        
        for ((_, subscription) in subscriptions.entries()) {
            if (subscription.subscriber == userId) {
                totalSubs += 1;
                totalSpent += subscription.totalPaid;
                
                if (subscription.isActive and subscription.endDate > now) {
                    activeSubs += 1;
                    
                    // Calculate monthly spend for recent subscriptions
                    if (subscription.startDate > monthAgo) {
                        monthlySpend += subscription.totalPaid;
                    };
                };
            };
        };
        
        {
            totalSubscriptions = totalSubs;
            activeSubscriptions = activeSubs;
            totalSpent = totalSpent;
            currentMonthlySpend = monthlySpend;
        }
    };

    public query func searchUsers(searchQuery: Text, limit: Nat, offset: Nat) : async {
        users: [User];
        totalMatches: Nat;
        hasMore: Bool;
    } {
        let results = Buffer.Buffer<User>(0);
        let lowerQuery = searchQuery;
        var totalMatches = 0;
        var skipped = 0;
        var collected = 0;
        
        // First pass: count total matches and collect results with pagination
        label searchLoop for ((_, user) in users.entries()) {
            let lowerUsername = user.username;
            let lowerDisplayName = user.displayName;
            
            // Simple substring matching (case-sensitive for now)
            if (Text.contains(lowerUsername, #text lowerQuery) or 
                Text.contains(lowerDisplayName, #text lowerQuery) or
                Text.contains(user.bio, #text lowerQuery)) {
                
                totalMatches += 1;
                
                // Skip results until we reach the offset
                if (skipped < offset) {
                    skipped += 1;
                    continue searchLoop;
                };
                
                // Collect results up to the limit
                if (collected < limit) {
                    results.add(user);
                    collected += 1;
                };
                
                // Stop collecting once we have enough results
                if (collected >= limit) {
                    continue searchLoop; // Keep counting total matches
                };
            };
        };
        
        {
            users = Buffer.toArray(results);
            totalMatches = totalMatches;
            hasMore = totalMatches > (offset + limit);
        }
    };

    // Data Integrity Functions
    public shared(msg) func validateDataIntegrity() : async Result.Result<{
        usersCount: Nat;
        usernamesCount: Nat;
        orphanedUsernames: Nat;
        duplicateFollowsFixed: Nat;
        expiredSubscriptionsFixed: Nat;
    }, Text> {
        if (not isAdmin(msg.caller)) {
            return #err("Unauthorized: Admin access required");
        };
        
        var orphanedUsernames = 0;
        var duplicateFollowsFixed = 0;
        var expiredSubscriptionsFixed = 0;
        
        // Check for orphaned usernames
        let usernamesToRemove = Buffer.Buffer<Text>(0);
        for ((username, userId) in usernames.entries()) {
            switch (users.get(userId)) {
                case null { 
                    usernamesToRemove.add(username);
                    orphanedUsernames += 1;
                };
                case (?user) {
                    if (user.username != username) {
                        usernamesToRemove.add(username);
                        orphanedUsernames += 1;
                    };
                };
            };
        };
        
        // Remove orphaned usernames
        for (username in usernamesToRemove.vals()) {
            usernames.delete(username);
        };
        
        // Fix duplicate follows and clean up user relationships
        for ((userId, user) in users.entries()) {
            // Remove duplicates from following list
            let uniqueFollowing = Buffer.Buffer<Principal>(0);
            let seenFollowing = HashMap.HashMap<Principal, Bool>(0, Principal.equal, Principal.hash);
            
            for (followId in user.following.vals()) {
                switch (seenFollowing.get(followId)) {
                    case null {
                        seenFollowing.put(followId, true);
                        uniqueFollowing.add(followId);
                    };
                    case (?_) { duplicateFollowsFixed += 1; };
                };
            };
            
            // Remove duplicates from followers list
            let uniqueFollowers = Buffer.Buffer<Principal>(0);
            let seenFollowers = HashMap.HashMap<Principal, Bool>(0, Principal.equal, Principal.hash);
            
            for (followerId in user.followers.vals()) {
                switch (seenFollowers.get(followerId)) {
                    case null {
                        seenFollowers.put(followerId, true);
                        uniqueFollowers.add(followerId);
                    };
                    case (?_) { duplicateFollowsFixed += 1; };
                };
            };
            
            // Update user if changes were made
            let newFollowing = Buffer.toArray(uniqueFollowing);
            let newFollowers = Buffer.toArray(uniqueFollowers);
            
            if (Array.size(newFollowing) != Array.size(user.following) or 
                Array.size(newFollowers) != Array.size(user.followers)) {
                let updatedUser = {
                    user with 
                    following = newFollowing;
                    followers = newFollowers;
                };
                users.put(userId, updatedUser);
            };
        };
        
        // Clean up expired subscriptions
        let subscriptionsToUpdate = Buffer.Buffer<(Text, Subscription)>(0);
        let now = Time.now();
        
        for ((subId, subscription) in subscriptions.entries()) {
            if (subscription.isActive and subscription.endDate < now) {
                let updatedSubscription = { subscription with isActive = false };
                subscriptionsToUpdate.add((subId, updatedSubscription));
                expiredSubscriptionsFixed += 1;
            };
        };
        
        // Update expired subscriptions
        for ((subId, updatedSub) in subscriptionsToUpdate.vals()) {
            subscriptions.put(subId, updatedSub);
        };
        
        #ok({
            usersCount = users.size();
            usernamesCount = usernames.size();
            orphanedUsernames = orphanedUsernames;
            duplicateFollowsFixed = duplicateFollowsFixed;
            expiredSubscriptionsFixed = expiredSubscriptionsFixed;
        })
    };

    public shared(msg) func unblockUser(targetUser: Principal) : async Result.Result<(), Text> {
        let caller = msg.caller;
        
        switch (users.get(caller)) {
            case (?user) {
                // Check if user is actually blocked
                if (Array.find(user.blockedUsers, func (id: Principal) : Bool { id == targetUser }) == null) {
                    return #err("User is not blocked");
                };
                
                let updatedBlockedUsers = Array.filter(user.blockedUsers, func (id: Principal) : Bool { id != targetUser });
                let updatedUser = { 
                    user with 
                    blockedUsers = updatedBlockedUsers;
                    lastActive = Time.now();
                };
                users.put(caller, updatedUser);
                #ok()
            };
            case null { #err("User not found") };
        }
    };

    public shared(msg) func unsuspendUser(userId: Principal) : async Result.Result<(), Text> {
        if (not isAdmin(msg.caller)) {
            return #err("Unauthorized: Admin access required");
        };
        
        switch (users.get(userId)) {
            case (?user) {
                let updatedUser = {
                    user with
                    isSuspended = false;
                    suspensionReason = null;
                    suspensionEndDate = null;
                };
                users.put(userId, updatedUser);
                suspendedUsers.delete(userId);
                #ok()
            };
            case null { #err("User not found") };
        }
    };

    public query func getUserRelationship(_targetUser: Principal) : async Result.Result<UserRelationship, Text> {
        // Note: This would need the caller context, so it should be a shared function
        // For now, returning an error as query functions don't have access to msg.caller
        #err("Use getUserRelationshipWithAuth instead")
    };

    public shared(msg) func getUserRelationshipWithAuth(targetUser: Principal) : async Result.Result<UserRelationship, Text> {
        let caller = msg.caller;
        
        if (caller == targetUser) {
            return #err("Cannot get relationship with yourself");
        };
        
        switch (users.get(caller)) {
            case (?user) {
                // Check if blocked
                if (Array.find(user.blockedUsers, func (id: Principal) : Bool { id == targetUser }) != null) {
                    return #ok(#Blocked);
                };
                
                let isFollowing = Array.find(user.following, func (id: Principal) : Bool { id == targetUser }) != null;
                let isFollower = Array.find(user.followers, func (id: Principal) : Bool { id == targetUser }) != null;
                let isSubscribed = isUserSubscribed(caller, targetUser);
                
                if (isSubscribed) {
                    return #ok(#Subscriber);
                } else if (isFollowing and isFollower) {
                    return #ok(#Mutual);
                } else if (isFollowing) {
                    return #ok(#Following);
                } else if (isFollower) {
                    return #ok(#Follower);
                } else {
                    // No specific relationship found, but we could add a #None variant
                    return #err("No relationship found");
                };
            };
            case null { #err("User not found") };
        }
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
        let result = await videoManager.likeVideo(msg.caller, videoId);
        
        // Update user stats on successful like
        switch (result) {
            case (#ok()) {
                switch (users.get(msg.caller)) {
                    case (?user) {
                        let updatedStats = {
                            user.stats with
                            totalLikes = user.stats.totalLikes + 1;
                        };
                        let updatedUser = { 
                            user with 
                            stats = updatedStats;
                            lastActive = Time.now();
                        };
                        users.put(msg.caller, updatedUser);
                        
                        // Record analytics
                        ignore analyticsManager.recordUserAction(msg.caller, "like", ?videoId, null);
                    };
                    case null { };
                };
            };
            case (#err(_)) { };
        };
        
        result
    };

    public shared(msg) func unlikeVideo(videoId: Text) : async Result.Result<(), Text> {
        let result = await videoManager.unlikeVideo(msg.caller, videoId);
        
        // Update user stats on successful unlike
        switch (result) {
            case (#ok()) {
                switch (users.get(msg.caller)) {
                    case (?user) {
                        let currentTotalLikes = user.stats.totalLikes;
                        let newTotalLikes = if (currentTotalLikes > 0) { 
                            currentTotalLikes - 1
                        } else { 0 };
                        
                        let updatedStats = {
                            user.stats with
                            totalLikes = newTotalLikes;
                        };
                        let updatedUser = { 
                            user with 
                            stats = updatedStats;
                            lastActive = Time.now();
                        };
                        users.put(msg.caller, updatedUser);
                        
                        // Record analytics
                        ignore analyticsManager.recordUserAction(msg.caller, "unlike", ?videoId, null);
                    };
                    case null { };
                };
            };
            case (#err(_)) { };
        };
        
        result
    };

    public shared(msg) func hasUserLikedVideo(videoId: Text) : async Result.Result<Bool, Text> {
        await videoManager.hasUserLikedVideo(msg.caller, videoId)
    };

    public shared(msg) func addComment(videoId: Text, content: Text, parentCommentId: ?Text) : async Result.Result<Text, Text> {
        await videoManager.addComment(msg.caller, videoId, content, parentCommentId)
    };

    public shared(msg) func shareVideo(videoId: Text, platform: Text) : async Result.Result<(), Text> {
        await videoManager.shareVideo(msg.caller, videoId, platform)
    };

    public shared(msg) func recordView(videoId: Text, watchTime: Nat) : async Result.Result<(), Text> {
        let result = await videoManager.recordView(msg.caller, videoId, watchTime);
        
        // Update user stats on successful view recording
        switch (result) {
            case (#ok()) {
                switch (users.get(msg.caller)) {
                    case (?user) {
                        let updatedStats = {
                            user.stats with
                            totalViews = user.stats.totalViews + 1;
                            viewsGained30d = user.stats.viewsGained30d + 1;
                        };
                        let updatedUser = { 
                            user with 
                            stats = updatedStats;
                            lastActive = Time.now();
                        };
                        users.put(msg.caller, updatedUser);
                        
                        // Record analytics with proper watch time conversion
                        ignore analyticsManager.recordView(msg.caller, msg.caller, videoId, Float.fromInt(watchTime));
                    };
                    case null { };
                };
            };
            case (#err(_)) { };
        };
        
        result
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

    public query func getAllVideos() : async Result.Result<[VideoManager.Video], Text> {
        videoManager.getAllVideos()
    };

    public query func searchVideos(searchQuery: Text, category: ?VideoManager.VideoCategory, limit: Nat) : async [VideoManager.Video] {
        videoManager.searchVideos(searchQuery, category, limit)
    };

    public query func getVideoComments(videoId: Text, limit: Nat, offset: Nat) : async [VideoManager.Comment] {
        videoManager.getVideoComments(videoId, limit, offset)
    };

    // Debug function to get all comments
    public query func getAllComments() : async [VideoManager.Comment] {
        videoManager.getAllComments()
    };

    public shared(msg) func likeComment(commentId: Text) : async Result.Result<(), Text> {
        await videoManager.likeComment(msg.caller, commentId)
    };

    public shared(msg) func toggleCommentLike(commentId: Text) : async Result.Result<(), Text> {
        await videoManager.toggleCommentLike(msg.caller, commentId)
    };

    public query func getVideoAnalytics(videoId: Text) : async Result.Result<VideoManager.VideoAnalytics, Text> {
        videoManager.getVideoAnalytics(videoId)
    };

    public query func getUserPlaylists(userId: Principal) : async [VideoManager.Playlist] {
        videoManager.getUserPlaylists(userId)
    };

    // Chunked Upload Functions
    public shared(msg) func initializeChunkedUpload(
        fileName: Text,
        totalSize: Nat,
        contentType: Text,
        expectedChecksum: ?Text
    ) : async Result.Result<Text, Text> {
        await videoManager.initializeChunkedUpload(msg.caller, fileName, totalSize, contentType, expectedChecksum)
    };

    public shared(msg) func uploadChunk(
        sessionId: Text,
        chunkInfo: VideoManager.ChunkInfo
    ) : async Result.Result<{uploaded: Nat; total: Nat}, Text> {
        await videoManager.uploadChunk(msg.caller, sessionId, chunkInfo)
    };

    public shared(msg) func finalizeChunkedUpload(
        sessionId: Text,
        title: Text,
        description: Text,
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
        await videoManager.finalizeChunkedUpload(
            msg.caller, 
            sessionId, 
            title, 
            description, 
            thumbnail, 
            videoType, 
            category, 
            tags, 
            hashtags, 
            settings
        )
    };

    public query func getChunkedUploadProgress(sessionId: Text) : async Result.Result<{uploaded: Nat; total: Nat; percentage: Float}, Text> {
        videoManager.getChunkedUploadProgress(sessionId)
    };

    public shared(msg) func cancelChunkedUpload(sessionId: Text) : async Result.Result<(), Text> {
        await videoManager.cancelChunkedUpload(msg.caller, sessionId)
    };

    public query func getVideoStreamChunk(
        videoId: Text,
        chunkIndex: Nat,
        chunkSize: ?Nat
    ) : async Result.Result<VideoManager.StreamChunk, Text> {
        videoManager.getVideoStreamChunk(videoId, chunkIndex, chunkSize)
    };

    public query func getVideoStreamInfo(videoId: Text) : async Result.Result<{totalSize: Nat; totalChunks: Nat; chunkSize: Nat}, Text> {
        videoManager.getVideoStreamInfo(videoId)
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
    
    // Performance Analytics Functions
    public query func getUserActivitySummary(userId: Principal) : async Result.Result<{
        profile: {
            username: Text;
            displayName: Text;
            tier: UserTier;
            verificationStatus: VerificationStatus;
            createdAt: Int;
            lastActive: Int;
        };
        stats: UserStats;
        relationships: {
            followers: Nat;
            following: Nat;
            subscribers: Nat;
        };
        activity: {
            isOnline: Bool;
            daysSinceLastActive: Nat;
            engagementLevel: Text; // High, Medium, Low
        };
    }, Text> {
        switch (users.get(userId)) {
            case (?user) {
                let now = Time.now();
                let daysSinceActive = (now - user.lastActive) / (24 * 60 * 60 * 1000_000_000);
                let isOnline = daysSinceActive < 1; // Active within last day
                
                let engagementLevel = if (user.stats.totalViews > 1000 and user.stats.totalLikes > 100) {
                    "High"
                } else if (user.stats.totalViews > 100 and user.stats.totalLikes > 10) {
                    "Medium"
                } else {
                    "Low"
                };
                
                #ok({
                    profile = {
                        username = user.username;
                        displayName = user.displayName;
                        tier = user.tier;
                        verificationStatus = user.verificationStatus;
                        createdAt = user.createdAt;
                        lastActive = user.lastActive;
                    };
                    stats = user.stats;
                    relationships = {
                        followers = Array.size(user.followers);
                        following = Array.size(user.following);
                        subscribers = Array.size(user.subscribers);
                    };
                    activity = {
                        isOnline = isOnline;
                        daysSinceLastActive = Int.abs(daysSinceActive);
                        engagementLevel = engagementLevel;
                    };
                })
            };
            case null { #err("User not found") };
        }
    };

    public query func getTopUsers(metric: Text, limit: Nat) : async [{
        userId: Principal;
        username: Text;
        displayName: Text;
        value: Nat;
        tier: UserTier;
    }] {
        let userArray = Iter.toArray(users.entries());
        let sortedUsers = Array.sort<(Principal, User)>(userArray, func(a, b) {
            let valueA = switch (metric) {
                case ("followers") { Array.size(a.1.followers) };
                case ("views") { a.1.stats.totalViews };
                case ("likes") { a.1.stats.totalLikes };
                case ("streams") { a.1.stats.totalStreams };
                case ("revenue") { a.1.stats.totalRevenue };
                case (_) { 0 };
            };
            let valueB = switch (metric) {
                case ("followers") { Array.size(b.1.followers) };
                case ("views") { b.1.stats.totalViews };
                case ("likes") { b.1.stats.totalLikes };
                case ("streams") { b.1.stats.totalStreams };
                case ("revenue") { b.1.stats.totalRevenue };
                case (_) { 0 };
            };
            
            if (valueA > valueB) { #less } 
            else if (valueA < valueB) { #greater } 
            else { #equal }
        });
        
        let limitedUsers = if (Array.size(sortedUsers) > limit) {
            Array.subArray<(Principal, User)>(sortedUsers, 0, limit)
        } else {
            sortedUsers
        };
        
        Array.map<(Principal, User), {userId: Principal; username: Text; displayName: Text; value: Nat; tier: UserTier}>(
            limitedUsers,
            func((userId, user)) {
                let value = switch (metric) {
                    case ("followers") { Array.size(user.followers) };
                    case ("views") { user.stats.totalViews };
                    case ("likes") { user.stats.totalLikes };
                    case ("streams") { user.stats.totalStreams };
                    case ("revenue") { user.stats.totalRevenue };
                    case (_) { 0 };
                };
                
                {
                    userId = userId;
                    username = user.username;
                    displayName = user.displayName;
                    value = value;
                    tier = user.tier;
                }
            }
        )
    };

    public query func getPlatformStats() : async {
        totalUsers: Nat;
        activeUsers: Nat;
        totalSubscriptions: Nat;
        totalRevenue: Nat;
        verifiedUsers: Nat;
        partneredUsers: Nat;
    } {
        var activeUsers = 0;
        var totalSubscriptionsCount = 0;
        var totalPlatformRevenue = 0;
        var verifiedUsers = 0;
        var partneredUsers = 0;
        
        let now = Time.now();
        let dayAgo = now - (24 * 60 * 60 * 1000_000_000);
        
        // Count user statistics
        for ((_, user) in users.entries()) {
            if (user.lastActive > dayAgo) {
                activeUsers += 1;
            };
            
            if (user.verificationStatus == #Verified) {
                verifiedUsers += 1;
            };
            
            switch (user.partnershipInfo) {
                case (?_) { partneredUsers += 1 };
                case null { };
            };
            
            totalPlatformRevenue += user.stats.totalRevenue;
        };
        
        // Count active subscriptions
        for ((_, subscription) in subscriptions.entries()) {
            if (subscription.isActive and subscription.endDate > now) {
                totalSubscriptionsCount += 1;
            };
        };
        
        {
            totalUsers = users.size();
            activeUsers = activeUsers;
            totalSubscriptions = totalSubscriptionsCount;
            totalRevenue = totalPlatformRevenue;
            verifiedUsers = verifiedUsers;
            partneredUsers = partneredUsers;
        }
    };

    // WebRTC Streaming Functions
    
    // Create a new WebRTC stream
    public shared(msg) func createWebRTCStream(streamData: {
        streamId: Text;
        title: Text;
        category: Text;
        maxViewers: Nat;
    }) : async Result.Result<(), Text> {
        let streamResult = await liveStreamManager.createStream(
            msg.caller,
            streamData.title,
            "WebRTC Gaming Stream",
            switch (streamData.category) {
                case ("Gaming") { #Gaming };
                case ("JustChatting") { #JustChatting };
                case ("Music") { #Music };
                case ("Art") { #Art };
                case ("IRL") { #IRL };
                case ("CryptoTrading") { #CryptoTrading };
                case ("Education") { #Education };
                case ("Sports") { #Sports };
                case ("Technology") { #Technology };
                case ("Cooking") { #Cooking };
                case ("Fitness") { #Fitness };
                case ("Creative") { #Creative };
                case (_) { #Gaming };
            },
            [],
            "General",
            #P720
        );
        switch (streamResult) {
            case (#ok(_)) {
                // Initialize WebRTC connection for the stream
                webRTCService.initializeStreamConnection(msg.caller, streamData.streamId, streamData.maxViewers)
            };
            case (#err(error)) {
                #err("Failed to create livestream: " # error)
            };
        }
    };
    
    // Viewer joins a stream
    public shared(msg) func joinStream(streamId: Text, offer: Text) : async Result.Result<(), Text> {
        webRTCService.joinStream(msg.caller, streamId, offer)
    };
    
    // Streamer gets pending viewer connections
    public shared(msg) func getPendingViewers(streamId: Text) : async Result.Result<[{viewerId: Text; offer: Text}], Text> {
        webRTCService.getPendingViewers(msg.caller, streamId)
    };
    
    // Streamer sends answer to viewer
    public shared(msg) func sendAnswer(data: {
        streamId: Text;
        viewerId: Text;
        answer: Text;
    }) : async Result.Result<(), Text> {
        webRTCService.sendAnswer(msg.caller, data.streamId, data.viewerId, data.answer)
    };
    
    // Viewer gets answer from streamer
    public shared(msg) func getAnswer(streamId: Text) : async Result.Result<?Text, Text> {
        webRTCService.getAnswer(msg.caller, streamId)
    };
    
    // ICE candidate exchange
    public shared(msg) func sendIceCandidate(data: {
        streamId: Text;
        targetId: ?Text;
        candidate: Text;
    }) : async Result.Result<(), Text> {
        webRTCService.sendIceCandidate(msg.caller, data.streamId, data.targetId, data.candidate)
    };
    
    // Get ICE candidates
    public shared(msg) func getIceCandidates(streamId: Text) : async Result.Result<[Text], Text> {
        webRTCService.getIceCandidates(msg.caller, streamId)
    };
    
    // Update viewer heartbeat
    public shared(msg) func updateHeartbeat(streamId: Text) : async Result.Result<(), Text> {
        webRTCService.updateHeartbeat(msg.caller, streamId)
    };
    
    // Remove viewer from stream
    public shared(msg) func leaveStream(streamId: Text) : async Result.Result<(), Text> {
        webRTCService.removeViewer(msg.caller, streamId)
    };
    
    // End WebRTC stream
    public shared(msg) func endWebRTCStream(streamId: Text) : async Result.Result<(), Text> {
        let webRTCResult = webRTCService.endStream(msg.caller, streamId);
        // Also end the livestream
        let _ = await liveStreamManager.endStream(msg.caller, streamId);
        webRTCResult
    };
    
    // Get stream statistics
    public func getStreamStats(streamId: Text) : async Result.Result<WebRTCManager.WebRTCStats, Text> {
        webRTCService.getStreamStats(streamId)
    };
    
    // Get active streams
    public query func getActiveStreams() : async [(Text, {streamerId: Text; viewerCount: Nat; isActive: Bool})] {
        webRTCService.getActiveStreams()
    };
    
    // Get viewer count for a stream
    public query func getViewerCount(streamId: Text) : async Nat {
        webRTCService.getViewerCount(streamId)
    };
    
    // New Chunked Upload Service Functions
    
    // Initialize chunked upload for streaming service
    public shared(msg) func initializeStreamUpload(
        fileName: Text,
        totalSize: Nat,
        contentType: Text,
        expectedChecksum: ?Text
    ) : async Result.Result<Text, Text> {
        chunkedUploadService.initializeUpload(msg.caller, fileName, totalSize, contentType, expectedChecksum)
    };
    
    // Upload chunk for large files
    public shared(msg) func uploadVideoChunk(
        sessionId: Text,
        chunkInfo: ChunkedUploadManager.ChunkInfo
    ) : async Result.Result<{uploaded: Nat; total: Nat}, Text> {
        chunkedUploadService.uploadChunk(msg.caller, sessionId, chunkInfo)
    };
    
    // Finalize stream upload
    public shared(msg) func finalizeStreamUpload(sessionId: Text) : async Result.Result<Text, Text> {
        chunkedUploadService.finalizeUpload(msg.caller, sessionId)
    };
    
    // Get stream upload progress
    public func getStreamUploadProgress(sessionId: Text) : async Result.Result<{uploaded: Nat; total: Nat; percentage: Float}, Text> {
        chunkedUploadService.getUploadProgress(sessionId)
    };
    
    // Get missing chunks for resumable upload
    public func getMissingVideoChunks(sessionId: Text) : async Result.Result<[Nat], Text> {
        chunkedUploadService.getMissingChunks(sessionId)
    };
    
    // Cancel stream upload
    public shared(msg) func cancelStreamUpload(sessionId: Text) : async Result.Result<(), Text> {
        chunkedUploadService.cancelUpload(msg.caller, sessionId)
    };
    
    // Get stream chunk for playback
    public func getStreamVideoChunk(
        videoId: Text,
        chunkIndex: Nat,
        chunkSize: ?Nat
    ) : async Result.Result<ChunkedUploadManager.StreamChunk, Text> {
        chunkedUploadService.getStreamChunk(videoId, chunkIndex, chunkSize)
    };
    
    // Get stream video info
    public func getStreamVideoInfo(videoId: Text) : async Result.Result<{totalSize: Nat; totalChunks: Nat; chunkSize: Nat}, Text> {
        chunkedUploadService.getVideoStreamInfo(videoId)
    };
    
    // Helper functions
    private func isUserFollowing(follower: Principal, followee: Principal) : Bool {
        switch (users.get(follower)) {
            case (?user) {
                Array.find<Principal>(user.following, func(p: Principal) : Bool { p == followee }) != null
            };
            case null { false };
        }
    };
    
    private func isUserSubscribed(subscriber: Principal, streamer: Principal) : Bool {
        let subscriptionKey = Principal.toText(subscriber) # "_" # Principal.toText(streamer);
        switch (subscriptions.get(subscriptionKey)) {
            case (?subscription) { subscription.isActive and subscription.endDate > Time.now() };
            case null { false };
        }
    };
    
    private func calculateSubscriptionCost(tier: Nat, duration: Nat) : Nat {
        let baseCost = switch (tier) {
            case 1 { 500 };  // Tier 1: 500 coins per month
            case 2 { 1000 }; // Tier 2: 1000 coins per month
            case 3 { 2500 }; // Tier 3: 2500 coins per month
            case _ { 500 };  // Default to tier 1
        };
        baseCost * duration
    };
    
    private func validateUsername(username: Text) : Result.Result<(), Text> {
        let len = Text.size(username);
        if (len < 3) {
            return #err("Username must be at least 3 characters");
        };
        if (len > 30) {
            return #err("Username must be less than 30 characters");
        };
        // Check for valid characters (alphanumeric and underscore)
        for (char in username.chars()) {
            if (not (Char.isAlphabetic(char) or Char.isDigit(char) or char == '_')) {
                return #err("Username can only contain letters, numbers, and underscores");
            };
        };
        #ok()
    };
    
    private func validateEmail(email: Text) : Bool {
        // Simple email validation - check for @ symbol and basic structure
        let chars = Text.toArray(email);
        var atCount = 0;
        var atIndex : ?Nat = null;
        var dotAfterAt = false;
        
        for (i in chars.keys()) {
            if (chars[i] == '@') {
                atCount += 1;
                atIndex := ?i;
            };
        };
        
        // Must have exactly one @ symbol
        if (atCount != 1) {
            return false;
        };
        
        // Check for dot after @
        switch (atIndex) {
            case (?index) {
                for (i in chars.keys()) {
                    if (i > index and chars[i] == '.') {
                        dotAfterAt := true;
                    };
                };
            };
            case null { return false; };
        };
        
        dotAfterAt and Text.size(email) > 5
    };
    
    private func isAdmin(user: Principal) : Bool {
        switch (users.get(user)) {
            case (?userInfo) {
                switch (userInfo.tier) {
                    case (#Admin) { true };
                    case _ { false };
                }
            };
            case null { false };
        }
    };

    // System maintenance functions
    public shared(_msg) func cleanupExpiredSessions() : async Nat {
        let webrtcCleaned = webRTCService.cleanupExpiredConnections();
        let uploadCleaned = chunkedUploadService.cleanupExpiredSessions();
        webrtcCleaned + uploadCleaned
    };
}