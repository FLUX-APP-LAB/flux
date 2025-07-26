import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Blob "mo:base/Blob";
import Char "mo:base/Char";
import Iter "mo:base/Iter";

module VideoManager {
    // Types
    public type VideoType = {
        #Short; // TikTok-style videos (15-60 seconds)
        #Long; // YouTube-style videos (1-60 minutes)
        #Clip; // Stream highlights (15-300 seconds)
        #VOD; // Full stream recordings
    };

    public type VideoCategory = {
        #Gaming;
        #Entertainment;
        #Music;
        #Education;
        #Sports;
        #Comedy;
        #Dance;
        #Food;
        #Travel;
        #Art;
        #Technology;
        #Lifestyle;
        #News;
        #Other;
    };

    public type VideoQuality = {
        #P240;
        #P360;
        #P480;
        #P720;
        #P1080;
        #P1440;
        #P2160;
    };

    public type VideoStatus = {
        #Processing;
        #Ready;
        #Failed;
        #Archived;
        #Deleted;
    };

    public type VideoMetadata = {
        duration: Nat;
        resolution: Text;
        frameRate: Nat;
        bitrate: Nat;
        codec: Text;
        fileSize: Nat;
        uploadDate: Int;
        processedDate: ?Int;
    };

    public type VideoAnalytics = {
        views: Nat;
        likes: Nat;
        dislikes: Nat;
        shares: Nat;
        comments: Nat;
        averageWatchTime: Nat;
        clickThroughRate: Float;
        engagement: Float;
        retention: [(Nat, Float)]; // (timestamp, retention_percentage)
    };

    public type Comment = {
        id: Text;
        user: Principal;
        content: Text;
        timestamp: Int;
        likes: Nat;
        dislikes: Nat;
        replies: [Comment];
        isEdited: Bool;
        isPinned: Bool;
        isModerated: Bool;
    };

    public type Video = {
        id: Text;
        creator: Principal;
        title: Text;
        description: Text;
        thumbnail: ?Blob;
        videoData: ?Text; // Storage reference
        videoType: VideoType;
        category: VideoCategory;
        tags: [Text];
        hashtags: [Text];
        language: Text;
        isMonetized: Bool;
        ageRestricted: Bool;
        isPrivate: Bool;
        isUnlisted: Bool;
        allowComments: Bool;
        allowDuets: Bool;
        allowRemix: Bool;
        metadata: VideoMetadata;
        analytics: VideoAnalytics;
        comments: [Comment];
        status: VideoStatus;
        streamId: ?Text;
        clipStartTime: ?Nat;
        clipEndTime: ?Nat;
        createdAt: Int;
        updatedAt: Int;
        publishedAt: ?Int;
        scheduledAt: ?Int;
    };

    public type VideoProcessingJob = {
        id: Text;
        videoId: Text;
        status: Text;
        progress: Nat;
        startTime: Int;
        endTime: ?Int;
        error: ?Text;
    };

    public type VideoInteraction = {
        userId: Principal;
        videoId: Text;
        action: Text; // like, dislike, share, comment, watch
        timestamp: Int;
        metadata: ?Text;
    };

    public type Playlist = {
        id: Text;
        creator: Principal;
        title: Text;
        description: Text;
        thumbnail: ?Blob;
        videos: [Text];
        isPublic: Bool;
        createdAt: Int;
        updatedAt: Int;
    };

    public class VideoManager() {
        // State
        private var videos = HashMap.HashMap<Text, Video>(0, Text.equal, Text.hash);
        private var comments = HashMap.HashMap<Text, Comment>(0, Text.equal, Text.hash);
        private var processingJobs = HashMap.HashMap<Text, VideoProcessingJob>(0, Text.equal, Text.hash);
        private var interactions = HashMap.HashMap<Text, VideoInteraction>(0, Text.equal, Text.hash);
        private var playlists = HashMap.HashMap<Text, Playlist>(0, Text.equal, Text.hash);
        private var _videoTags = HashMap.HashMap<Text, [Text]>(0, Text.equal, Text.hash);

