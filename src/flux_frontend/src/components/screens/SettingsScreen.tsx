import React from 'react';
import { Settings, User, Bell, Shield, Palette, Globe, Download, HelpCircle } from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const settingsSections = [
    {
      title: 'Account',
      icon: User,
      items: [
        { label: 'Profile Information', description: 'Update your name, bio, and avatar' },
        { label: 'Privacy Settings', description: 'Control who can see your content' },
        { label: 'Account Security', description: 'Password and two-factor authentication' },
      ]
    },
    {
      title: 'Notifications',
      icon: Bell,
      items: [
        { label: 'Push Notifications', description: 'Mobile and desktop notifications' },
        { label: 'Email Preferences', description: 'Marketing and update emails' },
        { label: 'Live Stream Alerts', description: 'Notifications for followed streamers' },
      ]
    },
    {
      title: 'Appearance',
      icon: Palette,
      items: [
        { label: 'Theme', description: 'Dark or light mode preference' },
        { label: 'Display Settings', description: 'Font size and layout options' },
        { label: 'Video Quality', description: 'Default playback quality settings' },
      ]
    },
    {
      title: 'Privacy & Safety',
      icon: Shield,
      items: [
        { label: 'Content Filtering', description: 'Filter inappropriate content' },
        { label: 'Blocked Users', description: 'Manage your blocked users list' },
        { label: 'Data & Analytics', description: 'Control data collection preferences' },
      ]
    },
    {
      title: 'Authentication',
      icon: Shield,
      items: [
        { label: 'Internet Identity', description: 'Connect with Internet Identity for secure authentication' },
        { label: 'Wallet Connection', description: 'Manage your wallet connection and permissions' },
        { label: 'Session Management', description: 'View and manage active sessions' },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-flux-bg-primary pt-20 md:pt-20 lg:pt-6 px-4 md:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-flux-primary rounded-xl">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-flux-text-primary">Settings</h1>
              <p className="text-flux-text-secondary">Manage your FLUX experience</p>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {settingsSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="bg-flux-bg-secondary rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <section.icon className="w-5 h-5 text-flux-primary" />
                <h2 className="text-lg font-semibold text-flux-text-primary">{section.title}</h2>
              </div>
              <div className="space-y-4">
                {section.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-center justify-between p-4 bg-flux-bg-tertiary rounded-lg hover:bg-flux-bg-primary transition-colors cursor-pointer">
                    <div>
                      <h3 className="text-sm font-medium text-flux-text-primary">{item.label}</h3>
                      <p className="text-xs text-flux-text-secondary mt-1">{item.description}</p>
                    </div>
                    <div className="text-flux-text-secondary">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Additional Options */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-flux-bg-secondary rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Globe className="w-5 h-5 text-flux-primary" />
              <h3 className="text-lg font-semibold text-flux-text-primary">Language & Region</h3>
            </div>
            <p className="text-sm text-flux-text-secondary mb-4">Choose your preferred language and region settings.</p>
            <button className="bg-flux-bg-tertiary text-flux-text-primary px-4 py-2 rounded-lg hover:bg-flux-bg-primary transition-colors">
              Change Language
            </button>
          </div>

          <div className="bg-flux-bg-secondary rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Download className="w-5 h-5 text-flux-primary" />
              <h3 className="text-lg font-semibold text-flux-text-primary">Data Export</h3>
            </div>
            <p className="text-sm text-flux-text-secondary mb-4">Download your FLUX data and content.</p>
            <button className="bg-flux-bg-tertiary text-flux-text-primary px-4 py-2 rounded-lg hover:bg-flux-bg-primary transition-colors">
              Request Export
            </button>
          </div>
        </div>

        {/* Help & Support */}
        <div className="mt-8 bg-flux-bg-secondary rounded-xl p-6 text-center">
          <HelpCircle className="w-12 h-12 text-flux-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-flux-text-primary mb-2">Need Help?</h3>
          <p className="text-flux-text-secondary mb-4">Check out our help center or contact support for assistance.</p>
          <div className="flex justify-center space-x-4">
            <button className="bg-flux-primary text-white px-6 py-2 rounded-lg hover:opacity-90 transition-opacity">
              Help Center
            </button>
            <button className="bg-flux-bg-tertiary text-flux-text-primary px-6 py-2 rounded-lg hover:bg-flux-bg-primary transition-colors">
              Contact Support
            </button>
          </div>
        </div>

        
      </div>
    </div>
  );
};
