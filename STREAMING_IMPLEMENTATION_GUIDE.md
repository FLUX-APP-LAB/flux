# Flux Streaming Platform - Implementation Guide

## Overview

The Flux streaming platform implements a hybrid architecture combining:
- **WebRTC**: Real-time peer-to-peer video/audio streaming
- **ICP Canister**: Signaling server and coordination layer
- **React Frontend**: User interface components

## Architecture Components

### 1. Backend (Motoko)

#### WebRTC Manager (`webrtc.mo`)
- Handles WebRTC signaling between streamers and viewers
- Manages connection states and ICE candidate exchange
- Tracks viewer connections and stream statistics

#### Chunked Upload Manager (`chunkedupload.mo`)
- Handles large video file uploads in chunks
- Provides video streaming for recorded content
- Manages upload sessions and resumable uploads

#### Main Actor Integration
- Exposes WebRTC and upload APIs
- Integrates with existing livestream management
- Provides unified interface for streaming functionality

### 2. Frontend (JavaScript/React)

#### GameStreamer Class
- Manages streamer-side WebRTC connections
- Captures screen/game content
- Handles multiple viewer connections simultaneously

#### StreamViewer Class
- Manages viewer-side WebRTC connections
- Handles reconnection and error recovery
- Provides connection quality monitoring

#### StreamingInterface Component
- React component for streaming UI
- Supports both streamer and viewer modes
- Real-time statistics and controls

## Usage Examples

### 1. Starting a Game Stream

```javascript
import { GameStreamer } from './lib/streaming/GameStreamer';
import { idlFactory } from './declarations/flux_backend';

// Initialize streamer
const streamer = new GameStreamer('canister-id', agent);
await streamer.initialize(idlFactory);

// Start streaming
const result = await streamer.startGameStream('Call of Duty: Warzone', {
    frameRate: 60,
    width: 1920,
    height: 1080,
    maxViewers: 50,
    category: 'Gaming'
});

if (result.success) {
    console.log('Stream started!', result.streamId);
    
    // Get real-time stats
    setInterval(async () => {
        const stats = await streamer.getStreamStats();
        console.log('Viewers:', stats.viewerCount);
    }, 5000);
}
```

### 2. Watching a Stream

```javascript
import { StreamViewer } from './lib/streaming/StreamViewer';

// Initialize viewer
const viewer = new StreamViewer('canister-id', agent);
await viewer.initialize(idlFactory);

// Watch stream
const result = await viewer.watchStream('stream_abc123', 'video-element-id');

if (result.success) {
    console.log('Connected to stream!');
    
    // Monitor connection quality
    viewer.addEventListener('connectionQualityChanged', (event) => {
        console.log('Quality:', event.detail.quality);
    });
}
```

### 3. React Component Usage

```jsx
import StreamingInterface from './components/stream/StreamingInterface';

// Streamer mode
<StreamingInterface 
    mode="streamer"
    canisterId="rdmx6-jaaaa-aaaah-qcaaa-cai"
    idlFactory={idlFactory}
/>

// Viewer mode
<StreamingInterface 
    mode="viewer"
    streamId="stream_abc123"
    canisterId="rdmx6-jaaaa-aaaah-qcaaa-cai"
    idlFactory={idlFactory}
/>
```

## API Reference

### Backend Methods

#### Stream Management
```motoko
// Create a new stream
createStream(streamData: {
    streamId: Text;
    title: Text;
    category: Text;
    maxViewers: Nat;
}) : async Result.Result<(), Text>

// End stream
endStream(streamId: Text) : async Result.Result<(), Text>

// Get active streams
getActiveStreams() : async [(Text, {streamerId: Text; viewerCount: Nat; isActive: Bool})]
```

#### Viewer Management
```motoko
// Join stream
joinStream(streamId: Text, offer: Text) : async Result.Result<(), Text>

// Leave stream
leaveStream(streamId: Text) : async Result.Result<(), Text>

// Update heartbeat
updateHeartbeat(streamId: Text) : async Result.Result<(), Text>
```

#### Signaling
```motoko
// Get pending viewers (for streamers)
getPendingViewers(streamId: Text) : async Result.Result<[{viewerId: Text; offer: Text}], Text>

// Send answer to viewer
sendAnswer(data: {streamId: Text; viewerId: Text; answer: Text}) : async Result.Result<(), Text>

// Get answer from streamer
getAnswer(streamId: Text) : async Result.Result<?Text, Text>

// ICE candidate exchange
sendIceCandidate(data: {streamId: Text; targetId: ?Text; candidate: Text}) : async Result.Result<(), Text>
getIceCandidates(streamId: Text) : async Result.Result<[Text], Text>
```

