import { ActorSubclass } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

// WebRTC Types
export interface SignalingMessage {
  streamId: string;
  senderId: string;
  receiverId?: string;
  messageType: 'offer' | 'answer' | 'iceCandidate' | 'viewerJoin' | 'viewerLeave' | 'streamEnd' | 'heartbeat' | 'chatMessage' | 'typing' | 'userJoin' | 'userLeave';
  payload: string;
  timestamp: number;
}

export interface StreamSession {
  id: string;
  streamerId: string;
  viewers: string[];
  status: 'active' | 'inactive' | 'ended';
  createdAt: number;
  endedAt?: number;
  title: string;
  description: string;
}

export interface ICEServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
  credentialType?: 'password' | 'oauth';
}

export interface WebRTCConfig {
  iceServers: ICEServerConfig[];
  iceCandidatePoolSize?: number;
}

export class WebRTCStreamingService {
  private actor: ActorSubclass<any>;
  private localPeerConnections: Map<string, RTCPeerConnection> = new Map(); // For streamers (multiple viewers)
  private remotePeerConnection: RTCPeerConnection | null = null; // For viewers (single streamer)
  private localStream: MediaStream | null = null;
  private currentSessionId: string | null = null;
  private isStreamer: boolean = false;
  private isConnecting: boolean = false; // Add connection state tracking
  private messagePollingInterval: number | null = null;
  private onStreamReceived?: (stream: MediaStream) => void;
  private onStreamEnded?: () => void;
  private onViewerCountChanged?: (count: number) => void;

  // Chat data channels
  private dataChannels: Map<string, RTCDataChannel> = new Map(); // For streamers (multiple viewers)
  private remoteDataChannel: RTCDataChannel | null = null; // For viewers (single streamer)
  private onChatMessage?: (message: any) => void;
  private onUserJoined?: (user: any) => void;
  private onUserLeft?: (user: any) => void;
  private onTypingUpdate?: (userId: string, isTyping: boolean) => void;

  // Queue for messages received before handlers are set
  private pendingMessages: Array<{type: string, data: any, senderId: string}> = [];
  private handlersInitialized: boolean = false;

  // WebRTC Configuration with STUN/TURN servers
  private rtcConfiguration: WebRTCConfig = {
    iceServers: [
      // Public STUN servers
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      
      // Add your TURN servers here
      // {
      //   urls: 'turn:your-turn-server.com:3478',
      //   username: 'your-username',
      //   credential: 'your-password',
      //   credentialType: 'password'
      // },
      // {
      //   urls: 'turns:your-turn-server.com:5349',
      //   username: 'your-username',
      //   credential: 'your-password',
      //   credentialType: 'password'
      // }
    ],
    iceCandidatePoolSize: 10
  };

  constructor(actor: ActorSubclass<any>) {
    this.actor = actor;
  }

  // Utility method to safely parse JSON
  private safeJsonParse<T>(jsonString: any, context: string): T | null {
    try {
      // Handle case where input might not be a string
      if (jsonString === null || jsonString === undefined) {
        console.log(`Null/undefined ${context} received, skipping`);
        return null;
      }
      
      // Convert to string if it's not already
      const jsonStr = typeof jsonString === 'string' ? jsonString : String(jsonString);
      
      if (!jsonStr || jsonStr.trim() === '') {
        console.log(`Empty ${context} received, skipping`);
        return null;
      }
      
      console.log(`Parsing ${context}:`, jsonStr.substring(0, 100) + (jsonStr.length > 100 ? '...' : ''));
      return JSON.parse(jsonStr) as T;
    } catch (error) {
      console.error(`Error parsing ${context} JSON:`, error, 'Raw data:', jsonString);
      return null;
    }
  }

  // Configure TURN servers
  public configureTurnServers(turnServers: ICEServerConfig[]): void {
    this.rtcConfiguration.iceServers = [
      ...this.rtcConfiguration.iceServers.filter(server => 
        typeof server.urls === 'string' ? 
          server.urls.startsWith('stun:') : 
          server.urls.some(url => url.startsWith('stun:'))
      ),
      ...turnServers
    ];
  }

