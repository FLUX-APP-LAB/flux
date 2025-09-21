import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet, Play, Users, Zap, ArrowRight, Gamepad2, Headphones, Video, Shield, Sparkles, Coins, Trophy, Menu, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { useWallet } from '../../hooks/useWallet';
import { useAppStore } from '../../store/appStore';
import toast from 'react-hot-toast';
import { Canvas } from '@react-three/fiber';
import { Float, Environment, OrbitControls, MeshDistortMaterial } from '@react-three/drei';

const Hero3D: React.FC = () => {
  const [useLocalHdri, setUseLocalHdri] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch('/hdri/potsdamer_platz_1k.hdr', { method: 'HEAD' })
      .then((res) => {
        if (!isMounted) return;
        setUseLocalHdri(res.ok);
      })
      .catch(() => {
        if (!isMounted) return;
        setUseLocalHdri(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <Suspense fallback={null}>
        <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.8}>
          <mesh>
            <icosahedronGeometry args={[1, 2]} />
            <MeshDistortMaterial
              color="#6366f1"
              emissive="#818cf8"
              emissiveIntensity={0.15}
              roughness={0.1}
              metalness={0.6}
              distort={0.25}
              speed={1.2}
              transparent
              opacity={0.9}
            />
          </mesh>
        </Float>
        {useLocalHdri ? (
          <Environment files="/hdri/potsdamer_platz_1k.hdr" />
        ) : (
          <Environment preset="studio" />
        )}
      </Suspense>
      <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.4} />
    </Canvas>
  );
};

