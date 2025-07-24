import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, Play, Pause, Volume2, VolumeX, X, Hash, Settings } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAppStore } from '../../store/appStore';
import { useWallet } from '../../hooks/useWallet';
import { 
  fileToUint8Array, 
  validateVideoFile, 
  extractVideoMetadata, 
  generateThumbnail,
  formatFileSize,
  formatDuration,
  getVideoType,
  mapCategoryToBackend,
  VideoUploadData 
} from '../../lib/videoUtils';
import toast from 'react-hot-toast';
import { useWallet } from '../../hooks/useWallet';

interface VideoUploadProps {
  onClose: () => void;
}

export const VideoUpload: React.FC<VideoUploadProps> = ({ onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [category, setCategory] = useState('gaming');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isUnlisted, setIsUnlisted] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuets, setAllowDuets] = useState(true);
  const [allowRemix, setAllowRemix] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'uploading' | 'processing' | 'complete' | 'error'>('uploading');
  const [videoMetadata, setVideoMetadata] = useState<{ duration: number; width: number; height: number } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { currentUser, videoFeed, setVideoFeed } = useAppStore();

  const { newAuthActor } = useWallet();

  const { newAuthActor, principal } = useWallet();


  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file first
    const validation = validateVideoFile(file);
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid video file');
      return;
    }

    try {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
      
      // Extract video metadata
      const metadata = await extractVideoMetadata(file);
      setVideoMetadata(metadata);
      
      toast.success(`Video loaded - ${formatDuration(metadata.duration)} • ${metadata.width}x${metadata.height}`);
    } catch (error) {
      toast.error('Failed to load video metadata');
      console.error('Video metadata extraction failed:', error);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  }, [handleFileSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const uploadToBackend = async () => {
    if (!selectedFile || !newAuthActor || !currentUser) {
      toast.error('Missing required data for upload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('uploading');

    try {
      // Convert file to Uint8Array for Motoko backend
      toast.loading('Converting video file...');
      const videoData = await fileToUint8Array(selectedFile);
      
      setUploadProgress(10);
      
      // Generate thumbnail
      toast.loading('Generating thumbnail...');
      const thumbnailBlob = await generateThumbnail(selectedFile);
      const thumbnailData = await fileToUint8Array(new File([thumbnailBlob], 'thumbnail.jpg'));
      
      setUploadProgress(20);
      
      // Prepare upload data
      const videoType = videoMetadata ? getVideoType(videoMetadata.duration) : 'Short';
      const processedHashtags = hashtags
        .split(' ')
        .filter(tag => tag.startsWith('#') && tag.length > 1)
        .map(tag => tag.slice(1)); // Remove # symbol
      
      const uploadData = {
        title: title.trim() || 'Untitled Video',
        description: description.trim(),
        videoType: { [videoType]: null },
        category: { [mapCategoryToBackend(category)]: null },
        tags: [], // Could be extracted from description or added separately
        hashtags: processedHashtags,
        settings: {
          isPrivate,
          isUnlisted,
          allowComments,
          allowDuets,
          allowRemix,
          isMonetized: false, // Default for now
          ageRestricted: false, // Default for now
          scheduledAt: [], // No scheduling for now
        }
      };
      
      setUploadProgress(30);
      
      // Check if file is too large for single upload (1.5MB limit for safety)
      const maxChunkSize = 1.5 * 1024 * 1024; // 1.5MB chunks
      
      if (videoData.length > maxChunkSize) {
        // Chunked upload for larger files
        toast.loading('Uploading large video in chunks...');
        
        try {
          // First, create the video record without video data
          const videoRecord = await newAuthActor.createVideoRecord(
            uploadData.title,
            uploadData.description,
            [thumbnailData], // Thumbnail
            uploadData.videoType,
            uploadData.category,
            uploadData.tags,
            uploadData.hashtags,
            uploadData.settings
          );
          
          if (!('ok' in videoRecord)) {
            throw new Error(videoRecord.err || 'Failed to create video record');
          }
          
          const videoId = videoRecord.ok;
          setUploadProgress(40);
          
          // Split video data into chunks
          const chunks = [];
          for (let i = 0; i < videoData.length; i += maxChunkSize) {
            const chunk = videoData.slice(i, i + maxChunkSize);
            chunks.push(chunk);
          }
          
          // Upload chunks
          for (let i = 0; i < chunks.length; i++) {
            toast.loading(`Uploading chunk ${i + 1}/${chunks.length}...`);
            
            try {
              const chunkResult = await newAuthActor.uploadVideoChunk(
                videoId,
                chunks[i],
                i,
                chunks.length
              );
              
              if (!('ok' in chunkResult)) {
                throw new Error(`Chunk upload failed: ${chunkResult.err}`);
              }
              
              // Update progress based on chunks uploaded
              const chunkProgress = 40 + ((i + 1) / chunks.length) * 50; // 40-90%
              setUploadProgress(Math.floor(chunkProgress));
              
            } catch (chunkError) {
              console.error(`Failed to upload chunk ${i}:`, chunkError);
              const errorMessage = chunkError instanceof Error ? chunkError.message : 'Unknown error';
              throw new Error(`Failed to upload chunk ${i + 1}/${chunks.length}: ${errorMessage}`);
            }
          }
          
          setUploadProgress(100);
          setUploadStatus('complete');
          
        } catch (chunkedError) {
          console.warn('Chunked upload failed, falling back to single upload:', chunkedError);
          toast.loading('Chunked upload failed, trying single upload...');
          
          // Fallback to single upload with smaller file
          // Compress the video data if possible, or reject if too large
          if (videoData.length > 2 * 1024 * 1024) { // 2MB limit for single upload
            throw new Error('File too large for upload. Please use a video under 2MB or try compressing it.');
          }
          
          // Try single upload as fallback
          setUploadProgress(50);
          setUploadStatus('processing');
          toast.loading('Uploading to backend (fallback)...');
          
          const result = await newAuthActor.uploadVideo(
            uploadData.title,
            uploadData.description,
            videoData,
            [thumbnailData],
            uploadData.videoType,
            uploadData.category,
            uploadData.tags,
            uploadData.hashtags,
            uploadData.settings
          );
          
          if (!('ok' in result)) {
            throw new Error(result.err || 'Upload failed');
          }
          
          setUploadProgress(100);
          setUploadStatus('complete');
        }
        
      } else {
        // Single upload for smaller files
        setUploadProgress(50);
        setUploadStatus('processing');
        toast.loading('Uploading to backend...');
        
        // Call backend upload function
        const result = await newAuthActor.uploadVideo(
          uploadData.title,
          uploadData.description,
          videoData,
          [thumbnailData], // Optional thumbnail
          uploadData.videoType,
          uploadData.category,
          uploadData.tags,
          uploadData.hashtags,
          uploadData.settings
        );
        
        if (!('ok' in result)) {
          throw new Error(result.err || 'Upload failed');
        }
        
        setUploadProgress(100);
        setUploadStatus('complete');
      }
      
      // Create frontend video object for immediate display
      const newVideo = {
        id: Date.now().toString(), // Use timestamp for now since we might not have the backend ID
        title: uploadData.title,
        thumbnail: videoPreview || '',
        videoUrl: videoPreview || '',
        creator: currentUser,
        views: 0,
        likes: 0,
        duration: videoMetadata?.duration || 0,
        isLiked: false,
        description: uploadData.description,
        hashtags: processedHashtags,
      };
      
      // Add to feed
      setVideoFeed([newVideo, ...videoFeed]);
      
      toast.success('Video uploaded successfully!');
      setTimeout(() => onClose(), 1000);
      
    } catch (error) {
      setUploadStatus('error');
      let errorMessage = 'Upload failed';
      
      if (error instanceof Error) {
        if (error.message.includes('too large')) {
          errorMessage = 'File too large. Please use a video under 2MB or compress your video.';
        } else if (error.message.includes('Payload Too Large')) {
          errorMessage = 'File too large for network. Please use a smaller video file.';
        } else if (error.message.includes('chunk')) {
          errorMessage = 'Chunked upload failed. Try with a smaller video file.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
      console.error('Upload error:', error);

  const uploadVideo = async () => {
    if (!selectedFile) {
      toast.error('No video file selected');
      return;
    }
    if (!newAuthActor) {
      toast.error('Not connected to backend. Please connect your wallet.');
      return;
    }
    if (!principal) {
      toast.error('No principal found. Please connect your wallet.');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await selectedFile.arrayBuffer();
      // Convert to Uint8Array for candid blob - this becomes videoData
      const videoData = new Uint8Array(arrayBuffer);

      // Generate thumbnail from first frame
      const generateThumbnail = async (videoUrl: string): Promise<Uint8Array> => {
        return new Promise((resolve, reject) => {
          const video = document.createElement('video');
          video.src = videoUrl;
          video.crossOrigin = 'anonymous';
          video.muted = true;
          video.playsInline = true;
          video.currentTime = 0.5; // Seek to 0.5 seconds for better frame
          
          video.addEventListener('loadeddata', () => {
            // Set canvas size to video size (or limit max size for performance)
            const canvas = document.createElement('canvas');
            const maxSize = 400; // Smaller thumbnail for better performance
            const aspectRatio = video.videoWidth / video.videoHeight;
            
            if (video.videoWidth > video.videoHeight) {
              canvas.width = Math.min(maxSize, video.videoWidth);
              canvas.height = canvas.width / aspectRatio;
            } else {
              canvas.height = Math.min(maxSize, video.videoHeight);
              canvas.width = canvas.height * aspectRatio;
            }
            
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject('Canvas context error');
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob((blob) => {
              if (!blob) return reject('Thumbnail blob error');
              
              const reader = new FileReader();
              reader.onloadend = () => {
                // Convert to Uint8Array for Motoko Blob
                const arrayBuffer = reader.result as ArrayBuffer;
                const uint8Array = new Uint8Array(arrayBuffer);
                resolve(uint8Array);
              };
              reader.onerror = () => reject('Thumbnail read error');
              reader.readAsArrayBuffer(blob);
            }, 'image/jpeg', 0.8);
          });
          
          video.onerror = () => reject('Video load error');
          
          // Set a timeout in case video doesn't load
          setTimeout(() => reject('Video load timeout'), 10000);
        });
      };

      let thumbnail: Uint8Array | null = null;
      if (videoPreview) {
        try {
          thumbnail = await generateThumbnail(videoPreview);
        } catch (err) {
          console.warn('Thumbnail generation failed:', err);
          thumbnail = null;
        }
      }

      setUploadProgress(30);

      // Prepare video metadata according to your Motoko type
      const videoMetadata = {
        duration: 0, // You might want to get actual video duration
        resolution: "720p", // Default or detect from video
        format: selectedFile.type,
        fileSize: selectedFile.size,
        fps: 30, // Default or detect
        bitrate: 0, // Default or calculate
        aspectRatio: "16:9", // Default or detect
        codec: "h264" // Default
      };

      const analytics = {
        views: 0,
        likes: 0,
        dislikes: 0,
        shares: 0,
        comments: 0,
        watchTime: 0,
        engagement: 0.0,
        impressions: 0,
        clickThroughRate: 0.0,
        demographics: [],
        trafficSources: [],
        retentionGraph: []
      };

      // Parse hashtags properly
      const hashtagsArr = hashtags
        .split(/\s+/)
        .filter(tag => tag.startsWith('#') && tag.length > 1)
        .map(tag => tag.substring(1)); // Remove # symbol

      const videoType = { Short: null }; // Or whatever your VideoType variants are
      const category = { Entertainment: null }; // Adjust based on your VideoCategory variants
      const tags: string[] = []; // You might want to add a tags input field

      setUploadProgress(50);
      
      // Call backend with individual parameters matching the Video type structure
      // Instead of passing an object, pass each parameter separately
      let result;
      try {
        result = await newAuthActor.uploadVideo(
          title,                    // title: Text
          description,             // description: Text
          videoData,               // videoData: Blob
          thumbnail,               // thumbnail: ?Blob
          videoType,               // videoType: VideoType
          category,                // category: VideoCategory
          tags,                    // tags: [Text]
          hashtagsArr,             // hashtags: [Text]
          {
            ageRestricted: false,
            allowComments: true,
            allowDuets: false,
            allowRemix: false,
            isMonetized: false,
            isPrivate: false,
            isUnlisted: false,
            scheduledAt: null
          }
        );
      } catch (err) {
        console.error('Upload call error:', err);
        if (err instanceof TypeError && err.message.includes('NetworkError')) {
          toast.error('Network error: Check backend CORS settings.');
        } else if (err && typeof err === 'object' && 'message' in err) {
          toast.error('Upload failed: ' + err.message);
        } else {
          toast.error('Upload failed: Unknown error');
        }
        throw err;
      }
      
      setUploadProgress(100);
      
      if (result && ('ok' in result || 'Ok' in result)) {
        toast.success('Video uploaded successfully!');
        // Clean up preview URL
        if (videoPreview) {
          URL.revokeObjectURL(videoPreview);
        }
        setSelectedFile(null);
        setVideoPreview(null);
        onClose();
      } else {
        const errorMsg = result?.err || result?.Err || 'Unknown error';
        toast.error('Upload failed: ' + errorMsg);
      }
    } catch (err) {
      console.error('Upload error:', err);
      // Error already handled in the try block
    } finally {
      setIsUploading(false);
    }
  };

  const removeVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setSelectedFile(null);
    setVideoPreview(null);
  };

  return (
    <div className="space-y-6">
      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-flux-bg-tertiary rounded-xl p-12 text-center hover:border-flux-primary transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-12 h-12 text-flux-text-secondary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-flux-text-primary mb-2">
            Upload your video
          </h3>
          <p className="text-flux-text-secondary mb-4">
            Drag and drop your video here, or click to browse
          </p>
          <p className="text-sm text-flux-text-secondary">
            Supports MP4, MOV, AVI up to 10MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      ) : isUploading ? (
        /* Upload Progress Screen */
        <div className="space-y-6">
          {/* Video Preview - Smaller during upload */}
          <div className="relative aspect-[9/16] max-w-xs mx-auto bg-black rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              src={videoPreview!}
              className="w-full h-full object-cover"
              muted
              loop
              autoPlay
            />
            
            {/* Upload Overlay */}
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <div className="text-center text-white p-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold mb-2">
                  {uploadStatus === 'uploading' && 'Uploading Video...'}
                  {uploadStatus === 'processing' && 'Processing Video...'}
                  {uploadStatus === 'complete' && 'Upload Complete!'}
                  {uploadStatus === 'error' && 'Upload Failed'}
                </h3>
                <p className="text-sm opacity-90 mb-4">
                  {uploadStatus === 'uploading' && 'Converting and uploading your video to the blockchain'}
                  {uploadStatus === 'processing' && 'Your video is being processed and will be available soon'}
                  {uploadStatus === 'complete' && 'Your video has been successfully published'}
                  {uploadStatus === 'error' && 'Something went wrong during the upload'}
                </p>
              </div>
            </div>
          </div>

          {/* Upload Progress Details */}
          <div className="bg-flux-bg-tertiary rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-flux-text-primary">
                {title || 'Untitled Video'}
              </h4>
              <span className="text-2xl font-bold text-flux-primary">
                {uploadProgress}%
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-flux-bg-primary rounded-full h-3">
              <motion.div
                className={`h-3 rounded-full ${
                  uploadStatus === 'error' ? 'bg-red-500' : 
                  uploadStatus === 'complete' ? 'bg-green-500' : 
                  'bg-flux-gradient'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>

            {/* Status Steps */}
            <div className="flex items-center justify-between text-sm">
              <div className={`flex items-center space-x-2 ${
                uploadProgress >= 20 ? 'text-flux-primary' : 'text-flux-text-secondary'
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  uploadProgress >= 20 ? 'bg-flux-primary' : 'bg-flux-text-secondary'
                }`}></div>
                <span>Converting</span>
              </div>
              
              <div className={`flex items-center space-x-2 ${
                uploadProgress >= 40 ? 'text-flux-primary' : 'text-flux-text-secondary'
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  uploadProgress >= 40 ? 'bg-flux-primary' : 'bg-flux-text-secondary'
                }`}></div>
                <span>Thumbnail</span>
              </div>
              
              <div className={`flex items-center space-x-2 ${
                uploadProgress >= 60 ? 'text-flux-primary' : 'text-flux-text-secondary'
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  uploadProgress >= 60 ? 'bg-flux-primary' : 'bg-flux-text-secondary'
                }`}></div>
                <span>Uploading</span>
              </div>
              
              <div className={`flex items-center space-x-2 ${
                uploadProgress >= 100 ? 'text-flux-primary' : 'text-flux-text-secondary'
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  uploadProgress >= 100 ? 'bg-flux-primary' : 'bg-flux-text-secondary'
                }`}></div>
                <span>Complete</span>
              </div>
            </div>

            {/* Video Info During Upload */}
            {videoMetadata && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-flux-bg-primary">
                <div className="text-center">
                  <span className="block text-xs text-flux-text-secondary">Duration</span>
                  <span className="text-sm font-medium text-flux-text-primary">
                    {formatDuration(videoMetadata.duration)}
                  </span>
                </div>
                <div className="text-center">
                  <span className="block text-xs text-flux-text-secondary">Size</span>
                  <span className="text-sm font-medium text-flux-text-primary">
                    {formatFileSize(selectedFile.size)}
                  </span>
                </div>
              </div>
            )}

            {/* Current Action */}
            <div className="text-center pt-2">
              <p className="text-sm text-flux-text-secondary">
                {uploadProgress < 10 && "Converting video file..."}
                {uploadProgress >= 10 && uploadProgress < 20 && "Generating thumbnail..."}
                {uploadProgress >= 20 && uploadProgress < 30 && "Preparing upload..."}
                {uploadProgress >= 30 && uploadProgress < 40 && "Checking file size..."}
                {uploadProgress >= 40 && uploadProgress < 90 && "Uploading video chunks..."}
                {uploadProgress >= 90 && uploadProgress < 100 && "Finalizing upload..."}
                {uploadProgress >= 100 && uploadStatus === 'processing' && "Processing video..."}
                {uploadStatus === 'complete' && "Video successfully published!"}
                {uploadStatus === 'error' && "Upload failed. Please try again."}
              </p>
            </div>

            {/* Cancel Button - Only show during early stages */}
            {uploadProgress < 60 && uploadStatus !== 'complete' && uploadStatus !== 'error' && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsUploading(false);
                    setUploadProgress(0);
                    setUploadStatus('uploading');
                    toast.error('Upload cancelled');
                  }}
                  className="px-8"
                >
                  Cancel Upload
                </Button>
              </div>
            )}

            {/* Close Button - Show when complete or error */}
            {(uploadStatus === 'complete' || uploadStatus === 'error') && (
              <div className="flex justify-center pt-4">
                <Button
                  onClick={onClose}
                  className="px-8"
                  variant={uploadStatus === 'error' ? 'secondary' : 'default'}
                >
                  {uploadStatus === 'complete' ? 'Done' : 'Close'}
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Video Details Form - Only show when not uploading */
        <div className="space-y-6">
          {/* Video Preview */}
          <div className="relative aspect-[9/16] max-w-xs mx-auto bg-black rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              src={videoPreview!}
              className="w-full h-full object-cover"
              muted={isMuted}
              loop
            />
            
            {/* Video Controls */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="ghost" onClick={togglePlayPause}>
                      {isPlaying ? (
                        <Pause className="w-4 h-4 text-white" />
                      ) : (
                        <Play className="w-4 h-4 text-white" />
                      )}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={toggleMute}>
                      {isMuted ? (
                        <VolumeX className="w-4 h-4 text-white" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-white" />
                      )}
                    </Button>
                  </div>
                  <Button size="sm" variant="ghost" onClick={removeVideo}>
                    <X className="w-4 h-4 text-white" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Video Details Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-flux-text-primary mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your video a catchy title..."
                className="w-full px-4 py-3 bg-flux-bg-tertiary text-flux-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-flux-primary"
                maxLength={100}
              />
              <div className="text-right text-xs text-flux-text-secondary mt-1">
                {title.length}/100
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-flux-text-primary mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell viewers about your video..."
                rows={3}
                className="w-full px-4 py-3 bg-flux-bg-tertiary text-flux-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-flux-primary resize-none"
                maxLength={500}
              />
              <div className="text-right text-xs text-flux-text-secondary mt-1">
                {description.length}/500
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-flux-text-primary mb-2">
                <Hash className="w-4 h-4 inline mr-1" />
                Hashtags
              </label>
              <input
                type="text"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#trending #viral #fyp"
                className="w-full px-4 py-3 bg-flux-bg-tertiary text-flux-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-flux-primary"
              />
              <p className="text-xs text-flux-text-secondary mt-1">
                Separate hashtags with spaces
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-flux-text-primary mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-flux-bg-tertiary text-flux-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-flux-primary"
              >
                <option value="gaming">Gaming</option>
                <option value="entertainment">Entertainment</option>
                <option value="music">Music</option>
                <option value="education">Education</option>
                <option value="sports">Sports</option>
                <option value="comedy">Comedy</option>
                <option value="dance">Dance</option>
                <option value="food">Food</option>
                <option value="travel">Travel</option>
                <option value="art">Art</option>
                <option value="technology">Technology</option>
                <option value="lifestyle">Lifestyle</option>
                <option value="news">News</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Privacy Settings */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-flux-text-primary">
                <Settings className="w-4 h-4 inline mr-1" />
                Privacy & Settings
              </label>
              
              <div className="space-y-2">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-flux-text-primary">Private video</span>
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="w-4 h-4 text-flux-primary rounded focus:ring-flux-primary"
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <span className="text-sm text-flux-text-primary">Unlisted (not in search)</span>
                  <input
                    type="checkbox"
                    checked={isUnlisted}
                    onChange={(e) => setIsUnlisted(e.target.checked)}
                    className="w-4 h-4 text-flux-primary rounded focus:ring-flux-primary"
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <span className="text-sm text-flux-text-primary">Allow comments</span>
                  <input
                    type="checkbox"
                    checked={allowComments}
                    onChange={(e) => setAllowComments(e.target.checked)}
                    className="w-4 h-4 text-flux-primary rounded focus:ring-flux-primary"
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <span className="text-sm text-flux-text-primary">Allow duets</span>
                  <input
                    type="checkbox"
                    checked={allowDuets}
                    onChange={(e) => setAllowDuets(e.target.checked)}
                    className="w-4 h-4 text-flux-primary rounded focus:ring-flux-primary"
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <span className="text-sm text-flux-text-primary">Allow remixes</span>
                  <input
                    type="checkbox"
                    checked={allowRemix}
                    onChange={(e) => setAllowRemix(e.target.checked)}
                    className="w-4 h-4 text-flux-primary rounded focus:ring-flux-primary"
                  />
                </label>
              </div>
            </div>

            {/* Video Info */}
            {selectedFile && videoMetadata && (
              <div className="bg-flux-bg-tertiary rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-medium text-flux-text-primary">Video Information</h4>
                <div className="grid grid-cols-2 gap-4 text-xs text-flux-text-secondary">
                  <div>
                    <span className="block">Duration</span>
                    <span className="text-flux-text-primary">{formatDuration(videoMetadata.duration)}</span>
                  </div>
                  <div>
                    <span className="block">Resolution</span>
                    <span className="text-flux-text-primary">{videoMetadata.width}x{videoMetadata.height}</span>
                  </div>
                  <div>
                    <span className="block">File Size</span>
                    <span className="text-flux-text-primary">{formatFileSize(selectedFile.size)}</span>
                  </div>
                  <div>
                    <span className="block">Type</span>
                    <span className="text-flux-text-primary">{getVideoType(videoMetadata.duration)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isUploading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={uploadToBackend}
              onClick={uploadVideo}
              disabled={isUploading || !title.trim()}
              isLoading={isUploading}
              className="flex-1"
            >
              Publish Video
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};