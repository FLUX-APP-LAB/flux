import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, Play, Pause, Volume2, VolumeX, X, Hash, AtSign } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAppStore } from '../../store/appStore';
import { useWallet } from '../../hooks/useWallet';
import { VideoService } from '../../lib/videoService';
import { ChunkedUploadService } from '../../lib/chunkedUploadService';
import { 
  validateVideoFile, 
  extractVideoMetadata, 
  formatFileSize,
  formatDuration,
  getVideoType,
  generateThumbnail,
  mapCategoryToBackend
} from '../../lib/videoUtils';

import toast from 'react-hot-toast';

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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'uploading' | 'processing' | 'complete' | 'error'>('uploading');
  const [videoMetadata, setVideoMetadata] = useState<{ duration: number } | null>(null);
  const [category, setCategory] = useState<string>('Other');
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [isUnlisted, setIsUnlisted] = useState<boolean>(false);
  const [allowComments, setAllowComments] = useState<boolean>(true);
  const [allowDuets, setAllowDuets] = useState<boolean>(true);
  const [allowRemix, setAllowRemix] = useState<boolean>(true);
  const [chunksUploaded, setChunksUploaded] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [canResume, setCanResume] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { currentUser, videoFeed, setVideoFeed } = useAppStore();
  const { newAuthActor, principal } = useWallet();

  const handleFileSelect = useCallback((file: File) => {
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
      // Extract video metadata
      extractVideoMetadata(file).then(meta => setVideoMetadata(meta)).catch(() => setVideoMetadata(null));
    } else {
      toast.error('Please select a valid video file');
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

  const uploadVideo = async () => {
    if (!selectedFile || !newAuthActor || !principal) {
      toast.error('Missing required data for upload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('uploading');

    try {
      console.log('Starting chunked upload for file:', selectedFile.name, 'Size:', selectedFile.size);
      
      // Generate thumbnail
      toast.loading('Generating thumbnail...');
      const thumbnailBlob = await generateThumbnail(selectedFile);
      const thumbnailArrayBuffer = await thumbnailBlob.arrayBuffer();
      const thumbnailData = new Uint8Array(thumbnailArrayBuffer);
      
      setUploadProgress(10);
      
      // Prepare metadata
      const videoType = videoMetadata ? getVideoType(videoMetadata.duration) : 'Short';
      const processedHashtags = hashtags
        .split(' ')
        .filter(tag => tag.startsWith('#') && tag.length > 1)
        .map(tag => tag.slice(1)); // Remove # symbol
      
      const metadata = {
        title: title.trim() || 'Untitled Video',
        description: description.trim(),
        category: mapCategoryToBackend(category),
        tags: [] as string[],
        hashtags: processedHashtags,
        thumbnail: thumbnailData,
        settings: {
          isPrivate,
          isUnlisted,
          allowComments,
          allowDuets,
          allowRemix,
          isMonetized: false,
          ageRestricted: false,
          scheduledAt: undefined,
        }
      };

      setUploadProgress(20);
      
      // Create chunked upload service
      const uploadService = new ChunkedUploadService(newAuthActor);
      
      // Upload with progress tracking
      const videoId = await uploadService.uploadFile(
        selectedFile,
        metadata,
        // Progress callback
        (progress) => {
          const progressPercent = 20 + (progress.percentage * 0.7); // 20-90% for upload
          setUploadProgress(progressPercent);
          setChunksUploaded(progress.uploaded);
          setTotalChunks(progress.total);
          
          console.log(`Upload progress: ${progress.uploaded}/${progress.total} chunks (${progress.percentage.toFixed(1)}%)`);
        },
        // Chunk complete callback
        (chunkIndex, totalChunks) => {
          console.log(`Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`);
        }
      );
      
      setUploadProgress(95);
      setUploadStatus('processing');
      toast.loading('Finalizing upload...');
      
      // Refresh video feed
      try {
        const videoService = new VideoService(newAuthActor);
        const updatedVideos = await videoService.getAllVideos();
        setVideoFeed(updatedVideos);
        console.log('Video feed refreshed after upload');
      } catch (error) {
        console.error('Failed to refresh video feed after upload:', error);
      }
      
      setUploadProgress(100);
      setUploadStatus('complete');
      
      console.log('Chunked upload completed successfully. Video ID:', videoId);
      toast.success('Video uploaded successfully!');
      
      setTimeout(() => onClose(), 1000);
      
    } catch (error) {
      setUploadStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      toast.error(errorMessage);
      console.error('Chunked upload failed:', error);
      
      // Store session ID for potential resume
      if (error instanceof Error && error.message.includes('session')) {
        const sessionId = extractSessionIdFromError(error.message);
        if (sessionId) {
          setCurrentSessionId(sessionId);
          setCanResume(true);
        }
      }
    } finally {
      setIsUploading(false);
    }
  };

  const resumeUpload = async () => {
    if (!selectedFile || !currentSessionId || !newAuthActor) {
      toast.error('Cannot resume upload - missing data');
      return;
    }

    setIsUploading(true);
    setUploadStatus('uploading');
    
    try {
      const uploadService = new ChunkedUploadService(newAuthActor);
      
      await uploadService.resumeUpload(
        currentSessionId,
        selectedFile,
        // Progress callback
        (progress) => {
          const progressPercent = 20 + (progress.percentage * 0.7);
          setUploadProgress(progressPercent);
          setChunksUploaded(progress.uploaded);
          setTotalChunks(progress.total);
        },
        // Chunk complete callback
        (chunkIndex, totalChunks) => {
          console.log(`Resumed chunk ${chunkIndex + 1}/${totalChunks} uploaded`);
        }
      );
      
      setUploadProgress(100);
      setUploadStatus('complete');
      toast.success('Upload resumed and completed successfully!');
      setCanResume(false);
      
      setTimeout(() => onClose(), 1000);
      
    } catch (error) {
      setUploadStatus('error');
      toast.error('Failed to resume upload');
      console.error('Resume upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const extractSessionIdFromError = (errorMessage: string): string | null => {
    const match = errorMessage.match(/session[:\s]+([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
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
          className="border-2 border-dashed border-flux-bg-tertiary rounded-xl p-6 md:p-12 text-center hover:border-flux-primary transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-8 h-8 md:w-12 md:h-12 text-flux-text-secondary mx-auto mb-3 md:mb-4" />
          <h3 className="text-base md:text-lg font-semibold text-flux-text-primary mb-2">
            Upload your video
          </h3>
          <p className="text-sm md:text-base text-flux-text-secondary mb-3 md:mb-4">
            Drag and drop your video here, or click to browse
          </p>
          <p className="text-xs md:text-sm text-flux-text-secondary">
            Supports MP4, MOV, AVI up to 100MB
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
          <div className="relative aspect-[9/16] max-w-[200px] md:max-w-xs mx-auto bg-black rounded-xl overflow-hidden">
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
              <div className="text-center text-white p-4 md:p-6">
                <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-b-2 border-white mx-auto mb-3 md:mb-4"></div>
                <h3 className="text-base md:text-lg font-semibold mb-2">
                  {uploadStatus === 'uploading' && 'Uploading Video...'}
                  {uploadStatus === 'processing' && 'Processing Video...'}
                  {uploadStatus === 'complete' && 'Upload Complete!'}
                  {uploadStatus === 'error' && 'Upload Failed'}
                </h3>
                <p className="text-xs md:text-sm opacity-90 mb-3 md:mb-4">
                  {uploadStatus === 'uploading' && 'Converting and uploading your video to the blockchain'}
                  {uploadStatus === 'processing' && 'Your video is being processed and will be available soon'}
                  {uploadStatus === 'complete' && 'Your video has been successfully published'}
                  {uploadStatus === 'error' && 'Something went wrong during the upload'}
                </p>
              </div>
            </div>
          </div>

          {/* Upload Progress Details */}
          <div className="bg-flux-bg-tertiary rounded-xl p-4 md:p-6 space-y-3 md:space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base md:text-lg font-semibold text-flux-text-primary truncate mr-4">
                {title || 'Untitled Video'}
              </h4>
              <span className="text-xl md:text-2xl font-bold text-flux-primary flex-shrink-0">
                {uploadProgress}%
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-flux-bg-primary rounded-full h-2 md:h-3">
              <motion.div
                className={`h-2 md:h-3 rounded-full ${
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
            <div className="flex items-center justify-between text-xs md:text-sm">
              <div className={`flex items-center space-x-1 md:space-x-2 ${
                uploadProgress >= 20 ? 'text-flux-primary' : 'text-flux-text-secondary'
              }`}>
                <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${
                  uploadProgress >= 20 ? 'bg-flux-primary' : 'bg-flux-text-secondary'
                }`}></div>
                <span className="hidden sm:inline">Converting</span>
                <span className="sm:hidden">Conv</span>
              </div>
              
              <div className={`flex items-center space-x-1 md:space-x-2 ${
                uploadProgress >= 40 ? 'text-flux-primary' : 'text-flux-text-secondary'
              }`}>
                <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${
                  uploadProgress >= 40 ? 'bg-flux-primary' : 'bg-flux-text-secondary'
                }`}></div>
                <span className="hidden sm:inline">Thumbnail</span>
                <span className="sm:hidden">Thumb</span>
              </div>
              
              <div className={`flex items-center space-x-1 md:space-x-2 ${
                uploadProgress >= 60 ? 'text-flux-primary' : 'text-flux-text-secondary'
              }`}>
                <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${
                  uploadProgress >= 60 ? 'bg-flux-primary' : 'bg-flux-text-secondary'
                }`}></div>
                <span className="hidden sm:inline">Uploading</span>
                <span className="sm:hidden">Upload</span>
              </div>
              
              <div className={`flex items-center space-x-1 md:space-x-2 ${
                uploadProgress >= 100 ? 'text-flux-primary' : 'text-flux-text-secondary'
              }`}>
                <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${
                  uploadProgress >= 100 ? 'bg-flux-primary' : 'bg-flux-text-secondary'
                }`}></div>
                <span className="hidden sm:inline">Complete</span>
                <span className="sm:hidden">Done</span>
              </div>
            </div>

            {/* Video Info During Upload */}
            {videoMetadata && (
              <div className="grid grid-cols-2 gap-3 md:gap-4 pt-3 md:pt-4 border-t border-flux-bg-primary">
                <div className="text-center">
                  <span className="block text-xs text-flux-text-secondary">Duration</span>
                  <span className="text-xs md:text-sm font-medium text-flux-text-primary">
                    {formatDuration(videoMetadata.duration)}
                  </span>
                </div>
                <div className="text-center">
                  <span className="block text-xs text-flux-text-secondary">Size</span>
                  <span className="text-xs md:text-sm font-medium text-flux-text-primary">
                    {formatFileSize(selectedFile.size)}
                  </span>
                </div>
              </div>
            )}

            {/* Current Action */}
            <div className="text-center pt-2">
              <p className="text-xs md:text-sm text-flux-text-secondary">
                {uploadProgress < 10 && "Preparing video file..."}
                {uploadProgress >= 10 && uploadProgress < 20 && "Generating thumbnail..."}
                {uploadProgress >= 20 && uploadProgress < 90 && "Uploading video chunks..."}
                {uploadProgress >= 90 && uploadProgress < 100 && "Finalizing upload..."}
                {uploadStatus === 'processing' && "Processing video..."}
                {uploadStatus === 'complete' && "Video successfully published!"}
                {uploadStatus === 'error' && "Upload failed. Please try again."}
              </p>
              
              {/* Chunk progress for chunked uploads */}
              {totalChunks > 0 && uploadStatus === 'uploading' && (
                <div className="text-xs text-flux-text-secondary mt-1">
                  Uploaded {chunksUploaded} of {totalChunks} chunks
                </div>
              )}
            </div>

            {/* Resume Upload Button */}
            {canResume && uploadStatus === 'error' && (
              <div className="flex justify-center pt-4">
                <Button
                  onClick={resumeUpload}
                  className="px-8"
                  variant="primary"
                  disabled={isUploading}
                >
                  Resume Upload
                </Button>
              </div>
            )}

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
                  variant={uploadStatus === 'error' ? 'secondary' : 'primary'}
                >
                  {uploadStatus === 'complete' ? 'Done' : 'Close'}
                </Button>
              </div>
            )}
          </div>
        </div>

      ) : (
        <div className="space-y-6">
          {/* Video Preview */}
          <div className="relative aspect-[9/16] max-w-[250px] md:max-w-xs mx-auto bg-black rounded-xl overflow-hidden">
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
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-flux-text-primary">Uploading...</span>
                <span className="text-flux-text-secondary">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-flux-bg-tertiary rounded-full h-2">
                <motion.div
                  className="bg-flux-gradient h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isUploading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={uploadVideo}
              disabled={isUploading || !title.trim()}
              isLoading={isUploading}
              className="flex-1"
            >
              {isUploading ? 'Uploading...' : 'Publish Video'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};