export const LandingPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { login, authError } = useWallet();
  const { isAuthenticated, currentUser } = useAppStore();

  const connectWallet = async () => {
    setIsLoading(true);
    try {
      console.log('Starting wallet connection...');
      await login();
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast.error('Failed to connect wallet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authError) {
      toast.error(`Authentication error: ${authError}`);
    }
  }, [authError]);

  const features = [
    {
      title: 'Instant Streaming',
      description: 'Go live in seconds with zero setup complexity',
      icon: Video,
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Crypto Rewards',
      description: 'Earn and tip with native crypto integration',
      icon: Wallet,
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Global Reach',
      description: 'Connect with viewers across the world',
      icon: Users,
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Ultra Low Latency',
      description: 'Real-time interaction with cutting-edge tech',
      icon: Zap,
      gradient: 'from-orange-500 to-red-500'
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Refined background with subtle patterns */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.08),transparent_50%)]" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[
          { icon: Gamepad2, delay: 0, x: '10%', y: '20%' },
          { icon: Headphones, delay: 2, x: '85%', y: '15%' },
          { icon: Video, delay: 4, x: '15%', y: '75%' },
          { icon: Play, delay: 6, x: '80%', y: '70%' },
        ].map((item, i) => (
          <motion.div
            key={i}
            className="absolute w-6 h-6 text-white/5"
            style={{ left: item.x, top: item.y }}
            animate={{ 
              y: [-10, 10, -10], 
              opacity: [0.05, 0.15, 0.05],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 8 + item.delay, 
              repeat: Infinity, 
              ease: "easeInOut", 
              delay: item.delay 
            }}
          >
            <item.icon className="w-full h-full" />
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Sleeker Navigation */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="p-4 lg:p-6"
        >
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <motion.div 
              className="flex items-center space-x-4"
              whileHover={{ scale: 1.02 }}
            >
              <img src="/logo.png" alt="Flux Logo" className="w-12 h-12 object-contain" />
              
              <div className="text-3xl font-black bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent tracking-tight">
              FLUX
              </div>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5 rounded-xl px-4 py-2">
                Features
              </Button>
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5 rounded-xl px-4 py-2">
                Community
              </Button>
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5 rounded-xl px-4 py-2">
                Docs
              </Button>
              <Button 
                onClick={connectWallet} 
                isLoading={isLoading} 
                className="ml-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl px-6 py-2.5 font-semibold shadow-lg transition-all duration-300"
              >
                Connect Wallet
              </Button>
            </div>

            {/* Mobile menu button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-white/80 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:hidden mt-4 p-4 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-white/10"
            >
              <div className="flex flex-col space-y-2">
                <Button variant="ghost" className="text-slate-300 hover:text-white justify-start">Features</Button>
                <Button variant="ghost" className="text-slate-300 hover:text-white justify-start">Community</Button>
                <Button variant="ghost" className="text-slate-300 hover:text-white justify-start">Docs</Button>
                <Button 
                  onClick={connectWallet} 
                  isLoading={isLoading} 
                  className="mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold"
                >
                  Connect Wallet
                </Button>
              </div>
            </motion.div>
          )}
        </motion.header>

        {/* Hero Section - More Refined */}
        <div className="flex-1 flex items-center justify-center px-4 lg:px-8">
          <div className="w-full max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Content */}
              <motion.div 
                initial={{ opacity: 0, y: 40 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.2 }}
                className="text-center lg:text-left"
              >
                <motion.h1 
                  className="text-5xl lg:text-7xl font-black text-white tracking-tight mb-8 mt-8 space-y-2"
                  style={{ lineHeight: 1.5 }}
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.3 }}
                >
                  <span className="block mb-2">Stream</span>
                  <span className="block bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                  Without
                  </span>
                  <span className="block text-slate-200">Limits</span>
                </motion.h1>

                {/* 3D Visual - Mobile Only */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  transition={{ delay: 0.4 }}
                  className="lg:hidden mb-8"
                >
                  <div className="relative h-[300px] rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-white/10 shadow-2xl">
                    <Hero3D />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-transparent pointer-events-none" />
                  </div>
                </motion.div>

                <motion.p 
                  className="text-xl text-slate-400 max-w-2xl mx-auto lg:mx-0 mb-10 leading-relaxed"
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.4 }}
                >
                  The next-generation streaming platform built for creators. 
                  Connect your wallet, go live instantly, and earn crypto rewards from your community.
                </motion.p>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.5 }}
                  className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
                >
                  <Button 
                    onClick={connectWallet} 
                    isLoading={isLoading}
                    size="lg"
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-indigo-500/25 transition-all duration-300 group"
                  >
                    <Wallet className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
                    {isLoading ? 'Connecting...' : 'Get Started'}
                    <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="lg"
                    className="text-slate-300 hover:text-white border-2 border-slate-700 hover:border-slate-600 rounded-2xl px-8 py-4 font-semibold transition-all duration-300"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Watch Demo
                  </Button>
                </motion.div>
              </motion.div>

              {/* 3D Visual - Desktop Only */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                transition={{ delay: 0.4 }}
                className="hidden lg:block"
              >
                <div className="relative h-[500px] rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-white/10 shadow-2xl">
                  <Hero3D />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-transparent pointer-events-none" />
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.6 }}
          className="px-4 lg:px-8 py-12"
        >
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Secure', icon: Shield },
                { label: 'Fast', icon: Zap },
                { label: 'Rewarding', icon: Coins },
                { label: 'Global', icon: Trophy }
              ].map((item, i) => (
                <motion.div 
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.7 + i * 0.1 }}
                  className="flex items-center justify-center gap-3 py-4 px-6 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <item.icon className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300 font-medium">{item.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Features Grid - Refined */}
        <motion.section 
          initial={{ opacity: 0, y: 50 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.8 }}
          className="px-4 lg:px-8 py-16"
        >
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <motion.h2 
                className="text-4xl lg:text-5xl font-black text-white mb-4 tracking-tight"
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.9 }}
              >
                Built for <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Creators</span>
              </motion.h2>
              <motion.p 
                className="text-xl text-slate-400 max-w-2xl mx-auto"
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 1 }}
              >
                Everything you need to stream, engage, and monetize your content
              </motion.p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <motion.div 
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }} 
                  whileInView={{ opacity: 1, y: 0 }} 
                  viewport={{ once: true }} 
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group"
                >
                  <div className="relative p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all duration-300 hover:shadow-2xl">
                    <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-400 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-slate-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Stats Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }}
          className="px-4 lg:px-8 py-16"
        >
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: '<25ms', label: 'Stream Latency' },
                { value: '0%', label: 'Platform Fees' },
                { value: '99.9%', label: 'Uptime' },
                { value: '24/7', label: 'Support' },
              ].map((stat, i) => (
                <motion.div 
                  key={stat.value}
                  initial={{ opacity: 0, y: 20 }} 
                  whileInView={{ opacity: 1, y: 0 }} 
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center p-6 rounded-2xl bg-slate-900/30 border border-slate-800"
                >
                  <div className="text-3xl lg:text-4xl font-black text-white mb-2">
                    {stat.value}
                  </div>
                  <div className="text-slate-400 font-medium">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Footer CTA */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 1.2 }}
          className="text-center py-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/50 border border-slate-800 text-slate-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm">Ready to join the future of streaming?</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};