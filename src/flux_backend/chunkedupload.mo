import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Int "mo:base/Int";
import Blob "mo:base/Blob";
import Buffer "mo:base/Buffer";
import Iter "mo:base/Iter";
import Float "mo:base/Float";

module ChunkedUploadManager {
    
    // Types for chunked upload
    public type ChunkInfo = {
        chunkIndex: Nat;
        totalChunks: Nat;
        chunkSize: Nat;
        data: Blob;
        checksum: Text; // MD5 or SHA256 hash for integrity
    };
    
    public type UploadSession = {
        sessionId: Text;
        userId: Principal;
        fileName: Text;
        totalSize: Nat;
        totalChunks: Nat;
        uploadedChunks: [Bool]; // Track which chunks are uploaded
        chunks: HashMap.HashMap<Nat, Blob>; // Store chunks temporarily
        createdAt: Int;
        lastActivity: Int;
        metadata: {
            contentType: Text;
            expectedChecksum: ?Text;
        };
    };
    
    public type StreamChunk = {
        data: Blob;
        chunkIndex: Nat;
        totalChunks: Nat;
        isLast: Bool;
    };
    
    public class ChunkedUploadService() {
        
        // Storage for upload sessions (temporary storage)
        private var uploadSessions = HashMap.HashMap<Text, UploadSession>(0, Text.equal, Text.hash);
        
        // Final assembled video storage
        private var videoStorage = HashMap.HashMap<Text, Blob>(0, Text.equal, Text.hash);
        
        // Chunk cache for streaming
        private var streamingCache = HashMap.HashMap<Text, [Blob]>(0, Text.equal, Text.hash);
        
        // Constants
        private let MAX_CHUNK_SIZE: Nat = 1048576; // 1MB chunks (1024 * 1024)
        private let SESSION_TIMEOUT: Int = 3600_000_000_000; // 1 hour in nanoseconds
        private let MAX_SESSIONS_PER_USER: Nat = 5;
        
        // Initialize upload session
        public func initializeUpload(
            caller: Principal,
            fileName: Text,
            totalSize: Nat,
            contentType: Text,
            expectedChecksum: ?Text
        ) : Result.Result<Text, Text> {
            
            // Validate file size (100MB max)
            if (totalSize > 100_000_000) {
                return #err("File too large. Maximum size is 100MB");
            };
            
            // Clean up old sessions for this user
            cleanupUserSessions(caller);
            
            // Check user session limit
            let userSessions = getUserActiveSessions(caller);
            if (userSessions.size() >= MAX_SESSIONS_PER_USER) {
                return #err("Too many active upload sessions. Please complete or cancel existing uploads.");
            };
            
            // Calculate chunks needed
            let totalChunks = if (MAX_CHUNK_SIZE > 0 and totalSize > 0) {
                Int.abs((totalSize + MAX_CHUNK_SIZE - 1) / MAX_CHUNK_SIZE)
            } else {
                1
            };
            let sessionId = generateSessionId(caller, fileName);
            
            // Initialize chunk tracking
            let uploadedChunks = Array.tabulate<Bool>(totalChunks, func(i) = false);
            let chunks = HashMap.HashMap<Nat, Blob>(0, Nat.equal, Nat32.fromNat);
            
            let session: UploadSession = {
                sessionId = sessionId;
                userId = caller;
                fileName = fileName;
                totalSize = totalSize;
                totalChunks = totalChunks;
                uploadedChunks = uploadedChunks;
                chunks = chunks;
                createdAt = Time.now();
                lastActivity = Time.now();
                metadata = {
                    contentType = contentType;
                    expectedChecksum = expectedChecksum;
                };
            };
            
            uploadSessions.put(sessionId, session);
            
            #ok(sessionId)
        };
        
