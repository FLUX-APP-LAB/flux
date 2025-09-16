import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Result "mo:base/Result";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Int "mo:base/Int";
import Iter "mo:base/Iter";

module LiveStreamManager {
    // Types
    public type StreamCategory = {
        #Gaming;
        #JustChatting;
        #Music;
        #Art;
        #IRL;
        #CryptoTrading;
        #Education;
        #Sports;
        #Technology;
        #Cooking;
        #Fitness;
        #Creative;
    };

    public type StreamQuality = {
        #P240;
        #P360;
        #P480;
        #P720;
        #P1080;
        #P1440;
        #P2160;
    };

    public type StreamStatus = {
        #Scheduled;
        #Live;
        #Ended;
        #Paused;
        #Offline;
    };

    public type ChatMessage = {
        id: Text;
        user: Principal;
        username: Text;
        message: Text;
        timestamp: Int;
        emotes: [Text];
        badges: [Text];
        color: Text;
        bits: Nat;
        isModerated: Bool;
        isDeleted: Bool;
        isHighlighted: Bool;
        replyTo: ?Text;
    };

    public type ChatModerationAction = {
        #Timeout;
        #Ban;
        #Delete;
        #Warn;
        #Unban;
    };

    public type Moderator = {
        userId: Principal;
        permissions: [Text];
        assignedBy: Principal;
        assignedAt: Int;
        isActive: Bool;
    };

    public type StreamAlert = {
        id: Text;
        alertType: Text; // follow, subscribe, donation, raid, host
        user: Principal;
        message: ?Text;
        amount: ?Nat;
        timestamp: Int;
        isDisplayed: Bool;
    };

    public type Donation = {
        id: Text;
        donor: Principal;
        amount: Nat;
        currency: Text; // ICP, coins, bits
        message: ?Text;
        timestamp: Int;
        isAnonymous: Bool;
        isRefunded: Bool;
    };

    public type Raid = {
        id: Text;
        fromStreamer: Principal;
        toStreamer: Principal;
        viewerCount: Nat;
        message: Text;
        timestamp: Int;
        isAccepted: Bool;
    };

    public type Host = {
        id: Text;
        hostingStreamer: Principal;
        hostedStreamer: Principal;
        viewerCount: Nat;
        startTime: Int;
        endTime: ?Int;
        isActive: Bool;
    };

    public type StreamSchedule = {
        id: Text;
        streamer: Principal;
        title: Text;
        description: Text;
        category: StreamCategory;
        scheduledStart: Int;
        estimatedDuration: Nat;
        isRecurring: Bool;
        recurrencePattern: ?Text;
        notificationsSent: Bool;
        isPublic: Bool;
    };

    public type StreamMetrics = {
        peakViewers: Nat;
        averageViewers: Nat;
        totalViews: Nat;
        chatMessages: Nat;
        newFollowers: Nat;
        newSubscribers: Nat;
        donations: Nat;
        bitsReceived: Nat;
        raidsSent: Nat;
        raidsReceived: Nat;
        streamDuration: Nat;
        engagement: Float;
    };

    public type LiveStream = {
        id: Text;
        streamer: Principal;
        title: Text;
        description: Text;
        category: StreamCategory;
        tags: [Text];
        language: Text;
        status: StreamStatus;
        viewers: [Principal];
        chatMessages: [ChatMessage];
        moderators: [Moderator];
        subscriberOnlyMode: Bool;
        followerOnlyMode: Bool;
        slowModeInterval: Nat;
        emoteOnlyMode: Bool;
        maturityRating: Text;
        streamUrl: Text;
        thumbnailUrl: ?Text;
        streamKey: Text;
        quality: StreamQuality;
        bitrate: Nat;
        frameRate: Nat;
        alerts: [StreamAlert];
        donations: [Donation];
        raids: [Raid];
        hosts: [Host];
        schedule: ?StreamSchedule;
        metrics: StreamMetrics;
        isRecording: Bool;
        recordingUrl: ?Text;
        startTime: Int;
        endTime: ?Int;
        createdAt: Int;
        updatedAt: Int;
    };

