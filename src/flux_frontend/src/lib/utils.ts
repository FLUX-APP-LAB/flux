import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function generateMockData() {
  const mockUsers = [
    { id: '1', username: 'techcreator', displayName: 'Tech Creator', avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop' },
    { id: '2', username: 'musicvibes', displayName: 'Music Vibes', avatar: 'https://images.pexels.com/photos/1081685/pexels-photo-1081685.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop' },
    { id: '3', username: 'artstream', displayName: 'Art Stream', avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop' },
    { id: '4', username: 'gamerpro', displayName: 'Gamer Pro', avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop' },
  ];

  const mockVideos = [
    {
      id: '1',
      title: 'Amazing Tech Review',
      thumbnail: 'https://images.pexels.com/photos/1181298/pexels-photo-1181298.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      creator: mockUsers[0],
      views: 125000,
      likes: 12500,
      duration: 180,
      isLiked: false,
      description: 'Check out this amazing tech review covering the latest gadgets and innovations in the tech world!',
      hashtags: ['#tech', '#review', '#gadgets', '#innovation'],
    },
    {
      id: '2',
      title: 'Chill Music Session',
      thumbnail: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      creator: mockUsers[1],
      views: 89000,
      likes: 8900,
      duration: 240,
      isLiked: true,
      description: 'Relaxing music session perfect for studying, working, or just chilling out.',
      hashtags: ['#music', '#chill', '#relaxing', '#vibes'],
    },
    {
      id: '3',
      title: 'Digital Art Process',
      thumbnail: 'https://images.pexels.com/photos/1936936/pexels-photo-1936936.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      creator: mockUsers[2],
      views: 67000,
      likes: 6700,
      duration: 300,
      isLiked: false,
      description: 'Watch me create digital art from scratch using professional techniques and tools.',
      hashtags: ['#art', '#digital', '#creative', '#process'],
    },
    {
      id: '4',
      title: 'Epic Gaming Moments',
      thumbnail: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      creator: mockUsers[3],
      views: 234000,
      likes: 23400,
      duration: 420,
      isLiked: true,
      description: 'Compilation of the most epic gaming moments and highlights from recent streams.',
      hashtags: ['#gaming', '#epic', '#highlights', '#moments'],
    },
  ];

  const mockStreams = [
    {
      id: '1',
      title: 'Live Coding Session',
      thumbnail: 'https://images.pexels.com/photos/1181472/pexels-photo-1181472.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      creator: mockUsers[0],
      viewers: 1250,
      isLive: true,
      category: 'Technology',
    },
    {
      id: '2',
      title: 'Music Production Live',
      thumbnail: 'https://images.pexels.com/photos/1370545/pexels-photo-1370545.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      creator: mockUsers[1],
      viewers: 890,
      isLive: true,
      category: 'Music',
    },
  ];

  return { mockUsers, mockVideos, mockStreams };
}