### Frontend Classes

#### GameStreamer Methods
```javascript
// Initialize
await streamer.initialize(idlFactory)

// Start streaming
await streamer.startGameStream(title, options)

// Stop streaming
await streamer.stopStream()

// Get statistics
await streamer.getStreamStats()

// Properties
streamer.isLive
streamer.currentViewerCount
streamer.currentStreamId
```

#### StreamViewer Methods
```javascript
// Initialize
await viewer.initialize(idlFactory)

// Watch stream
await viewer.watchStream(streamId, videoElementId)

// Leave stream
await viewer.leaveStream()

// Get statistics
await viewer.getStreamStats()

// Properties
viewer.connected
viewer.connectionQuality
viewer.currentStreamId
```

## Event System

### Streamer Events
```javascript
// Stream lifecycle
window.addEventListener('streamStarted', (event) => {
    console.log('Stream started:', event.detail);
});

window.addEventListener('streamEnded', (event) => {
    console.log('Stream ended:', event.detail);
});

// Viewer management
window.addEventListener('viewerConnected', (event) => {
    console.log('New viewer:', event.detail.viewerId);
});

window.addEventListener('viewerDisconnected', (event) => {
    console.log('Viewer left:', event.detail.viewerId);
});
```

### Viewer Events
```javascript
// Connection events
window.addEventListener('streamConnected', (event) => {
    console.log('Connected to stream:', event.detail.streamId);
});

window.addEventListener('connectionQualityChanged', (event) => {
    console.log('Quality changed:', event.detail.quality);
});

// Stream events
window.addEventListener('streamReceived', (event) => {
    console.log('Video stream received');
});

window.addEventListener('streamerMetrics', (event) => {
    console.log('Streamer metrics:', event.detail.metrics);
});
```

## Configuration

### WebRTC Configuration
```javascript
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ]
};
```

### Stream Settings
```javascript
const streamSettings = {
    title: 'My Gaming Stream',
    category: 'Gaming',
    maxViewers: 100,
    frameRate: 60,
    resolution: { width: 1920, height: 1080 }
};
```

## Error Handling

### Common Errors and Solutions

1. **Screen sharing permission denied**
   - User needs to allow screen sharing in browser
   - Check browser compatibility

2. **Connection failed**
   - Network/firewall issues
   - ICE candidate exchange problems
   - Automatic reconnection attempts

3. **Stream not found**
   - Stream may have ended
   - Check active streams list

4. **Max viewers reached**
   - Stream is at capacity
   - Try again later

### Error Handling Pattern
```javascript
try {
    const result = await streamer.startGameStream(title, options);
    if (!result.success) {
        handleError(result.error);
    }
} catch (error) {
    handleError(error.message);
}
```

## Performance Optimization

### Streamer Optimization
- Use appropriate frame rates (30 FPS for most content, 60 FPS for fast-paced games)
- Monitor connection count and adjust quality
- Implement viewer limit enforcement

### Viewer Optimization
- Automatic quality adjustment based on connection
- Reconnection with exponential backoff
- Efficient ICE candidate handling

### Network Optimization
- STUN servers for NAT traversal
- Efficient signaling queue management
- Heartbeat system for connection monitoring

## Security Considerations

### Access Control
- Principal-based authentication via ICP
- Stream ownership verification
- Rate limiting for API calls

### Data Protection
- WebRTC encryption (DTLS/SRTP)
- Secure signaling via HTTPS
- No sensitive data in signaling messages

## Deployment

### Canister Deployment
```bash
# Deploy backend
dfx deploy flux_backend

# Update with streaming functionality
dfx canister call flux_backend cleanupExpiredSessions
```

### Frontend Integration
```bash
# Install dependencies
npm install @dfinity/agent @dfinity/auth-client

# Build and deploy
npm run build
```

## Monitoring and Analytics

### Stream Statistics
- Viewer count tracking
- Connection quality metrics
- Data transfer monitoring
- Error rate tracking

### System Health
- Active streams count
- Connection failure rates
- Resource usage monitoring
- Cleanup procedures

This implementation provides a complete WebRTC streaming solution integrated with the Internet Computer, offering both live streaming capabilities and robust error handling for production use.
