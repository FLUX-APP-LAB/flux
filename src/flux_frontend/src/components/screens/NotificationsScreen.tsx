import React from 'react';
import { Bell, Heart, MessageCircle, UserPlus, Video, Calendar } from 'lucide-react';

export const NotificationsScreen: React.FC = () => {
  const notifications = [
    {
      id: 1,
      type: 'like',
      icon: Heart,
      iconColor: 'text-flux-accent-red',
      user: 'john_doe',
      action: 'liked your video',
      content: 'Epic Gaming Moment #1',
      time: '2 minutes ago',
      unread: true,
    },
    {
      id: 2,
      type: 'comment',
      icon: MessageCircle,
      iconColor: 'text-flux-primary',
      user: 'sarah_gamer',
      action: 'commented on your stream',
      content: 'Amazing stream today!',
      time: '15 minutes ago',
      unread: true,
    },
    {
      id: 3,
      type: 'follow',
      icon: UserPlus,
      iconColor: 'text-flux-accent-green',
      user: 'mike_creator',
      action: 'started following you',
      content: '',
      time: '1 hour ago',
      unread: true,
    },
    {
      id: 4,
      type: 'video',
      icon: Video,
      iconColor: 'text-flux-accent-yellow',
      user: 'flux_team',
      action: 'uploaded a new video',
      content: 'FLUX Platform Update v2.0',
      time: '3 hours ago',
      unread: false,
    },
  ];

  return (
    <div className="min-h-screen bg-flux-bg-primary pt-20 md:pt-20 lg:pt-6 px-4 md:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-flux-primary rounded-xl">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-flux-text-primary">Notifications</h1>
                <p className="text-flux-text-secondary">Stay updated with your FLUX activity</p>
              </div>
            </div>
            <button className="text-sm text-flux-primary hover:underline">
              Mark all as read
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-4 mb-6">
          {['All', 'Likes', 'Comments', 'Follows', 'Uploads'].map((tab) => (
            <button
              key={tab}
              className="px-4 py-2 rounded-lg bg-flux-bg-secondary text-flux-text-secondary hover:text-flux-text-primary hover:bg-flux-bg-tertiary transition-colors"
            >
              {tab}
              {tab === 'All' && (
                <span className="ml-2 bg-flux-accent-red text-white text-xs px-2 py-0.5 rounded-full">
                  3
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-flux-bg-secondary rounded-xl p-4 hover:bg-flux-bg-tertiary transition-colors ${
                notification.unread ? 'border-l-4 border-flux-primary' : ''
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className={`p-2 bg-flux-bg-tertiary rounded-lg ${notification.iconColor}`}>
                  <notification.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-semibold text-flux-text-primary">@{notification.user}</span>
                    <span className="text-flux-text-secondary">{notification.action}</span>
                    {notification.unread && (
                      <div className="w-2 h-2 bg-flux-primary rounded-full"></div>
                    )}
                  </div>
                  {notification.content && (
                    <p className="text-sm text-flux-text-secondary mb-2">"{notification.content}"</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-flux-text-secondary">{notification.time}</span>
                    <div className="flex space-x-2">
                      <button className="text-xs text-flux-primary hover:underline">View</button>
                      <button className="text-xs text-flux-text-secondary hover:text-flux-text-primary">Dismiss</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More */}
        <div className="mt-8 text-center">
          <button className="bg-flux-bg-secondary text-flux-text-primary px-6 py-3 rounded-lg hover:bg-flux-bg-tertiary transition-colors">
            Load More Notifications
          </button>
        </div>

        {/* Settings Link */}
        <div className="mt-8 bg-flux-bg-secondary rounded-xl p-6 text-center">
          <h3 className="text-lg font-semibold text-flux-text-primary mb-2">Notification Settings</h3>
          <p className="text-flux-text-secondary mb-4">Customize what notifications you receive and how you receive them.</p>
          <button className="bg-flux-primary text-white px-6 py-2 rounded-lg hover:opacity-90 transition-opacity">
            Manage Settings
          </button>
        </div>
      </div>
    </div>
  );
};
