import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, Play, Pause, Volume2, VolumeX, X, Hash, AtSign } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAppStore } from '../../store/appStore';
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