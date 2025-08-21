import { Actor } from '@dfinity/agent';

/**
 * StreamViewer - Handles viewing streams with WebRTC and ICP integration
 * This class manages the viewer side of the WebRTC connection
 */
export class StreamViewer {
    constructor(canisterId, agent) {
        this.canisterId = canisterId;
        this.agent = agent;
        this.peerConnection = null;
        this.icpActor = null;
        this.streamId = null;
        this.videoElement = null;
        this.dataChannel = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.heartbeatInterval = null;
        this.iceCandidateInterval = null;
        
        // WebRTC configuration
        this.rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };
        
        // Connection statistics
        this.stats = {
            joinTime: null,
            bytesReceived: 0,
            packetsLost: 0,
            frameRate: 0,
            resolution: { width: 0, height: 0 },
            connectionQuality: 'unknown'
        };
    }

    async initialize(idlFactory) {
        try {
            // Initialize ICP actor
            this.icpActor = Actor.createActor(idlFactory, {
                agent: this.agent,
                canisterId: this.canisterId,
            });
            
            console.log('📺 StreamViewer initialized');
            return { success: true };
        } catch (error) {
            console.error('Failed to initialize StreamViewer:', error);
            return { success: false, error: error.message };
        }
    }

    async watchStream(streamId, videoElementId) {
        this.streamId = streamId;
        this.videoElement = document.getElementById(videoElementId);
        
        if (!this.videoElement) {
            throw new Error('Video element not found');
        }

        try {
            console.log(`📺 Attempting to watch stream: ${streamId}`);
            
            // 1. Check if stream exists and is live
            const activeStreams = await this.icpActor.getActiveStreams();
            const streamExists = activeStreams.some(([id]) => id === streamId);
            
            if (!streamExists) {
                throw new Error('Stream is not available or not live');
            }

            // 2. Create peer connection
            this.peerConnection = new RTCPeerConnection(this.rtcConfig);
            
            // 3. Set up event handlers
            this.setupPeerConnectionEvents();

            // 4. Create offer and join stream
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

            const joinResult = await this.icpActor.joinStream(streamId, JSON.stringify(offer));
            if (joinResult.err) {
                throw new Error(`Failed to join stream: ${joinResult.err}`);
            }

            // 5. Wait for answer from streamer
            await this.waitForAnswer();

            // 6. Handle ICE candidates
            this.handleIceCandidates();
            
            // 7. Start heartbeat
            this.startHeartbeat();

            this.stats.joinTime = Date.now();
            console.log(`📺 Successfully joined stream: ${streamId}`);
            
            return { success: true };

        } catch (error) {
            console.error('Failed to watch stream:', error);
            this.cleanup();
            return { success: false, error: error.message };
        }
    }

    setupPeerConnectionEvents() {
        // Handle incoming stream
        this.peerConnection.ontrack = (event) => {
            console.log('📹 Received remote stream');
            
            if (event.streams && event.streams[0]) {
                this.videoElement.srcObject = event.streams[0];
                
                // Auto-play the video
                this.videoElement.play().catch(error => {
                    console.warn('Auto-play failed, user interaction required:', error);
                    this.showPlayButton();
                });
                
                // Dispatch custom event
                window.dispatchEvent(new CustomEvent('streamReceived', {
                    detail: { 
                        streamId: this.streamId,
                        stream: event.streams[0]
                    }
                }));
            }
        };

        // Handle ICE candidates
        this.peerConnection.onicecandidate = async (event) => {
            if (event.candidate) {
                try {
                    await this.icpActor.sendIceCandidate({
                        streamId: this.streamId,
                        targetId: null, // Broadcast to streamer
                        candidate: JSON.stringify(event.candidate)
                    });
                } catch (error) {
                    console.error('Failed to send ICE candidate:', error);
                }
            }
        };

        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            console.log(`Connection state: ${state}`);
            
            switch (state) {
                case 'connected':
                    this.onStreamConnected();
                    break;
                case 'disconnected':
                    this.onStreamDisconnected();
                    break;
                case 'failed':
                    this.onConnectionFailed();
                    break;
            }
        };

        // Handle ICE connection state
        this.peerConnection.oniceconnectionstatechange = () => {
            const state = this.peerConnection.iceConnectionState;
            console.log(`ICE connection state: ${state}`);
            
            this.updateConnectionQuality(state);
        };

        // Handle data channel from streamer
        this.peerConnection.ondatachannel = (event) => {
            const channel = event.channel;
            console.log(`📊 Data channel received: ${channel.label}`);
            
            if (channel.label === 'metrics') {
                this.dataChannel = channel;
                
                channel.onmessage = (event) => {
                    try {
                        const metrics = JSON.parse(event.data);
                        this.handleStreamerMetrics(metrics);
                    } catch (error) {
                        console.error('Failed to parse metrics:', error);
                    }
                };
            }
        };
    }

    async waitForAnswer() {
        const maxAttempts = 30; // 30 seconds
        let attempts = 0;

        while (attempts < maxAttempts) {
            try {
                const answerResult = await this.icpActor.getAnswer(this.streamId);
                if (answerResult.ok && answerResult.ok !== null) {
                    const answer = answerResult.ok;
                    await this.peerConnection.setRemoteDescription(
                        new RTCSessionDescription(JSON.parse(answer))
                    );
                    console.log('✅ Received answer from streamer');
                    return;
                }
            } catch (error) {
                console.error('Error getting answer:', error);
            }

            // Wait 1 second before trying again
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }

        throw new Error('Timeout waiting for streamer response');
    }

    async handleIceCandidates() {
        // Poll for ICE candidates
        const pollCandidates = async () => {
            try {
                const candidatesResult = await this.icpActor.getIceCandidates(this.streamId);
                
                if (candidatesResult.ok) {
                    const candidates = candidatesResult.ok;
                    
                    for (const candidateStr of candidates) {
                        try {
                            const candidate = JSON.parse(candidateStr);
                            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                        } catch (error) {
                            console.error('Error adding ICE candidate:', error);
                        }
                    }
                }

                // Continue polling if still connected
                if (this.peerConnection && 
                    this.peerConnection.connectionState !== 'closed' &&
                    this.peerConnection.connectionState !== 'failed') {
                    this.iceCandidateInterval = setTimeout(pollCandidates, 2000);
                }
            } catch (error) {
                console.error('Error polling ICE candidates:', error);
                if (this.isConnected) {
                    this.iceCandidateInterval = setTimeout(pollCandidates, 5000);
                }
            }
        };

        pollCandidates();
    }

    startHeartbeat() {
        const sendHeartbeat = async () => {
            if (this.isConnected && this.streamId) {
                try {
                    await this.icpActor.updateHeartbeat(this.streamId);
                } catch (error) {
                    console.error('Failed to send heartbeat:', error);
                }
            }
        };

        // Send heartbeat every 20 seconds
        this.heartbeatInterval = setInterval(sendHeartbeat, 20000);
    }

    onStreamConnected() {
        console.log('🎉 Successfully connected to stream!');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Enable video controls
        if (this.videoElement) {
            this.videoElement.controls = true;
            this.videoElement.muted = false; // Allow audio
        }

        // Remove any overlays
        this.removeOverlays();
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('streamConnected', {
            detail: { streamId: this.streamId }
        }));
    }

    onStreamDisconnected() {
        console.log('📺 Stream disconnected');
        this.isConnected = false;
        
        // Show reconnection UI
        this.showReconnectionMessage();
        
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
            this.attemptReconnection();
        }, 3000);
    }

    onConnectionFailed() {
        console.log('❌ Connection failed');
        this.isConnected = false;
        
        // Attempt immediate reconnection
        this.attemptReconnection();
    }

    async attemptReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.showStreamEndedMessage();
            return;
        }
        
        this.reconnectAttempts++;
        console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        try {
            // Check if stream is still live
            const activeStreams = await this.icpActor.getActiveStreams();
            const streamExists = activeStreams.some(([id]) => id === this.streamId);
            
            if (streamExists) {
                // Cleanup old connection and try again
                this.cleanup(false); // Don't reset reconnect attempts
                await this.watchStream(this.streamId, this.videoElement.id);
            } else {
                this.showStreamEndedMessage();
            }
        } catch (error) {
            console.error('Reconnection failed:', error);
            
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                // Try again with exponential backoff
                const delay = Math.min(10000, 1000 * Math.pow(2, this.reconnectAttempts));
                setTimeout(() => this.attemptReconnection(), delay);
            } else {
                this.showStreamEndedMessage();
            }
        }
    }

    updateConnectionQuality(iceConnectionState) {
        let quality = 'unknown';
        
        switch (iceConnectionState) {
            case 'connected':
            case 'completed':
                quality = 'good';
                break;
            case 'checking':
                quality = 'connecting';
                break;
            case 'disconnected':
                quality = 'poor';
                break;
            case 'failed':
                quality = 'failed';
                break;
        }
        
        this.stats.connectionQuality = quality;
        
        // Dispatch quality update event
        window.dispatchEvent(new CustomEvent('connectionQualityChanged', {
            detail: { 
                streamId: this.streamId,
                quality: quality,
                iceState: iceConnectionState
            }
        }));
    }

    handleStreamerMetrics(metrics) {
        // Process metrics from streamer
        console.log('📊 Received streamer metrics:', metrics);
        
        // Dispatch metrics event
        window.dispatchEvent(new CustomEvent('streamerMetrics', {
            detail: { 
                streamId: this.streamId,
                metrics: metrics
            }
        }));
    }

    showPlayButton() {
        const overlay = this.createOverlay('play-button');
        overlay.innerHTML = `
            <div class="play-button-container">
                <button class="play-button" onclick="document.getElementById('${this.videoElement.id}').play()">
                    <svg width="50" height="50" viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                    <span>Click to Play</span>
                </button>
            </div>
        `;
    }

    showReconnectionMessage() {
        const overlay = this.createOverlay('reconnect-message');
        overlay.innerHTML = `
            <div class="reconnect-message">
                <h3>Connection Lost</h3>
                <p>Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})</p>
                <div class="loading-spinner"></div>
            </div>
        `;
    }

    showStreamEndedMessage() {
        const overlay = this.createOverlay('stream-ended');
        overlay.innerHTML = `
            <div class="stream-ended">
                <h3>Stream Ended</h3>
                <p>The streamer has ended this broadcast or the connection could not be restored.</p>
                <button onclick="window.location.reload()">Find Another Stream</button>
            </div>
        `;
    }

    createOverlay(className) {
        this.removeOverlays();
        
        const overlay = document.createElement('div');
        overlay.className = `stream-overlay ${className}`;
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            z-index: 1000;
        `;
        
        if (this.videoElement && this.videoElement.parentNode) {
            this.videoElement.parentNode.style.position = 'relative';
            this.videoElement.parentNode.appendChild(overlay);
        }
        
        return overlay;
    }

    removeOverlays() {
        const overlays = document.querySelectorAll('.stream-overlay');
        overlays.forEach(overlay => overlay.remove());
    }

    async leaveStream() {
        if (this.streamId) {
            try {
                await this.icpActor.leaveStream(this.streamId);
            } catch (error) {
                console.error('Failed to leave stream cleanly:', error);
            }
        }
        
        this.cleanup();
    }

    cleanup(resetReconnectAttempts = true) {
        this.isConnected = false;
        
        if (resetReconnectAttempts) {
            this.reconnectAttempts = 0;
        }
        
        // Clear intervals
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        
        if (this.iceCandidateInterval) {
            clearTimeout(this.iceCandidateInterval);
            this.iceCandidateInterval = null;
        }
        
        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        // Clear video source
        if (this.videoElement && this.videoElement.srcObject) {
            const tracks = this.videoElement.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            this.videoElement.srcObject = null;
        }

        // Remove overlays
        this.removeOverlays();
    }

    // Get stream statistics
    async getStreamStats() {
        if (!this.peerConnection) return null;

        try {
            const stats = await this.peerConnection.getStats();
            const videoStats = {};
            
            stats.forEach(stat => {
                if (stat.type === 'inbound-rtp' && stat.mediaType === 'video') {
                    videoStats.bytesReceived = stat.bytesReceived || 0;
                    videoStats.packetsReceived = stat.packetsReceived || 0;
                    videoStats.packetsLost = stat.packetsLost || 0;
                    videoStats.framesDecoded = stat.framesDecoded || 0;
                    videoStats.frameWidth = stat.frameWidth || 0;
                    videoStats.frameHeight = stat.frameHeight || 0;
                    videoStats.framesPerSecond = stat.framesPerSecond || 0;
                }
            });

            this.stats.bytesReceived = videoStats.bytesReceived;
            this.stats.packetsLost = videoStats.packetsLost;
            this.stats.frameRate = videoStats.framesPerSecond;
            this.stats.resolution = {
                width: videoStats.frameWidth,
                height: videoStats.frameHeight
            };

            return {
                streamId: this.streamId,
                connectionState: this.peerConnection.connectionState,
                iceConnectionState: this.peerConnection.iceConnectionState,
                isConnected: this.isConnected,
                connectionQuality: this.stats.connectionQuality,
                watchTime: this.stats.joinTime ? Date.now() - this.stats.joinTime : 0,
                video: videoStats,
                ...this.stats
            };
        } catch (error) {
            console.error('Failed to get stream stats:', error);
            return {
                streamId: this.streamId,
                isConnected: this.isConnected,
                error: error.message
            };
        }
    }

    // Public getters
    get currentStreamId() {
        return this.streamId;
    }

    get connected() {
        return this.isConnected;
    }

    get connectionQuality() {
        return this.stats.connectionQuality;
    }
}

export default StreamViewer;