  // Set event handlers
  public setEventHandlers(handlers: {
    onStreamReceived?: (stream: MediaStream) => void;
    onStreamEnded?: () => void;
    onViewerCountChanged?: (count: number) => void;
    onChatMessage?: (message: any) => void;
    onUserJoined?: (user: any) => void;
    onUserLeft?: (user: any) => void;
    onTypingUpdate?: (userId: string, isTyping: boolean) => void;
  }): void {
    console.log('Setting event handlers:', handlers);
    console.log('onChatMessage handler type:', typeof handlers.onChatMessage);
    this.onStreamReceived = handlers.onStreamReceived;
    this.onStreamEnded = handlers.onStreamEnded;
    this.onViewerCountChanged = handlers.onViewerCountChanged;
    this.onChatMessage = handlers.onChatMessage;
    this.onUserJoined = handlers.onUserJoined;
    this.onUserLeft = handlers.onUserLeft;
    this.onTypingUpdate = handlers.onTypingUpdate;
    this.handlersInitialized = true;
    console.log('Event handlers set. onChatMessage is now:', typeof this.onChatMessage);
    
    // Process any pending messages that arrived before handlers were set
    if (this.pendingMessages.length > 0) {
      console.log(`Processing ${this.pendingMessages.length} pending messages`);
      const messagesToProcess = [...this.pendingMessages];
      this.pendingMessages = []; // Clear the queue
      
      // Process each pending message
      messagesToProcess.forEach(({type, data, senderId}) => {
        console.log(`Processing pending message of type: ${type}`);
        this.processMessage(type, data, senderId);
      });
    }
  }

  // Start streaming (for streamers)
  public async startStreaming(title: string, description: string, category: string): Promise<string | null> {
    try {
      console.log('Starting streaming process...');
      
      // Prevent multiple concurrent streaming attempts
      if (this.isStreamer && this.currentSessionId) {
        console.log('Already streaming with session:', this.currentSessionId);
        return this.currentSessionId;
      }

      if (this.isConnecting) {
        console.log('Already connecting, ignoring duplicate startStreaming call');
        return null;
      }

      this.isConnecting = true;
      
      // Get user media first
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log('Got local media stream:', this.localStream);

      // Create WebRTC stream session on backend
      const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await this.actor.createWebRTCStream({
        streamId,
        title,
        category,
        maxViewers: 100
      });

      if ('ok' in result) {
        this.currentSessionId = streamId;
        this.isStreamer = true;
        this.isConnecting = false;
        
        console.log('WebRTC stream created successfully:', streamId);
        
        // Start polling for viewer connections
        this.startMessagePolling();
        
        return streamId;
      } else {
        console.error('Failed to create WebRTC stream:', result.err);
        this.isConnecting = false;
        this.cleanup();
        return null;
      }
    } catch (error) {
      console.error('Error starting stream:', error);
      this.isConnecting = false;
      this.cleanup();
      return null;
    }
  }

