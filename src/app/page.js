'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MessageCircle, PenLine, BookOpen, Sparkles, Globe, Zap, ChevronRight } from 'lucide-react';
import WelcomeGuide from '@/components/WelcomeGuide';
import { Particles } from '@/components/ui/particles';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { MagicCard } from '@/components/ui/magic-card';
import { BlurFade } from '@/components/ui/blur-fade';
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text';
import { cn } from '@/lib/utils';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-black">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full"
        />
      </div>
    );
  }

  const features = [
    {
      icon: MessageCircle,
      title: "AI Conversations",
      description: "Chat naturally with AI in your target language",
      color: "from-blue-500 to-cyan-500",
      gradientFrom: "#3b82f6",
      gradientTo: "#06b6d4"
    },
    {
      icon: PenLine,
      title: "Instant Corrections",
      description: "See mistakes highlighted with helpful explanations",
      color: "from-pink-500 to-rose-500",
      gradientFrom: "#ec4899",
      gradientTo: "#f43f5e"
    },
    {
      icon: BookOpen,
      title: "Grammar Notes",
      description: "Learn rules and patterns as you practice",
      color: "from-purple-500 to-violet-500",
      gradientFrom: "#a855f7",
      gradientTo: "#8b5cf6"
    }
  ];

  const stats = [
    { icon: Globe, label: "Languages", value: "10+" },
    { icon: Sparkles, label: "AI Powered", value: "100%" },
    { icon: Zap, label: "Real-time", value: "Instant" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black relative overflow-hidden">
      {/* Welcome Guide */}
      <WelcomeGuide />

      {/* Particles Background */}
      <Particles
        className="absolute inset-0 z-0"
        quantity={120}
        staticity={30}
        ease={80}
        color="#a855f7"
        size={0.6}
      />

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 180, 360],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-600/20 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.3, 1, 1.3],
            rotate: [180, 360, 180],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-violet-600/20 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl"
        />
      </div>

      <div className="relative min-h-screen flex items-center justify-center px-4 py-12 z-10">
        <div className="text-center max-w-6xl mx-auto">
          {/* Animated Badge */}
          <BlurFade delay={0.1} inView>
            <div className="flex justify-center mb-6">
              <AnimatedGradientText className="px-6 py-2">
                <Sparkles className="w-4 h-4 mr-2" />
                <span className={cn(
                  "inline animate-gradient bg-gradient-to-r from-[#ffaa40] via-[#9c40ff] to-[#ffaa40] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent",
                )}>
                  AI-Powered Language Learning
                </span>
                <ChevronRight className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </AnimatedGradientText>
            </div>
          </BlurFade>

          {/* Logo/Title */}
          <BlurFade delay={0.2} inView>
            <motion.h1
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                Lingozo
              </span>
            </motion.h1>
          </BlurFade>

          <BlurFade delay={0.3} inView>
            <motion.div
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500/20 to-violet-500/20 backdrop-blur-xl rounded-full border border-purple-400/30 shadow-lg shadow-purple-500/20"
              whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(168, 85, 247, 0.3)" }}
              transition={{ duration: 0.3 }}
            >
              <Globe className="w-5 h-5 text-purple-300" />
              <p className="text-base sm:text-lg md:text-xl text-white font-medium">
                Learn Languages with AI
              </p>
            </motion.div>
          </BlurFade>

          {/* Description */}
          <BlurFade delay={0.4} inView>
            <p className="text-lg md:text-xl text-white/70 mb-12 mt-8 max-w-2xl mx-auto leading-relaxed font-light">
              Practice conversations, get instant corrections, and learn grammar rules
              with your personal AI language tutor.
            </p>
          </BlurFade>

          {/* CTA Buttons */}
          <BlurFade delay={0.5} inView>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link href="/signup">
                <ShimmerButton
                  shimmerColor="#ffffff"
                  shimmerSize="0.1em"
                  borderRadius="16px"
                  shimmerDuration="2s"
                  background="linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #7c3aed 100%)"
                  className="px-8 py-4 text-lg font-semibold shadow-2xl shadow-purple-500/40 hover:shadow-purple-500/60 transition-shadow"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Get Started Free
                </ShimmerButton>
              </Link>
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-xl text-white px-8 py-4 rounded-2xl font-semibold hover:bg-white/20 transition-all border border-white/30 hover:border-white/50 shadow-lg"
                >
                  Sign In
                </Link>
              </motion.div>
            </div>
          </BlurFade>

          {/* Stats with MagicCard */}
          <BlurFade delay={0.6} inView>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-16">
              {stats.map((stat, index) => (
                <MagicCard
                  key={index}
                  className="rounded-2xl cursor-pointer"
                  gradientColor="rgba(168, 85, 247, 0.15)"
                  gradientFrom="#a855f7"
                  gradientTo="#6366f1"
                >
                  <motion.div
                    whileHover={{ y: -5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="p-6 text-center"
                  >
                    <stat.icon className="w-7 h-7 text-purple-400 mx-auto mb-3" />
                    <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-sm text-white/60 font-medium">{stat.label}</div>
                  </motion.div>
                </MagicCard>
              ))}
            </div>
          </BlurFade>

          {/* Features Grid with MagicCard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <BlurFade key={index} delay={0.7 + index * 0.1} inView>
                <MagicCard
                  className="rounded-3xl h-full"
                  gradientColor="rgba(168, 85, 247, 0.1)"
                  gradientFrom={feature.gradientFrom}
                  gradientTo={feature.gradientTo}
                >
                  <motion.div
                    whileHover={{ y: -8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="p-8 text-center group h-full"
                  >
                    <motion.div
                      className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 mx-auto shadow-lg group-hover:shadow-2xl transition-all`}
                      whileHover={{ rotate: 12, scale: 1.1 }}
                      transition={{ duration: 0.3, type: "spring" }}
                    >
                      <feature.icon className="w-8 h-8 text-white" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-200 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-white/60 leading-relaxed font-light group-hover:text-white/80 transition-colors">
                      {feature.description}
                    </p>
                  </motion.div>
                </MagicCard>
              </BlurFade>
            ))}
          </div>

          {/* Floating decorative elements */}
          <motion.div
            animate={{
              y: [0, -30, 0],
              x: [0, 20, 0],
              rotate: [0, 15, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 left-10 w-24 h-24 bg-gradient-to-br from-yellow-400/30 to-orange-400/20 rounded-full blur-2xl"
          />
          <motion.div
            animate={{
              y: [0, 30, 0],
              x: [0, -30, 0],
              rotate: [0, -20, 0],
              scale: [1.2, 1, 1.2],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-32 right-16 w-40 h-40 bg-gradient-to-br from-pink-500/30 to-purple-500/20 rounded-full blur-2xl"
          />
          <motion.div
            animate={{
              y: [0, -20, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/3 right-20 w-16 h-16 bg-gradient-to-br from-cyan-400/40 to-blue-400/30 rounded-full blur-xl"
          />
        </div>
      </div>
    </div>
  );
}
