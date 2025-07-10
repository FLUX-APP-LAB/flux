import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Play, Users, Zap, ArrowRight, Gamepad2, Headphones, Video } from 'lucide-react';
import { Button } from '../ui/Button';
import { SignupPage } from './SignupPage';
import { useAppStore } from '../../store/appStore';
import { useAuth } from '../../hooks/useAuth';
import { generateMockData } from '../../lib/utils';
import toast from 'react-hot-toast';

export const LandingPage: React.FC = () => {
  const [showSignup, setShowSignup] = useState(false);
  const { setCurrentUser, setAuthenticated } = useAppStore();
  const { login, isLoading: authLoading, isAuthenticated, principal, getWalletAddress } = useAuth();

  const connectWallet = async () => {
    try {
      const success = await login();
      
      if (success) {
        const walletAddress = getWalletAddress();
        toast.success(`Wallet connected! ${walletAddress?.slice(0, 6)}...${walletAddress?.slice(-4)}`);
        
        // Check if this wallet has an existing account (simulate database lookup)
        const hasExistingAccount = Math.random() > 0.7; // 30% chance of existing account
        
        if (hasExistingAccount) {
          // Existing user - log them in directly
          const { mockUsers } = generateMockData();
          const existingUser = {
            ...mockUsers[0],
            walletAddress: walletAddress || undefined,
            principal,
          };
          setCurrentUser(existingUser);
          setAuthenticated(true);
          toast.success(`Welcome back!`);
        } else {
          // New wallet - redirect to signup
          toast('Complete your profile to get started', { icon: '👋' });
          setShowSignup(true);
        }
      } else {
        toast.error('Failed to connect wallet. Please try again.');
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast.error('Failed to connect wallet. Please try again.');
    }
  };

  const features = [
    {
      title: 'Stream & Earn',
      description: 'Monetize your gaming content with crypto rewards',
      icon: Video,
    },
    {
      title: 'Web3 Gaming',
      description: 'Connect your wallet and join the future of gaming',
      icon: Wallet,
    },
    {
      title: 'Global Community',
      description: 'Connect with gamers and creators worldwide',
      icon: Users,
    },
    {
      title: 'Next-Gen Tech',
      description: 'Experience cutting-edge streaming technology',
      icon: Zap,
    },
  ];

  if (showSignup) {
    return (
      <SignupPage 
        onBack={() => setShowSignup(false)} 
      />
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Hero Background Image */}
      <div className="absolute inset-0">
        <img
          src="/17517500282326374985607665398759.jpg"
          alt="Gaming Setup"
          className="w-full h-full object-cover"
        />
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/70" />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-flux-primary/30 via-transparent to-flux-accent-purple/30" />
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Gaming Icons */}
        {[
          { icon: Gamepad2, delay: 0, x: '10%', y: '20%' },
          { icon: Headphones, delay: 1, x: '85%', y: '15%' },
          { icon: Video, delay: 2, x: '15%', y: '70%' },
          { icon: Play, delay: 3, x: '80%', y: '75%' },
        ].map((item, i) => (
          <motion.div
            key={i}
            className="absolute w-8 h-8 text-white/20"
            style={{ left: item.x, top: item.y }}
            animate={{
              y: [-20, 20, -20],
              rotate: [0, 360],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 8 + item.delay * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: item.delay,
            }}
          >
            <item.icon className="w-full h-full" />
          </motion.div>
        ))}

        {/* Floating Particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-flux-primary rounded-full opacity-40"
            animate={{
              x: [0, Math.random() * 100 - 50],
              y: [0, Math.random() * 100 - 50],
              opacity: [0.4, 0.1, 0.4],
            }}
            transition={{
              duration: Math.random() * 15 + 10,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6"
        >
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <motion.div
              className="text-3xl font-bold bg-flux-gradient bg-clip-text text-transparent"
              whileHover={{ scale: 1.05 }}
            >
              FLUX
            </motion.div>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" className="text-white/80 hover:text-white border border-white/20 hover:border-white/40">
                Learn More
              </Button>
            </div>
          </div>
        </motion.header>

        {/* Main Hero Content */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-4xl mx-auto text-center">
            {/* Hero Text */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-8"
            >
              <motion.h1
                className="text-6xl lg:text-8xl font-bold text-white leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Stream.
                <span className="bg-flux-gradient bg-clip-text text-transparent block">
                  Game.
                </span>
                <span className="text-flux-accent-gold">
                  Earn.
                </span>
              </motion.h1>

              <motion.p
                className="text-xl lg:text-2xl text-white/80 max-w-2xl mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                Join the next generation of gaming and streaming. 
                Connect your wallet and start earning crypto rewards for your content.
              </motion.p>

              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="pt-4"
              >
                <Button
                  onClick={connectWallet}
                  isLoading={authLoading}
                  className="bg-flux-gradient hover:opacity-90 text-white px-12 py-6 text-xl font-bold rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300"
                  size="lg"
                >
                  <Wallet className="w-6 h-6 mr-3" />
                  {authLoading ? 'Connecting Wallet...' : 'Connect Wallet & Start'}
                  <ArrowRight className="w-6 h-6 ml-3" />
                </Button>
                
                <motion.p 
                  className="text-white/60 text-sm mt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  Secure Web3 connection • No fees to join • Start earning today
                </motion.p>

                {/* Wallet Connection Info */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="mt-6 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 max-w-md mx-auto"
                >
                  <div className="flex items-center justify-center space-x-4 text-white/80 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-flux-accent-green rounded-full animate-pulse" />
                      <span>Stoic Wallet</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-flux-accent-green rounded-full animate-pulse" />
                      <span>NNS wallet</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-flux-accent-green rounded-full animate-pulse" />
                      <span>Plug Wallet</span>
                    </div>
                  </div>
                  <p className="text-white/60 text-xs mt-2 text-center">
                    New to crypto? We'll guide you through the setup process
                  </p>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Features Section */}
        <motion.section
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="px-6 pb-12"
        >
          <div className="max-w-7xl mx-auto">
            <motion.h2
              className="text-3xl lg:text-4xl font-bold text-white text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              Why Choose <span className="bg-flux-gradient bg-clip-text text-transparent">FLUX</span>?
            </motion.h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  className="group relative"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                  whileHover={{ y: -10, scale: 1.02 }}
                >
                  {/* Card Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl backdrop-blur-sm border border-white/20 group-hover:border-flux-primary/50 transition-all duration-300" />
                  
                  {/* Card Content */}
                  <div className="relative p-8 text-center">
                    <div className="w-16 h-16 bg-flux-gradient rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-4 group-hover:text-flux-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-white/70 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center pb-8"
        >
          <motion.div
            className="inline-flex items-center space-x-2 text-white/60 text-sm"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-2 h-2 bg-flux-accent-green rounded-full animate-pulse" />
            <span>Ready to join the future of gaming?</span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};