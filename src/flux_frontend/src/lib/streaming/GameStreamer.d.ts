export interface StreamStats {
  streamId: string;
  isLive: boolean;
  duration?: number;
  viewerCount: number;
  totalViewers: number;
  connectionFailures: number;
  connections: string[];
  totalBytesSent?: number;
  totalPacketsSent?: number;
  averageBitrate?: number;
  frameRate?: number;
  error?: string;
}

export interface StreamStartOptions {
  frameRate?: number;
  width?: number;
  height?: number;
  maxViewers?: number;
  category?: string;
}

export interface StreamResult {
  success: boolean;
  streamId?: string;
  error?: string;
}

export declare class GameStreamer {
  constructor(canisterId: string, agent: any);
  
  initialize(idlFactory: any): Promise<{ success: boolean; error?: string }>;
  
  startGameStream(title: string, options?: StreamStartOptions): Promise<StreamResult>;
  
  stopStream(): Promise<void>;
  
  getStreamStats(): Promise<StreamStats>;
  
  cleanup(): void;
  
  readonly currentStreamId: string;
  readonly isLive: boolean;
  readonly currentViewerCount: number;
}

export { GameStreamer };