        // Upload individual chunk
        public func uploadChunk(
            caller: Principal,
            sessionId: Text,
            chunkInfo: ChunkInfo
        ) : Result.Result<{uploaded: Nat; total: Nat}, Text> {
            
            switch (uploadSessions.get(sessionId)) {
                case (?session) {
                    // Verify ownership
                    if (session.userId != caller) {
                        return #err("Unauthorized access to upload session");
                    };
                    
                    // Validate chunk
                    if (chunkInfo.chunkIndex >= session.totalChunks) {
                        return #err("Invalid chunk index");
                    };
                    
                    if (chunkInfo.totalChunks != session.totalChunks) {
                        return #err("Chunk count mismatch");
                    };
                    
                    // Validate chunk size
                    let expectedSize = if (session.totalChunks > 0 and chunkInfo.chunkIndex + 1 == session.totalChunks) {
                        // Last chunk might be smaller
                        if (session.totalSize <= MAX_CHUNK_SIZE) {
                            session.totalSize
                        } else {
                            let remainder = if (MAX_CHUNK_SIZE > 0) {
                                session.totalSize % MAX_CHUNK_SIZE
                            } else {
                                0
                            };
                            if (remainder == 0) { MAX_CHUNK_SIZE } else { remainder }
                        }
                    } else {
                        MAX_CHUNK_SIZE
                    };
                    
                    if (chunkInfo.chunkSize != expectedSize) {
                        return #err("Invalid chunk size. Expected: " # Nat.toText(expectedSize) # ", got: " # Nat.toText(chunkInfo.chunkSize));
                    };
                    
                    // Store chunk
                    session.chunks.put(chunkInfo.chunkIndex, chunkInfo.data);
                    
                    // Update tracking
                    let updatedChunks = Array.tabulate<Bool>(session.totalChunks, func(i) {
                        if (i == chunkInfo.chunkIndex) { true }
                        else { session.uploadedChunks[i] }
                    });
                    
                    let updatedSession = {
                        session with
                        uploadedChunks = updatedChunks;
                        lastActivity = Time.now();
                    };
                    
                    uploadSessions.put(sessionId, updatedSession);
                    
                    // Count uploaded chunks
                    let uploadedCount = Array.foldLeft<Bool, Nat>(updatedChunks, 0, func(acc, uploaded) {
                        if (uploaded) { acc + 1 } else { acc }
                    });
                    
                    #ok({uploaded = uploadedCount; total = session.totalChunks})
                };
                case null {
                    #err("Upload session not found")
                };
            }
        };
        
        // Finalize upload - assemble chunks into final video
        public func finalizeUpload(
            caller: Principal,
            sessionId: Text
        ) : Result.Result<Text, Text> {
            
            switch (uploadSessions.get(sessionId)) {
                case (?session) {
                    // Verify ownership
                    if (session.userId != caller) {
                        return #err("Unauthorized access to upload session");
                    };
                    
                    // Check if all chunks are uploaded
                    let allUploaded = Array.foldLeft<Bool, Bool>(session.uploadedChunks, true, func(acc, uploaded) {
                        acc and uploaded
                    });
                    
                    if (not allUploaded) {
                        return #err("Not all chunks uploaded");
                    };
                    
                    // Assemble chunks in order
                    let assembledData = Buffer.Buffer<Nat8>(session.totalSize);
                    
                    if (session.totalChunks > 0) {
                        for (i in Iter.range(0, Int.abs(session.totalChunks - 1))) {
                            switch (session.chunks.get(i)) {
                                case (?chunkData) {
                                    let chunkArray = Blob.toArray(chunkData);
                                    for (byte in chunkArray.vals()) {
                                        assembledData.add(byte);
                                    };
                                };
                                case null {
                                    return #err("Missing chunk data for index " # Nat.toText(i));
                                };
                            };
                        };
                    };
                    
                    // Create final blob
                    let finalBlob = Blob.fromArray(Buffer.toArray(assembledData));
                    
                    // Verify integrity if checksum provided
                    switch (session.metadata.expectedChecksum) {
                        case (?_expectedHash) {
                            // TODO: Implement checksum verification
                            // let calculatedHash = calculateHash(finalBlob);
                            // if (calculatedHash != _expectedHash) {
                            //     return #err("File integrity check failed");
                            // };
                        };
                        case null { };
                    };
                    
                    // Generate video ID and store
                    let videoId = "video_" # Principal.toText(caller) # "_" # Int.toText(Time.now());
                    videoStorage.put(videoId, finalBlob);
                    
                    // Prepare for streaming by pre-chunking
                    prepareForStreaming(videoId, finalBlob);
                    
                    // Clean up session
                    uploadSessions.delete(sessionId);
                    
                    #ok(videoId)
                };
                case null {
                    #err("Upload session not found")
                };
            }
        };
        
