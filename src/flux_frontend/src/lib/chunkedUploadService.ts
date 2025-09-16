interface ChunkInfo {
  chunkIndex: number;
  totalChunks: number;
  chunkSize: number;
  data: Uint8Array;
  checksum: string;
}

interface UploadProgress {
  uploaded: number;
  total: number;
  percentage: number;
}

interface UploadSession {
  sessionId: string;
  fileName: string;
  totalSize: number;
  totalChunks: number;
  uploadedChunks: boolean[];
}

interface StreamChunk {
  data: Uint8Array;
  chunkIndex: number;
  totalChunks: number;
  isLast: boolean;
}

interface VideoStreamInfo {
  totalSize: number;
  totalChunks: number;
  chunkSize: number;
}

export class ChunkedUploadService {
  private actor: any;
  private readonly CHUNK_SIZE = 1024 * 1024; // 1MB chunks
  private readonly MAX_CONCURRENT_UPLOADS = 3;
  private readonly RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  constructor(actor: any) {
    this.actor = actor;
  }

  /**
   * Upload a file using chunked upload strategy
   */
  async uploadFile(
    file: File,
    metadata: {
      title: string;
      description: string;
      category: string;
      tags: string[];
      hashtags: string[];
      thumbnail?: Uint8Array;
      settings: {
        isPrivate: boolean;
        isUnlisted: boolean;
        allowComments: boolean;
        allowDuets: boolean;
        allowRemix: boolean;
        isMonetized: boolean;
        ageRestricted: boolean;
        scheduledAt?: number;
      };
    },
    onProgress?: (progress: UploadProgress) => void,
    onChunkComplete?: (chunkIndex: number, totalChunks: number) => void
  ): Promise<string> {
    try {
      // Step 1: Validate file
      this.validateFile(file);

      // Step 2: Initialize upload session
      const sessionId = await this.initializeUpload(file);
      console.log('Initialized upload session:', sessionId);

      // Step 3: Upload chunks
      await this.uploadChunks(file, sessionId, onProgress, onChunkComplete);

      // Step 4: Finalize upload and create video record
      const videoId = await this.finalizeUpload(sessionId, metadata);
      
      console.log('Upload completed successfully. Video ID:', videoId);
      return videoId;

    } catch (error) {
      console.error('Chunked upload failed:', error);
      throw error;
    }
  }

  /**
   * Resume an interrupted upload
   */
  async resumeUpload(
    sessionId: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void,
    onChunkComplete?: (chunkIndex: number, totalChunks: number) => void
  ): Promise<void> {
    try {
      // Get missing chunks
      const result = await this.actor.getMissingChunks(sessionId);
      if (!('ok' in result)) {
        throw new Error(result.err || 'Failed to get missing chunks');
      }

      const missingChunks = result.ok;
      console.log('Resuming upload. Missing chunks:', missingChunks);

      // Upload only missing chunks
      await this.uploadSpecificChunks(file, sessionId, missingChunks, onProgress, onChunkComplete);

    } catch (error) {
      console.error('Resume upload failed:', error);
      throw error;
    }
  }

  /**
   * Stream video content progressively
   */
  async createStreamingUrl(videoId: string): Promise<string> {
    try {
      // Get video stream info
      const infoResult = await this.actor.getVideoStreamInfo(videoId);
      if (!('ok' in infoResult)) {
        throw new Error(infoResult.err || 'Failed to get video stream info');
      }

      const streamInfo: VideoStreamInfo = infoResult.ok;
      
      // Create a custom streaming URL that our video player can use
      return this.createProgressiveStreamUrl(videoId, streamInfo);

    } catch (error) {
      console.error('Failed to create streaming URL:', error);
      throw error;
    }
  }

