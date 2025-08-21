import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Buffer "mo:base/Buffer";
import Bool "mo:base/Bool";

module WebRTCManager {
    
    // Types for WebRTC signaling
    public type SignalingMessage = {
        streamId: Text;
        senderId: Principal;
        receiverId: ?Principal; // null for broadcast messages
        messageType: SignalingMessageType;
        payload: Text;
        timestamp: Int;
    };
    
    public type SignalingMessageType = {
        #Offer;
        #Answer;
        #IceCandidate;
        #ViewerJoin;
        #ViewerLeave;
        #StreamEnd;
        #Heartbeat;
    };
    
    public type ViewerConnection = {
        viewerId: Principal;
        streamId: Text;
        joinTime: Int;
        lastHeartbeat: Int;
        connectionState: ConnectionState;
        offer: ?Text;
        answer: ?Text;
        iceCandidates: [Text];
    };
    
    public type ConnectionState = {
        #Pending;
        #Connecting;
        #Connected;
        #Disconnected;
        #Failed;
    };
    
    public type StreamConnection = {
        streamId: Text;
        streamerId: Principal;
        viewers: HashMap.HashMap<Text, ViewerConnection>; // viewerId -> connection
        maxViewers: Nat;
        createdAt: Int;
        isActive: Bool;
    };
    
    public type WebRTCStats = {
        streamId: Text;
        totalViewers: Nat;
        activeConnections: Nat;
        averageConnectionTime: Int;
        dataTransferred: Nat;
        connectionFailures: Nat;
    };
    
    public class WebRTCSignalingService() {
        
        // Storage for signaling data
        private var streamConnections = HashMap.HashMap<Text, StreamConnection>(0, Text.equal, Text.hash);
        private var signalingQueues = HashMap.HashMap<Text, Buffer.Buffer<SignalingMessage>>(0, Text.equal, Text.hash);
        private var viewerHeartbeats = HashMap.HashMap<Text, Int>(0, Text.equal, Text.hash);
        
        // Configuration
        private let HEARTBEAT_TIMEOUT: Int = 30_000_000_000; // 30 seconds in nanoseconds
        private let MAX_SIGNALING_QUEUE_SIZE: Nat = 1000;
        
        // Initialize stream connection for WebRTC
        public func initializeStreamConnection(
            streamerId: Principal,
            streamId: Text,
            maxViewers: Nat
        ) : Result.Result<(), Text> {
            
            // Check if stream already exists
            switch (streamConnections.get(streamId)) {
                case (?_) {
                    return #err("Stream connection already exists");
                };
                case null {};
            };
            
            let viewers = HashMap.HashMap<Text, ViewerConnection>(0, Text.equal, Text.hash);
            let connection: StreamConnection = {
                streamId = streamId;
                streamerId = streamerId;
                viewers = viewers;
                maxViewers = maxViewers;
                createdAt = Time.now();
                isActive = true;
            };
            
            streamConnections.put(streamId, connection);
            signalingQueues.put(streamId, Buffer.Buffer<SignalingMessage>(0));
            
            #ok()
        };
        
        // Viewer joins stream
        public func joinStream(
            viewerId: Principal,
            streamId: Text,
            offer: Text
        ) : Result.Result<(), Text> {
            
            switch (streamConnections.get(streamId)) {
                case (?streamConnection) {
                    if (not streamConnection.isActive) {
                        return #err("Stream is not active");
                    };
                    
                    // Check viewer capacity
                    if (streamConnection.viewers.size() >= streamConnection.maxViewers) {
                        return #err("Stream is at maximum capacity");
                    };
                    
                    let viewerKey = Principal.toText(viewerId);
                    
                    // Check if viewer already connected
                    switch (streamConnection.viewers.get(viewerKey)) {
                        case (?_) {
                            return #err("Viewer already connected to this stream");
                        };
                        case null {};
                    };
                    
                    // Create viewer connection
                    let viewerConnection: ViewerConnection = {
                        viewerId = viewerId;
                        streamId = streamId;
                        joinTime = Time.now();
                        lastHeartbeat = Time.now();
                        connectionState = #Pending;
                        offer = ?offer;
                        answer = null;
                        iceCandidates = [];
                    };
                    
                    streamConnection.viewers.put(viewerKey, viewerConnection);
                    
                    // Add signaling message for streamer
                    let signalingMsg: SignalingMessage = {
                        streamId = streamId;
                        senderId = viewerId;
                        receiverId = ?streamConnection.streamerId;
                        messageType = #ViewerJoin;
                        payload = offer;
                        timestamp = Time.now();
                    };
                    
                    addSignalingMessage(streamId, signalingMsg);
                    
                    #ok()
                };
                case null {
                    #err("Stream not found")
                };
            }
        };
        
