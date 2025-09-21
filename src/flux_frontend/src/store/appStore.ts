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
  bio?: string;
  website?: string[]; // changed from string to string[]
  location?: string;
  socialLinks?: {
    twitter?: string[];
    instagram?: string[];
    website?: string[];
    discord?: string[];
    youtube?: string[];
  };
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
  // Optional properties for stream management
  description?: string;
  tags?: string[];
  streamKey?: string;
  shareUrl?: string;
  startedAt?: Date | string; // Allow both Date and string for compatibility
  streamUrl?: string;
  chatEnabled?: boolean;
  metrics?: {
    peakViewers: number;
    averageViewers: number;
    totalViews: number;
    engagement: number;
  };
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  message: string;
  timestamp: Date;
  badges?: string[];
  messageType?: 'normal' | 'system' | 'moderator' | 'highlight';
  emotes?: { [key: string]: string }; // emote name -> image URL
}

export interface ChatUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  badges?: string[];
  isTyping: boolean;
}

export interface ChatRoom {
  streamId: string;
  messages: ChatMessage[];
  activeUsers: ChatUser[];
  settings: {
    enabled: boolean;
    slowMode: number; // seconds between messages
    subscriberOnly: boolean;
    moderatorsOnly: boolean;
  };
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
  followingUsers: Set<string>; // Set of user IDs that the current user is following
  
  // Streaming state
  activeStreams: LiveStream[];
  currentStream: LiveStream | null;
  
  // Chat state
  chatRooms: Map<string, ChatRoom>; // streamId -> ChatRoom
  currentChatRoom: string | null;
  typingUsers: Set<string>; // userIds currently typing
  
  // UI state
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  desktopSidebarCollapsed: boolean;
  activePage: 'home' | 'discover' | 'following' | 'profile' | 'stream' | 'creator' | 'trending' | 'gaming' | 'rewards' | 'saved' | 'notifications' | 'settings' | 'wallet';
  selectedUser: any | null;
  
  // Actions
  setCurrentUser: (user: User | null) => Promise<void>;
  setAuthenticated: (isAuth: boolean) => void;
  setWalletAddress: (address: string | null) => void;
  setPrincipal: (principal: string | null) => void;
  setVideoFeed: (videos: Video[]) => void;
  setCurrentVideoIndex: (index: number) => void;
  toggleVideoLike: (videoId: string) => void;
  toggleFollowUser: (userId: string) => void;
  isFollowingUser: (userId: string) => boolean;
  setActiveStreams: (streams: LiveStream[]) => void;
  setCurrentStream: (stream: LiveStream | null) => void;
  