    public type ChatSettings = {
        subscriberOnlyMode: Bool;
        followerOnlyMode: Bool;
        slowModeInterval: Nat;
        emoteOnlyMode: Bool;
        linksAllowed: Bool;
        capsAllowed: Bool;
        wordFilters: [Text];
        bannedWords: [Text];
        autoModeration: Bool;
        moderationLevel: Text;
    };

    public type StreamOverlay = {
        id: Text;
        streamer: Principal;
        name: Text;
        overlayType: Text;
        configuration: Text; // JSON string
        isActive: Bool;
        position: Text;
        size: Text;
        opacity: Float;
        createdAt: Int;
        updatedAt: Int;
    };

    public class LiveStreamManager() {
        // State
        private var streams = HashMap.HashMap<Text, LiveStream>(0, Text.equal, Text.hash);
        private var chatMessages = HashMap.HashMap<Text, ChatMessage>(0, Text.equal, Text.hash);
        private var moderators = HashMap.HashMap<Text, Moderator>(0, Text.equal, Text.hash);
        private var streamSchedules = HashMap.HashMap<Text, StreamSchedule>(0, Text.equal, Text.hash);
        private var streamOverlays = HashMap.HashMap<Text, StreamOverlay>(0, Text.equal, Text.hash);
        private var bannedUsers = HashMap.HashMap<Text, Int>(0, Text.equal, Text.hash);
        private var chatSettings = HashMap.HashMap<Principal, ChatSettings>(0, Principal.equal, Principal.hash);

        // Core Streaming Functions
        public func createStream(
            caller: Principal,
            title: Text,
            description: Text,
            category: StreamCategory,
            tags: [Text],
            maturityRating: Text,
            quality: StreamQuality
        ) : async Result.Result<Text, Text> {
            let streamId = "stream_" # Principal.toText(caller) # "_" # Int.toText(Time.now());
            let streamKey = generateStreamKey(caller);
            
            let stream : LiveStream = {
            id = streamId;
            streamer = caller;
            title = title;
            description = description;
            category = category;
            tags = tags;
            language = "en";
            status = #Offline;
            viewers = [];
            chatMessages = [];
            moderators = [];
            subscriberOnlyMode = false;
            followerOnlyMode = false;
            slowModeInterval = 0;
            emoteOnlyMode = false;
            maturityRating = maturityRating;
            streamUrl = "rtmp://streaming.icp-social.com/live/" # streamKey;
            thumbnailUrl = null;
            streamKey = streamKey;
            quality = quality;
            bitrate = 5000;
            frameRate = 30;
            alerts = [];
            donations = [];
            raids = [];
            hosts = [];
            schedule = null;
            metrics = {
                peakViewers = 0;
                averageViewers = 0;
                totalViews = 0;
                chatMessages = 0;
                newFollowers = 0;
                newSubscribers = 0;
                donations = 0;
                bitsReceived = 0;
                raidsSent = 0;
                raidsReceived = 0;
                streamDuration = 0;
                engagement = 0.0;
            };
            isRecording = false;
            recordingUrl = null;
            startTime = 0;
            endTime = null;
            createdAt = Time.now();
            updatedAt = Time.now();
            };
            
            streams.put(streamId, stream);
            #ok(streamId)
        };