        // Get upload progress
        public func getUploadProgress(sessionId: Text) : Result.Result<{uploaded: Nat; total: Nat; percentage: Float}, Text> {
            switch (uploadSessions.get(sessionId)) {
                case (?session) {
                    let uploadedCount = Array.foldLeft<Bool, Nat>(session.uploadedChunks, 0, func(acc, uploaded) {
                        if (uploaded) { acc + 1 } else { acc }
                    });
                    
                    let percentage = if (session.totalChunks > 0) {
                        (Float.fromInt(uploadedCount) / Float.fromInt(session.totalChunks)) * 100.0
                    } else { 
                        0.0 
                    };
                    
                    #ok({
                        uploaded = uploadedCount;
                        total = session.totalChunks;
                        percentage = percentage;
                    })
                };
                case null {
                    #err("Upload session not found")
                };
            }
        };
        
        // Resume upload - get missing chunks
        public func getMissingChunks(sessionId: Text) : Result.Result<[Nat], Text> {
            switch (uploadSessions.get(sessionId)) {
                case (?session) {
                    let missingChunks = Buffer.Buffer<Nat>(session.totalChunks);
                    
                    if (session.totalChunks > 0) {
                        for (i in Iter.range(0, Int.abs(session.totalChunks - 1))) {
                            if (not session.uploadedChunks[i]) {
                                missingChunks.add(i);
                            };
                        };
                    };
                    
                    #ok(Buffer.toArray(missingChunks))
                };
                case null {
                    #err("Upload session not found")
                };
            }
        };
        
        // Cancel upload session
        public func cancelUpload(caller: Principal, sessionId: Text) : Result.Result<(), Text> {
            switch (uploadSessions.get(sessionId)) {
                case (?session) {
                    if (session.userId != caller) {
                        return #err("Unauthorized access to upload session");
                    };
                    
                    uploadSessions.delete(sessionId);
                    #ok()
                };
                case null {
                    #err("Upload session not found")
                };
            }
        };
        
        // Streaming functions
        
        // Get video stream chunk
        public func getStreamChunk(
            videoId: Text,
            chunkIndex: Nat,
            chunkSize: ?Nat
        ) : Result.Result<StreamChunk, Text> {
            
            let requestedChunkSize = switch (chunkSize) {
                case (?size) { Nat.min(size, MAX_CHUNK_SIZE) };
                case null { MAX_CHUNK_SIZE };
            };
            
            // Check cache first
            switch (streamingCache.get(videoId)) {
                case (?cachedChunks) {
                    if (chunkIndex < cachedChunks.size()) {
                        let chunk = cachedChunks[chunkIndex];
                        return #ok({
                            data = chunk;
                            chunkIndex = chunkIndex;
                            totalChunks = cachedChunks.size();
                            isLast = cachedChunks.size() > 0 and chunkIndex + 1 == cachedChunks.size();
                        });
                    };
                };
                case null { };
            };
            
            // Fall back to direct storage
            switch (videoStorage.get(videoId)) {
                case (?videoData) {
                    let videoArray = Blob.toArray(videoData);
                    let totalSize = videoArray.size();
                    let totalChunks = if (requestedChunkSize > 0 and totalSize > 0) {
                        Int.abs((totalSize + requestedChunkSize - 1) / requestedChunkSize)
                    } else {
                        1
                    };
                    
                    if (chunkIndex >= totalChunks) {
                        return #err("Chunk index out of range");
                    };
                    
                    let startPos = chunkIndex * requestedChunkSize;
                    let endPos = Nat.min(startPos + requestedChunkSize, totalSize);
                    
                    if (startPos >= totalSize) {
                        return #err("Chunk index out of range");
                    };
                    
                    let chunkSize = if (endPos >= startPos) { 
                        Int.abs(endPos - startPos) 
                    } else { 
                        0 
                    };
                    if (chunkSize == 0) {
                        return #err("Invalid chunk size");
                    };
                    
                    let chunkArray = Array.subArray(videoArray, startPos, chunkSize);
                    
                    #ok({
                        data = Blob.fromArray(chunkArray);
                        chunkIndex = chunkIndex;
                        totalChunks = totalChunks;
                        isLast = totalChunks > 0 and chunkIndex + 1 == totalChunks;
                    })
                };
                case null {
                    #err("Video not found")
                };
            }
        };
        
        // Get video info for streaming
        public func getVideoStreamInfo(videoId: Text) : Result.Result<{totalSize: Nat; totalChunks: Nat; chunkSize: Nat}, Text> {
            switch (videoStorage.get(videoId)) {
                case (?videoData) {
                    let totalSize = Blob.toArray(videoData).size();
                    let totalChunks = if (MAX_CHUNK_SIZE > 0 and totalSize > 0) {
                        Int.abs((totalSize + MAX_CHUNK_SIZE - 1) / MAX_CHUNK_SIZE)
                    } else {
                        1
                    };
                    
                    #ok({
                        totalSize = totalSize;
                        totalChunks = totalChunks;
                        chunkSize = MAX_CHUNK_SIZE;
                    })
                };
                case null {
                    #err("Video not found")
                };
            }
        };
        
        // Utility functions
        
        private func generateSessionId(caller: Principal, fileName: Text) : Text {
            "upload_" # Principal.toText(caller) # "_" # fileName # "_" # Int.toText(Time.now())
        };
        
        private func getUserActiveSessions(caller: Principal) : [UploadSession] {
            let sessions = Buffer.Buffer<UploadSession>(10);
            
            for ((sessionId, session) in uploadSessions.entries()) {
                if (session.userId == caller) {
                    sessions.add(session);
                };
            };
            
            Buffer.toArray(sessions)
        };
        
        private func cleanupUserSessions(caller: Principal) {
            let currentTime = Time.now();
            let sessionsToDelete = Buffer.Buffer<Text>(10);
            
            for ((sessionId, session) in uploadSessions.entries()) {
                if (session.userId == caller and (currentTime - session.lastActivity) > SESSION_TIMEOUT) {
                    sessionsToDelete.add(sessionId);
                };
            };
            
            for (sessionId in sessionsToDelete.vals()) {
                uploadSessions.delete(sessionId);
            };
        };
        
        private func prepareForStreaming(videoId: Text, videoData: Blob) {
            let videoArray = Blob.toArray(videoData);
            let totalSize = videoArray.size();
            let totalChunks = if (MAX_CHUNK_SIZE > 0 and totalSize > 0) {
                Int.abs((totalSize + MAX_CHUNK_SIZE - 1) / MAX_CHUNK_SIZE)
            } else {
                1
            };
            
            let chunks = Buffer.Buffer<Blob>(totalChunks);
            
            if (totalChunks > 0) {
                for (i in Iter.range(0, Int.abs(totalChunks - 1))) {
                    let startPos = i * MAX_CHUNK_SIZE;
                    let endPos = Nat.min(startPos + MAX_CHUNK_SIZE, totalSize);
                    
                    if (startPos < totalSize and endPos >= startPos) {
                        let chunkSize = Int.abs(endPos - startPos);
                        let chunkArray = Array.subArray(videoArray, startPos, chunkSize);
                        chunks.add(Blob.fromArray(chunkArray));
                    };
                };
            };
            
            streamingCache.put(videoId, Buffer.toArray(chunks));
        };
        
        // Admin/maintenance functions
        
        public func cleanupExpiredSessions() : Nat {
            let currentTime = Time.now();
            let sessionsToDelete = Buffer.Buffer<Text>(100);
            
            for ((sessionId, session) in uploadSessions.entries()) {
                if ((currentTime - session.lastActivity) > SESSION_TIMEOUT) {
                    sessionsToDelete.add(sessionId);
                };
            };
            
            for (sessionId in sessionsToDelete.vals()) {
                uploadSessions.delete(sessionId);
            };
            
            sessionsToDelete.size()
        };
        
        public func getActiveSessionsCount() : Nat {
            uploadSessions.size()
        };
        
        public func getStoredVideosCount() : Nat {
            videoStorage.size()
        };
    };
}
