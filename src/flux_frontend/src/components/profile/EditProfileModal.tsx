import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Upload, Save, User, Mail, MapPin, Globe, Eye, EyeOff, Image, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { useAppStore } from '../../store/appStore';
import toast from 'react-hot-toast';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, setCurrentUser } = useAppStore();
  const [formData, setFormData] = useState({
    displayName: currentUser?.displayName || '',
    username: currentUser?.username || '',
    bio: 'Passionate content creator exploring the latest in technology and innovation. Join me on this journey!',
    location: 'San Francisco, CA',
    website: 'https://techcreator.com',
    avatar: currentUser?.avatar || '',
    banner: currentUser?.banner || 'https://images.pexels.com/photos/1181298/pexels-photo-1181298.jpeg?auto=compress&cs=tinysrgb&w=800&h=300&fit=crop',
  });
  const [privacySettings, setPrivacySettings] = useState({
    isPrivateAccount: false,
    showActivityStatus: true,
    allowDirectMessages: true,
    showFollowersList: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'privacy'>('profile');
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePrivacyChange = (field: string, value: boolean) => {
    setPrivacySettings(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (type: 'avatar' | 'banner', file?: File) => {
    if (type === 'banner') {
      setIsUploadingBanner(true);
    } else {
      setIsUploadingAvatar(true);
    }

    try {
      // Simulate file processing if a file is provided
      if (file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error('Please select a valid image file');
          return;
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          toast.error('Image size must be less than 5MB');
          return;
        }

        // Simulate upload progress
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Create object URL for preview
        const imageUrl = URL.createObjectURL(file);
        setFormData(prev => ({ ...prev, [type]: imageUrl }));
      } else {
        // Generate a random image from Pexels
        await new Promise(resolve => setTimeout(resolve, 1000));
        const mockImageUrl = `https://images.pexels.com/photos/${Math.floor(Math.random() * 1000000)}/pexels-photo-${Math.floor(Math.random() * 1000000)}.jpeg?auto=compress&cs=tinysrgb&w=${type === 'avatar' ? '400&h=400' : '800&h=300'}&fit=crop`;
        setFormData(prev => ({ ...prev, [type]: mockImageUrl }));
      }
      
      toast.success(`${type === 'avatar' ? 'Profile picture' : 'Banner'} updated!`);
    } catch (error) {
      toast.error(`Failed to upload ${type === 'avatar' ? 'profile picture' : 'banner'}`);
    } finally {
      if (type === 'banner') {
        setIsUploadingBanner(false);
      } else {
        setIsUploadingAvatar(false);
      }
    }
  };

  const handleFileSelect = (type: 'avatar' | 'banner') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleImageUpload(type, file);
      }
    };
    input.click();
  };

  const removeBanner = () => {
    setFormData(prev => ({ ...prev, banner: '' }));
    toast.success('Banner removed');
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        displayName: formData.displayName,
        username: formData.username,
        avatar: formData.avatar,
        banner: formData.banner,
      };
      setCurrentUser(updatedUser);
    }
    
    setIsLoading(false);
    toast.success('Profile updated successfully!');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-flux-bg-secondary rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-flux-bg-tertiary">
            <h2 className="text-xl font-bold text-flux-text-primary">Edit Profile</h2>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-flux-bg-tertiary">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'text-flux-primary border-b-2 border-flux-primary bg-flux-primary/5'
                  : 'text-flux-text-secondary hover:text-flux-text-primary'
              }`}
            >
              Profile Information
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
                activeTab === 'privacy'
                  ? 'text-flux-primary border-b-2 border-flux-primary bg-flux-primary/5'
                  : 'text-flux-text-secondary hover:text-flux-text-primary'
              }`}
            >
              Privacy & Security
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* Banner Upload */}
                <div>
                  <label className="block text-sm font-medium text-flux-text-primary mb-2">
                    Banner Image
                  </label>
                  <div className="relative h-32 bg-flux-bg-tertiary rounded-xl overflow-hidden group">
                    {formData.banner ? (
                      <>
                        <img
                          src={formData.banner}
                          alt="Banner"
                          className="w-full h-full object-cover"
                        />
                        {/* Banner Overlay Controls */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="flex items-center space-x-3">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleFileSelect('banner')}
                              disabled={isUploadingBanner}
                              isLoading={isUploadingBanner}
                            >
                              <Camera className="w-4 h-4 mr-2" />
                              {isUploadingBanner ? 'Uploading...' : 'Change'}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleImageUpload('banner')}
                              disabled={isUploadingBanner}
                            >
                              <Image className="w-4 h-4 mr-2" />
                              Random
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={removeBanner}
                              disabled={isUploadingBanner}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-flux-primary to-flux-accent-purple flex items-center justify-center">
                        <div className="text-center">
                          <Image className="w-8 h-8 text-white/70 mx-auto mb-2" />
                          <p className="text-white/70 text-sm mb-3">No banner image</p>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleFileSelect('banner')}
                              disabled={isUploadingBanner}
                              isLoading={isUploadingBanner}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Upload
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleImageUpload('banner')}
                              disabled={isUploadingBanner}
                            >
                              <Image className="w-4 h-4 mr-2" />
                              Random
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Upload Progress Indicator */}
                    {isUploadingBanner && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <p className="text-white text-sm">Uploading banner...</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-flux-text-secondary text-xs mt-2">
                    Recommended: 800x300px, JPG or PNG, max 5MB
                  </p>
                </div>

                {/* Avatar Upload */}
                <div>
                  <label className="block text-sm font-medium text-flux-text-primary mb-2">
                    Profile Picture
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="relative group">
                      <Avatar
                        src={formData.avatar}
                        alt={formData.displayName}
                        size="xl"
                      />
                      <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-5 h-5 text-white" />
                      </div>
                      {isUploadingAvatar && (
                        <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleFileSelect('avatar')}
                        disabled={isUploadingAvatar}
                        isLoading={isUploadingAvatar}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {isUploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleImageUpload('avatar')}
                        disabled={isUploadingAvatar}
                      >
                        <Image className="w-4 h-4 mr-2" />
                        Random Photo
                      </Button>
                    </div>
                  </div>
                  <p className="text-flux-text-secondary text-xs mt-2">
                    Recommended: 400x400px, JPG or PNG, max 5MB
                  </p>
                </div>

                {/* Form Fields */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-flux-text-primary mb-2">
                      <User className="w-4 h-4 inline mr-1" />
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => handleInputChange('displayName', e.target.value)}
                      className="w-full px-4 py-3 bg-flux-bg-tertiary text-flux-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-flux-primary"
                      placeholder="Your display name"
                      maxLength={50}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-flux-text-primary mb-2">
                      Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-flux-text-secondary">@</span>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => handleInputChange('username', e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-flux-bg-tertiary text-flux-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-flux-primary"
                        placeholder="username"
                        maxLength={30}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-flux-text-primary mb-2">
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-flux-bg-tertiary text-flux-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-flux-primary resize-none"
                    placeholder="Tell us about yourself..."
                    maxLength={160}
                  />
                  <div className="text-right text-xs text-flux-text-secondary mt-1">
                    {formData.bio.length}/160
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-flux-text-primary mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className="w-full px-4 py-3 bg-flux-bg-tertiary text-flux-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-flux-primary"
                      placeholder="Your location"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-flux-text-primary mb-2">
                      <Globe className="w-4 h-4 inline mr-1" />
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      className="w-full px-4 py-3 bg-flux-bg-tertiary text-flux-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-flux-primary"
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-flux-text-primary mb-4">Privacy Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-flux-bg-tertiary rounded-lg">
                      <div className="flex items-center space-x-3">
                        <EyeOff className="w-5 h-5 text-flux-text-secondary" />
                        <div>
                          <p className="text-flux-text-primary font-medium">Private Account</p>
                          <p className="text-flux-text-secondary text-sm">Only followers can see your content</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handlePrivacyChange('isPrivateAccount', !privacySettings.isPrivateAccount)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          privacySettings.isPrivateAccount ? 'bg-flux-primary' : 'bg-flux-bg-secondary'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            privacySettings.isPrivateAccount ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-flux-bg-tertiary rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Eye className="w-5 h-5 text-flux-text-secondary" />
                        <div>
                          <p className="text-flux-text-primary font-medium">Show Activity Status</p>
                          <p className="text-flux-text-secondary text-sm">Let others see when you're online</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handlePrivacyChange('showActivityStatus', !privacySettings.showActivityStatus)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          privacySettings.showActivityStatus ? 'bg-flux-primary' : 'bg-flux-bg-secondary'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            privacySettings.showActivityStatus ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-flux-bg-tertiary rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Mail className="w-5 h-5 text-flux-text-secondary" />
                        <div>
                          <p className="text-flux-text-primary font-medium">Allow Direct Messages</p>
                          <p className="text-flux-text-secondary text-sm">Anyone can send you messages</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handlePrivacyChange('allowDirectMessages', !privacySettings.allowDirectMessages)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          privacySettings.allowDirectMessages ? 'bg-flux-primary' : 'bg-flux-bg-secondary'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            privacySettings.allowDirectMessages ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-flux-bg-tertiary rounded-lg">
                      <div className="flex items-center space-x-3">
                        <User className="w-5 h-5 text-flux-text-secondary" />
                        <div>
                          <p className="text-flux-text-primary font-medium">Show Followers List</p>
                          <p className="text-flux-text-secondary text-sm">Others can see who follows you</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handlePrivacyChange('showFollowersList', !privacySettings.showFollowersList)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          privacySettings.showFollowersList ? 'bg-flux-primary' : 'bg-flux-bg-secondary'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            privacySettings.showFollowersList ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-flux-text-primary mb-4">Account Security</h3>
                  
                  <div className="space-y-3">
                    <Button variant="secondary" className="w-full justify-start">
                      Two-Factor Authentication
                    </Button>
                    <Button variant="secondary" className="w-full justify-start">
                      Connected Wallets
                    </Button>
                    <Button variant="secondary" className="w-full justify-start">
                      Download Your Data
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-flux-accent-red/10 border border-flux-accent-red/20 rounded-lg">
                  <h4 className="text-sm font-semibold text-flux-accent-red mb-2">Danger Zone</h4>
                  <p className="text-flux-text-secondary text-sm mb-3">
                    These actions cannot be undone. Please be careful.
                  </p>
                  <div className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start text-flux-accent-red hover:bg-flux-accent-red/10">
                      Deactivate Account
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-flux-accent-red hover:bg-flux-accent-red/10">
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-flux-bg-tertiary">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} isLoading={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};