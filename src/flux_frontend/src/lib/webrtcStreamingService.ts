import { ActorSubclass } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

// WebRTC Types
export interface SignalingMessage {
  streamId: string;
  senderId: string;
  receiverId?: string;
  messageType: 'offer' | 'answer' | 'iceCandidate' | 'viewerJoin' | 'viewerLeave' | 'streamEnd' | 'heartbeat';
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
  }): void {
    this.onStreamReceived = handlers.onStreamReceived;
    this.onStreamEnded = handlers.onStreamEnded;
    this.onViewerCountChanged = handlers.onViewerCountChanged;
  }

  // Start streaming (for streamers)
  public async startStreaming(title: string, description: string, category: string): Promise<string | null> {
    try {
      console.log('Starting streaming process...');
      
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
        
        console.log('WebRTC stream created successfully:', streamId);
        
        // Start polling for viewer connections
        this.startMessagePolling();
        
        return streamId;
      } else {
        console.error('Failed to create WebRTC stream:', result.err);
        this.cleanup();
        return null;
      }
    } catch (error) {
      console.error('Error starting stream:', error);
      this.cleanup();
      return null;
    }
  }

  // Join stream (for viewers)
  public async joinStream(streamId: string): Promise<boolean> {
    try {
      console.log('Joining stream:', streamId);
      
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
      
      // Handle incoming stream
      this.remotePeerConnection.ontrack = (event) => {
        console.log('Received remote track:', event);
        if (event.streams && event.streams[0] && this.onStreamReceived) {
          this.onStreamReceived(event.streams[0]);
        }
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
      
      // Handle connection state
      peerConnection.onconnectionstatechange = () => {
        console.log(`Connection state with ${viewerId}:`, peerConnection.connectionState);
        if (peerConnection.connectionState === 'disconnected' || 
            peerConnection.connectionState === 'failed') {
          this.localPeerConnections.delete(viewerId);
          this.updateViewerCount();
        }
      };
      
      // Set remote description and create answer
      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      console.log('Created answer for viewer:', viewerId);
      
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
}