  /**
   * Get video chunks for progressive streaming
   */
  async getVideoChunk(videoId: string, chunkIndex: number): Promise<Uint8Array> {
    try {
      const result = await this.actor.getVideoStreamChunk(videoId, chunkIndex, null);
      if (!('ok' in result)) {
        throw new Error(result.err || 'Failed to get video chunk');
      }

      const streamChunk: StreamChunk = result.ok;
      return streamChunk.data;

    } catch (error) {
      console.error('Failed to get video chunk:', error);
      throw error;
    }
  }

  private validateFile(file: File): void {
    // Check file type
    if (!file.type.startsWith('video/')) {
      throw new Error('File must be a video');
    }

    // Check file size (100MB max)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('File size must be less than 100MB');
    }

    // Check supported formats
    const supportedFormats = ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi'];
    if (!supportedFormats.includes(file.type)) {
      console.warn('Unsupported video format:', file.type, 'Upload may fail during processing');
    }
  }

  private async initializeUpload(file: File): Promise<string> {
    try {
      // Calculate expected checksum (simplified - in production use proper hashing)
      const expectedChecksum = await this.calculateFileChecksum(file);

      const result = await this.actor.initializeChunkedUpload(
        file.name,
        file.size,
        file.type,
        [expectedChecksum] // Optional parameter as array
      );

      if (!('ok' in result)) {
        throw new Error(result.err || 'Failed to initialize upload');
      }

      return result.ok;

    } catch (error) {
      console.error('Failed to initialize upload:', error);
      throw error;
    }
  }

  private async uploadChunks(
    file: File,
    sessionId: string,
    onProgress?: (progress: UploadProgress) => void,
    onChunkComplete?: (chunkIndex: number, totalChunks: number) => void
  ): Promise<void> {
    const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);
    const chunks: number[] = Array.from({ length: totalChunks }, (_, i) => i);
    
    await this.uploadSpecificChunks(file, sessionId, chunks, onProgress, onChunkComplete);
  }

  private async uploadSpecificChunks(
    file: File,
    sessionId: string,
    chunkIndices: number[],
    onProgress?: (progress: UploadProgress) => void,
    onChunkComplete?: (chunkIndex: number, totalChunks: number) => void
  ): Promise<void> {
    const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);
    let uploadedCount = 0;

    // Upload chunks with concurrency control
    const semaphore = new Semaphore(this.MAX_CONCURRENT_UPLOADS);
    
    const uploadPromises = chunkIndices.map(async (chunkIndex) => {
      await semaphore.acquire();
      
      try {
        await this.uploadSingleChunk(file, sessionId, chunkIndex, totalChunks);
        uploadedCount++;
        
        onChunkComplete?.(chunkIndex, totalChunks);
        onProgress?.({
          uploaded: uploadedCount,
          total: chunkIndices.length,
          percentage: (uploadedCount / chunkIndices.length) * 100
        });

      } finally {
        semaphore.release();
      }
    });

    await Promise.all(uploadPromises);
  }

  private async uploadSingleChunk(
    file: File,
    sessionId: string,
    chunkIndex: number,
    totalChunks: number
  ): Promise<void> {
    const start = chunkIndex * this.CHUNK_SIZE;
    const end = Math.min(start + this.CHUNK_SIZE, file.size);
    const chunkBlob = file.slice(start, end);
    
    // Convert to Uint8Array
    const chunkData = await this.blobToUint8Array(chunkBlob);
    
    // Calculate chunk checksum
    const checksum = await this.calculateChecksum(chunkData);

    const chunkInfo: ChunkInfo = {
      chunkIndex,
      totalChunks,
      chunkSize: chunkData.length,
      data: chunkData,
      checksum
    };

    // Retry logic
    for (let attempt = 0; attempt < this.RETRY_ATTEMPTS; attempt++) {
      try {
        const result = await this.actor.uploadChunk(sessionId, chunkInfo);
        
        if ('ok' in result) {
          console.log(`Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`);
          return;
        } else {
          throw new Error(result.err || 'Chunk upload failed');
        }

      } catch (error) {
        console.warn(`Chunk ${chunkIndex} upload attempt ${attempt + 1} failed:`, error);
        
        if (attempt === this.RETRY_ATTEMPTS - 1) {
          throw error;
        }
        
        // Wait before retry
        await this.delay(this.RETRY_DELAY * (attempt + 1));
      }
    }
  }

  private async finalizeUpload(
    sessionId: string,
    metadata: {
      title: string;
      description: string;
      category: string;
      tags: string[];
      hashtags: string[];
      thumbnail?: Uint8Array;
      settings: {
        isPrivate: boolean;
        isUnlisted: boolean;
        allowComments: boolean;
        allowDuets: boolean;
        allowRemix: boolean;
        isMonetized: boolean;
        ageRestricted: boolean;
        scheduledAt?: number;
      };
    }
  ): Promise<string> {
    try {
      // Map category to backend format
      const categoryMap: Record<string, any> = {
        'Gaming': { Gaming: null },
        'Entertainment': { Entertainment: null },
        'Music': { Music: null },
        'Education': { Education: null },
        'Sports': { Sports: null },
        'Comedy': { Comedy: null },
        'Dance': { Dance: null },
        'Food': { Food: null },
        'Travel': { Travel: null },
        'Art': { Art: null },
        'Technology': { Technology: null },
        'Lifestyle': { Lifestyle: null },
        'News': { News: null },
        'Other': { Other: null }
      };

      const videoType = { Long: null }; // Default to Long videos
      const category = categoryMap[metadata.category] || { Other: null };
      const thumbnail = metadata.thumbnail ? [metadata.thumbnail] : [];

      // Prepare settings with proper null handling for optional fields
      const settings = {
        isPrivate: metadata.settings.isPrivate,
        isUnlisted: metadata.settings.isUnlisted,
        allowComments: metadata.settings.allowComments,
        allowDuets: metadata.settings.allowDuets,
        allowRemix: metadata.settings.allowRemix,
        isMonetized: metadata.settings.isMonetized,
        ageRestricted: metadata.settings.ageRestricted,
        scheduledAt: metadata.settings.scheduledAt ? [metadata.settings.scheduledAt] : []
      };

      const result = await this.actor.finalizeChunkedUpload(
        sessionId,
        metadata.title,
        metadata.description,
        thumbnail,
        videoType,
        category,
        metadata.tags,
        metadata.hashtags,
        settings
      );

      if (!('ok' in result)) {
        throw new Error(result.err || 'Failed to finalize upload');
      }

      return result.ok;

    } catch (error) {
      console.error('Failed to finalize upload:', error);
      throw error;
    }
  }

  private createProgressiveStreamUrl(videoId: string, streamInfo: VideoStreamInfo): string {
    // Create a blob URL that supports progressive loading
    const progressiveBlob = this.createProgressiveBlob(videoId, streamInfo);
    return URL.createObjectURL(progressiveBlob);
  }

  private createProgressiveBlob(videoId: string, streamInfo: VideoStreamInfo): Blob {
    // Create a custom blob that loads chunks on demand
    const chunks: Uint8Array[] = [];
    let loadedChunks = 0;

    // This is a simplified implementation - in production you'd want proper streaming
    const loadChunk = async (chunkIndex: number) => {
      if (!chunks[chunkIndex]) {
        try {
          chunks[chunkIndex] = await this.getVideoChunk(videoId, chunkIndex);
          loadedChunks++;
        } catch (error) {
          console.error(`Failed to load chunk ${chunkIndex}:`, error);
        }
      }
      return chunks[chunkIndex];
    };

    // Pre-load first few chunks for instant playback
    for (let i = 0; i < Math.min(3, streamInfo.totalChunks); i++) {
      loadChunk(i);
    }

    // Return a blob with the first chunk for immediate playback
    const firstChunk = chunks[0] || new Uint8Array(0);
    return new Blob([firstChunk as BlobPart], { type: 'video/mp4' });
  }

  private async blobToUint8Array(blob: Blob): Promise<Uint8Array> {
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  private async calculateFileChecksum(file: File): Promise<string> {
    // Simplified checksum - in production use proper crypto hashing
    const buffer = await file.arrayBuffer();
    const hashArray = await crypto.subtle.digest('SHA-256', buffer);
    const hashHex = Array.from(new Uint8Array(hashArray))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return hashHex;
  }

  private async calculateChecksum(data: Uint8Array): Promise<string> {
    const hashArray = await crypto.subtle.digest('SHA-256', data as BufferSource);
    const hashHex = Array.from(new Uint8Array(hashArray))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return hashHex;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Semaphore for controlling concurrent uploads
class Semaphore {
  private permits: number;
  private waitQueue: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    const nextResolve = this.waitQueue.shift();
    if (nextResolve) {
      this.permits--;
      nextResolve();
    }
  }
}

// Progressive video streaming utilities
export class VideoStreamingService {
  private actor: any;
  private cache: Map<string, Uint8Array> = new Map();

  constructor(actor: any) {
    this.actor = actor;
  }

  /**
   * Create a streaming video element with progressive loading
   */
  async createStreamingVideoElement(videoId: string): Promise<HTMLVideoElement> {
    const video = document.createElement('video');
    video.controls = true;
    video.preload = 'metadata';

    // Get stream info
    const infoResult = await this.actor.getVideoStreamInfo(videoId);
    if (!('ok' in infoResult)) {
      throw new Error('Failed to get video stream info');
    }

    const streamInfo: VideoStreamInfo = infoResult.ok;

    // Create MediaSource for advanced streaming
    if ('MediaSource' in window) {
      const mediaSource = new MediaSource();
      video.src = URL.createObjectURL(mediaSource);

      mediaSource.addEventListener('sourceopen', () => {
        this.setupMediaSource(mediaSource, videoId, streamInfo);
      });
    } else {
      // Fallback to blob URL
      const blobUrl = await this.createFallbackBlobUrl(videoId, streamInfo);
      video.src = blobUrl;
    }

    return video;
  }

  private async setupMediaSource(
    mediaSource: MediaSource,
    videoId: string,
    streamInfo: VideoStreamInfo
  ): Promise<void> {
    try {
      const sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.42E01E"');
      
      // Load and append chunks progressively
      for (let i = 0; i < streamInfo.totalChunks; i++) {
        const chunk = await this.getChunkWithCache(videoId, i);
        
        if (chunk) {
          sourceBuffer.appendBuffer(chunk as BufferSource);
          
          // Wait for append to complete
          await new Promise((resolve) => {
            sourceBuffer.addEventListener('updateend', resolve, { once: true });
          });
        }
      }

      mediaSource.endOfStream();

    } catch (error) {
      console.error('MediaSource setup failed:', error);
      mediaSource.endOfStream('decode');
    }
  }

  private async createFallbackBlobUrl(videoId: string, streamInfo: VideoStreamInfo): Promise<string> {
    const chunks: Uint8Array[] = [];
    
    // Load all chunks
    for (let i = 0; i < streamInfo.totalChunks; i++) {
      const chunk = await this.getChunkWithCache(videoId, i);
      if (chunk) {
        chunks.push(chunk);
      }
    }

    // Combine chunks into single blob
    const combinedArray = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
    let offset = 0;
    
    for (const chunk of chunks) {
      combinedArray.set(chunk, offset);
      offset += chunk.length;
    }

    const blob = new Blob([combinedArray], { type: 'video/mp4' });
    return URL.createObjectURL(blob);
  }

  private async getChunkWithCache(videoId: string, chunkIndex: number): Promise<Uint8Array | null> {
    const cacheKey = `${videoId}_${chunkIndex}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const result = await this.actor.getVideoStreamChunk(videoId, chunkIndex, null);
      if ('ok' in result) {
        const chunk = result.ok.data;
        this.cache.set(cacheKey, chunk);
        return chunk;
      }
    } catch (error) {
      console.error(`Failed to load chunk ${chunkIndex}:`, error);
    }

    return null;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