        public func startStream(caller: Principal, streamId: Text) : async Result.Result<(), Text> {
        switch (streams.get(streamId)) {
            case (?stream) {
                if (stream.streamer != caller) {
                    return #err("Not authorized to start this stream");
                };
                
                let updatedStream = {
                    stream with
                    status = #Live;
                    startTime = Time.now();
                    updatedAt = Time.now();
                };
                streams.put(streamId, updatedStream);
                #ok()
            };
            case null { #err("Stream not found") };
        }
        };

        public func endStream(caller: Principal, streamId: Text) : async Result.Result<(), Text> {
        switch (streams.get(streamId)) {
            case (?stream) {
                if (stream.streamer != caller) {
                    return #err("Not authorized to end this stream");
                };
                
                let streamDurationInt = Time.now() - stream.startTime;
                let streamDuration = Int.abs(streamDurationInt);
                let updatedMetrics = {
                    stream.metrics with
                    streamDuration = streamDuration;
                };
                
                let updatedStream = {
                    stream with
                    status = #Ended;
                    endTime = ?Time.now();
                    metrics = updatedMetrics;
                    updatedAt = Time.now();
                };
                streams.put(streamId, updatedStream);
                #ok()
            };
            case null { #err("Stream not found") };
        }
        };

        public func sendChatMessage(caller: Principal, streamId: Text, message: Text, bits: Nat) : async Result.Result<Text, Text> {
        let messageId = "msg_" # Principal.toText(caller) # "_" # Int.toText(Time.now());
        
        switch (streams.get(streamId)) {
            case (?stream) {
                // Check if user is banned
                let banKey = Principal.toText(caller) # "_" # streamId;
                switch (bannedUsers.get(banKey)) {
                    case (?banEndTime) {
                        if (banEndTime > Time.now()) {
                            return #err("User is banned from chat");
                        };
                    };
                    case null { };
                };
                
                let chatMessage : ChatMessage = {
                    id = messageId;
                    user = caller;
                    username = "User"; // Should get from user canister
                    message = message;
                    timestamp = Time.now();
                    emotes = extractEmotes(message);
                    badges = getUserBadges(caller);
                    color = "#FFFFFF";
                    bits = bits;
                    isModerated = false;
                    isDeleted = false;
                    isHighlighted = bits > 0;
                    replyTo = null;
                };
                
                chatMessages.put(messageId, chatMessage);
                
                // Update stream metrics
                let updatedMetrics = {
                    stream.metrics with
                    chatMessages = stream.metrics.chatMessages + 1;
                    bitsReceived = stream.metrics.bitsReceived + bits;
                };
                
                let updatedStream = {
                    stream with
                    metrics = updatedMetrics;
                    updatedAt = Time.now();
                };
                streams.put(streamId, updatedStream);
                
                #ok(messageId)
            };
            case null { #err("Stream not found") };
        }
        };

        public func moderateChat(
        caller: Principal,
        streamId: Text,
        userId: Principal,
        action: ChatModerationAction,
        duration: ?Nat,
        _reason: ?Text
    ) : async Result.Result<(), Text> {
        switch (streams.get(streamId)) {
            case (?stream) {
                // Check if caller is streamer or moderator
                let isModerator = stream.streamer == caller or 
                    Array.find(stream.moderators, func (mod: Moderator) : Bool { mod.userId == caller and mod.isActive }) != null;
                
                if (not isModerator) {
                    return #err("Not authorized to moderate this chat");
                };
                
                switch (action) {
                    case (#Timeout) {
                        let banKey = Principal.toText(userId) # "_" # streamId;
                        let durationSeconds = switch (duration) { case (?d) d; case null 300; };
                        let durationInt : Int = durationSeconds;
                        let banEndTime = Time.now() + (durationInt * 1000000000);
                        bannedUsers.put(banKey, banEndTime);
                    };
                    case (#Ban) {
                        let banKey = Principal.toText(userId) # "_" # streamId;
                        bannedUsers.put(banKey, Time.now() + 365 * 24 * 60 * 60 * 1000000000); // 1 year
                    };
                    case (#Unban) {
                        let banKey = Principal.toText(userId) # "_" # streamId;
                        bannedUsers.delete(banKey);
                    };
                    case _ { };
                };
                
                #ok()
            };
            case null { #err("Stream not found") };
        }
        };

        public func addModerator(caller: Principal, streamId: Text, userId: Principal, permissions: [Text]) : async Result.Result<(), Text> {
        switch (streams.get(streamId)) {
            case (?stream) {
                if (stream.streamer != caller) {
                    return #err("Only the streamer can add moderators");
                };
                
                let moderator : Moderator = {
                    userId = userId;
                    permissions = permissions;
                    assignedBy = caller;
                    assignedAt = Time.now();
                    isActive = true;
                };
                
                let modKey = Principal.toText(userId) # "_" # streamId;
                moderators.put(modKey, moderator);
                #ok()
            };
            case null { #err("Stream not found") };
        }
        };

        public func sendDonation(caller: Principal, streamId: Text, amount: Nat, currency: Text, message: ?Text, isAnonymous: Bool) : async Result.Result<Text, Text> {
        let donationId = "donation_" # Principal.toText(caller) # "_" # Int.toText(Time.now());
        
        switch (streams.get(streamId)) {
            case (?stream) {
                let donation : Donation = {
                    id = donationId;
                    donor = caller;
                    amount = amount;
                    currency = currency;
                    message = message;
                    timestamp = Time.now();
                    isAnonymous = isAnonymous;
                    isRefunded = false;
                };
                
                // Update stream metrics
                let updatedMetrics = {
                    stream.metrics with
                    donations = stream.metrics.donations + amount;
                };
                
                let updatedDonations = Array.append(stream.donations, [donation]);
                let updatedStream = {
                    stream with
                    donations = updatedDonations;
                    metrics = updatedMetrics;
                    updatedAt = Time.now();
                };
                streams.put(streamId, updatedStream);
                
                #ok(donationId)
            };
            case null { #err("Stream not found") };
        }
        };

        public func raidStream(caller: Principal, fromStreamId: Text, toStreamId: Text, message: Text) : async Result.Result<(), Text> {
        switch (streams.get(fromStreamId)) {
            case (?fromStream) {
                if (fromStream.streamer != caller) {
                    return #err("Not authorized to raid from this stream");
                };
                
                switch (streams.get(toStreamId)) {
                    case (?toStream) {
                        let raidId = "raid_" # fromStreamId # "_" # toStreamId # "_" # Int.toText(Time.now());
                        let _raid : Raid = {
                            id = raidId;
                            fromStreamer = caller;
                            toStreamer = toStream.streamer;
                            viewerCount = Array.size(fromStream.viewers);
                            message = message;
                            timestamp = Time.now();
                            isAccepted = false;
                        };
                        
                        // Update metrics for both streams
                        let updatedFromMetrics = {
                            fromStream.metrics with
                            raidsSent = fromStream.metrics.raidsSent + 1;
                        };
                        
                        let updatedToMetrics = {
                            toStream.metrics with
                            raidsReceived = toStream.metrics.raidsReceived + 1;
                        };
                        
                        let updatedFromStream = {
                            fromStream with
                            metrics = updatedFromMetrics;
                            updatedAt = Time.now();
                        };
                        
                        let updatedToStream = {
                            toStream with
                            metrics = updatedToMetrics;
                            updatedAt = Time.now();
                        };
                        
                        streams.put(fromStreamId, updatedFromStream);
                        streams.put(toStreamId, updatedToStream);
                        
                        #ok()
                    };
                    case null { #err("Target stream not found") };
                }
            };
            case null { #err("Source stream not found") };
        }
        };

        public func scheduleStream(
        caller: Principal,
        title: Text,
        description: Text,
        category: StreamCategory,
        scheduledStart: Int,
        estimatedDuration: Nat,
        isRecurring: Bool,
        recurrencePattern: ?Text
    ) : async Result.Result<Text, Text> {
        let scheduleId = "schedule_" # Principal.toText(caller) # "_" # Int.toText(Time.now());
        
        let schedule : StreamSchedule = {
            id = scheduleId;
            streamer = caller;
            title = title;
            description = description;
            category = category;
            scheduledStart = scheduledStart;
            estimatedDuration = estimatedDuration;
            isRecurring = isRecurring;
            recurrencePattern = recurrencePattern;
            notificationsSent = false;
            isPublic = true;
        };
        
        streamSchedules.put(scheduleId, schedule);
        #ok(scheduleId)
        };

        public func updateChatSettings(caller: Principal, streamId: Text, settings: ChatSettings) : async Result.Result<(), Text> {
        switch (streams.get(streamId)) {
            case (?stream) {
                if (stream.streamer != caller) {
                    return #err("Not authorized to update chat settings");
                };
                
                chatSettings.put(caller, settings);
                #ok()
            };
            case null { #err("Stream not found") };
        }
        };

        public func createOverlay(
        caller: Principal,
        name: Text,
        overlayType: Text,
        configuration: Text,
        position: Text,
        size: Text,
        opacity: Float
    ) : async Result.Result<Text, Text> {
        let overlayId = "overlay_" # Principal.toText(caller) # "_" # Int.toText(Time.now());
        
        let overlay : StreamOverlay = {
            id = overlayId;
            streamer = caller;
            name = name;
            overlayType = overlayType;
            configuration = configuration;
            isActive = true;
            position = position;
            size = size;
            opacity = opacity;
            createdAt = Time.now();
            updatedAt = Time.now();
        };
        
        streamOverlays.put(overlayId, overlay);
        #ok(overlayId)
        };

        // Query Functions
        public func getStream(streamId: Text) : Result.Result<LiveStream, Text> {
        switch (streams.get(streamId)) {
            case (?stream) { #ok(stream) };
            case null { #err("Stream not found") };
        }
    };

    public func getLiveStreams(_category: ?StreamCategory, _language: ?Text, _limit: Nat) : [LiveStream] {
        // Get all streams and filter for live ones
        let allStreams = Iter.toArray(streams.vals());
        let liveStreams = Array.filter<LiveStream>(
            allStreams,
            func(stream: LiveStream) : Bool {
                stream.status == #Live
            }
        );
        
        // Apply limit
        if (liveStreams.size() <= _limit) {
            liveStreams
        } else {
            Array.take(liveStreams, _limit)
        }
    };

    public func getStreamsByUser(_userId: Principal, _limit: Nat) : [LiveStream] {
        // Get all streams by user
        let allStreams = Iter.toArray(streams.vals());
        let userStreams = Array.filter<LiveStream>(
            allStreams,
            func(stream: LiveStream) : Bool {
                stream.streamer == _userId
            }
        );
        
        // Apply limit
        if (userStreams.size() <= _limit) {
            userStreams
        } else {
            Array.take(userStreams, _limit)
        }
    };

    public func getStreamChat(_streamId: Text, _limit: Nat, _offset: Nat) : [ChatMessage] {
        // Return chat messages for stream
        []
    };

    public func getStreamSchedule(_userId: Principal) : [StreamSchedule] {
        // Return user's scheduled streams
        []
    };

    public func getStreamOverlays(_userId: Principal) : [StreamOverlay] {
        // Return user's stream overlays
        []
    };

    public func getStreamMetrics(streamId: Text) : Result.Result<StreamMetrics, Text> {
        switch (streams.get(streamId)) {
            case (?stream) { #ok(stream.metrics) };
            case null { #err("Stream not found") };
        }
    };

    // Helper Functions
    private func generateStreamKey(streamer: Principal) : Text {
        "sk_" # Principal.toText(streamer) # "_" # Int.toText(Time.now())
    };

    private func extractEmotes(_message: Text) : [Text] {
        // Extract emote codes from message
        []
    };

    private func getUserBadges(_userId: Principal) : [Text] {
        // Get user's badges from user canister
        []
    };

    // Admin Functions
    public func suspendStream(_streamId: Text, _reason: Text) : async Result.Result<(), Text> {
        // Admin function to suspend streams
        #ok()
    };

    public func featureStream(_streamId: Text) : async Result.Result<(), Text> {
        // Admin function to feature streams
        #ok()
    };
    
    }; // End of LiveStreamManager class
}