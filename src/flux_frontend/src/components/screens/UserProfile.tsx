import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Settings, Share, MoreHorizontal, Play, Users, Edit } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { EditProfileModal } from '../profile/EditProfileModal';
import { useAppStore } from '../../store/appStore';
import { generateMockData, formatNumber } from '../../lib/utils';
import { User, Video, LiveStream } from '../../store/appStore';

export const UserProfile: React.FC = () => {
  const { currentUser, setActivePage } = useAppStore();
  const [activeTab, setActiveTab] = useState<'videos' | 'streams' | 'about'>('videos');
  const [userVideos, setUserVideos] = useState<Video[]>([]);
  const [userStreams, setUserStreams] = useState<LiveStream[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);

  // Use current user if available, otherwise show mock profile
  const profileUser: User = currentUser || {
    id: '1',
    username: 'techcreator',
    displayName: 'Tech Creator',
    avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
    banner: 'https://images.pexels.com/photos/1181298/pexels-photo-1181298.jpeg?auto=compress&cs=tinysrgb&w=800&h=300&fit=crop',
    followerCount: 125000,
    followingCount: 250,
    subscriberCount: 45000,
    tier: 'gold',
    isLiveStreaming: false,
  };

  const isOwnProfile = currentUser?.id === profileUser.id;

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

  return (
    <div className="min-h-screen bg-flux-bg-primary">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between p-4 pt-12">
          <Button size="sm" variant="ghost" onClick={() => setActivePage('home')}>
            <ArrowLeft className="w-5 h-5 text-white" />
          </Button>
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="ghost">
              <Share className="w-5 h-5 text-white" />
            </Button>
            <Button size="sm" variant="ghost">
              <MoreHorizontal className="w-5 h-5 text-white" />
            </Button>
          </div>
        </div>
      </div>

      {/* Profile Banner */}
      <div className="relative h-64 overflow-hidden">
        <img
          src={profileUser.banner}
          alt="Profile banner"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* Profile Info */}
      <div className="relative -mt-16 px-4">
        <div className="flex items-end justify-between mb-4">
          <div className="flex items-end space-x-4">
            <Avatar
              src={profileUser.avatar}
              alt={profileUser.displayName}
              size="xl"
              isLive={profileUser.isLiveStreaming}
              tier={profileUser.tier}
            />
            <div className="pb-2">
              <h1 className="text-2xl font-bold text-flux-text-primary">
                {profileUser.displayName}
              </h1>
              <p className="text-flux-text-secondary">@{profileUser.username}</p>
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
                <Button size="sm" variant="secondary">
                  Follow
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
              {formatNumber(profileUser.followerCount || 0)}
            </p>
            <p className="text-flux-text-secondary text-sm">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-flux-text-primary">
              {formatNumber(profileUser.followingCount || 0)}
            </p>
            <p className="text-flux-text-secondary text-sm">Following</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-flux-text-primary">
              {formatNumber(profileUser.subscriberCount || 0)}
            </p>
            <p className="text-flux-text-secondary text-sm">Subscribers</p>
          </div>
        </div>

        {/* Bio */}
        <div className="mb-6">
          <p className="text-flux-text-primary">
            🎥 Content creator passionate about technology and innovation
          </p>
          <p className="text-flux-text-primary">
            📧 Business inquiries: hello@techcreator.com
          </p>
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