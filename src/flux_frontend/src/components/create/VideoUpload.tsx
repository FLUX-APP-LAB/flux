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
  const { newAuthActor } = useWallet();

  const handleFileSelect = useCallback((file: File) => {
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
    } else {
      toast.error('Please select a valid video file');
  const simulateUpload = async () => {
    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setUploadProgress(i);
    }

    // Create new video object
    const newVideo = {
      id: Date.now().toString(),
      title: title || 'Untitled Video',
      thumbnail: videoPreview || 'https://images.pexels.com/photos/1181298/pexels-photo-1181298.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop',
      videoUrl: videoPreview || 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
      creator: currentUser!,
      views: 0,
      likes: 0,
      duration: 180,
      isLiked: false,
      description,
      hashtags: hashtags.split(' ').filter(tag => tag.startsWith('#')),
    };

    // Add to feed
    setVideoFeed([newVideo, ...videoFeed]);
    
    setIsUploading(false);
    toast.success('Video uploaded successfully!');
    onClose();
  };
        );
      } catch (err) {
        // Network/CORS error handling
        if (err instanceof TypeError && err.message.includes('NetworkError')) {
          toast.error('Network error: Check backend CORS settings.');
        } else {
          const errorMessage = typeof err === 'object' && err !== null && 'message' in err
            ? (err as { message?: string }).message
            : undefined;
          toast.error('Upload failed: ' + (errorMessage || 'Unknown error'));
        }
        throw err;
      }
      setUploadProgress(100);
      if (result && 'ok' in result) {
        toast.success('Video uploaded successfully!');
        // Clean up preview URL
        if (videoPreview) {
          URL.revokeObjectURL(videoPreview);
        }
        setSelectedFile(null);
        setVideoPreview(null);
        onClose();
      } else {
        toast.error('Upload failed: ' + (result?.err || 'Unknown error'));
      }
    } catch (err) {
      console.error('Upload error:', err);
      // Error already handled above
    } finally {
      setIsUploading(false);
    }
  };
>>>>>>> parent of 421dca1 (Merge pull request #3 from Cybortex/follow-fxn)

      let thumbnail: number[] = [];
  const simulateUpload = async () => {
    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setUploadProgress(i);
    }

    // Create new video object
    const newVideo = {
      id: Date.now().toString(),
      title: title || 'Untitled Video',
      thumbnail: videoPreview || 'https://images.pexels.com/photos/1181298/pexels-photo-1181298.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop',
      videoUrl: videoPreview || 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
      creator: currentUser!,
      views: 0,
      likes: 0,
      duration: 180,
      isLiked: false,
      description,
      hashtags: hashtags.split(' ').filter(tag => tag.startsWith('#')),
    };

    // Add to feed
    setVideoFeed([newVideo, ...videoFeed]);
    
    setIsUploading(false);
    toast.success('Video uploaded successfully!');
    onClose();
  };
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
<<<<<<< HEAD
              onClick={uploadVideo}
=======
              onClick={simulateUpload}
>>>>>>> parent of 66714e5 (feat: Implement video upload functionality with chunked uploads, metadata extraction, and enhanced validation in frontend and backend)
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