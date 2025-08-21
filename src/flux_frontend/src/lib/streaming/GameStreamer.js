import { Actor } from '@dfinity/agent';

/**
 * GameStreamer - Handles game streaming with WebRTC and ICP integration
 * This class manages the streamer side of the WebRTC connection
 */
export class GameStreamer {
    constructor(canisterId, agent) {
        this.canisterId = canisterId;
        this.agent = agent;
        this.streamId = this.generateStreamId();
        this.peerConnections = new Map(); // viewerId -> RTCPeerConnection
        this.localStream = null;
        this.icpActor = null;
        this.isStreaming = false;
        this.signalingInterval = null;
        
        // WebRTC configuration
        this.rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };
        
        // Stream statistics
        this.stats = {
            startTime: null,
            viewerCount: 0,
            totalViewers: 0,
            dataTransferred: 0,
            connectionFailures: 0
        };
    }

    async initialize(idlFactory) {
        try {
            // Initialize ICP actor
            this.icpActor = Actor.createActor(idlFactory, {
                agent: this.agent,
                canisterId: this.canisterId,
            });
            
            console.log('🎮 GameStreamer initialized');
            return { success: true };
        } catch (error) {
            console.error('Failed to initialize GameStreamer:', error);
            return { success: false, error: error.message };
        }
    }

    async startGameStream(gameTitle, options = {}) {
        try {
            console.log(`🎮 Starting game stream: ${gameTitle}`);
            
            // 1. Capture game screen + audio
            this.localStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    frameRate: options.frameRate || 30,
                    width: { ideal: options.width || 1920 },
                    height: { ideal: options.height || 1080 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 48000
                }
            });

            // Handle screen sharing stop
            this.localStream.getVideoTracks()[0].addEventListener('ended', () => {
                console.log('Screen sharing stopped by user');
                this.stopStream();
            });

            // 2. Register stream on ICP
            const streamData = {
                streamId: this.streamId,
                title: gameTitle,
                category: options.category || 'Gaming',
                maxViewers: options.maxViewers || 100
            };

            const result = await this.icpActor.createWebRTCStream(streamData);
            if (result.err) {
                throw new Error(`Failed to create stream: ${result.err}`);
            }

            // 3. Start listening for viewers
            this.isStreaming = true;
            this.stats.startTime = Date.now();
            this.startSignalingLoop();
            
            console.log(`🎮 Game stream started! Stream ID: ${this.streamId}`);
            
            // Dispatch custom event
            window.dispatchEvent(new CustomEvent('streamStarted', {
                detail: { 
                    streamId: this.streamId,
                    title: gameTitle,
                    category: streamData.category
                }
            }));
            
            return { success: true, streamId: this.streamId };

        } catch (error) {
            console.error('Failed to start stream:', error);
            this.cleanup();
            return { success: false, error: error.message };
        }
    }

    async startSignalingLoop() {
        if (!this.isStreaming) return;

        try {
            // Poll ICP for new viewer connection requests
            const pendingViewersResult = await this.icpActor.getPendingViewers(this.streamId);
            
            if (pendingViewersResult.ok) {
                const pendingViewers = pendingViewersResult.ok;
                
                for (const viewer of pendingViewers) {
                    await this.connectToViewer(viewer);
                }
            }

            // Schedule next poll
            if (this.isStreaming) {
                this.signalingInterval = setTimeout(() => this.startSignalingLoop(), 2000);
            }
        } catch (error) {
            console.error('Signaling loop error:', error);
            if (this.isStreaming) {
                this.signalingInterval = setTimeout(() => this.startSignalingLoop(), 5000);
            }
        }
    }

    async connectToViewer(viewerData) {
        const { viewerId, offer } = viewerData;
        
        try {
            console.log(`🔗 Connecting to viewer: ${viewerId}`);
            
            // Create peer connection for this viewer
            const peerConnection = new RTCPeerConnection(this.rtcConfig);
            this.peerConnections.set(viewerId, peerConnection);

            // Add local stream to peer connection
            this.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.localStream);
            });

            // Handle ICE candidates
            peerConnection.onicecandidate = async (event) => {
                if (event.candidate) {
                    try {
                        await this.icpActor.sendIceCandidate({
                            streamId: this.streamId,
                            targetId: viewerId,
                            candidate: JSON.stringify(event.candidate)
                        });
                    } catch (error) {
                        console.error('Failed to send ICE candidate:', error);
                    }
                }
            };

            // Handle connection state changes
            peerConnection.onconnectionstatechange = () => {
                const state = peerConnection.connectionState;
                console.log(`Viewer ${viewerId} connection state: ${state}`);
                
                switch (state) {
                    case 'connected':
                        this.onViewerConnected(viewerId);
                        break;
                    case 'disconnected':
                    case 'failed':
                        this.removeViewer(viewerId);
                        break;
                }
            };

            // Handle data channel for viewer metrics
            const dataChannel = peerConnection.createDataChannel('metrics', {
                ordered: true
            });
            
            dataChannel.onopen = () => {
                console.log(`📊 Data channel opened for viewer ${viewerId}`);
                this.sendViewerMetrics(dataChannel);
            };

            // Set remote description (viewer's offer)
            await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(offer)));

            // Create and send answer
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            const answerResult = await this.icpActor.sendAnswer({
                streamId: this.streamId,
                viewerId: viewerId,
                answer: JSON.stringify(answer)
            });

            if (answerResult.err) {
                throw new Error(answerResult.err);
            }

            console.log(`✅ Connected to viewer: ${viewerId}`);
            this.stats.totalViewers++;

        } catch (error) {
            console.error(`Failed to connect to viewer ${viewerId}:`, error);
            this.removeViewer(viewerId);
            this.stats.connectionFailures++;
        }
    }

    onViewerConnected(viewerId) {
        this.stats.viewerCount = this.peerConnections.size;
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('viewerConnected', {
            detail: { 
                viewerId,
                viewerCount: this.stats.viewerCount
            }
        }));
    }

    removeViewer(viewerId) {
        const peerConnection = this.peerConnections.get(viewerId);
        if (peerConnection) {
            peerConnection.close();
            this.peerConnections.delete(viewerId);
            
            this.stats.viewerCount = this.peerConnections.size;
            
            console.log(`👋 Viewer ${viewerId} disconnected. Current viewers: ${this.stats.viewerCount}`);
            
            // Dispatch custom event
            window.dispatchEvent(new CustomEvent('viewerDisconnected', {
                detail: { 
                    viewerId,
                    viewerCount: this.stats.viewerCount
                }
            }));
        }
    }

    async sendViewerMetrics(dataChannel) {
        if (dataChannel.readyState === 'open') {
            const metrics = {
                timestamp: Date.now(),
                streamId: this.streamId,
                viewerCount: this.stats.viewerCount,
                streamDuration: Date.now() - this.stats.startTime
            };
            
            try {
                dataChannel.send(JSON.stringify(metrics));
            } catch (error) {
                console.error('Failed to send metrics:', error);
            }
        }
        
        // Send metrics every 30 seconds
        if (this.isStreaming) {
            setTimeout(() => this.sendViewerMetrics(dataChannel), 30000);
        }
    }

    async stopStream() {
        console.log('🛑 Stopping stream...');
        
        this.isStreaming = false;
        
        // Clear signaling interval
        if (this.signalingInterval) {
            clearTimeout(this.signalingInterval);
            this.signalingInterval = null;
        }
        
        // Close all peer connections
        for (const [viewerId, peerConnection] of this.peerConnections) {
            peerConnection.close();
        }
        this.peerConnections.clear();

        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Update stream status on ICP
        try {
            await this.icpActor.endWebRTCStream(this.streamId);
        } catch (error) {
            console.error('Failed to end stream on ICP:', error);
        }
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('streamEnded', {
            detail: { 
                streamId: this.streamId,
                duration: Date.now() - this.stats.startTime,
                totalViewers: this.stats.totalViewers
            }
        }));
        
        console.log('🛑 Stream stopped');
    }

    async getStreamStats() {
        try {
            const icpStatsResult = await this.icpActor.getStreamStats(this.streamId);
            const icpStats = icpStatsResult.ok || {};
            
            // Get WebRTC stats
            const rtcStats = await this.getRTCStats();
            
            return {
                streamId: this.streamId,
                isLive: this.isStreaming,
                duration: this.stats.startTime ? Date.now() - this.stats.startTime : 0,
                viewerCount: this.stats.viewerCount,
                totalViewers: this.stats.totalViewers,
                connectionFailures: this.stats.connectionFailures,
                connections: Array.from(this.peerConnections.keys()),
                ...icpStats,
                ...rtcStats
            };
        } catch (error) {
            console.error('Failed to get stream stats:', error);
            return {
                streamId: this.streamId,
                isLive: this.isStreaming,
                viewerCount: this.stats.viewerCount,
                error: error.message
            };
        }
    }

    async getRTCStats() {
        const stats = {
            totalBytesSent: 0,
            totalPacketsSent: 0,
            averageBitrate: 0,
            frameRate: 0
        };

        try {
            for (const [viewerId, peerConnection] of this.peerConnections) {
                const connectionStats = await peerConnection.getStats();
                
                connectionStats.forEach(stat => {
                    if (stat.type === 'outbound-rtp' && stat.mediaType === 'video') {
                        stats.totalBytesSent += stat.bytesSent || 0;
                        stats.totalPacketsSent += stat.packetsSent || 0;
                        stats.frameRate = Math.max(stats.frameRate, stat.framesPerSecond || 0);
                    }
                });
            }
            
            // Calculate average bitrate (bytes per second)
            if (this.stats.startTime) {
                const durationSeconds = (Date.now() - this.stats.startTime) / 1000;
                stats.averageBitrate = (stats.totalBytesSent * 8) / durationSeconds; // bits per second
            }
        } catch (error) {
            console.error('Failed to get RTC stats:', error);
        }

        return stats;
    }

    cleanup() {
        this.isStreaming = false;
        
        if (this.signalingInterval) {
            clearTimeout(this.signalingInterval);
            this.signalingInterval = null;
        }
        
        // Close all connections
        for (const [viewerId, peerConnection] of this.peerConnections) {
            peerConnection.close();
        }
        this.peerConnections.clear();
        
        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
    }

    generateStreamId() {
        return 'stream_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    // Public getters
    get currentStreamId() {
        return this.streamId;
    }

    get isLive() {
        return this.isStreaming;
    }

    get currentViewerCount() {
        return this.stats.viewerCount;
    }
}

export default GameStreamer;
