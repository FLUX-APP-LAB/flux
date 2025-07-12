import React from 'react';
import { Bookmark, Video, Heart, Clock, Calendar } from 'lucide-react';

export const SavedScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-flux-bg-primary pt-20 md:pt-20 lg:pt-6 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-flux-primary rounded-xl">
              <Bookmark className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-flux-text-primary">Saved</h1>
              <p className="text-flux-text-secondary">Your bookmarked content</p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-4 mb-8">
          {['All', 'Videos', 'Streams', 'Playlists'].map((tab) => (
            <button
              key={tab}
              className="px-4 py-2 rounded-lg bg-flux-bg-secondary text-flux-text-secondary hover:text-flux-text-primary hover:bg-flux-bg-tertiary transition-colors"
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Saved Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-flux-bg-secondary rounded-xl overflow-hidden hover:bg-flux-bg-tertiary transition-colors">
              <div className="aspect-video bg-flux-bg-primary relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Video className="w-12 h-12 text-flux-text-secondary" />
                </div>
                <div className="absolute top-2 right-2">
                  <Bookmark className="w-5 h-5 text-flux-accent-yellow fill-current" />
                </div>
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  10:45
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-medium text-flux-text-primary mb-2 line-clamp-2">
                  Saved Video Title #{i}
                </h3>
                <p className="text-xs text-flux-text-secondary mb-2">Creator Name</p>
                <div className="flex items-center justify-between text-xs text-flux-text-secondary">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center space-x-1">
                      <Heart className="w-3 h-3" />
                      <span>1.2K</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>2 days ago</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State (when no saved content) */}
        <div className="bg-flux-bg-secondary rounded-xl p-8 text-center">
          <Bookmark className="w-16 h-16 text-flux-text-secondary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-flux-text-primary mb-2">No Saved Content Yet</h3>
          <p className="text-flux-text-secondary mb-4">Start bookmarking videos and streams you want to watch later!</p>
          <button className="bg-flux-primary text-white px-6 py-2 rounded-lg hover:opacity-90 transition-opacity">
            Explore Content
          </button>
        </div>
      </div>
    </div>
  );
};
