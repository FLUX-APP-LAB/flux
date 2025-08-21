export interface ViewerStats {
  streamId: string;
  connectionState: string;
  iceConnectionState: string;
  isConnected: boolean;
  connectionQuality: string;
  watchTime: number;
  bytesReceived: number;
  packetsLost: number;
  frameRate: number;
  resolution: {
    width: number;
    height: number;
  };
  error?: string;
}

export interface ViewerResult {
  success: boolean;
  error?: string;
}

export declare class StreamViewer {
  constructor(canisterId: string, agent: any);
  
  initialize(idlFactory: any): Promise<{ success: boolean; error?: string }>;
  
  watchStream(streamId: string, videoElementId: string): Promise<ViewerResult>;
  
  leaveStream(): Promise<void>;
  
  getStreamStats(): Promise<ViewerStats | null>;
  
  cleanup(resetReconnectAttempts?: boolean): void;
  
  icpActor: any;
  
  readonly currentStreamId: string | null;
  readonly connected: boolean;
  readonly connectionQuality: string;
}

export { StreamViewer };