  // Join stream (for viewers)
  public async joinStream(streamId: string): Promise<boolean> {
    try {
      console.log('Joining stream:', streamId);
      
      // Check if actor is available
      if (!this.actor) {
        console.error('Actor not available for joining stream');
        return false;
      }
      
      // Check if already connected to this stream
      if (this.currentSessionId === streamId && !this.isStreamer && this.remotePeerConnection) {
        console.log('Already connected to this stream');
        return true;
      }
      
      // Check if already connecting
      if (this.isConnecting) {
        console.log('Connection already in progress');
        return false;
      }
      
      // Set connecting state
      this.isConnecting = true;
      
      // Clean up any existing connections before joining new stream
      this.cleanup();
      
      this.currentSessionId = streamId;
      this.isStreamer = false;
      
      // Create peer connection for receiving stream
      this.remotePeerConnection = new RTCPeerConnection(this.rtcConfiguration);
      
      // CRITICAL: Viewer must create data channel BEFORE creating offer
      // This ensures data channel is included in the offer SDP
      console.log('Viewer creating data channel before offer...');
      try {
        const dataChannel = this.remotePeerConnection.createDataChannel('chat', {
          ordered: true,
          maxRetransmits: 3
        });
        
        console.log('Viewer data channel created, state:', dataChannel.readyState);
        
        dataChannel.onopen = () => {
          console.log('Viewer data channel opened');
          this.remoteDataChannel = dataChannel;
        };
        
        dataChannel.onclose = () => {
          console.log('Viewer data channel closed');
          this.remoteDataChannel = null;
        };
        
        dataChannel.onmessage = (event) => {
          console.log('Viewer received message via data channel:', event.data);
          this.handleDataChannelMessage(event.data, 'streamer');
        };
        
        dataChannel.onerror = (error) => {
          console.error('Viewer data channel error:', error);
        };
        
        // Store the data channel reference immediately
        this.remoteDataChannel = dataChannel;
        console.log('Viewer data channel stored successfully');
        
      } catch (error) {
        console.error('Error creating viewer data channel:', error);
        throw error;
      }
      
      // Handle incoming stream
      this.remotePeerConnection.ontrack = (event) => {
        console.log('Received remote track:', event);
        if (event.streams && event.streams[0] && this.onStreamReceived) {
          this.onStreamReceived(event.streams[0]);
        }
      };

      // Handle incoming data channel for chat
      this.remotePeerConnection.ondatachannel = (event) => {
        console.log('Received data channel:', event);
        this.handleIncomingDataChannel(event);
      };
      
      // Handle ICE candidates
      this.remotePeerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate:', event.candidate);
          await this.sendIceCandidate(event.candidate);
        }
      };
      