  // Chat actions
  initializeChatRoom: (streamId: string) => void;
  addChatMessage: (streamId: string, message: ChatMessage) => void;
  updateChatUser: (streamId: string, user: ChatUser) => void;
  removeChatUser: (streamId: string, userId: string) => void;
  setCurrentChatRoom: (streamId: string | null) => void;
  addTypingUser: (userId: string) => void;
  removeTypingUser: (userId: string) => void;
  updateChatSettings: (streamId: string, settings: Partial<ChatRoom['settings']>) => void;
  
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
  setDesktopSidebarCollapsed: (collapsed: boolean) => void;
  setActivePage: (page: AppState['activePage']) => void;
  setSelectedUser: (user: any | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  currentUser: null,
  isAuthenticated: false,
  walletAddress: null,
  principal: null,
  videoFeed: [],
  currentVideoIndex: 0,
  followingUsers: new Set<string>(),
  activeStreams: [],
  currentStream: null,
  chatRooms: new Map<string, ChatRoom>(),
  currentChatRoom: null,
  typingUsers: new Set<string>(),
  theme: 'dark',
  sidebarOpen: false,
  desktopSidebarCollapsed: false,
  activePage: 'home',
  selectedUser: null,
  
  // Actions
  setCurrentUser: async (user) => {
    await Promise.resolve();
    set({ currentUser: user });
  },
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
  toggleFollowUser: (userId) => set((state) => {
    const newFollowingUsers = new Set(state.followingUsers);
    if (newFollowingUsers.has(userId)) {
      newFollowingUsers.delete(userId);
    } else {
      newFollowingUsers.add(userId);
    }
    return { followingUsers: newFollowingUsers };
  }),
  isFollowingUser: (userId) => {
    const state = get();
    return state.followingUsers.has(userId);
  },
  setActiveStreams: (streams) => set({ activeStreams: streams }),
  setCurrentStream: (stream) => set({ currentStream: stream }),
  
  // Chat actions
  initializeChatRoom: (streamId) => set((state) => {
    const newChatRooms = new Map(state.chatRooms);
    if (!newChatRooms.has(streamId)) {
      newChatRooms.set(streamId, {
        streamId,
        messages: [],
        activeUsers: [],
        settings: {
          enabled: true,
          slowMode: 0,
          subscriberOnly: false,
          moderatorsOnly: false,
        }
      });
    }
    return { chatRooms: newChatRooms };
  }),
  
  addChatMessage: (streamId, message) => set((state) => {
    const newChatRooms = new Map(state.chatRooms);
    const chatRoom = newChatRooms.get(streamId);
    if (chatRoom) {
      // Check if message with this ID already exists to prevent duplicates
      const existingMessage = chatRoom.messages.find(m => m.id === message.id);
      if (existingMessage) {
        return { chatRooms: newChatRooms }; // Don't add duplicate
      }
      
      const updatedChatRoom = {
        ...chatRoom,
        messages: [...chatRoom.messages, message].slice(-100) // Keep only last 100 messages
      };
      newChatRooms.set(streamId, updatedChatRoom);
    }
    return { chatRooms: newChatRooms };
  }),
  
  updateChatUser: (streamId, user) => set((state) => {
    const newChatRooms = new Map(state.chatRooms);
    const chatRoom = newChatRooms.get(streamId);
    if (chatRoom) {
      const existingUserIndex = chatRoom.activeUsers.findIndex(u => u.id === user.id);
      const updatedUsers = existingUserIndex >= 0 
        ? chatRoom.activeUsers.map((u, i) => i === existingUserIndex ? user : u)
        : [...chatRoom.activeUsers, user];
      
      const updatedChatRoom = {
        ...chatRoom,
        activeUsers: updatedUsers
      };
      newChatRooms.set(streamId, updatedChatRoom);
    }
    return { chatRooms: newChatRooms };
  }),
  
  removeChatUser: (streamId, userId) => set((state) => {
    const newChatRooms = new Map(state.chatRooms);
    const chatRoom = newChatRooms.get(streamId);
    if (chatRoom) {
      const updatedChatRoom = {
        ...chatRoom,
        activeUsers: chatRoom.activeUsers.filter(u => u.id !== userId)
      };
      newChatRooms.set(streamId, updatedChatRoom);
    }
    return { chatRooms: newChatRooms };
  }),
  
  setCurrentChatRoom: (streamId) => set({ currentChatRoom: streamId }),
  
  addTypingUser: (userId) => set((state) => {
    const newTypingUsers = new Set(state.typingUsers);
    newTypingUsers.add(userId);
    return { typingUsers: newTypingUsers };
  }),
  
  removeTypingUser: (userId) => set((state) => {
    const newTypingUsers = new Set(state.typingUsers);
    newTypingUsers.delete(userId);
    return { typingUsers: newTypingUsers };
  }),
  
  updateChatSettings: (streamId, settings) => set((state) => {
    const newChatRooms = new Map(state.chatRooms);
    const chatRoom = newChatRooms.get(streamId);
    if (chatRoom) {
      const updatedChatRoom = {
        ...chatRoom,
        settings: { ...chatRoom.settings, ...settings }
      };
      newChatRooms.set(streamId, updatedChatRoom);
    }
    return { chatRooms: newChatRooms };
  }),
  
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setDesktopSidebarCollapsed: (collapsed) => set({ desktopSidebarCollapsed: collapsed }),
  setActivePage: (page) => set({ activePage: page }),
  setSelectedUser: (user) => set({ selectedUser: user }),
}));