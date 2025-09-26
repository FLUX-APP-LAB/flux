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
        <Environment files="/hdri/potsdamer_platz_1k.hdr" />
      </Suspense>
      <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.4} />
    </Canvas>
  );
};

export const LandingPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const navigate = useNavigate();
  const { login, authError } = useWallet();
  const { isAuthenticated, currentUser } = useAppStore();

  // Hero carousel data
  const heroSlides = [
    {
      title: "Stream",
      subtitle: "Without",
      accent: "Limits",
      description: "Blockchain-powered streaming for gamers. Go live, earn crypto, dominate.",
      image: "/hero-card-image-1.jpg"
    },
    {
      title: "Earn",
      subtitle: "While You",
      accent: "Play",
      description: "Turn your gaming passion into real crypto rewards. Stream smarter, earn bigger.",
      image: "/hero-card-image-2.jpg"
    },
    {
      title: "Connect",
      subtitle: "With Your",
      accent: "Community",
      description: "Build lasting connections with fans who truly support your gaming journey.",
      image: "/hero-card-image-3.jpg"
    },
    {
      title: "Revolutionize",
      subtitle: "Gaming",
      accent: "Streaming",
      description: "Experience the future of interactive entertainment with blockchain technology.",
      image: "/hero-card-image-4.jpg"
    }
  ];

  // Auto-cycle hero slides every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeroIndex((prevIndex) => (prevIndex + 1) % heroSlides.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [heroSlides.length]);

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
      gradient: 'from-[#8a2be2] to-[#9932cc]'
    },
    {
      title: 'Crypto Rewards',
      description: 'Earn and tip with native crypto integration',
      icon: Wallet,
      gradient: 'from-[#9932cc] to-[#8b5cf6]'
    },
    {
      title: 'Global Reach',
      description: 'Connect with viewers across the world',
      icon: Users,
      gradient: 'from-[#8b5cf6] to-[#8a2be2]'
    },
    {
      title: 'Ultra Low Latency',
      description: 'Real-time interaction with cutting-edge tech',
      icon: Zap,
      gradient: 'from-[#8a2be2] to-[#9932cc]'
    },
  ];

  return (
    <div className="min-h-screen bg-black bg-[url('/ui-images/hero-img.png')] bg-cover bg-center bg-no-repeat relative overflow-hidden">
      {/* Refined background with subtle patterns */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-[#1a0033] to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(138,43,226,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(155,48,255,0.08),transparent_50%)]" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(155,48,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(155,48,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
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
            className="absolute w-6 h-6 text-[#ae18e2]/20"
            style={{ left: item.x, top: item.y }}
            animate={{ 
              y: [-10, 10, -10], 
              opacity: [0.2, 0.5, 0.2],
              scale: [1, 1.2, 1],
              rotate: [0, 360]
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
        {/* Floating particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-[#3542cd] rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-20, 20, -20],
              x: [-10, 10, -10],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 10 + Math.random() * 5,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}
        {/* Animated lines */}
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={`line-${i}`}
            className="absolute h-px bg-gradient-to-r from-transparent via-[#ae18e2] to-transparent"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${100 + Math.random() * 200}px`,
            }}
            animate={{
              x: [-100, 100, -100],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 15 + Math.random() * 10,
              repeat: Infinity,
              delay: Math.random() * 10,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Sleeker Navigation */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="p-2 lg:p-3"
        >
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <motion.div 
              className="flex items-center space-x-4"
              whileHover={{ scale: 1.02 }}
            >
              <img src="/logo.png" alt="Flux Logo" className="w-12 h-12 object-contain" />
              
              <motion.div 
                className="text-3xl font-black bg-gradient-to-r from-[#8a2be2] to-[#9932cc] bg-clip-text text-transparent tracking-tight"
              >
              FLUX
              </motion.div>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              <Button variant="ghost" className="text-slate-300 hover:text-[#8a2be2] hover:bg-[#8a2be2]/10 rounded-xl px-4 py-2 transition-all duration-300 hover:shadow-[0_0_10px_#8a2be2]">
                Features
              </Button>
              <Button variant="ghost" className="text-slate-300 hover:text-[#8a2be2] hover:bg-[#8a2be2]/10 rounded-xl px-4 py-2 transition-all duration-300 hover:shadow-[0_0_10px_#8a2be2]">
                Community
              </Button>
              <Button variant="ghost" className="text-slate-300 hover:text-[#8a2be2] hover:bg-[#8a2be2]/10 rounded-xl px-4 py-2 transition-all duration-300 hover:shadow-[0_0_10px_#8a2be2]">
                Docs
              </Button>
              <Button 
                onClick={connectWallet} 
                isLoading={isLoading} 
                className="ml-4 bg-gradient-to-r from-[#8a2be2] to-[#9932cc] hover:from-[#8a2be2]/80 hover:to-[#9932cc]/80 text-white rounded-xl px-6 py-2.5 font-semibold shadow-lg transition-all duration-300"
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
                <Button variant="ghost" className="text-slate-300 hover:text-[#8a2be2] hover:bg-[#8a2be2]/10 justify-start transition-all duration-300">Features</Button>
                <Button variant="ghost" className="text-slate-300 hover:text-[#8a2be2] hover:bg-[#8a2be2]/10 justify-start transition-all duration-300">Community</Button>
                <Button variant="ghost" className="text-slate-300 hover:text-[#8a2be2] hover:bg-[#8a2be2]/10 justify-start transition-all duration-300">Docs</Button>
                <Button 
                  onClick={connectWallet} 
                  isLoading={isLoading} 
                  className="mt-2 bg-gradient-to-r from-[#8a2be2] to-[#9932cc] text-white rounded-xl font-semibold"
                >
                  Connect Wallet
                </Button>
              </div>
            </motion.div>
          )}
        </motion.header>

        {/* Hero Section - More Refined */}
        <div className="h-[120vh] flex items-center lg:justify-start lg:pt-8 justify-center pt-16 md:pt-24 px-4 lg:px-8 relative" style={{ backgroundImage: 'url(/ui-images/hero-img.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <div className="absolute inset-0 bg-[#100422]/80 backdrop-blur-sm" />
          <div className="w-full max-w-7xl mx-auto relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Content */}
              <motion.div 
                initial={{ opacity: 0, y: 40 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.2 }}
                className="text-center lg:text-left"
              >
                <motion.h1 

                  key={currentHeroIndex} // Re-animate on slide change
                  className="text-5xl lg:text-7xl font-black text-white leading-[0.9] tracking-tight mb-8"

                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.3, duration: 0.8 }}
                >

                  {heroSlides[currentHeroIndex].title}
                  <span className="block bg-gradient-to-r from-[#8a2be2] via-[#9932cc] to-[#8b5cf6] bg-clip-text text-transparent">
                    {heroSlides[currentHeroIndex].subtitle}

                  </span>
                  <span className="block text-slate-200">{heroSlides[currentHeroIndex].accent}</span>
                </motion.h1>

                {/* Hero Image Card - Mobile Only */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  transition={{ delay: 0.4 }}
                  className="lg:hidden mb-8"
                >
                  <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#1a0033]/80 to-black/80 backdrop-blur-sm border border-[#8a2be2]/40 shadow-2xl hover:shadow-[0_0_30px_#8a2be2] transition-all duration-500 group">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img 
                        src={heroSlides[currentHeroIndex].image} 
                        alt="FLUX Gaming Streaming" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="flex items-center gap-2 text-white/90">
                          <div className="w-2 h-2 bg-[#8a2be2] rounded-full animate-pulse" />
                          <span className="text-sm font-medium">Next-Gen Streaming</span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-br from-[#8a2be2]/10 via-transparent to-[#9932cc]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                </motion.div>

                <motion.p 
                  key={`desc-${currentHeroIndex}`} // Re-animate on slide change
                  className="text-xl text-[#8b5cf6] max-w-2xl mx-auto lg:mx-0 mb-10 leading-relaxed"
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.4, duration: 0.8 }}
                >
                  {heroSlides[currentHeroIndex].description}
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
                    className="bg-gradient-to-r from-[#8a2be2] to-[#9932cc] hover:from-[#8a2be2]/80 hover:to-[#9932cc]/80 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-[#8a2be2]/25 transition-all duration-300 group"
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

                {/* Carousel Indicators */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.5 }}
                  className="flex justify-center lg:justify-start gap-2 mt-8"
                >
                  {heroSlides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentHeroIndex(index)}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        index === currentHeroIndex
                          ? 'bg-[#8a2be2] scale-125 shadow-[0_0_10px_#8a2be2]'
                          : 'bg-[#8b5cf6]/50 hover:bg-[#8b5cf6]'
                      }`}
                    />
                  ))}
                </motion.div>
              </motion.div>

              {/* Hero Image Card - Desktop Only */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                transition={{ delay: 0.4 }}
                className="hidden lg:block"
              >
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#1a0033]/80 to-black/80 backdrop-blur-sm border border-[#8a2be2]/40 shadow-2xl hover:shadow-[0_0_40px_#8a2be2] transition-all duration-500 group">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img 
                      src={heroSlides[currentHeroIndex].image} 
                      alt="FLUX Gaming Streaming" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                    <div className="absolute bottom-6 left-6 right-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-white">
                          <div className="w-3 h-3 bg-[#8a2be2] rounded-full animate-pulse" />
                          <span className="text-lg font-bold">{heroSlides[currentHeroIndex].title} {heroSlides[currentHeroIndex].accent}</span>
                        </div>
                        <div className="flex gap-2">
                          <div className="w-2 h-2 bg-[#9932cc] rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                          <div className="w-2 h-2 bg-[#8b5cf6] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          <div className="w-2 h-2 bg-[#8a2be2] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                        </div>
                      </div>
                      <p className="text-[#8b5cf6] text-sm mt-2 leading-relaxed">
                        {heroSlides[currentHeroIndex].description}
                      </p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-[#8a2be2]/20 via-transparent to-[#9932cc]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-[#8a2be2]/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-[#8a2be2]" />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Live Streams Section */}
        <motion.section
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="px-4 lg:px-8 py-16"
        >
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <motion.h2
                className="text-4xl lg:text-5xl font-black text-white mb-4 tracking-tight"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                Live <span className="bg-gradient-to-r from-[#8a2be2] to-[#9932cc] bg-clip-text text-transparent">Streams</span>
              </motion.h2>
              <motion.p
                className="text-xl text-[#8b5cf6] max-w-2xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                Join the action and watch your favorite gamers live
              </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  id: 1,
                  title: "Epic Gaming Session - Building the Ultimate Base",
                  streamer: "ProGamer2024",
                  game: "Minecraft",
                  viewers: "12.5K",
                  thumbnail: "/thumbnail-live-1.png",
                  video: "/video-live-1.mp4",
                  isLive: true
                },
                {
                  id: 2,
                  title: "Competitive FPS Action - Going for the Win",
                  streamer: "FPS_Master",
                  game: "Call of Duty",
                  viewers: "8.2K",
                  thumbnail: "/thumbnail-live-2.jpg",
                  video: "/video-live-2.mkv",
                  isLive: true
                },
                {
                  id: 4,
                  title: "Speedrun Challenge - World Record Attempt",
                  streamer: "SpeedRunner",
                  game: "Rte",
                  viewers: "15.3K",
                  thumbnail: "/thumbnail-live-4.jpg",
                  video: "/video-live-4.mp4",
                  isLive: true
                },
                {
                  id: 5,
                  title: "RPG Adventure",
                  streamer: "RPG_Fan",
                  game: "GOD OF WAR",
                  viewers: "9.7K",
                  thumbnail: "/thumbnail-live-5.jpg",
                  video: "/video-live-5.mkv",
                  isLive: false
                },
                {
                  id: 6,
                  title: "Esports Training - Team Practice",
                  streamer: "TeamCaptain",
                  game: "League of Legends",
                  viewers: "22.1K",
                  thumbnail: "/thumbnail-live-6.jpg",
                  video: "/video-live-6.mp4",
                  isLive: true
                }
              ].map((stream, index) => (
                <motion.div
                  key={stream.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group"
                >
                  <div className="bg-gradient-to-br from-[#1a0033]/80 to-black/80 rounded-2xl overflow-hidden hover:from-[#2d0b52]/90 hover:to-[#1a0033]/90 transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_25px_#8a2be2] border border-[#8a2be2]/20 hover:border-[#8a2be2]/40">
                    <div className="relative h-48 overflow-hidden">
                      {/* Thumbnail Image */}
                      <img
                        src={stream.thumbnail}
                        alt={stream.title}
                        className="w-full h-full object-cover group-hover:opacity-0 transition-opacity duration-300"
                      />

                      {/* Video Player */}
                      <video
                        src={stream.video}
                        className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        loop
                        muted
                        playsInline
                        onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                        onMouseLeave={(e) => (e.target as HTMLVideoElement).pause()}
                      />

                      {stream.isLive && (
                        <div className="absolute top-3 left-3 flex items-center space-x-2 bg-black/80 backdrop-blur-sm rounded-full px-3 py-1 border border-[#8a2be2]/30 z-10">
                          <div className="w-2 h-2 bg-[#8a2be2] rounded-full animate-pulse shadow-[0_0_10px_#8a2be2]"></div>
                          <span className="text-xs font-bold text-white">LIVE</span>
                        </div>
                      )}
                      <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm rounded-lg px-2 py-1 text-xs border border-[#8a2be2]/20 z-10">
                        <span className="text-[#8b5cf6] font-medium">{stream.viewers}</span>
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="font-bold text-white mb-3 line-clamp-2 group-hover:text-[#8a2be2] transition-colors duration-300">{stream.title}</h3>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#8a2be2] to-[#9932cc] flex items-center justify-center text-white text-sm font-bold shadow-[0_0_15px_#8a2be2]">
                            {stream.streamer.charAt(0)}
                          </div>
                          <span className="text-[#8b5cf6] font-medium">{stream.streamer}</span>
                        </div>

                        <div className="hidden md:flex items-center space-x-2 bg-[#1a0033]/60 rounded-full px-3 py-1 border border-[#8a2be2]/20">
                          <span className="text-xs text-[#8b5cf6] font-medium">{stream.game}</span>
                        </div>
                      </div>

                      <div className="md:hidden mt-3 flex items-center space-x-2 bg-[#1a0033]/60 rounded-full px-3 py-1 w-fit border border-[#8a2be2]/20">
                        <span className="text-xs text-[#8b5cf6] font-medium">{stream.game}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* About Section */}
        <motion.section 
          initial={{ opacity: 0, y: 50 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }}
          className="px-4 lg:px-8 py-16"
        >
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <motion.h2 
                className="text-4xl lg:text-5xl font-black text-white mb-4 tracking-tight relative"
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true }}
              >
                Revolutionizing Gaming Streams
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-[#8a2be2] to-[#9932cc] rounded-full" style={{ boxShadow: '0 0 10px #8a2be2' }}></div>
              </motion.h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -50 }} 
                whileInView={{ opacity: 1, x: 0 }} 
                viewport={{ once: true }}
                className="space-y-6"
              >
                <div className="p-8 rounded-3xl bg-gradient-to-br from-[#2d0b52]/50 to-[#100422]/50 border border-[#ae18e2]/30 hover:border-[#ae18e2]/50 transition-all duration-300 hover:shadow-[0_0_20px_#ae18e2]">
                  <h3 className="text-2xl font-bold text-white mb-4">Blockchain-Powered</h3>
                  <p className="text-[#8b5cf6] leading-relaxed">
                    Built on cutting-edge blockchain technology, FLUX enables true ownership of your streams and rewards. No middlemen, just pure gaming freedom.
                  </p>
                </div>
                <div className="p-8 rounded-3xl bg-gradient-to-br from-[#2d0b52]/50 to-[#100422]/50 border border-[#3542cd]/30 hover:border-[#3542cd]/50 transition-all duration-300 hover:shadow-[0_0_20px_#3542cd]">
                  <h3 className="text-2xl font-bold text-white mb-4">For Gamers, By Gamers</h3>
                  <p className="text-[#8b5cf6] leading-relaxed">
                    Designed by passionate gamers who understand the thrill of live streaming. Every feature crafted to enhance your gaming experience.
                  </p>
                </div>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, x: 50 }} 
                whileInView={{ opacity: 1, x: 0 }} 
                viewport={{ once: true }}
                className="relative"
              >
                <div className="relative h-[400px] rounded-3xl overflow-hidden bg-gradient-to-br from-[#2d0b52]/50 to-[#100422]/50 backdrop-blur-sm border border-[#ae18e2]/30 shadow-2xl">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Gamepad2 className="w-24 h-24 text-[#ae18e2] mx-auto mb-4" />
                      <p className="text-white text-lg font-semibold">Gaming Meets Blockchain</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#100422]/20 via-transparent to-transparent pointer-events-none" />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>

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

        {/* Vision and Pillars Section */}
        <motion.section 
          initial={{ opacity: 0, y: 50 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }}
          className="px-4 lg:px-8 py-16"
        >
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <motion.h2 
                className="text-4xl lg:text-5xl font-black text-white mb-4 tracking-tight"
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true }}
              >
                Our <span className="bg-gradient-to-r from-[#8a2be2] to-[#9932cc] bg-clip-text text-transparent">Vision</span>
              </motion.h2>
              <motion.p 
                className="text-xl text-[#8b5cf6] max-w-2xl mx-auto"
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true }}
              >
                Empowering gamers with decentralized streaming technology
              </motion.p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: 'Decentralized Freedom',
                  description: 'Break free from centralized platforms. Own your content, control your destiny.',
                  icon: Shield,
                  color: '#ae18e2'
                },
                {
                  title: 'Crypto Rewards',
                  description: 'Earn real value for your streams. Direct payments, no fees, instant transfers.',
                  icon: Coins,
                  color: '#3542cd'
                },
                {
                  title: 'Community First',
                  description: 'Built by gamers for gamers. Every decision driven by our passionate community.',
                  icon: Users,
                  color: '#6ac8fb'
                }
              ].map((pillar, index) => (
                <motion.div 
                  key={pillar.title}
                  initial={{ opacity: 0, y: 30 }} 
                  whileInView={{ opacity: 1, y: 0 }} 
                  viewport={{ once: true }} 
                  transition={{ delay: index * 0.2 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group relative"
                >
                  <div className="relative p-8 rounded-3xl bg-gradient-to-br from-[#1a0033]/50 to-black/50 border border-[#8a2be2]/30 hover:border-[#8a2be2]/60 transition-all duration-300 hover:shadow-[0_0_25px_#8a2be2] overflow-hidden">
                    <div className={`w-16 h-16 bg-gradient-to-br from-[${pillar.color}] to-[${pillar.color}]/50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <pillar.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-4 group-hover:text-[#8a2be2] transition-colors">
                      {pillar.title}
                    </h3>
                    <p className="text-[#8b5cf6] leading-relaxed">
                      {pillar.description}
                    </p>
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[#ae18e2]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

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
                Built for <span className="bg-gradient-to-r from-[#8a2be2] to-[#9932cc] bg-clip-text text-transparent">Creators</span>
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
                  <div className="relative p-8 rounded-3xl bg-gradient-to-br from-[#2d0b52]/50 to-[#100422]/50 border border-[#ae18e2]/30 hover:border-[#ae18e2]/60 transition-all duration-300 hover:shadow-[0_0_25px_#ae18e2] hover:scale-105 animate-pulse">
                    <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#8a2be2] transition-colors">
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

        {/* Flagship Project Section */}
        <motion.section 
          initial={{ opacity: 0, y: 50 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }}
          className="px-4 lg:px-8 py-16"
        >
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -50 }} 
                whileInView={{ opacity: 1, x: 0 }} 
                viewport={{ once: true }}
                className="relative"
              >
                <div className="relative h-[400px] rounded-3xl overflow-hidden bg-gradient-to-br from-[#2d0b52]/50 to-[#100422]/50 backdrop-blur-sm border border-[#ae18e2]/30 shadow-2xl">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Video className="w-24 h-24 text-[#3542cd] mx-auto mb-4" />
                      <p className="text-white text-lg font-semibold">Live Streaming Demo</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#100422]/20 via-transparent to-transparent pointer-events-none" />
                </div>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, x: 50 }} 
                whileInView={{ opacity: 1, x: 0 }} 
                viewport={{ once: true }}
                className="space-y-6"
              >
                <div className="p-8 rounded-3xl bg-gradient-to-br from-[#2d0b52]/50 to-[#100422]/50 border border-[#ae18e2]/30 hover:border-[#ae18e2]/50 transition-all duration-300 hover:shadow-[0_0_20px_#ae18e2]">
                  <h3 className="text-3xl font-bold text-white mb-4">FLUX Streaming Platform</h3>
                  <p className="text-[#8b5cf6] leading-relaxed mb-6">
                    Experience the future of gaming streams with our flagship blockchain-powered platform. Ultra-low latency, crypto rewards, and decentralized freedom all in one sleek interface.
                  </p>
                  <Button 
                    className="bg-gradient-to-r from-[#8a2be2] to-[#9932cc] hover:from-[#8a2be2]/80 hover:to-[#9932cc]/80 text-white px-8 py-3 rounded-2xl font-bold transition-all duration-300 hover:shadow-[0_0_15px_#8a2be2]"
                  >
                    View Demo
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </motion.div>
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

        {/* Contact Section */}
        <motion.section 
          initial={{ opacity: 0, y: 50 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }}
          className="px-4 lg:px-8 py-16"
        >
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <motion.h2 
                className="text-4xl lg:text-5xl font-black text-white mb-4 tracking-tight"
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true }}
              >
                Get in <span className="bg-gradient-to-r from-[#8a2be2] to-[#9932cc] bg-clip-text text-transparent">Touch</span>
              </motion.h2>
              <motion.p 
                className="text-xl text-[#8b5cf6]"
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true }}
              >
                Ready to revolutionize your streaming?
              </motion.p>
            </div>
            <motion.form 
              initial={{ opacity: 0, y: 30 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input
                  type="text"
                  placeholder="Your Name"
                  className="w-full px-6 py-4 bg-[#2d0b52]/50 border border-[#ae18e2]/30 rounded-2xl text-white placeholder-[#6ac8fb]/50 focus:border-[#ae18e2] focus:outline-none focus:shadow-[0_0_10px_#ae18e2] transition-all duration-300"
                />
                <input
                  type="email"
                  placeholder="Your Email"
                  className="w-full px-6 py-4 bg-[#2d0b52]/50 border border-[#ae18e2]/30 rounded-2xl text-white placeholder-[#6ac8fb]/50 focus:border-[#ae18e2] focus:outline-none focus:shadow-[0_0_10px_#ae18e2] transition-all duration-300"
                />
              </div>
              <textarea
                rows={4}
                placeholder="Tell us about your project..."
                className="w-full px-6 py-4 bg-[#1a0033]/50 border border-[#8a2be2]/30 rounded-2xl text-white placeholder-[#8b5cf6]/50 focus:border-[#8a2be2] focus:outline-none focus:shadow-[0_0_10px_#8a2be2] transition-all duration-300 resize-none"
              />
              <div className="text-center">
                <Button 
                  type="submit"
                  className="bg-gradient-to-r from-[#8a2be2] to-[#9932cc] hover:from-[#8a2be2]/80 hover:to-[#9932cc]/80 text-white px-12 py-4 rounded-2xl font-bold text-lg shadow-[0_0_15px_#8a2be2] hover:shadow-[0_0_25px_#8a2be2] transition-all duration-300"
                >
                  Send Message
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.form>
          </div>
        </motion.section>

        {/* Footer */}
        <motion.footer 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 1.2 }}
          className="w-full py-16 px-4 lg:px-8"
        >
          <div className="max-w-7xl mx-auto text-center">
            <div className="flex justify-center space-x-8 mb-8">
              {[
                { icon: 'twitter', label: 'Twitter' },
                { icon: 'discord', label: 'Discord' },
                { icon: 'github', label: 'GitHub' },
                { icon: 'youtube', label: 'YouTube' }
              ].map((social, i) => (
                <motion.a
                  key={social.icon}
                  href="#"
                  className="w-12 h-12 rounded-full bg-[#1a0033]/50 border border-[#8a2be2]/30 flex items-center justify-center text-[#8a2be2] hover:text-white hover:border-[#8a2be2] hover:shadow-[0_0_15px_#8a2be2] transition-all duration-300"
                  whileHover={{ scale: 1.1, rotate: 360 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3 + i * 0.1 }}
                >
                  <span className="text-lg font-bold">{social.icon.charAt(0).toUpperCase()}</span>
                </motion.a>
              ))}
            </div>
            <motion.p 
              className="text-[#8b5cf6] text-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
            >
              Ready to join the future of streaming?
            </motion.p>
            <motion.div 
              className="mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6 }}
            >
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1a0033]/50 border border-[#8a2be2]/30 text-[#8b5cf6]">
                <div className="w-2 h-2 bg-[#8a2be2] rounded-full animate-pulse" />
                <span className="text-sm font-medium">FLUX - Streaming Reimagined</span>
              </div>
            </motion.div>
          </div>
        </motion.footer>
      </div>
    </div>
  );
};