      // Handle connection state changes
      this.remotePeerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', this.remotePeerConnection?.connectionState);
        if (this.remotePeerConnection?.connectionState === 'disconnected' || 
            this.remotePeerConnection?.connectionState === 'failed') {
          this.handleStreamEnd();
        }
      };
      
      // Create offer
      const offer = await this.remotePeerConnection.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: true
      });
      
      await this.remotePeerConnection.setLocalDescription(offer);
      
      console.log('Created offer:', offer);
      
      // Debug: Check if offer includes data channel
      if (offer.sdp) {
        const hasDataChannel = offer.sdp.includes('m=application');
        console.log(`Viewer offer SDP includes data channel: ${hasDataChannel}`);
        if (hasDataChannel) {
          console.log('Data channel should be negotiated with streamer');
        } else {
          console.warn('Viewer offer does not include data channel!');
        }
      }
      
      // Join stream on backend with offer
      const result = await this.actor.joinStream(streamId, JSON.stringify(offer));
      
      if ('ok' in result) {
        console.log('Successfully joined stream');
        
        // Start polling for answers and ICE candidates
        this.startMessagePolling();
        
        // Clear connecting state
        this.isConnecting = false;
        
        return true;
      } else {
        console.error('Failed to join stream:', result.err);
        this.isConnecting = false;
        this.cleanup();
        return false;
      }
    } catch (error) {
      console.error('Error joining stream:', error);
      this.isConnecting = false;
      this.cleanup();
      return false;
    }
  }

  // End streaming
  public async endStream(): Promise<boolean> {
    if (!this.currentSessionId || !this.isStreamer) {
      return false;
    }

    try {
      // Note: You'll need to add this method to your backend
      // const result = await this.actor.endWebRTCStream(this.currentSessionId);
      
      this.cleanup();
      return true;
    } catch (error) {
      console.error('Error ending stream:', error);
      this.cleanup();
      return false;
    }
  }

  // Get local stream (for streamers)
  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // Get remote stream (for viewers)
  public getRemoteStream(): MediaStream | null {
    if (this.remotePeerConnection) {
      const receivers = this.remotePeerConnection.getReceivers();
      if (receivers.length > 0 && receivers[0].track) {
        return new MediaStream(receivers.map(receiver => receiver.track!).filter(track => track));
      }
    }
    return null;
  }

  // Private methods

  private async startMessagePolling(): Promise<void> {
    if (this.messagePollingInterval) {
      clearInterval(this.messagePollingInterval);
    }

    this.messagePollingInterval = window.setInterval(async () => {
      try {
        if (this.isStreamer) {
          await this.pollForViewers();
        } else {
          await this.pollForAnswerAndIceCandidates();
        }
      } catch (error) {
        console.error('Error polling messages:', error);
      }
    }, 1000);
  }

  private async pollForViewers(): Promise<void> {
    if (!this.currentSessionId) return;

    try {
      const result = await this.actor.getPendingViewers(this.currentSessionId);
      
      if ('ok' in result) {
        for (const viewer of result.ok) {
          await this.handleViewerOffer(viewer.viewerId, viewer.offer);
        }
      }
    } catch (error) {
      console.error('Error polling for viewers:', error);
    }
  }

  private async pollForAnswerAndIceCandidates(): Promise<void> {
    if (!this.currentSessionId) return;

    try {
      // Poll for answer
      const answerResult = await this.actor.getAnswer(this.currentSessionId);
      
      console.log('Answer result:', answerResult);
      
      if ('ok' in answerResult && answerResult.ok) {
        // Handle case where backend returns array instead of string
        const answerData = Array.isArray(answerResult.ok) ? answerResult.ok[0] : answerResult.ok;
        const answer = this.safeJsonParse<RTCSessionDescriptionInit>(answerData, 'answer');
        if (answer && this.remotePeerConnection && this.remotePeerConnection.signalingState === 'have-local-offer') {
          console.log('Received answer:', answer);
          
          // Debug: Check if answer includes data channel
          if (answer.sdp) {
            const hasDataChannel = answer.sdp.includes('m=application');
            console.log(`Answer SDP includes data channel: ${hasDataChannel}`);
            if (!hasDataChannel) {
              console.warn('Answer does not include data channel - data channel will not work');
            }
          }
          
          await this.remotePeerConnection.setRemoteDescription(answer);
        }
      }

      // Poll for ICE candidates
      const iceCandidatesResult = await this.actor.getIceCandidates(this.currentSessionId);
      
      console.log('ICE candidates result:', iceCandidatesResult);
      
      if ('ok' in iceCandidatesResult) {
        for (const candidateStr of iceCandidatesResult.ok) {
          const candidate = this.safeJsonParse<RTCIceCandidateInit>(candidateStr, 'ICE candidate');
          if (candidate && this.remotePeerConnection && this.remotePeerConnection.remoteDescription) {
            console.log('Adding ICE candidate:', candidate);
            await this.remotePeerConnection.addIceCandidate(candidate);
          }
        }
      }
    } catch (error) {
      console.error('Error polling for answer and ICE candidates:', error);
    }
  }

  private async handleViewerOffer(viewerId: string, offerStr: string): Promise<void> {
    try {
      console.log('Handling viewer offer from:', viewerId);
      
      // Don't handle the same viewer multiple times
      if (this.localPeerConnections.has(viewerId)) {
        return;
      }

      const offer = this.safeJsonParse<RTCSessionDescriptionInit>(offerStr, 'viewer offer');
      if (!offer) {
        console.error('Failed to parse viewer offer, skipping');
        return;
      }
      
      // Create new peer connection for this viewer
      const peerConnection = new RTCPeerConnection(this.rtcConfiguration);
      
      // Add local stream tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, this.localStream!);
        });
      }
      
      // Handle ICE candidates
      peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate to viewer:', viewerId);
          await this.sendIceCandidateToViewer(viewerId, event.candidate);
        }
      };

      // Handle ICE connection state for monitoring
      peerConnection.oniceconnectionstatechange = () => {
        console.log(`ICE connection state with ${viewerId}:`, peerConnection.iceConnectionState);
      };
      
      // Handle connection state
      peerConnection.onconnectionstatechange = () => {
        console.log(`Connection state with ${viewerId}:`, peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          // Check if data channel opened
          console.log(`Peer connection established with ${viewerId}, checking data channels...`);
          this.checkDataChannelStatus(viewerId);
        } else if (peerConnection.connectionState === 'disconnected' || 
            peerConnection.connectionState === 'failed') {
          this.localPeerConnections.delete(viewerId);
          this.updateViewerCount();
        }
      };
      
      // Handle incoming data channel from viewer
      peerConnection.ondatachannel = (event) => {
        console.log(`Streamer received data channel from viewer ${viewerId}:`, event.channel);
        const dataChannel = event.channel;
        
        dataChannel.onopen = () => {
          console.log(`Data channel opened from viewer ${viewerId}`);
          this.dataChannels.set(viewerId, dataChannel);
          console.log(`Data channels count after open: ${this.dataChannels.size}`);
        };

        dataChannel.onclose = () => {
          console.log(`Data channel closed from viewer ${viewerId}`);
          this.dataChannels.delete(viewerId);
          console.log(`Data channels count after close: ${this.dataChannels.size}`);
        };

        dataChannel.onmessage = (event) => {
          this.handleDataChannelMessage(event.data, viewerId);
        };

        dataChannel.onerror = (error) => {
          console.error(`Data channel error from viewer ${viewerId}:`, error);
        };
      };
      
      console.log('Streamer ready to receive data channel from viewer...');
      
      // Set remote description and create answer
      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      console.log('Created answer for viewer:', viewerId);
      
      // Debug: Check if data channel is in the SDP
      if (answer.sdp) {
        const hasDataChannel = answer.sdp.includes('m=application');
        console.log(`Answer SDP includes data channel: ${hasDataChannel}`);
        if (hasDataChannel) {
          console.log('Data channel should be negotiated with viewer');
        } else {
          console.warn('Data channel NOT found in SDP - this is the problem!');
        }
      }
      
      // Send answer to viewer
      const result = await this.actor.sendAnswer({
        streamId: this.currentSessionId!,
        viewerId,
        answer: JSON.stringify(answer)
      });
      
      if ('ok' in result) {
        this.localPeerConnections.set(viewerId, peerConnection);
        this.updateViewerCount();
      } else {
        console.error('Failed to send answer:', result.err);
        peerConnection.close();
      }
    } catch (error) {
      console.error('Error handling viewer offer:', error);
    }
  }

  private async sendIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    if (!this.currentSessionId) return;

    try {
      await this.actor.sendIceCandidate({
        streamId: this.currentSessionId,
        targetId: [], // null for viewers
        candidate: JSON.stringify(candidate)
      });
    } catch (error) {
      console.error('Error sending ICE candidate:', error);
    }
  }

  private async sendIceCandidateToViewer(viewerId: string, candidate: RTCIceCandidate): Promise<void> {
    if (!this.currentSessionId) return;

    try {
      await this.actor.sendIceCandidate({
        streamId: this.currentSessionId,
        targetId: [viewerId], // wrapped in array for optional type
        candidate: JSON.stringify(candidate)
      });
    } catch (error) {
      console.error('Error sending ICE candidate to viewer:', error);
    }
  }

  private updateViewerCount(): void {
    const count = this.localPeerConnections.size;
    console.log('Viewer count updated:', count);
    if (this.onViewerCountChanged) {
      this.onViewerCountChanged(count);
    }
  }

  private handleStreamEnd(): void {
    console.log('Stream ended');
    if (this.onStreamEnded) {
      this.onStreamEnded();
    }
    this.cleanup();
  }

  private cleanup(): void {
    console.log('Cleaning up WebRTC connections');
    
    // Stop message polling
    if (this.messagePollingInterval) {
      clearInterval(this.messagePollingInterval);
      this.messagePollingInterval = null;
    }
    
    // Close all peer connections
    this.localPeerConnections.forEach(pc => pc.close());
    this.localPeerConnections.clear();
    
    if (this.remotePeerConnection) {
      this.remotePeerConnection.close();
      this.remotePeerConnection = null;
    }
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Reset state
    this.currentSessionId = null;
    this.isStreamer = false;
    this.isConnecting = false;
    this.handlersInitialized = false;
    this.pendingMessages = [];
  }

  // Public cleanup method
  public disconnect(): void {
    this.cleanup();
  }

  // Check if currently connected to a stream
  public isConnectedToStream(streamId?: string): boolean {
    if (streamId) {
      return this.currentSessionId === streamId && !this.isConnecting;
    }
    return this.currentSessionId !== null && !this.isConnecting;
  }

  // Check if currently connecting
  public isCurrentlyConnecting(): boolean {
    return this.isConnecting;
  }

  // Get connection stats for debugging
  public async getConnectionStats(): Promise<any> {
    const stats: any = {};
    
    if (this.isStreamer) {
      for (const [viewerId, pc] of this.localPeerConnections) {
        const pcStats = await pc.getStats();
        stats[viewerId] = Array.from(pcStats.values());
      }
    } else if (this.remotePeerConnection) {
      const pcStats = await this.remotePeerConnection.getStats();
      stats.viewer = Array.from(pcStats.values());
    }
    
    return stats;
  }

  // Chat functionality methods
  
  // Create data channel for chat (streamer side)
  private setupDataChannel(peerConnection: RTCPeerConnection, viewerId: string): RTCDataChannel {
    console.log(`Creating data channel for viewer ${viewerId}, peer connection state: ${peerConnection.connectionState}`);
    
    const dataChannel = peerConnection.createDataChannel('chat', {
      ordered: true,
      maxRetransmits: 3
    });

    console.log(`Data channel created for viewer ${viewerId}, initial state: ${dataChannel.readyState}`);

    // Store the data channel immediately, even before it opens
    // We'll track its state changes
    const tempChannelMap = new Map();
    tempChannelMap.set(viewerId, dataChannel);
    console.log(`Storing data channel reference for ${viewerId} (state: ${dataChannel.readyState})`);

    dataChannel.onopen = () => {
      console.log(`Data channel opened for viewer ${viewerId}, setting in map`);
      this.dataChannels.set(viewerId, dataChannel);
      console.log(`Data channels count after open: ${this.dataChannels.size}`);
    };

    dataChannel.onclose = () => {
      console.log(`Data channel closed for viewer ${viewerId}`);
      this.dataChannels.delete(viewerId);
      console.log(`Data channels count after close: ${this.dataChannels.size}`);
    };

    dataChannel.onmessage = (event) => {
      this.handleDataChannelMessage(event.data, viewerId);
    };

    dataChannel.onerror = (error) => {
      console.error(`Data channel error for viewer ${viewerId}:`, error);
    };

    // Set up a timeout to check if the data channel opens within a reasonable time
    setTimeout(() => {
      console.log(`Data channel timeout check for ${viewerId}: state = ${dataChannel.readyState}`);
      if (dataChannel.readyState !== 'open') {
        console.warn(`Data channel for ${viewerId} did not open within 10 seconds. Current state: ${dataChannel.readyState}`);
      }
    }, 10000);

    return dataChannel;
  }

  // Handle incoming data channel (viewer side)
  private handleIncomingDataChannel(event: RTCDataChannelEvent): void {
    const dataChannel = event.channel;
    console.log(`Incoming data channel received (viewer), label: ${dataChannel.label}, state: ${dataChannel.readyState}`);
    this.remoteDataChannel = dataChannel;

    dataChannel.onopen = () => {
      console.log('Data channel opened (viewer) - chat is now ready');
    };

    dataChannel.onclose = () => {
      console.log('Data channel closed (viewer)');
      this.remoteDataChannel = null;
    };

    dataChannel.onmessage = (event) => {
      this.handleDataChannelMessage(event.data, 'streamer');
    };

    dataChannel.onerror = (error) => {
      console.error('Data channel error (viewer):', error);
    };
  }

  // Handle data channel messages
  private handleDataChannelMessage(data: string, senderId: string): void {
    console.log(`Handling data channel message from ${senderId}:`, data);
    try {
      const message = JSON.parse(data);
      console.log(`Parsed message type: ${message.type}`, message);
      
      // If handlers are not initialized yet, queue the message
      if (!this.handlersInitialized) {
        console.log('Handlers not initialized yet, queueing message');
        this.pendingMessages.push({
          type: message.type,
          data: message.data,
          senderId: senderId
        });
        return;
      }

      // Process the message immediately
      this.processMessage(message.type, message.data, senderId);
    } catch (error) {
      console.error('Error parsing data channel message:', error);
    }
  }

  // Process individual message types
  private processMessage(type: string, data: any, senderId: string): void {
    console.log(`Processing message type: ${type} from ${senderId}`);
    
    switch (type) {
      case 'chatMessage':
        console.log(`Processing chat message from ${senderId}`, data);
        // If this is a streamer receiving a message from a viewer, broadcast it to all viewers
        if (this.isStreamer) {
          console.log(`Streamer broadcasting message to ${this.dataChannels.size} viewers`);
          // Broadcast to all viewers (including the original sender)
          this.dataChannels.forEach((dataChannel, viewerId) => {
            if (dataChannel.readyState === 'open') {
              try {
                const messageToForward = {
                  type: 'chatMessage',
                  data: data,
                  timestamp: Date.now()
                };
                dataChannel.send(JSON.stringify(messageToForward)); // Forward the original message
                console.log(`Forwarded message to viewer ${viewerId}`);
              } catch (error) {
                console.error(`Error forwarding chat message to viewer ${viewerId}:`, error);
              }
            }
          });
        } else {
          console.log('Viewer received chat message');
        }
        // Always trigger the local chat message handler
        console.log('Triggering onChatMessage callback');
        console.log('onChatMessage exists:', !!this.onChatMessage);
        console.log('Message data being passed:', data);
        console.log('onChatMessage function:', this.onChatMessage);
        this.onChatMessage?.(data);
        break;
      case 'userJoined':
        this.onUserJoined?.(data);
        break;
      case 'userLeft':
        this.onUserLeft?.(data);
        break;
      case 'typing':
        this.onTypingUpdate?.(senderId, data.isTyping);
        break;
      default:
        console.log('Unknown data channel message type:', type);
    }
  }

  // Send chat message
  public sendChatMessage(message: any): void {
    const chatData = {
      type: 'chatMessage',
      data: message,
      timestamp: Date.now()
    };

    const messageStr = JSON.stringify(chatData);
    console.log('Attempting to send chat message:', message);
    console.log('WebRTC service state - isStreamer:', this.isStreamer, 'dataChannels count:', this.dataChannels.size);

    if (this.isStreamer) {
      // Broadcast to all viewers
      let sentCount = 0;
      this.dataChannels.forEach((dataChannel, viewerId) => {
        console.log(`Data channel to ${viewerId} state:`, dataChannel.readyState);
        if (dataChannel.readyState === 'open') {
          try {
            dataChannel.send(messageStr);
            sentCount++;
            console.log(`Successfully sent message to viewer ${viewerId}`);
          } catch (error) {
            console.error(`Error sending chat message to viewer ${viewerId}:`, error);
          }
        } else {
          console.warn(`Data channel to ${viewerId} not open: ${dataChannel.readyState}`);
        }
      });
      
      console.log(`Sent message to ${sentCount} out of ${this.dataChannels.size} viewers`);
      
      // For streamers, also trigger their own chat message handler directly
      // since they don't receive their own messages back through data channels
      this.onChatMessage?.(message);
    } else if (this.remoteDataChannel) {
      console.log('Viewer data channel state:', this.remoteDataChannel.readyState);
      if (this.remoteDataChannel.readyState === 'open') {
        // Send to streamer (viewers sending to streamer)
        try {
          this.remoteDataChannel.send(messageStr);
          console.log('Successfully sent message to streamer');
        } catch (error) {
          console.error('Error sending chat message to streamer:', error);
        }
      } else {
        console.warn(`Data channel to streamer not open: ${this.remoteDataChannel.readyState}`);
      }
    } else {
      console.error('No data channels available for sending chat message');
    }
  }

  // Send typing indicator
  public sendTypingIndicator(isTyping: boolean): void {
    const typingData = {
      type: 'typing',
      data: { isTyping },
      timestamp: Date.now()
    };

    const messageStr = JSON.stringify(typingData);

    if (this.isStreamer) {
      // Broadcast to all viewers
      this.dataChannels.forEach((dataChannel, viewerId) => {
        if (dataChannel.readyState === 'open') {
          try {
            dataChannel.send(messageStr);
          } catch (error) {
            console.error(`Error sending typing indicator to viewer ${viewerId}:`, error);
          }
        }
      });
    } else if (this.remoteDataChannel && this.remoteDataChannel.readyState === 'open') {
      // Send to streamer
      try {
        this.remoteDataChannel.send(messageStr);
      } catch (error) {
        console.error('Error sending typing indicator to streamer:', error);
      }
    }
  }

  // Send user joined notification
  public sendUserJoined(user: any): void {
    const userData = {
      type: 'userJoined',
      data: user,
      timestamp: Date.now()
    };

    const messageStr = JSON.stringify(userData);

    if (this.isStreamer) {
      // Broadcast to all viewers
      this.dataChannels.forEach((dataChannel, viewerId) => {
        if (dataChannel.readyState === 'open') {
          try {
            dataChannel.send(messageStr);
          } catch (error) {
            console.error(`Error sending user joined to viewer ${viewerId}:`, error);
          }
        }
      });
    }
  }

  // Send user left notification
  public sendUserLeft(user: any): void {
    const userData = {
      type: 'userLeft',
      data: user,
      timestamp: Date.now()
    };

    const messageStr = JSON.stringify(userData);

    if (this.isStreamer) {
      // Broadcast to all viewers
      this.dataChannels.forEach((dataChannel, viewerId) => {
        if (dataChannel.readyState === 'open') {
          try {
            dataChannel.send(messageStr);
          } catch (error) {
            console.error(`Error sending user left to viewer ${viewerId}:`, error);
          }
        }
      });
    }
  }

  // Get data channel status
  public getDataChannelStatus(): { [key: string]: string } {
    const status: { [key: string]: string } = {};

    if (this.isStreamer) {
      this.dataChannels.forEach((dataChannel, viewerId) => {
        status[viewerId] = dataChannel.readyState;
      });
    } else if (this.remoteDataChannel) {
      status.streamer = this.remoteDataChannel.readyState;
    }

    return status;
  }

  // Check data channel status for debugging
  private checkDataChannelStatus(viewerId: string): void {
    // Find any data channels associated with this peer connection
    const peerConnection = this.localPeerConnections.get(viewerId);
    if (peerConnection) {
      console.log(`Checking data channels for viewer ${viewerId}:`);
      console.log(`- Data channels in map: ${this.dataChannels.size}`);
      console.log(`- Data channel for this viewer exists: ${this.dataChannels.has(viewerId)}`);
      
      if (this.dataChannels.has(viewerId)) {
        const dataChannel = this.dataChannels.get(viewerId)!;
        console.log(`- Data channel state: ${dataChannel.readyState}`);
      } else {
        console.log(`- No data channel found in map for viewer ${viewerId}`);
        console.log(`- This suggests the data channel never opened`);
      }
    }
  }

  // Check if chat is ready
  public isChatReady(): boolean {
    if (this.isStreamer) {
      // For streamers, chat is ready if at least one data channel is open
      for (const [viewerId, dataChannel] of this.dataChannels) {
        if (dataChannel.readyState === 'open') {
          return true;
        }
      }
      return false;
    } else {
      // For viewers, chat is ready if the remote data channel is open
      return this.remoteDataChannel?.readyState === 'open';
    }
  }

  // Get connection info for debugging
  public getConnectionInfo(): { 
    isStreamer: boolean; 
    dataChannelsCount: number; 
    dataChannelStatus: { [key: string]: string };
    sessionId: string | null;
  } {
    return {
      isStreamer: this.isStreamer,
      dataChannelsCount: this.isStreamer ? this.dataChannels.size : (this.remoteDataChannel ? 1 : 0),
      dataChannelStatus: this.getDataChannelStatus(),
      sessionId: this.currentSessionId
    };
  }
}