import React from 'react';
import { Gamepad2, Trophy, Users, TrendingUp, Calendar } from 'lucide-react';

export const GamingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-flux-bg-primary pt-20 md:pt-20 lg:pt-6 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-flux-gradient rounded-xl">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-flux-text-primary">Gaming Hub</h1>
              <p className="text-flux-text-secondary">Your gaming community on FLUX</p>
            </div>
            <span className="bg-flux-accent-green text-white text-xs px-2 py-1 rounded-full">NEW</span>
          </div>
        </div>

        {/* Gaming Categories */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {['Action', 'Strategy', 'RPG', 'Sports'].map((category) => (
            <div key={category} className="bg-flux-bg-secondary rounded-xl p-4 text-center hover:bg-flux-bg-tertiary transition-colors cursor-pointer">
              <div className="w-12 h-12 bg-flux-primary rounded-lg mx-auto mb-2"></div>
              <p className="text-sm font-medium text-flux-text-primary">{category}</p>
            </div>
          ))}
        </div>

        {/* Content Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Gaming Streams */}
          <div className="bg-flux-bg-secondary rounded-xl p-6">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-3 h-3 bg-flux-accent-red rounded-full animate-pulse"></div>
              <h2 className="text-lg font-semibold text-flux-text-primary">Live Gaming</h2>
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-3 p-3 bg-flux-bg-tertiary rounded-lg">
                  <div className="w-16 h-12 bg-flux-bg-primary rounded-lg relative">
                    <div className="absolute top-1 left-1 bg-flux-accent-red text-white text-xs px-1 rounded">LIVE</div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-flux-text-primary">Epic Gaming Stream #{i}</p>
                    <p className="text-xs text-flux-text-secondary">2.5K viewers • @gamer{i}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gaming Leaderboard */}
          <div className="bg-flux-bg-secondary rounded-xl p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Trophy className="w-5 h-5 text-flux-accent-yellow" />
              <h2 className="text-lg font-semibold text-flux-text-primary">Top Gamers</h2>
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-3 p-3 bg-flux-bg-tertiary rounded-lg">
                  <div className="flex items-center justify-center w-8 h-8 bg-flux-primary rounded-full text-white text-sm font-bold">
                    {i}
                  </div>
                  <div className="w-10 h-10 bg-flux-gradient rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-flux-text-primary">ProGamer{i}</p>
                    <p className="text-xs text-flux-text-secondary">{10000 - i * 1000} points</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="mt-8 bg-flux-bg-secondary rounded-xl p-8 text-center">
          <Calendar className="w-12 h-12 text-flux-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-flux-text-primary mb-2">Gaming Features Coming Soon</h3>
          <p className="text-flux-text-secondary">Tournaments, achievements, gaming rewards and more!</p>
        </div>
      </div>
    </div>
  );
};
