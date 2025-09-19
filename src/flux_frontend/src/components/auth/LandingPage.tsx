import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet, Play, Users, Zap, ArrowRight, Gamepad2, Headphones, Video, Shield, Sparkles, Coins, Trophy } from 'lucide-react';
import { Button } from '../ui/Button';
// Removed inline Signup flow; App decides based on auth + currentUser
import { useWallet } from '../../hooks/useWallet';
import { useAppStore } from '../../store/appStore';
import toast from 'react-hot-toast';
import { Canvas } from '@react-three/fiber';
import { Float, Environment, OrbitControls, MeshDistortMaterial } from '@react-three/drei';

const Hero3D: React.FC = () => {
  const [useLocalHdri, setUseLocalHdri] = useState(false);

  useEffect(() => {
    let isMounted = true;
    // Try to detect if local HDRI exists to avoid CORS issues with remote assets
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
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <Suspense fallback={null}>
        <Float speed={1.2} rotationIntensity={0.6} floatIntensity={1.2}>
          <mesh>
            <icosahedronGeometry args={[1.2, 1]} />
            {/* @ts-ignore - drei augments material */}
            <MeshDistortMaterial
              color="#7c3aed"
              emissive="#a78bfa"
              emissiveIntensity={0.2}
              roughness={0.2}
              metalness={0.4}
              distort={0.35}
              speed={1.5}
              transparent
              opacity={0.95}
            />
          </mesh>
        </Float>
        {useLocalHdri ? (
          <Environment files="/hdri/potsdamer_platz_1k.hdr" />
        ) : (
          <Environment preset="city" />
        )}
      </Suspense>
      <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.6} />
    </Canvas>
  );
};

