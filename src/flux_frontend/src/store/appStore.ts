import { create } from 'zustand';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  followerCount?: number;
  followingCount?: number;
  subscriberCount?: number;
  isLiveStreaming?: boolean;
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  banner?: string;
  walletAddress?: string;
  principal?: string;
}

export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  videoUrl: string;
  creator: User;
  views: number;
  likes: number;
  duration: number;
  isLiked: boolean;
  description: string;
  hashtags: string[];
}

export interface LiveStream {
  id: string;
  title: string;
  thumbnail: string;
  creator: User;
  viewers: number;
  isLive: boolean;
  category: string;
}

export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
  badges?: string[];
}

interface AppState {
  // User state
  currentUser: User | null;
  isAuthenticated: boolean;
  walletAddress: string | null;
  principal: string | null;
  
  // Content state
  videoFeed: Video[];
  currentVideoIndex: number;
  
  // Streaming state
  activeStreams: LiveStream[];
  currentStream: LiveStream | null;
  
  // UI state
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  desktopSidebarCollapsed: boolean;
  activePage: 'home' | 'discover' | 'following' | 'profile' | 'stream' | 'creator' | 'trending' | 'gaming' | 'rewards' | 'saved' | 'notifications' | 'settings' | 'wallet';
  
  // Actions
  setCurrentUser: (user: User | null) => void;
  setAuthenticated: (isAuth: boolean) => void;
  setWalletAddress: (address: string | null) => void;
  setPrincipal: (principal: string | null) => void;
  setVideoFeed: (videos: Video[]) => void;
  setCurrentVideoIndex: (index: number) => void;
  toggleVideoLike: (videoId: string) => void;
  setActiveStreams: (streams: LiveStream[]) => void;
  setCurrentStream: (stream: LiveStream | null) => void;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
  setDesktopSidebarCollapsed: (collapsed: boolean) => void;
  setActivePage: (page: AppState['activePage']) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  currentUser: null,
  isAuthenticated: false,
  walletAddress: null,
  principal: null,
  videoFeed: [],
  currentVideoIndex: 0,
  activeStreams: [],
  currentStream: null,
  theme: 'dark',
  sidebarOpen: false,
  desktopSidebarCollapsed: false,
  activePage: 'home',
  
  // Actions
  setCurrentUser: (user) => set({ currentUser: user }),
  setAuthenticated: (isAuth) => set({ isAuthenticated: isAuth }),
  setWalletAddress: (address) => set({ walletAddress: address }),
  setPrincipal: (principal) => set({ principal }),
  setVideoFeed: (videos) => set({ videoFeed: videos }),
  setCurrentVideoIndex: (index) => set({ currentVideoIndex: index }),
  toggleVideoLike: (videoId) => set((state) => ({
    videoFeed: state.videoFeed.map(video => 
      video.id === videoId 
        ? { ...video, isLiked: !video.isLiked, likes: video.isLiked ? video.likes - 1 : video.likes + 1 }
        : video
    )
  })),
  setActiveStreams: (streams) => set({ activeStreams: streams }),
  setCurrentStream: (stream) => set({ currentStream: stream }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setDesktopSidebarCollapsed: (collapsed) => set({ desktopSidebarCollapsed: collapsed }),
  setActivePage: (page) => set({ activePage: page }),
}));