import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, Play, Pause, Volume2, VolumeX, X, Hash, AtSign } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAppStore } from '../../store/appStore';
import { useWallet } from '../../hooks/useWallet';
import { VideoService } from '../../lib/videoService';
import { 
  validateVideoFile, 
  extractVideoMetadata, 
  formatFileSize,
  formatDuration,
  getVideoType,
  fileToUint8Array,
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { currentUser, videoFeed, setVideoFeed } = useAppStore();
  const { newAuthActor, principal } = useWallet();

  const handleFileSelect = useCallback((file: File) => {
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
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
      // Convert file to Uint8Array for Motoko backend
      toast.loading('Converting video file...');
      const videoData = await fileToUint8Array(selectedFile);
      
      setUploadProgress(20);
      
      // Generate thumbnail
      toast.loading('Generating thumbnail...');
      const thumbnailBlob = await generateThumbnail(selectedFile);
      const thumbnailData = await fileToUint8Array(new File([thumbnailBlob], 'thumbnail.jpg'));
      
      setUploadProgress(40);
      
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
        tags: [],
        hashtags: processedHashtags,
        settings: {
          isPrivate,
          isUnlisted,
          allowComments,
          allowDuets,
          allowRemix,
          isMonetized: false,
          ageRestricted: false,
          scheduledAt: [],
        }
      };
      
      setUploadProgress(60);
      setUploadStatus('processing');
      toast.loading('Uploading to backend...');
      
      // Call backend upload function
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
      
      console.log('Video uploaded successfully with ID:', result.ok);
      toast.success('Video uploaded successfully!');
      
      // Trigger immediate refresh of video feed to show the new video
      // This will help other users see the video faster
      try {
        const videoService = new VideoService(newAuthActor);
        const updatedVideos = await videoService.getAllVideos();
        setVideoFeed(updatedVideos);
        console.log('Video feed refreshed after upload');
      } catch (error) {
        console.error('Failed to refresh video feed after upload:', error);
      }
      
      setTimeout(() => onClose(), 1000);
      
    } catch (error) {
      setUploadStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      toast.error(errorMessage);
      consol
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