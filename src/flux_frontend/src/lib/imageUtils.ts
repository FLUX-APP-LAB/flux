import React from 'react';

// Image utility to handle external images with fallbacks and CORS-friendly alternatives
export interface ImageConfig {
  width?: number;
  height?: number;
  category?: 'people' | 'nature' | 'tech' | 'gaming' | 'art' | 'music';
  fallback?: string;
}

// Safe placeholder images using services that support CORS
const PLACEHOLDER_SERVICES = {
  picsum: (width: number = 400, height: number = 400, seed?: string) => 
    `https://picsum.photos/${width}/${height}${seed ? `?random=${seed}` : ''}`,
  
  placeholder: (width: number = 400, height: number = 400, text?: string) =>
    `https://via.placeholder.com/${width}x${height}/6366f1/ffffff?text=${encodeURIComponent(text || 'Image')}`,
  
  avataaars: (seed?: string) =>
    `https://avataaars.io/?avatarStyle=Circle&topType=ShortHairShortWaved&accessoriesType=Blank&hairColor=BrownDark&facialHairType=Blank&clotheType=BlazerShirt&eyeType=Default&eyebrowType=Default&mouthType=Default&skinColor=Light${seed ? `&seed=${seed}` : ''}`,
  
  robohash: (seed: string = 'default', type: 'avatars' | 'robots' = 'avatars') =>
    `https://robohash.org/${seed}?set=set${type === 'avatars' ? '4' : '1'}&size=200x200`
};

// Pre-defined safe avatar images
const SAFE_AVATARS = [
  '/default-avatar.png', // Local fallback
  PLACEHOLDER_SERVICES.robohash('user1', 'avatars'),
  PLACEHOLDER_SERVICES.robohash('user2', 'avatars'),
  PLACEHOLDER_SERVICES.robohash('user3', 'avatars'),
  PLACEHOLDER_SERVICES.robohash('user4', 'avatars'),
  PLACEHOLDER_SERVICES.robohash('user5', 'avatars'),
];

// Pre-defined safe thumbnail images
const SAFE_THUMBNAILS = [
  PLACEHOLDER_SERVICES.picsum(800, 600, '1'),
  PLACEHOLDER_SERVICES.picsum(800, 600, '2'),
  PLACEHOLDER_SERVICES.picsum(800, 600, '3'),
  PLACEHOLDER_SERVICES.picsum(800, 600, '4'),
  PLACEHOLDER_SERVICES.picsum(800, 600, '5'),
];

/**
 * Get a safe avatar image URL
 */
export function getSafeAvatar(index?: number, fallback?: string): string {
  if (fallback) return fallback;
  
  const safeIndex = (index ?? Math.floor(Math.random() * SAFE_AVATARS.length)) % SAFE_AVATARS.length;
  return SAFE_AVATARS[safeIndex];
}

/**
 * Get a safe thumbnail image URL
 */
export function getSafeThumbnail(index?: number, width: number = 800, height: number = 600): string {
  if (index !== undefined) {
    const safeIndex = index % SAFE_THUMBNAILS.length;
    return SAFE_THUMBNAILS[safeIndex];
  }
  
  // Generate random but consistent image
  const randomSeed = Math.floor(Math.random() * 1000);
  return PLACEHOLDER_SERVICES.picsum(width, height, randomSeed.toString());
}

/**
 * Get a placeholder image with custom text
 */
export function getPlaceholderImage(
  width: number = 400,
  height: number = 400,
  text: string = 'Image'
): string {
  return PLACEHOLDER_SERVICES.placeholder(width, height, text);
}

/**
 * Create an image with error handling and fallback
 */
export function createSafeImage(
  src: string,
  fallbackSrc?: string,
  onError?: (error: Event) => void
): HTMLImageElement {
  const img = new Image();
  img.crossOrigin = 'anonymous'; // Enable CORS
  
  img.onerror = (error) => {
    console.warn(`Failed to load image: ${src}`);
    if (fallbackSrc && img.src !== fallbackSrc) {
      console.log(`Falling back to: ${fallbackSrc}`);
      img.src = fallbackSrc;
    } else {
      // Final fallback to placeholder
      img.src = getPlaceholderImage(300, 300, 'Failed to load');
    }
    if (onError && error instanceof Event) {
      onError(error);
    }
  };
  
  img.src = src;
  return img;
}

/**
 * Preload an image with fallback handling
 */
export function preloadImage(src: string, fallbackSrc?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = createSafeImage(
      src,
      fallbackSrc,
      () => resolve(fallbackSrc || getPlaceholderImage())
    );
    
    img.onload = () => resolve(img.src);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      if (!img.complete) {
        reject(new Error('Image load timeout'));
      }
    }, 5000);
  });
}

/**
 * Convert unsafe Pexels URLs to safe alternatives
 */
export function convertPexelsToSafe(pexelsUrl: string): string {
  // Extract dimensions from Pexels URL
  const widthMatch = pexelsUrl.match(/w=(\d+)/);
  const heightMatch = pexelsUrl.match(/h=(\d+)/);
  
  const width = widthMatch ? parseInt(widthMatch[1]) : 400;
  const height = heightMatch ? parseInt(heightMatch[1]) : 400;
  
  // Generate consistent seed from URL for consistency
  const seed = pexelsUrl.split('/').pop()?.split('.')[0] || 'default';
  const numericSeed = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 1000;
  
  if (width <= 50 && height <= 50) {
    // Small avatars
    return PLACEHOLDER_SERVICES.robohash(seed, 'avatars');
  } else {
    // Larger images
    return PLACEHOLDER_SERVICES.picsum(width, height, numericSeed.toString());
  }
}

// React hook for safe image loading
export function useSafeImage(src: string, fallbackSrc?: string) {
  const [imageSrc, setImageSrc] = React.useState<string>(src);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);
  
  React.useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    
    preloadImage(src, fallbackSrc)
      .then((loadedSrc) => {
        setImageSrc(loadedSrc);
        setIsLoading(false);
      })
      .catch(() => {
        setHasError(true);
        setIsLoading(false);
        setImageSrc(fallbackSrc || getPlaceholderImage());
      });
  }, [src, fallbackSrc]);
  
  return { imageSrc, isLoading, hasError };
}

export default {
  getSafeAvatar,
  getSafeThumbnail,
  getPlaceholderImage,
  createSafeImage,
  preloadImage,
  convertPexelsToSafe,
  useSafeImage
};
