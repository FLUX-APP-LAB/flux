import React from 'react';
import { Trophy, Star, Gift, Award, Calendar } from 'lucide-react';

export const RewardsScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-flux-bg-primary pt-20 md:pt-20 lg:pt-6 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-flux-accent-yellow rounded-xl">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-flux-text-primary">Rewards</h1>
              <p className="text-flux-text-secondary">Earn rewards for your engagement on FLUX</p>
            </div>
          </div>
        </div>

        {/* Rewards Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-flux-bg-secondary rounded-xl p-6 text-center">
            <Star className="w-8 h-8 text-flux-accent-yellow mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-flux-text-primary mb-1">1,250</h3>
            <p className="text-flux-text-secondary">Total Points</p>
          </div>
          <div className="bg-flux-bg-secondary rounded-xl p-6 text-center">
            <Gift className="w-8 h-8 text-flux-accent-green mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-flux-text-primary mb-1">5</h3>
            <p className="text-flux-text-secondary">Rewards Earned</p>
          </div>
          <div className="bg-flux-bg-secondary rounded-xl p-6 text-center">
            <Award className="w-8 h-8 text-flux-primary mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-flux-text-primary mb-1">Bronze</h3>
            <p className="text-flux-text-secondary">Current Tier</p>
          </div>
        </div>

        {/* Available Rewards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-flux-bg-secondary rounded-xl p-6">
            <h2 className="text-lg font-semibold text-flux-text-primary mb-4">Available Rewards</h2>
            <div className="space-y-4">
              {[
                { name: 'Premium Badge', cost: 500, description: 'Show off your premium status' },
                { name: 'Custom Emotes', cost: 800, description: 'Unlock exclusive chat emotes' },
                { name: 'Profile Banner', cost: 1200, description: 'Customize your profile banner' },
              ].map((reward, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-flux-bg-tertiary rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-flux-primary rounded-lg flex items-center justify-center">
                      <Gift className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-flux-text-primary">{reward.name}</p>
                      <p className="text-xs text-flux-text-secondary">{reward.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-flux-accent-yellow">{reward.cost} pts</p>
                    <button className="text-xs text-flux-primary hover:underline">Redeem</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-flux-bg-secondary rounded-xl p-6">
            <h2 className="text-lg font-semibold text-flux-text-primary mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {[
                { action: 'Daily Login', points: '+10', time: '2 hours ago' },
                { action: 'Video Upload', points: '+50', time: '1 day ago' },
                { action: 'Stream for 1 hour', points: '+25', time: '2 days ago' },
              ].map((activity, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-flux-bg-tertiary rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-flux-text-primary">{activity.action}</p>
                    <p className="text-xs text-flux-text-secondary">{activity.time}</p>
                  </div>
                  <span className="text-flux-accent-green font-semibold">{activity.points}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="mt-8 bg-flux-bg-secondary rounded-xl p-8 text-center">
          <Calendar className="w-12 h-12 text-flux-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-flux-text-primary mb-2">More Rewards Coming Soon</h3>
          <p className="text-flux-text-secondary">NFT rewards, exclusive merchandise, and premium features!</p>
        </div>
      </div>
    </div>
  );
};