export const LandingPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login, authError } = useWallet();
  const { isAuthenticated, currentUser } = useAppStore();
  

  const connectWallet = async () => {
    setIsLoading(true);
    try {
      console.log('Starting wallet connection...');
      await login();
      // Don't navigate here - let the AppRouter handle navigation
      // based on the updated authentication state
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast.error('Failed to connect wallet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show error message if there's an authentication error
  useEffect(() => {
    if (authError) {
      toast.error(`Authentication error: ${authError}`);
    }
  }, [authError]);

  // No local signup routing; App handles view switching
  

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

  // Rendering always shows landing; after login, App switches views

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Premium gradient grid background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(124,58,237,0.25),rgba(17,24,39,0))]" />
        <div className="absolute inset-0 bg-[radial-gradient(40%_40%_at_80%_20%,rgba(168,85,247,0.12),rgba(0,0,0,0))]" />
        <img src="/17517500282326374985607665398759.jpg" alt="Gaming Setup" className="w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Floating icons subtle parallax */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[
          { icon: Gamepad2, delay: 0, x: '8%', y: '18%' },
          { icon: Headphones, delay: 1, x: '88%', y: '12%' },
          { icon: Video, delay: 2, x: '12%', y: '72%' },
          { icon: Play, delay: 3, x: '82%', y: '78%' },
        ].map((item, i) => (
          <motion.div
            key={i}
            className="absolute w-8 h-8 text-white/15"
            style={{ left: item.x, top: item.y }}
            animate={{ y: [-15, 15, -15], rotate: [0, 360], opacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: 10 + item.delay * 2, repeat: Infinity, ease: "easeInOut", delay: item.delay }}
          >
            <item.icon className="w-full h-full" />
          </motion.div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top Navigation */}
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="p-6">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center space-x-3">
              <img src="/logo.png" alt="FLUX" className="w-8 h-8" />
              <motion.div className="text-2xl font-extrabold bg-flux-gradient bg-clip-text text-transparent tracking-wide" whileHover={{ scale: 1.04 }}>
                FLUX
              </motion.div>
            </div>
            <div className="hidden md:flex items-center gap-1 text-white/80">
              <Button variant="ghost" className="text-white/80 hover:text-white">Features</Button>
              <Button variant="ghost" className="text-white/80 hover:text-white">Community</Button>
              <Button variant="ghost" className="text-white/80 hover:text-white">Docs</Button>
              <Button onClick={connectWallet} isLoading={isLoading} className="ml-2 bg-flux-gradient text-white rounded-xl px-5 py-2.5">Connect</Button>
            </div>
          </div>
        </motion.header>

        {/* Hero */}
        <div className="flex-1 flex items-center justify-center px-6 pt-6">
          <div className="w-full max-w-7xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              {/* Copy */}
              <div className="order-2 lg:order-1 text-center lg:text-left space-y-8">
                <motion.h1 className="text-5xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                  Create.
                  <span className="bg-flux-gradient bg-clip-text text-transparent block">Stream.</span>
                  <span className="text-flux-accent-gold">Own it.</span>
                </motion.h1>

                <motion.p className="text-lg lg:text-[1.35rem] text-white/85 max-w-xl lg:max-w-2xl mx-auto lg:mx-0 leading-relaxed" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                  A premium web3 platform for gamers and creators. Go live in seconds, reward your community, and get paid instantly.
                </motion.p>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="pt-2">
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-3 sm:justify-start justify-center">
                    <Button onClick={connectWallet} isLoading={isLoading} className="bg-flux-gradient hover:opacity-90 text-white px-8 py-4 text-lg font-bold rounded-2xl shadow-2xl transform hover:scale-[1.02] transition-all duration-300" size="lg">
                      <Wallet className="w-6 h-6 mr-3" />
                      {isLoading ? 'Connecting...' : 'Connect Wallet'}
                      <ArrowRight className="w-6 h-6 ml-3" />
                    </Button>
                    <Button variant="ghost" className="text-white/80 hover:text-white border border-white/10 hover:border-white/30 rounded-2xl px-6 py-4">
                      <Play className="w-5 h-5 mr-2" /> Watch Demo
                    </Button>
                  </div>

                  {/* <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className="mt-6 p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/15 max-w-md mx-auto lg:mx-0">
                    <div className="flex items-center justify-center flex-wrap gap-4 text-white/80 text-sm">
                      <div className="flex items-center gap-2"><div className="w-2 h-2 bg-flux-accent-green rounded-full animate-pulse" /><span>Stoic Wallet</span></div>
                      <div className="flex items-center gap-2"><div className="w-2 h-2 bg-flux-accent-green rounded-full animate-pulse" /><span>NNS</span></div>
                      <div className="flex items-center gap-2"><div className="w-2 h-2 bg-flux-accent-green rounded-full animate-pulse" /><span>Plug</span></div>
                    </div>
                    <p className="text-white/60 text-xs mt-2 text-center">Secure connection • No gas to join • Instant rewards</p>
                  </motion.div> */}
                </motion.div>
              </div>

              {/* Visual */}
              <div className="order-1 lg:order-2">
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="relative h-[360px] sm:h-[440px] lg:h-[540px] rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-md">
                  <div className="absolute inset-0">
                    <Hero3D />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-tr from-flux-primary/10 via-transparent to-flux-accent-purple/10 pointer-events-none" />
                  <div className="absolute -inset-24 opacity-[0.08] bg-[radial-gradient(circle_at_center,white,transparent_65%)]" />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Social proof band */}
        <div className="px-6 my-5">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-10">
              {[{ label: 'Non-custodial', icon: Shield }, { label: 'Creator-first', icon: Sparkles }, { label: 'Crypto-native', icon: Coins }, { label: 'Esports-ready', icon: Trophy }].map((item, i) => (
                <motion.div key={item.label} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 * i }} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-white/80">
                  <item.icon className="w-4 h-4 text-white/70" />
                  <span className="text-sm">{item.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Features */}
        <motion.section initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="px-6 pb-12">
          <div className="max-w-7xl mx-auto">
            <motion.h2 className="text-3xl lg:text-4xl font-extrabold text-white text-center mb-12 tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
              Why creators choose <span className="bg-flux-gradient bg-clip-text text-transparent">FLUX</span>
            </motion.h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-7">
              {features.map((feature, index) => (
                <motion.div key={feature.title} className="group relative" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + index * 0.1 }} whileHover={{ y: -8, scale: 1.01 }}>
                  <div className="absolute inset-0 rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur-md group-hover:border-flux-primary/50 transition-all duration-300" />
                  <div className="relative p-7 text-center">
                    <div className="w-16 h-16 bg-flux-gradient rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-flux-primary transition-colors">{feature.title}</h3>
                    <p className="text-white/70 leading-relaxed">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Stats band */}
        <div className="px-6 pb-10">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { k: '25ms', v: 'avg stream latency' },
                { k: '0%', v: 'platform cut on tips' },
                { k: '150k+', v: 'monthly viewers' },
                { k: '4.9/5', v: 'creator satisfaction' },
              ].map((s, i) => (
                <div key={s.k} className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
                  <div className="text-3xl font-extrabold text-white tracking-tight">{s.k}</div>
                  <div className="text-white/60 text-sm mt-1">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="text-center pb-10">
          <motion.div className="inline-flex items-center space-x-2 text-white/70 text-sm" animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <div className="w-2 h-2 bg-flux-accent-green rounded-full animate-pulse" />
            <span>Ready to build your audience on-chain?</span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};