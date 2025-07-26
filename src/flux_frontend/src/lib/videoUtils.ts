// Video utility functions for handling file uploads and conversions

export interface VideoUploadData {
  title: string;
  description: string;
  hashtags: string[];
  category: string;
  isPrivate: boolean;
  isUnlisted: boolean;
  allowComments: boolean;
  allowDuets: boolean;
  allowRemix: boolean;
  isMonetized: boolean;
  ageRestricted: boolean;
}

export interface UploadProgress {
  uploaded: number;
  total: number;
  percentage: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
}

// Convert File to ArrayBuffer then to Uint8Array for Motoko backend
export const fileToUint8Array = async (file: File): Promise<Uint8Array> => {
  return new Promise((resolve, reject) => {
    if (!file || file.size === 0) {
      reject(new Error('Video file is empty'));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          reject(new Error('Failed to read file data'));
          return;
        }
        
        const uint8Array = new Uint8Array(arrayBuffer);
        if (uint8Array.length === 0) {
          reject(new Error('Converted file data is empty'));
          return;
        }
        
        resolve(uint8Array);
      } catch (error) {
        if (error instanceof Error) {
          reject(new Error(`File conversion failed: ${error.message}`));
        } else {
          reject(new Error('File conversion failed: Unknown error'));
        }
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

// Validate video file before upload
export const validateVideoFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size must be less than 10MB' };
  }
  
  if (file.size === 0) {
    return { isValid: false, error: 'File is empty' };
  }
  
  // Check file type
  const allowedTypes = ['video/mp4', 'video/mov', 'video/quicktime', 'video/avi'];
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Unsupported file format. Please use MP4, MOV, or AVI files' };
  }
  
  return { isValid: true };
};

// Extract video metadata using HTML5 video element
export const extractVideoMetadata = (file: File): Promise<{
  duration: number;
  width: number;
  height: number;
}> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    
    video.onloadedmetadata = () => {
      resolve({
        duration: Math.floor(video.duration),
        width: video.videoWidth,
        height: video.videoHeight,
      });
      URL.revokeObjectURL(url);
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video metadata'));
      URL.revokeObjectURL(url);
    };
    
    video.src = url;
  });
};

// Generate thumbnail from video file
export const generateThumbnail = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const url = URL.createObjectURL(file);
    
    video.onloadedmetadata = () => {
      // Set canvas dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Seek to 10% of video duration for thumbnail
      video.currentTime = video.duration * 0.1;
    };
    
    video.onseeked = () => {
      if (ctx) {
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate thumbnail'));
          }
          URL.revokeObjectURL(url);
        }, 'image/jpeg', 0.8);
      } else {
        reject(new Error('Canvas context not available'));
        URL.revokeObjectURL(url);
      }
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video for thumbnail'));
      URL.revokeObjectURL(url);
    };
    
    video.src = url;
  });
};

// Chunk large files for upload
export const chunkFile = (file: File, chunkSize: number = 5 * 1024 * 1024): File[] => {
  const chunks: File[] = [];
  let start = 0;
  
  while (start < file.size) {
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    chunks.push(new File([chunk], `${file.name}_chunk_${chunks.length}`, {
      type: file.type,
    }));
    start = end;
  }
  
  return chunks;
};

// Format file size for display
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format duration from seconds to MM:SS
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Determine video type based on duration
export const getVideoType = (duration: number): 'Short' | 'Long' | 'Clip' => {
  if (duration <= 60) {
    return 'Short';
  } else if (duration <= 300) {
    return 'Clip';
  } else {
    return 'Long';
  }
};

// Map frontend categories to backend enum values
export const mapCategoryToBackend = (category: string): string => {
  const categoryMap: { [key: string]: string } = {
    'gaming': 'Gaming',
    'entertainment': 'Entertainment',
    'music': 'Music',
    'education': 'Education',
    'sports': 'Sports',
    'comedy': 'Comedy',
    'dance': 'Dance',
    'food': 'Food',
    'travel': 'Travel',
    'art': 'Art',
    'technology': 'Technology',
    'lifestyle': 'Lifestyle',
    'news': 'News',
    'other': 'Other',
  };
  
  return categoryMap[category.toLowerCase()] || 'Other';
};