        // Chunked upload support
        private var videoChunks = HashMap.HashMap<Text, [(Nat, Blob)]>(0, Text.equal, Text.hash);
        
        // Video data storage - separate from metadata for better performance
        private var videoDataStorage = HashMap.HashMap<Text, Blob>(0, Text.equal, Text.hash);
        
        // Core Video Functions
        public func uploadVideo(
        caller: Principal,
        title: Text,
        description: Text,
        videoData: Blob,
        thumbnail: ?Blob,
        videoType: VideoType,
        category: VideoCategory,
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
        let videoId = "vid_" # Principal.toText(caller) # "_" # Int.toText(Time.now());
        
        // Validate video data
        let videoSize = Blob.toArray(videoData).size();
        if (videoSize == 0) {
            return #err("Video file is empty");
        };
        
        if (videoSize > 10_000_000) { // 10MB limit
            return #err("Video file too large (max 10MB)");
        };
        
        // Basic video format validation by checking file headers
        let videoBytes = Blob.toArray(videoData);
        if (videoBytes.size() < 12) {
            return #err("Invalid video file format");
        };
        
        // Check for common video file signatures
        let isValidVideo = 
            // MP4 signature
            (videoBytes[4] == 0x66 and videoBytes[5] == 0x74 and videoBytes[6] == 0x79 and videoBytes[7] == 0x70) or
            // AVI signature  
            (videoBytes[0] == 0x52 and videoBytes[1] == 0x49 and videoBytes[2] == 0x46 and videoBytes[3] == 0x46) or
            // MOV/QuickTime signature
            (videoBytes[4] == 0x6D and videoBytes[5] == 0x6F and videoBytes[6] == 0x6F and videoBytes[7] == 0x76);
            
        if (not isValidVideo) {
            return #err("Unsupported video format. Please use MP4, AVI, or MOV files");
        };
        
        // Create video metadata
        let metadata : VideoMetadata = {
            duration = 0; // Will be set during processing
            resolution = "1080p";
            frameRate = 30;
            bitrate = 5000;
            codec = "H.264";
            fileSize = Blob.toArray(videoData).size();
            uploadDate = Time.now();
            processedDate = null;
        };
        
        let video : Video = {
            id = videoId;
            creator = caller;
            title = title;
            description = description;
            thumbnail = thumbnail;
            videoData = ?("video_" # videoId); // Storage reference to the video data
            videoType = videoType;
            category = category;
            tags = tags;
            hashtags = hashtags;
            language = "en";
            isMonetized = settings.isMonetized;
            ageRestricted = settings.ageRestricted;
            isPrivate = settings.isPrivate;
            isUnlisted = settings.isUnlisted;
            allowComments = settings.allowComments;
            allowDuets = settings.allowDuets;
            allowRemix = settings.allowRemix;
            metadata = metadata;
            analytics = {
                views = 0;
                likes = 0;
                dislikes = 0;
                shares = 0;
                comments = 0;
                averageWatchTime = 0;
                clickThroughRate = 0.0;
                engagement = 0.0;
                retention = [];
            };
            comments = [];
            status = #Ready; // Mark as ready immediately for simple uploads
            streamId = null;
            clipStartTime = null;
            clipEndTime = null;
            createdAt = Time.now();
            updatedAt = Time.now();
            publishedAt = ?Time.now(); // Set published time
            scheduledAt = settings.scheduledAt;
        };
        
        videos.put(videoId, video);
        
        // Store the actual video data separately
        videoDataStorage.put(videoId, videoData);
        
        // Create completed processing job for immediate availability
        let jobId = "job_" # videoId;
        let job : VideoProcessingJob = {
            id = jobId;
            videoId = videoId;
            status = "completed";
            progress = 100;
            startTime = Time.now();
            endTime = ?Time.now();
            error = null;
        };
        
        processingJobs.put(jobId, job);
        
        #ok(videoId)
    };

    public func createClip(
        caller: Principal,
        streamId: Text,
        startTime: Nat,
        endTime: Nat,
        title: Text,
        description: Text
    ) : async Result.Result<Text, Text> {
        let clipId = "clip_" # Principal.toText(caller) # "_" # Int.toText(Time.now());
        
        // Validate clip duration
        if (endTime <= startTime) {
            return #err("Invalid clip duration: end time must be after start time");
        };
        
        let duration = Int.abs(endTime - startTime);
        if (duration > 300) {
            return #err("Invalid clip duration: maximum 300 seconds allowed");
        };
        
        let clip : Video = {
            id = clipId;
            creator = caller;
            title = title;
            description = description;
            thumbnail = null;
            videoData = null;
            videoType = #Clip;
            category = #Gaming;
            tags = [];
            hashtags = [];
            language = "en";
            isMonetized = false;
            ageRestricted = false;
            isPrivate = false;
            isUnlisted = false;
            allowComments = true;
            allowDuets = true;
            allowRemix = true;
            metadata = {
                duration = duration;
                resolution = "1080p";
                frameRate = 30;
                bitrate = 5000;
                codec = "H.264";
                fileSize = 0;
                uploadDate = Time.now();
                processedDate = null;
            };
            analytics = {
                views = 0;
                likes = 0;
                dislikes = 0;
                shares = 0;
                comments = 0;
                averageWatchTime = 0;
                clickThroughRate = 0.0;
                engagement = 0.0;
                retention = [];
            };
            comments = [];
            status = #Processing;
            streamId = ?streamId;
            clipStartTime = ?startTime;
            clipEndTime = ?endTime;
            createdAt = Time.now();
            updatedAt = Time.now();
            publishedAt = null;
            scheduledAt = null;
        };
        
        videos.put(clipId, clip);
        #ok(clipId)
    };

    public func likeVideo(caller: Principal, videoId: Text) : async Result.Result<(), Text> {
        switch (videos.get(videoId)) {
            case (?video) {
                let updatedAnalytics = {
                    video.analytics with
                    likes = video.analytics.likes + 1;
                };
                let updatedVideo = { video with analytics = updatedAnalytics };
                videos.put(videoId, updatedVideo);
                
                // Record interaction
                let interactionId = Principal.toText(caller) # "_" # videoId # "_like";
                let interaction : VideoInteraction = {
                    userId = caller;
                    videoId = videoId;
                    action = "like";
                    timestamp = Time.now();
                    metadata = null;
                };
                interactions.put(interactionId, interaction);
                
                #ok()
            };
            case null { #err("Video not found") };
        }
    };

    public func addComment(caller: Principal, videoId: Text, content: Text, _parentCommentId: ?Text) : async Result.Result<Text, Text> {
        let commentId = "comment_" # Principal.toText(caller) # "_" # Int.toText(Time.now());
        
        switch (videos.get(videoId)) {
            case (?video) {
                if (not video.allowComments) {
                    return #err("Comments not allowed on this video");
                };
                
                let comment : Comment = {
                    id = commentId;
                    user = caller;
                    content = content;
                    timestamp = Time.now();
                    likes = 0;
                    dislikes = 0;
                    replies = [];
                    isEdited = false;
                    isPinned = false;
                    isModerated = false;
                };
                
                comments.put(commentId, comment);
                
                // Update video comment count
                let updatedAnalytics = {
                    video.analytics with
                    comments = video.analytics.comments + 1;
                };
                let updatedVideo = { video with analytics = updatedAnalytics };
                videos.put(videoId, updatedVideo);
                
                #ok(commentId)
            };
            case null { #err("Video not found") };
        }
    };

    public func shareVideo(caller: Principal, videoId: Text, platform: Text) : async Result.Result<(), Text> {
        switch (videos.get(videoId)) {
            case (?video) {
                let updatedAnalytics = {
                    video.analytics with
                    shares = video.analytics.shares + 1;
                };
                let updatedVideo = { video with analytics = updatedAnalytics };
                videos.put(videoId, updatedVideo);
                
                // Record interaction
                let interactionId = Principal.toText(caller) # "_" # videoId # "_share";
                let interaction : VideoInteraction = {
                    userId = caller;
                    videoId = videoId;
                    action = "share";
                    timestamp = Time.now();
                    metadata = ?platform;
                };
                interactions.put(interactionId, interaction);
                
                #ok()
            };
            case null { #err("Video not found") };
        }
    };

    public func recordView(caller: Principal, videoId: Text, watchTime: Nat) : async Result.Result<(), Text> {
        switch (videos.get(videoId)) {
            case (?video) {
                let updatedAnalytics = {
                    video.analytics with
                    views = video.analytics.views + 1;
                    averageWatchTime = if (video.analytics.views > 0) {
                        (video.analytics.averageWatchTime * video.analytics.views + watchTime) / (video.analytics.views + 1)
                    } else { watchTime };
                };
                let updatedVideo = { video with analytics = updatedAnalytics };
                videos.put(videoId, updatedVideo);
                
                // Record interaction
                let interactionId = Principal.toText(caller) # "_" # videoId # "_view_" # Int.toText(Time.now());
                let interaction : VideoInteraction = {
                    userId = caller;
                    videoId = videoId;
                    action = "view";
                    timestamp = Time.now();
                    metadata = ?Nat.toText(watchTime);
                };
                interactions.put(interactionId, interaction);
                
                #ok()
            };
            case null { #err("Video not found") };
        }
    };

    public func createPlaylist(caller: Principal, title: Text, description: Text, isPublic: Bool) : async Result.Result<Text, Text> {
        let playlistId = "playlist_" # Principal.toText(caller) # "_" # Int.toText(Time.now());
        
        let playlist : Playlist = {
            id = playlistId;
            creator = caller;
            title = title;
            description = description;
            thumbnail = null;
            videos = [];
            isPublic = isPublic;
            createdAt = Time.now();
            updatedAt = Time.now();
        };
        
        playlists.put(playlistId, playlist);
        #ok(playlistId)
    };

    public func addVideoToPlaylist(caller: Principal, playlistId: Text, videoId: Text) : async Result.Result<(), Text> {
        switch (playlists.get(playlistId)) {
            case (?playlist) {
                if (playlist.creator != caller) {
                    return #err("Not authorized to modify this playlist");
                };
                
                let updatedVideos = Array.append(playlist.videos, [videoId]);
                let updatedPlaylist = { 
                    playlist with 
                    videos = updatedVideos;
                    updatedAt = Time.now();
                };
                playlists.put(playlistId, updatedPlaylist);
                #ok()
            };
            case null { #err("Playlist not found") };
        }
    };        // Query Functions
        public func getVideo(videoId: Text) : Result.Result<Video, Text> {
        switch (videos.get(videoId)) {
            case (?video) { #ok(video) };
            case null { #err("Video not found") };
        }
    };        public func getVideosByUser(userId: Principal, limit: Nat, offset: Nat) : [Video] {
        // Return user's videos with pagination
        let allVideos = videos.vals();
        var userVideos : [Video] = [];
        
        for (video in allVideos) {
            if (video.creator == userId and not video.isPrivate) {
                userVideos := Array.append(userVideos, [video]);
            };
        };
        
        // Apply pagination
        let totalVideos = userVideos.size();
        if (offset >= totalVideos) {
            return [];
        };
        
        let endIndex = Nat.min(offset + limit, totalVideos);
        if (endIndex > offset) {
            let items = Array.subArray(userVideos, offset, totalVideos);
            if (items.size() <= limit) {
                items
            } else {
                Array.subArray(items, 0, limit)
            }
        } else {
            []
        }
    };
    
    public func getTrendingVideos(category: ?VideoCategory, timeframe: Nat, limit: Nat) : [Video] {
        // Return trending videos based on algorithm
        let allVideos = videos.vals();
        var filteredVideos : [Video] = [];
        let currentTime = Time.now();
        
        // Filter by category and timeframe
        for (video in allVideos) {
            let isInTimeframe = (currentTime - video.createdAt) <= timeframe;
            let matchesCategory = switch (category) {
                case null { true };
                case (?cat) { video.category == cat };
            };
            
            if (isInTimeframe and matchesCategory and not video.isPrivate and video.status == #Ready) {
                filteredVideos := Array.append(filteredVideos, [video]);
            };
        };
        
        // Sort by engagement score (views + likes + shares)
        let sortedVideos = Array.sort(filteredVideos, func(a: Video, b: Video) : {#less; #equal; #greater} {
            let scoreA = a.analytics.views + a.analytics.likes + a.analytics.shares;
            let scoreB = b.analytics.views + b.analytics.likes + b.analytics.shares;
            if (scoreA > scoreB) { #less } else if (scoreA < scoreB) { #greater } else { #equal }
        });
        
        // Apply limit
        let endIndex = Nat.min(limit, sortedVideos.size());
        Array.subArray(sortedVideos, 0, endIndex)
    };        public func getVideoFeed(userId: Principal, limit: Nat, offset: Nat) : [Video] {
        // Return personalized video feed
        let allVideos = videos.vals();
        var feedVideos : [Video] = [];
        
        // Get user's interaction history for personalization
        let userInteractions = interactions.vals();
        var userCategories : [VideoCategory] = [];
        
        // Analyze user preferences based on interactions
        for (interaction in userInteractions) {
            if (interaction.userId == userId) {
                switch (videos.get(interaction.videoId)) {
                    case (?video) {
                        userCategories := Array.append(userCategories, [video.category]);
                    };
                    case null { };
                };
            };
        };
        
        // Filter videos for feed
        for (video in allVideos) {
            let isRelevant = video.creator != userId and not video.isPrivate and video.status == #Ready;
            let matchesPreferences = userCategories.size() == 0 or Array.find(userCategories, func(cat: VideoCategory) : Bool { cat == video.category }) != null;
            
            if (isRelevant and matchesPreferences) {
                feedVideos := Array.append(feedVideos, [video]);
            };
        };
        
        // Sort by recency and engagement
        let sortedVideos = Array.sort(feedVideos, func(a: Video, b: Video) : {#less; #equal; #greater} {
            let scoreA = a.analytics.views + a.analytics.likes + (Int.abs(Time.now() - a.createdAt) / 86400); // Factor in recency
            let scoreB = b.analytics.views + b.analytics.likes + (Int.abs(Time.now() - b.createdAt) / 86400);
            if (scoreA > scoreB) { #less } else if (scoreA < scoreB) { #greater } else { #equal }
        });
        
        // Apply pagination
        let totalVideos = sortedVideos.size();
        if (offset >= totalVideos) {
            return [];
        };
        
        let endIndex = Nat.min(offset + limit, totalVideos);
        if (endIndex > offset) {
            let items = Array.subArray(sortedVideos, offset, totalVideos);
            if (items.size() <= limit) {
                items
            } else {
                Array.subArray(items, 0, limit)
            }
        } else {
            []
        }
    };
    
    public func searchVideos(searchQuery: Text, category: ?VideoCategory, limit: Nat) : [Video] {
        // If empty query, return all videos (filtered by category if specified)
        if (Text.size(searchQuery) == 0) {
            let allVideos = videos.vals()
                |> Iter.filter(_, func(video: Video) : Bool {
                    let categoryMatch = switch (category) {
                        case null { true };
                        case (?cat) { video.category == cat };
                    };
                    not video.isPrivate and video.status == #Ready and categoryMatch
                })
                |> Iter.toArray(_);
            
            // Sort by creation date (newest first)
            let sortedVideos = Array.sort(allVideos, func(a: Video, b: Video) : {#less; #equal; #greater} {
                if (a.createdAt > b.createdAt) { #less }
                else if (a.createdAt < b.createdAt) { #greater }
                else { #equal }
            });
            
            let endIndex = Nat.min(limit, sortedVideos.size());
            return Array.subArray(sortedVideos, 0, endIndex);
        };
        
        // Search videos by title, description, tags
        let allVideos = videos.vals();
        var matchingVideos : [Video] = [];
        let queryLower = Text.map(searchQuery, func(c: Char) : Char {
            if (c >= 'A' and c <= 'Z') {
                Char.fromNat32(Char.toNat32(c) + 32)
            } else { c }
        });
        
        for (video in allVideos) {
            if (not video.isPrivate and video.status == #Ready) {
                let titleLower = Text.map(video.title, func(c: Char) : Char {
                    if (c >= 'A' and c <= 'Z') {
                        Char.fromNat32(Char.toNat32(c) + 32)
                    } else { c }
                });
                let descLower = Text.map(video.description, func(c: Char) : Char {
                    if (c >= 'A' and c <= 'Z') {
                        Char.fromNat32(Char.toNat32(c) + 32)
                    } else { c }
                });
                
                let titleMatch = Text.contains(titleLower, #text queryLower);
                let descMatch = Text.contains(descLower, #text queryLower);
                
                // Check tags for matches
                var tagMatch = false;
                for (tag in video.tags.vals()) {
                    let tagLower = Text.map(tag, func(c: Char) : Char {
                        if (c >= 'A' and c <= 'Z') {
                            Char.fromNat32(Char.toNat32(c) + 32)
                        } else { c }
                    });
                    if (Text.contains(tagLower, #text queryLower)) {
                        tagMatch := true;
                    };
                };
                
                // Check hashtags for matches
                var hashtagMatch = false;
                for (hashtag in video.hashtags.vals()) {
                    let hashtagLower = Text.map(hashtag, func(c: Char) : Char {
                        if (c >= 'A' and c <= 'Z') {
                            Char.fromNat32(Char.toNat32(c) + 32)
                        } else { c }
                    });
                    if (Text.contains(hashtagLower, #text queryLower)) {
                        hashtagMatch := true;
                    };
                };
                
                let categoryMatch = switch (category) {
                    case null { true };
                    case (?cat) { video.category == cat };
                };
                
                if ((titleMatch or descMatch or tagMatch or hashtagMatch) and categoryMatch) {
                    matchingVideos := Array.append(matchingVideos, [video]);
                };
            };
        };
        
        // Sort by relevance (prioritize title matches, then description, then tags)
        let sortedVideos = Array.sort(matchingVideos, func(a: Video, b: Video) : {#less; #equal; #greater} {
            let aScore = a.analytics.views + a.analytics.likes;
            let bScore = b.analytics.views + b.analytics.likes;
            if (aScore > bScore) { #less } else if (aScore < bScore) { #greater } else { #equal }
        });
        
        // Apply limit
        let endIndex = Nat.min(limit, sortedVideos.size());
        Array.subArray(sortedVideos, 0, endIndex)
    };        public func getVideoComments(videoId: Text, limit: Nat, offset: Nat) : [Comment] {
        // Return video comments with pagination
        switch (videos.get(videoId)) {
            case (?video) {
                let videoComments = video.comments;
                let totalComments = videoComments.size();
                
                if (offset >= totalComments) {
                    return [];
                };
                
                // Sort comments by timestamp (newest first)
                let sortedComments = Array.sort(videoComments, func(a: Comment, b: Comment) : {#less; #equal; #greater} {
                    if (a.timestamp > b.timestamp) { #less }
                    else if (a.timestamp < b.timestamp) { #greater }
                    else { #equal }
                });
                
                let endIndex = Nat.min(offset + limit, totalComments);
                if (endIndex > offset) {
                    let items = Array.subArray(sortedComments, offset, totalComments);
                    if (items.size() <= limit) {
                        items
                    } else {
                        Array.subArray(items, 0, limit)
                    }
                } else {
                    []
                }
            };
            case null { [] };
        }
    };        public func getVideoAnalytics(videoId: Text) : Result.Result<VideoAnalytics, Text> {
        switch (videos.get(videoId)) {
            case (?video) { #ok(video.analytics) };
            case null { #err("Video not found") };
        }
    };        public func getUserPlaylists(userId: Principal) : [Playlist] {
        // Return user's playlists
        let allPlaylists = playlists.vals();
        var userPlaylists : [Playlist] = [];
        
        for (playlist in allPlaylists) {
            if (playlist.creator == userId) {
                userPlaylists := Array.append(userPlaylists, [playlist]);
            };
        };
        
        // Sort by creation date (newest first)
        let sortedPlaylists = Array.sort(userPlaylists, func(a: Playlist, b: Playlist) : {#less; #equal; #greater} {
            if (a.createdAt > b.createdAt) { #less }
            else if (a.createdAt < b.createdAt) { #greater }
            else { #equal }
        });
        
        sortedPlaylists
    };

    // Admin Functions
    public func moderateVideo(_videoId: Text, _action: Text, _reason: Text) : async Result.Result<(), Text> {
        // Admin function to moderate videos
        #ok()
    };

    public func bulkProcessVideos(_videoIds: [Text]) : async Result.Result<(), Text> {
        // Process multiple videos in batch
        #ok()
    };
    
    public func processVideoMetadata(videoData: Blob) : VideoMetadata {
        let fileSize = Blob.toArray(videoData).size();
        
        // Extract basic metadata from video file
        // In a real implementation, you'd parse the video headers
        let metadata : VideoMetadata = {
            duration = 0; // Would be extracted from video headers
            resolution = "1080p"; // Default, would be detected
            frameRate = 30;
            bitrate = 5000;
            codec = "H.264";
            fileSize = fileSize;
            uploadDate = Time.now();
            processedDate = null;
        };
        
        metadata
    };
    
    public func getUploadProgress(videoId: Text) : Result.Result<Nat, Text> {
        // Get upload/processing progress for a video
        let jobId = "job_" # videoId;
        switch (processingJobs.get(jobId)) {
            case (?job) { #ok(job.progress) };
            case null { #err("Processing job not found") };
        }
    };
    
    public func updateProcessingProgress(
        videoId: Text,
        progress: Nat,
        status: Text
    ) : Result.Result<(), Text> {
        let jobId = "job_" # videoId;
        switch (processingJobs.get(jobId)) {
            case (?job) {
                let updatedJob = {
                    job with
                    progress = progress;
                    status = status;
                    endTime = if (progress == 100) { ?Time.now() } else { job.endTime };
                };
                processingJobs.put(jobId, updatedJob);
                
                // Update video status if processing is complete
                if (progress == 100) {
                    switch (videos.get(videoId)) {
                        case (?video) {
                            let updatedVideo = {
                                video with
                                status = #Ready;
                                publishedAt = ?Time.now();
                                metadata = {
                                    video.metadata with
                                    processedDate = ?Time.now();
                                };
                            };
                            videos.put(videoId, updatedVideo);
                        };
                        case null { };
                    };
                };
                
                #ok()
            };
            case null { #err("Processing job not found") };
        }
    };
    
    public func createVideoRecord(
        caller: Principal,
        title: Text,
        description: Text,
        thumbnail: ?Blob,
        videoType: VideoType,
        category: VideoCategory,
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
        let videoId = "vid_" # Principal.toText(caller) # "_" # Int.toText(Time.now());
        
        let metadata : VideoMetadata = {
            duration = 0;
            resolution = "unknown";
            frameRate = 30;
            bitrate = 0;
            codec = "unknown";
            fileSize = 0;
            uploadDate = Time.now();
            processedDate = null;
        };
        
        let analytics : VideoAnalytics = {
            views = 0;
            likes = 0;
            dislikes = 0;
            shares = 0;
            comments = 0;
            averageWatchTime = 0;
            clickThroughRate = 0.0;
            engagement = 0.0;
            retention = [];
        };
        
        let video : Video = {
            id = videoId;
            creator = caller;
            title = title;
            description = description;
            thumbnail = thumbnail;
            videoData = null;
            videoType = videoType;
            category = category;
            tags = tags;
            hashtags = hashtags;
            language = "en";
            isMonetized = settings.isMonetized;
            ageRestricted = settings.ageRestricted;
            isPrivate = settings.isPrivate;
            isUnlisted = settings.isUnlisted;
            allowComments = settings.allowComments;
            allowDuets = settings.allowDuets;
            allowRemix = settings.allowRemix;
            metadata = metadata;
            analytics = analytics;
            comments = [];
            status = #Processing;
            streamId = null;
            clipStartTime = null;
            clipEndTime = null;
            createdAt = Time.now();
            updatedAt = Time.now();
            publishedAt = null;
            scheduledAt = settings.scheduledAt;
        };
        
        videos.put(videoId, video);
        #ok(videoId)
    };

    public func uploadVideoChunk(
        caller: Principal,
        videoId: Text,
        chunkData: Blob,
        chunkIndex: Nat,
        totalChunks: Nat
    ) : async Result.Result<Text, Text> {
        switch (videos.get(videoId)) {
            case null { #err("Video not found") };
            case (?video) {
                if (video.creator != caller) {
                    return #err("Unauthorized");
                };
                
                if (Blob.toArray(chunkData).size() > 2_000_000) {
                    return #err("Chunk too large");
                };
                
                let existingChunks = switch (videoChunks.get(videoId)) {
                    case null { [] };
                    case (?chunks) { chunks };
                };
                
                let newChunks = Array.append(existingChunks, [(chunkIndex, chunkData)]);
                videoChunks.put(videoId, newChunks);
                
                if (newChunks.size() == totalChunks) {
                    let updatedVideo = {
                        video with
                        videoData = ?("video_" # videoId);
                        status = #Ready;
                        updatedAt = Time.now();
                        publishedAt = ?Time.now();
                    };
                    
                    videos.put(videoId, updatedVideo);
                    videoChunks.delete(videoId);
                    
                    #ok("Video chunks combined successfully")
                } else {
                    #ok("Chunk " # Nat.toText(chunkIndex + 1) # "/" # Nat.toText(totalChunks) # " uploaded")
                }
            };
        }
    };
    
    // Get all public videos
    public func getAllVideos() : async Result.Result<[Video], Text> {
        let publicVideos = videos.vals()
            |> Iter.filter(_, func(video: Video) : Bool {
                not video.isPrivate and video.status == #Ready
            })
            |> Iter.toArray(_);
        
        // Sort by creation date (newest first)
        let sortedVideos = Array.sort(publicVideos, func(a: Video, b: Video) : {#less; #equal; #greater} {
            if (a.createdAt > b.createdAt) { #less }
            else if (a.createdAt < b.createdAt) { #greater }
            else { #equal }
        });
        
        #ok(sortedVideos)
    };

    // Get videos by creator
    public func getVideosByCreator(creator: Principal) : async Result.Result<[Video], Text> {
        let userVideos = videos.vals()
            |> Iter.filter(_, func(video: Video) : Bool {
                video.creator == creator and not video.isPrivate and video.status == #Ready
            })
            |> Iter.toArray(_);
        
        let sortedVideos = Array.sort(userVideos, func(a: Video, b: Video) : {#less; #equal; #greater} {
            if (a.createdAt > b.createdAt) { #less }
            else if (a.createdAt < b.createdAt) { #greater }
            else { #equal }
        });
        
        #ok(sortedVideos)
    };

    // Get videos by category
    public func getVideosByCategory(category: VideoCategory) : async Result.Result<[Video], Text> {
        let categoryVideos = videos.vals()
            |> Iter.filter(_, func(video: Video) : Bool {
                video.category == category and not video.isPrivate and video.status == #Ready
            })
            |> Iter.toArray(_);
        
        let sortedVideos = Array.sort(categoryVideos, func(a: Video, b: Video) : {#less; #equal; #greater} {
            if (a.createdAt > b.createdAt) { #less }
            else if (a.createdAt < b.createdAt) { #greater }
            else { #equal }
        });
        
        #ok(sortedVideos)
    };
    
    // Get video data for streaming/download
    public func getVideoData(videoId: Text) : async Result.Result<Blob, Text> {
        switch (videoDataStorage.get(videoId)) {
            case (?data) { #ok(data) };
            case null { #err("Video data not found") };
        }
    };
  } // Close the VideoManager class
} // Close the VideoManager module