import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Settings, Share, MoreHorizontal, Play, Users, Edit } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { EditProfileModal } from '../profile/EditProfileModal';
import { useAppStore } from '../../store/appStore';
import { generateMockData, formatNumber } from '../../lib/utils';
import { User, Video, LiveStream } from '../../store/appStore';
import { useWallet } from '../../hooks/useWallet';
import { UserService } from '../../lib/userService';
import { toast } from 'react-hot-toast';


export const UserProfile: React.FC = () => {
  const { currentUser, setActivePage, toggleFollowUser, isFollowingUser: isFollowingUserInStore } = useAppStore();
  const [activeTab, setActiveTab] = useState<'videos' | 'streams' | 'about'>('videos');
  const [userVideos, setUserVideos] = useState<Video[]>([]);
  const [userStreams, setUserStreams] = useState<LiveStream[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const { walletAddress, fetchAndSetCurrentUser, newAuthActor } = useWallet();

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      setError(null);
      if (currentUser) {
        setProfileUser(currentUser);
        setLoading(false);
      } else if (walletAddress) {
        try {
          const user = await fetchAndSetCurrentUser(walletAddress);
          if (user) {
            setProfileUser(user);
          } else {
            setProfileUser(null);
            setError('User not found.');
          }
        } catch (e) {
          setProfileUser(null);
          setError('Failed to fetch user.');
        } finally {
          setLoading(false);
        }
      } else {
        setProfileUser(null);
        setError('User not found.');
        setLoading(false);
      }
    };
    fetchUser();
  }, [currentUser, walletAddress, fetchAndSetCurrentUser]);

  const isOwnProfile = currentUser?.id === profileUser?.id;

  // Load follow status when profile user changes
  useEffect(() => {
    const loadFollowStatus = async () => {
      if (!newAuthActor || !profileUser || isOwnProfile) return;

      try {
        const userService = new UserService(newAuthActor);
        const relationship = await userService.getUserRelationship(profileUser.id);
        const isFollowing = relationship === 'Following' || relationship === 'Mutual' || relationship === 'Subscriber';
        setIsFollowing(isFollowing);
        
        // Update store with follow status
        if (isFollowing && !isFollowingUserInStore(profileUser.id)) {
          toggleFollowUser(profileUser.id);
        } else if (!isFollowing && isFollowingUserInStore(profileUser.id)) {
          toggleFollowUser(profileUser.id);
        }
      } catch (error) {
        console.error('Error loading follow status:', error);
      }
    };

    loadFollowStatus();
  }, [profileUser, newAuthActor, isOwnProfile]);

  const handleFollow = async () => {
    if (!newAuthActor || !profileUser || isFollowingLoading) return;

    setIsFollowingLoading(true);
    try {
      const userService = new UserService(newAuthActor);
      let success = false;

      if (isFollowing) {
        success = await userService.unfollowUser(profileUser.id);
        if (success) {
          setIsFollowing(false);
          toggleFollowUser(profileUser.id); // Update store
          toast.success('Unfollowed user');
        }
      } else {
        success = await userService.followUser(profileUser.id);
        if (success) {
          setIsFollowing(true);
          toggleFollowUser(profileUser.id); // Update store
          toast.success('Following user');
        }
      }

      if (!success) {
        toast.error(isFollowing ? 'Failed to unfollow user' : 'Failed to follow user');
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
      toast.error('Failed to follow user');
    } finally {
      setIsFollowingLoading(false);
    }
  };

  useEffect(() => {
    const { mockVideos, mockStreams } = generateMockData();
    setUserVideos(mockVideos.slice(0, 8));
    setUserStreams(mockStreams);
  }, []);

  const tabs = [
    { id: 'videos' as const, label: 'Videos', count: userVideos.length },
    { id: 'streams' as const, label: 'Streams', count: userStreams.length },
    { id: 'about' as const, label: 'About' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-flux-bg-primary">
        <span className="text-flux-text-secondary text-lg">Loading profile...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-flux-bg-primary">
        <span className="text-flux-accent-red text-lg">{error}</span>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-flux-bg-primary">
        <span className="text-flux-text-secondary text-lg">User not found.</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-flux-bg-primary">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between p-3 md:p-4 pt-8 md:pt-12">
          <Button size="sm" variant="ghost" onClick={() => setActivePage('home')} className="p-2">
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </Button>
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="ghost" className="p-2">
              <Share className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </Button>
            <Button size="sm" variant="ghost" className="p-2">
              <MoreHorizontal className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </Button>
          </div>
        </div>
      </div>

      {/* Profile Banner */}
      <div className="relative h-48 md:h-64 overflow-hidden">
        <img
          src={profileUser?.banner}
          alt="Profile banner"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* Profile Info */}
      <div className="relative -mt-12 md:-mt-16 px-3 md:px-4">
        <div className="flex items-end justify-between mb-3 md:mb-4">
          <div className="flex items-end space-x-3 md:space-x-4">
            <Avatar
              src={profileUser?.avatar || ''}
              alt={profileUser?.displayName || ''}
              size="xl"
              isLive={profileUser?.isLiveStreaming}
              tier={profileUser?.tier}
            />
            <div className="pb-2">
              <h1 className="text-xl md:text-2xl font-bold text-flux-text-primary">
                {profileUser?.displayName}
              </h1>
              <p className="text-flux-text-secondary">@{profileUser?.username}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 pb-2">
            {isOwnProfile ? (
              <Button 
                size="sm" 
                variant="secondary"
                onClick={() => setShowEditModal(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <>
                <Button 
                  size="sm" 
                  variant={isFollowing ? "secondary" : "primary"}
                  onClick={handleFollow}
                  disabled={!newAuthActor || isFollowingLoading}
                >
                  {isFollowingLoading ? 'Loading...' : (isFollowing ? 'Following' : 'Follow')}
                </Button>
                <Button size="sm" variant="primary">
                  Subscribe
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-6 mb-6">
          <div className="text-center">
            <p className="text-xl font-bold text-flux-text-primary">
              {formatNumber(profileUser?.followerCount || 0)}
            </p>
            <p className="text-flux-text-secondary text-sm">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-flux-text-primary">
              {formatNumber(profileUser?.followingCount || 0)}
            </p>
            <p className="text-flux-text-secondary text-sm">Following</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-flux-text-primary">
              {formatNumber(profileUser?.subscriberCount || 0)}
            </p>
            <p className="text-flux-text-secondary text-sm">Subscribers</p>
          </div>
        </div>

        {/* Bio */}
        <div className="mb-6">
          <p className="text-flux-text-primary">
            {profileUser?.bio || ''}
          </p>
          {Array.isArray(profileUser?.website) && profileUser.website.filter(site => typeof site === 'string' && site.trim().length > 0).length > 0 && (
            <span className="text-flux-text-primary block mt-2">
              {profileUser.website.filter(site => typeof site === 'string' && site.trim().length > 0).map((site, idx, arr) => (
                <span key={site}>
                  🌐 website: <a href={site} target="_blank" rel="noopener noreferrer" className="underline text-flux-primary">{site}</a>{idx < arr.length - 1 ? ', ' : ''}
                </span>
              ))}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-flux-bg-tertiary mb-6">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 transition-colors ${
                  activeTab === tab.id
                    ? 'text-flux-primary border-b-2 border-flux-primary'
                    : 'text-flux-text-secondary hover:text-flux-text-primary'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="ml-2 text-sm">({tab.count})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="pb-20">
          {activeTab === 'videos' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {userVideos.map((video) => (
                <motion.div
                  key={video.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative aspect-[9/16] rounded-lg overflow-hidden bg-flux-bg-secondary cursor-pointer"
                >
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-sm font-medium line-clamp-2">
                      {video.title}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Play className="w-3 h-3 text-white" />
                      <span className="text-white/80 text-xs">
                        {formatNumber(video.views)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'streams' && (
            <div className="space-y-4">
              {userStreams.map((stream) => (
                <motion.div
                  key={stream.id}
                  whileHover={{ scale: 1.02 }}
                  className="flex items-center space-x-4 p-4 bg-flux-bg-secondary rounded-lg cursor-pointer"
                >
                  <div className="relative">
                    <img
                      src={stream.thumbnail}
                      alt={stream.title}
                      className="w-24 h-16 rounded-lg object-cover"
                    />
                    {stream.isLive && (
                      <div className="absolute -top-1 -right-1 bg-flux-accent-red text-white text-xs px-1 rounded font-bold">
                        LIVE
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-flux-text-primary font-medium">
                      {stream.title}
                    </h3>
                    <p className="text-flux-text-secondary text-sm">
                      {stream.category}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Users className="w-3 h-3 text-flux-text-secondary" />
                      <span className="text-flux-text-secondary text-xs">
                        {formatNumber(stream.viewers)} viewers
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-flux-text-primary mb-2">
                  About Me
                </h3>
                <p className="text-flux-text-secondary">
                  Hey there! I'm a passionate content creator who loves exploring the latest in technology. 
                  I create videos about programming, tech reviews, and live coding sessions. 
                  Join me on this journey as we dive into the world of innovation together!
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-flux-text-primary mb-2">
                  Streaming Schedule
                </h3>
                <div className="space-y-2">
                  <p className="text-flux-text-secondary">Monday - Friday: 7:00 PM EST</p>
                  <p className="text-flux-text-secondary">Saturday: 2:00 PM EST</p>
                  <p className="text-flux-text-secondary">Sunday: Rest day</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
      />
    </div>
  );
};