/**
 * Streaming Utilities
 * Helper functions for WebRTC streaming functionality
 */

export const StreamingUtils = {
    
    /**
     * Check browser WebRTC support
     */
    checkWebRTCSupport() {
        const support = {
            webRTC: !!(window.RTCPeerConnection || window.webkitRTCPeerConnection),
            getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            getDisplayMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
            dataChannels: true
        };

        // Test data channel support
        try {
            const pc = new RTCPeerConnection();
            pc.createDataChannel('test');
            pc.close();
        } catch (e) {
            support.dataChannels = false;
        }

        return support;
    },

    /**
     * Get optimal video constraints based on device capabilities
     */
    async getOptimalVideoConstraints(preferredSettings = {}) {
        const defaults = {
            width: 1920,
            height: 1080,
            frameRate: 30
        };

        const settings = { ...defaults, ...preferredSettings };

        // Check if the requested resolution is supported
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: settings.width },
                    height: { ideal: settings.height },
                    frameRate: { ideal: settings.frameRate }
                }
            });
            
            const track = stream.getVideoTracks()[0];
            const actualSettings = track.getSettings();
            stream.getTracks().forEach(track => track.stop());
            
            return {
                width: { ideal: actualSettings.width || settings.width },
                height: { ideal: actualSettings.height || settings.height },
                frameRate: { ideal: actualSettings.frameRate || settings.frameRate }
            };
        } catch (error) {
            console.warn('Failed to test video constraints, using defaults:', error);
            return {
                width: { ideal: settings.width },
                height: { ideal: settings.height },
                frameRate: { ideal: settings.frameRate }
            };
        }
    },

    /**
     * Get audio constraints with echo cancellation and noise suppression
     */
    getOptimalAudioConstraints() {
        return {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 2
        };
    },

    /**
     * Generate a unique stream ID
     */
    generateStreamId(prefix = 'stream') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `${prefix}_${random}_${timestamp}`;
    },

    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    /**
     * Format duration to human readable format
     */
    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    },

    /**
     * Get connection quality based on ICE connection state
     */
    getConnectionQuality(iceConnectionState, stats = {}) {
        const packetLossRate = stats.packetsLost && stats.packetsReceived 
            ? (stats.packetsLost / (stats.packetsLost + stats.packetsReceived)) * 100 
            : 0;

        switch (iceConnectionState) {
            case 'connected':
            case 'completed':
                if (packetLossRate > 5) return 'poor';
                if (packetLossRate > 1) return 'fair';
                return 'excellent';
            case 'checking':
                return 'connecting';
            case 'disconnected':
                return 'poor';
            case 'failed':
                return 'failed';
            default:
                return 'unknown';
        }
    },

    /**
     * Calculate bitrate from bytes and time
     */
    calculateBitrate(bytes, timeMs) {
        if (timeMs <= 0) return 0;
        return (bytes * 8) / (timeMs / 1000); // bits per second
    },

    /**
     * Get display media with error handling
     */
    async getDisplayMedia(constraints) {
        try {
            return await navigator.mediaDevices.getDisplayMedia(constraints);
        } catch (error) {
            throw new Error(this.getDisplayMediaError(error));
        }
    },

    /**
     * Get user-friendly error message for display media errors
     */
    getDisplayMediaError(error) {
        switch (error.name) {
            case 'NotAllowedError':
                return 'Screen sharing permission denied. Please allow screen sharing and try again.';
            case 'NotFoundError':
                return 'No screen sharing source found.';
            case 'NotSupportedError':
                return 'Screen sharing is not supported in this browser.';
            case 'OverconstrainedError':
                return 'The requested screen sharing settings are not supported.';
            case 'SecurityError':
                return 'Screen sharing is not allowed due to security restrictions.';
            default:
                return `Screen sharing failed: ${error.message}`;
        }
    },

    /**
     * Monitor connection statistics
     */
    async monitorConnection(peerConnection, callback, interval = 5000) {
        if (!peerConnection || peerConnection.connectionState === 'closed') {
            return null;
        }

        const monitor = async () => {
            try {
                const stats = await peerConnection.getStats();
                const connectionStats = this.parseConnectionStats(stats);
                callback(connectionStats);

                if (peerConnection.connectionState !== 'closed') {
                    setTimeout(monitor, interval);
                }
            } catch (error) {
                console.error('Failed to get connection stats:', error);
            }
        };

        monitor();
        return monitor;
    },

    /**
     * Parse WebRTC stats into readable format
     */
    parseConnectionStats(stats) {
        const result = {
            audio: { inbound: {}, outbound: {} },
            video: { inbound: {}, outbound: {} },
            connection: {}
        };

        stats.forEach(stat => {
            switch (stat.type) {
                case 'inbound-rtp':
                    if (stat.mediaType === 'video') {
                        result.video.inbound = {
                            bytesReceived: stat.bytesReceived || 0,
                            packetsReceived: stat.packetsReceived || 0,
                            packetsLost: stat.packetsLost || 0,
                            framesDecoded: stat.framesDecoded || 0,
                            frameWidth: stat.frameWidth || 0,
                            frameHeight: stat.frameHeight || 0,
                            framesPerSecond: stat.framesPerSecond || 0
                        };
                    } else if (stat.mediaType === 'audio') {
                        result.audio.inbound = {
                            bytesReceived: stat.bytesReceived || 0,
                            packetsReceived: stat.packetsReceived || 0,
                            packetsLost: stat.packetsLost || 0
                        };
                    }
                    break;

                case 'outbound-rtp':
                    if (stat.mediaType === 'video') {
                        result.video.outbound = {
                            bytesSent: stat.bytesSent || 0,
                            packetsSent: stat.packetsSent || 0,
                            framesEncoded: stat.framesEncoded || 0,
                            frameWidth: stat.frameWidth || 0,
                            frameHeight: stat.frameHeight || 0,
                            framesPerSecond: stat.framesPerSecond || 0
                        };
                    } else if (stat.mediaType === 'audio') {
                        result.audio.outbound = {
                            bytesSent: stat.bytesSent || 0,
                            packetsSent: stat.packetsSent || 0
                        };
                    }
                    break;

                case 'candidate-pair':
                    if (stat.state === 'succeeded') {
                        result.connection = {
                            currentRoundTripTime: stat.currentRoundTripTime || 0,
                            totalRoundTripTime: stat.totalRoundTripTime || 0,
                            bytesReceived: stat.bytesReceived || 0,
                            bytesSent: stat.bytesSent || 0
                        };
                    }
                    break;
            }
        });

        return result;
    },

    /**
     * Create a simple data channel for metrics
     */
    createMetricsDataChannel(peerConnection, label = 'metrics') {
        try {
            const dataChannel = peerConnection.createDataChannel(label, {
                ordered: true,
                maxRetransmits: 3
            });

            dataChannel.onopen = () => {
                console.log(`Data channel '${label}' opened`);
            };

            dataChannel.onerror = (error) => {
                console.error(`Data channel '${label}' error:`, error);
            };

            dataChannel.onclose = () => {
                console.log(`Data channel '${label}' closed`);
            };

            return dataChannel;
        } catch (error) {
            console.error('Failed to create data channel:', error);
            return null;
        }
    },

    /**
     * Validate stream settings
     */
    validateStreamSettings(settings) {
        const errors = [];

        if (!settings.title || settings.title.trim().length === 0) {
            errors.push('Stream title is required');
        }

        if (settings.title && settings.title.length > 100) {
            errors.push('Stream title must be less than 100 characters');
        }

        if (!settings.category) {
            errors.push('Stream category is required');
        }

        if (settings.maxViewers && (settings.maxViewers < 1 || settings.maxViewers > 1000)) {
            errors.push('Max viewers must be between 1 and 1000');
        }

        if (settings.frameRate && ![15, 30, 60].includes(settings.frameRate)) {
            errors.push('Frame rate must be 15, 30, or 60 FPS');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    },

    /**
     * Get browser compatibility info
     */
    getBrowserInfo() {
        const userAgent = navigator.userAgent;
        let browser = 'Unknown';
        let version = 'Unknown';

        if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
            browser = 'Chrome';
            version = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
        } else if (userAgent.includes('Firefox')) {
            browser = 'Firefox';
            version = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
        } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
            browser = 'Safari';
            version = userAgent.match(/Version\/(\d+)/)?.[1] || 'Unknown';
        } else if (userAgent.includes('Edg')) {
            browser = 'Edge';
            version = userAgent.match(/Edg\/(\d+)/)?.[1] || 'Unknown';
        }

        return { browser, version };
    },

    /**
     * Check if browser supports required features
     */
    checkFeatureSupport() {
        const support = this.checkWebRTCSupport();
        const browserInfo = this.getBrowserInfo();
        
        const recommendations = [];
        
        if (!support.webRTC) {
            recommendations.push('WebRTC is not supported. Please use a modern browser.');
        }
        
        if (!support.getDisplayMedia) {
            recommendations.push('Screen sharing is not supported. Please update your browser.');
        }
        
        if (browserInfo.browser === 'Safari' && parseInt(browserInfo.version) < 14) {
            recommendations.push('Safari 14+ is recommended for best streaming experience.');
        }
        
        if (browserInfo.browser === 'Firefox' && parseInt(browserInfo.version) < 80) {
            recommendations.push('Firefox 80+ is recommended for best streaming experience.');
        }

        return {
            supported: support.webRTC && support.getDisplayMedia,
            support,
            browserInfo,
            recommendations
        };
    }
};

export default StreamingUtils;