        // Get pending viewer connections for streamer
        public func getPendingViewers(
            streamerId: Principal,
            streamId: Text
        ) : Result.Result<[{viewerId: Text; offer: Text}], Text> {
            
            switch (streamConnections.get(streamId)) {
                case (?streamConnection) {
                    if (streamConnection.streamerId != streamerId) {
                        return #err("Unauthorized access to stream");
                    };
                    
                    switch (signalingQueues.get(streamId)) {
                        case (?queue) {
                            let messages = Buffer.toArray(queue);
                            let viewerJoins = Array.filter(messages, func(msg: SignalingMessage): Bool {
                                switch (msg.messageType) {
                                    case (#ViewerJoin) { true };
                                    case (_) { false };
                                }
                            });
                            
                            // Clear processed viewer join messages
                            let filteredMessages = Array.filter(messages, func(msg: SignalingMessage): Bool {
                                switch (msg.messageType) {
                                    case (#ViewerJoin) { false };
                                    case (_) { true };
                                }
                            });
                            
                            let newQueue = Buffer.Buffer<SignalingMessage>(0);
                            for (msg in filteredMessages.vals()) {
                                newQueue.add(msg);
                            };
                            signalingQueues.put(streamId, newQueue);
                            
                            let result = Array.map(viewerJoins, func(msg: SignalingMessage): {viewerId: Text; offer: Text} {
                                {
                                    viewerId = Principal.toText(msg.senderId);
                                    offer = msg.payload;
                                }
                            });
                            
                            #ok(result)
                        };
                        case null {
                            #ok([])
                        };
                    }
                };
                case null {
                    #err("Stream not found")
                };
            }
        };
        
        // Streamer sends answer to viewer
        public func sendAnswer(
            streamerId: Principal,
            streamId: Text,
            viewerId: Text,
            answer: Text
        ) : Result.Result<(), Text> {
            
            switch (streamConnections.get(streamId)) {
                case (?streamConnection) {
                    if (streamConnection.streamerId != streamerId) {
                        return #err("Unauthorized access to stream");
                    };
                    
                    switch (streamConnection.viewers.get(viewerId)) {
                        case (?viewerConnection) {
                            let updatedConnection = {
                                viewerConnection with
                                connectionState = #Connecting;
                                answer = ?answer;
                            };
                            
                            streamConnection.viewers.put(viewerId, updatedConnection);
                            
                            // Add signaling message for viewer
                            let signalingMsg: SignalingMessage = {
                                streamId = streamId;
                                senderId = streamerId;
                                receiverId = ?viewerConnection.viewerId;
                                messageType = #Answer;
                                payload = answer;
                                timestamp = Time.now();
                            };
                            
                            addSignalingMessage(streamId, signalingMsg);
                            
                            #ok()
                        };
                        case null {
                            #err("Viewer connection not found")
                        };
                    }
                };
                case null {
                    #err("Stream not found")
                };
            }
        };
        
        // Viewer gets answer from streamer
        public func getAnswer(
            viewerId: Principal,
            streamId: Text
        ) : Result.Result<?Text, Text> {
            
            switch (streamConnections.get(streamId)) {
                case (?streamConnection) {
                    let viewerKey = Principal.toText(viewerId);
                    
                    switch (streamConnection.viewers.get(viewerKey)) {
                        case (?viewerConnection) {
                            if (viewerConnection.viewerId != viewerId) {
                                return #err("Unauthorized access");
                            };
                            
                            #ok(viewerConnection.answer)
                        };
                        case null {
                            #err("Viewer connection not found")
                        };
                    }
                };
                case null {
                    #err("Stream not found")
                };
            }
        };
        
        // Handle ICE candidate exchange
        public func sendIceCandidate(
            senderId: Principal,
            streamId: Text,
            targetId: ?Text, // null for broadcast to all viewers
            candidate: Text
        ) : Result.Result<(), Text> {
            
            switch (streamConnections.get(streamId)) {
                case (?streamConnection) {
                    // Verify sender is either streamer or a connected viewer
                    let isStreamer = streamConnection.streamerId == senderId;
                    let isViewer = switch (streamConnection.viewers.get(Principal.toText(senderId))) {
                        case (?_) { true };
                        case null { false };
                    };
                    
                    if (not (isStreamer or isViewer)) {
                        return #err("Unauthorized sender");
                    };
                    
                    let receiverId = switch (targetId) {
                        case (?id) { ?Principal.fromText(id) };
                        case null { null };
                    };
                    
                    let signalingMsg: SignalingMessage = {
                        streamId = streamId;
                        senderId = senderId;
                        receiverId = receiverId;
                        messageType = #IceCandidate;
                        payload = candidate;
                        timestamp = Time.now();
                    };
                    
                    addSignalingMessage(streamId, signalingMsg);
                    
                    #ok()
                };
                case null {
                    #err("Stream not found")
                };
            }
        };
        
        // Get ICE candidates for a specific receiver
        public func getIceCandidates(
            receiverId: Principal,
            streamId: Text
        ) : Result.Result<[Text], Text> {
            
            switch (signalingQueues.get(streamId)) {
                case (?queue) {
                    let messages = Buffer.toArray(queue);
                    let candidates = Array.filter(messages, func(msg: SignalingMessage): Bool {
                        switch (msg.messageType) {
                            case (#IceCandidate) {
                                switch (msg.receiverId) {
                                    case (?target) { target == receiverId };
                                    case null { true }; // Broadcast message
                                }
                            };
                            case (_) { false };
                        }
                    });
                    
                    let result = Array.map(candidates, func(msg: SignalingMessage): Text {
                        msg.payload
                    });
                    
                    #ok(result)
                };
                case null {
                    #ok([])
                };
            }
        };
        
        // Update viewer heartbeat
        public func updateHeartbeat(
            viewerId: Principal,
            streamId: Text
        ) : Result.Result<(), Text> {
            
            let viewerKey = Principal.toText(viewerId);
            let heartbeatKey = streamId # "_" # viewerKey;
            
            switch (streamConnections.get(streamId)) {
                case (?streamConnection) {
                    switch (streamConnection.viewers.get(viewerKey)) {
                        case (?viewerConnection) {
                            let updatedConnection = {
                                viewerConnection with
                                lastHeartbeat = Time.now();
                                connectionState = #Connected;
                            };
                            
                            streamConnection.viewers.put(viewerKey, updatedConnection);
                            viewerHeartbeats.put(heartbeatKey, Time.now());
                            
                            #ok()
                        };
                        case null {
                            #err("Viewer not found")
                        };
                    }
                };
                case null {
                    #err("Stream not found")
                };
            }
        };
        
        // Remove viewer from stream
        public func removeViewer(
            viewerId: Principal,
            streamId: Text
        ) : Result.Result<(), Text> {
            
            switch (streamConnections.get(streamId)) {
                case (?streamConnection) {
                    let viewerKey = Principal.toText(viewerId);
                    streamConnection.viewers.delete(viewerKey);
                    
                    let heartbeatKey = streamId # "_" # viewerKey;
                    viewerHeartbeats.delete(heartbeatKey);
                    
                    // Notify streamer about viewer leaving
                    let signalingMsg: SignalingMessage = {
                        streamId = streamId;
                        senderId = viewerId;
                        receiverId = ?streamConnection.streamerId;
                        messageType = #ViewerLeave;
                        payload = "";
                        timestamp = Time.now();
                    };
                    
                    addSignalingMessage(streamId, signalingMsg);
                    
                    #ok()
                };
                case null {
                    #err("Stream not found")
                };
            }
        };
        
        // End stream and cleanup all connections
        public func endStream(
            streamerId: Principal,
            streamId: Text
        ) : Result.Result<(), Text> {
            
            switch (streamConnections.get(streamId)) {
                case (?streamConnection) {
                    if (streamConnection.streamerId != streamerId) {
                        return #err("Unauthorized access to stream");
                    };
                    
                    // Mark stream as inactive
                    let updatedConnection = {
                        streamConnection with
                        isActive = false;
                    };
                    streamConnections.put(streamId, updatedConnection);
                    
                    // Notify all viewers about stream end
                    for ((viewerKey, viewerConnection) in streamConnection.viewers.entries()) {
                        let signalingMsg: SignalingMessage = {
                            streamId = streamId;
                            senderId = streamerId;
                            receiverId = ?viewerConnection.viewerId;
                            messageType = #StreamEnd;
                            payload = "";
                            timestamp = Time.now();
                        };
                        
                        addSignalingMessage(streamId, signalingMsg);
                    };
                    
                    #ok()
                };
                case null {
                    #err("Stream not found")
                };
            }
        };
        
        // Get stream statistics
        public func getStreamStats(streamId: Text) : Result.Result<WebRTCStats, Text> {
            switch (streamConnections.get(streamId)) {
                case (?streamConnection) {
                    let totalViewers = streamConnection.viewers.size();
                    let activeConnections = countActiveConnections(streamConnection);
                    let avgConnectionTime = calculateAverageConnectionTime(streamConnection);
                    
                    let stats: WebRTCStats = {
                        streamId = streamId;
                        totalViewers = totalViewers;
                        activeConnections = activeConnections;
                        averageConnectionTime = avgConnectionTime;
                        dataTransferred = 0; // TODO: Implement data tracking
                        connectionFailures = 0; // TODO: Implement failure tracking
                    };
                    
                    #ok(stats)
                };
                case null {
                    #err("Stream not found")
                };
            }
        };
        
        // Cleanup expired connections
        public func cleanupExpiredConnections() : Nat {
            let currentTime = Time.now();
            var cleanedCount = 0;
            
            let streamIds = Buffer.Buffer<Text>(streamConnections.size());
            for ((streamId, _) in streamConnections.entries()) {
                streamIds.add(streamId);
            };
            
            for (streamId in streamIds.vals()) {
                switch (streamConnections.get(streamId)) {
                    case (?streamConnection) {
                        let viewersToRemove = Buffer.Buffer<Text>(streamConnection.viewers.size());
                        
                        for ((viewerKey, viewerConnection) in streamConnection.viewers.entries()) {
                            let timeSinceHeartbeat = currentTime - viewerConnection.lastHeartbeat;
                            if (timeSinceHeartbeat > HEARTBEAT_TIMEOUT) {
                                viewersToRemove.add(viewerKey);
                            };
                        };
                        
                        for (viewerKey in viewersToRemove.vals()) {
                            streamConnection.viewers.delete(viewerKey);
                            let heartbeatKey = streamId # "_" # viewerKey;
                            viewerHeartbeats.delete(heartbeatKey);
                            cleanedCount += 1;
                        };
                    };
                    case null {};
                };
            };
            
            cleanedCount
        };
        
        // Private helper functions
        
        private func addSignalingMessage(streamId: Text, message: SignalingMessage) {
            switch (signalingQueues.get(streamId)) {
                case (?queue) {
                    if (queue.size() >= MAX_SIGNALING_QUEUE_SIZE) {
                        // Remove oldest message if queue is full
                        ignore queue.removeLast();
                    };
                    queue.add(message);
                };
                case null {
                    let newQueue = Buffer.Buffer<SignalingMessage>(0);
                    newQueue.add(message);
                    signalingQueues.put(streamId, newQueue);
                };
            }
        };
        
        private func countActiveConnections(streamConnection: StreamConnection) : Nat {
            var activeCount = 0;
            for ((_, viewerConnection) in streamConnection.viewers.entries()) {
                switch (viewerConnection.connectionState) {
                    case (#Connected) { activeCount += 1 };
                    case (_) {};
                };
            };
            activeCount
        };
        
        private func calculateAverageConnectionTime(streamConnection: StreamConnection) : Int {
            if (streamConnection.viewers.size() == 0) {
                return 0;
            };
            
            let currentTime = Time.now();
            var totalTime = 0;
            
            for ((_, viewerConnection) in streamConnection.viewers.entries()) {
                totalTime += Int.abs(currentTime - viewerConnection.joinTime);
            };
            
            totalTime / Int.abs(streamConnection.viewers.size())
        };
        
        // Query functions for external access
        
        public func getActiveStreams() : [(Text, {streamerId: Text; viewerCount: Nat; isActive: Bool})] {
            let result = Buffer.Buffer<(Text, {streamerId: Text; viewerCount: Nat; isActive: Bool})>(streamConnections.size());
            
            for ((streamId, connection) in streamConnections.entries()) {
                if (connection.isActive) {
                    result.add((streamId, {
                        streamerId = Principal.toText(connection.streamerId);
                        viewerCount = connection.viewers.size();
                        isActive = connection.isActive;
                    }));
                };
            };
            
            Buffer.toArray(result)
        };
        
        public func getViewerCount(streamId: Text) : Nat {
            switch (streamConnections.get(streamId)) {
                case (?connection) { connection.viewers.size() };
                case null { 0 };
            }
        };
    };
}