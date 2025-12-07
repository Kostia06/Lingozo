'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  BookOpen,
  Coffee,
  Trophy,
  MessageCircle,
  Zap,
  Brain,
  Target,
  Flame,
  X,
  Play,
  RotateCcw,
} from 'lucide-react';
import { MagicCard } from '@/components/ui/magic-card';
import { BlurFade } from '@/components/ui/blur-fade';
import { Meteors } from '@/components/ui/meteors';
import ShineBorder from '@/components/ui/shine-border';

export default function FeaturesPanel({ language, onFeatureSelect, onClose }) {
  const features = [
    {
      id: 'quiz-vocab',
      icon: BookOpen,
      title: 'Vocabulary Quiz',
      description: 'Test your word knowledge with fun quizzes',
      color: 'from-blue-500 to-cyan-500',
      gradientFrom: '#3b82f6',
      gradientTo: '#06b6d4',
      badge: 'Learning',
    },
    {
      id: 'quiz-grammar',
      icon: Brain,
      title: 'Grammar Challenge',
      description: 'Master grammar rules with interactive questions',
      color: 'from-purple-500 to-pink-500',
      gradientFrom: '#a855f7',
      gradientTo: '#ec4899',
      badge: 'Challenge',
    },
    {
      id: 'tea-time',
      icon: Coffee,
      title: 'Tea Time Chat',
      description: 'Share your stories and have deep conversations',
      color: 'from-amber-500 to-orange-500',
      gradientFrom: '#f59e0b',
      gradientTo: '#f97316',
      badge: 'Social',
    },
    {
      id: 'daily-challenge',
      icon: Flame,
      title: 'Daily Challenge',
      description: 'Complete today\'s language challenge',
      color: 'from-red-500 to-pink-500',
      gradientFrom: '#ef4444',
      gradientTo: '#ec4899',
      badge: 'Daily',
    },
    {
      id: 'scenario',
      icon: MessageCircle,
      title: 'Real-Life Scenario',
      description: 'Practice conversations in realistic situations',
      color: 'from-green-500 to-emerald-500',
      gradientFrom: '#22c55e',
      gradientTo: '#10b981',
      badge: 'Practice',
    },
    {
      id: 'speed-round',
      icon: Zap,
      title: 'Speed Round',
      description: 'Quick-fire translation challenges',
      color: 'from-yellow-500 to-amber-500',
      gradientFrom: '#eab308',
      gradientTo: '#f59e0b',
      badge: 'Fast',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-xl z-50 flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 30 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-900/95 backdrop-blur-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 w-full max-w-4xl h-[85vh] sm:h-auto sm:max-h-[85vh] overflow-y-auto shadow-2xl border border-white/10 relative"
      >
        {/* Meteors Effect */}
        <Meteors number={15} />

        {/* Header */}
        <BlurFade delay={0.1} inView>
          <div className="flex items-center justify-between mb-4 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-4">
              <motion.div
                className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 flex-shrink-0"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </motion.div>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Interactive Features
                </h2>
                <p className="text-xs sm:text-sm text-white/60">
                  Choose a fun way to practice {language}
                </p>
              </div>
            </div>
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400 }}
              className="p-2 sm:p-2.5 hover:bg-white/10 rounded-xl transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-white/60" />
            </motion.button>
          </div>
        </BlurFade>

        {/* Features Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
          {features.map((feature, index) => (
            <BlurFade key={feature.id} delay={0.15 + index * 0.05} inView>
              <MagicCard
                className="rounded-xl sm:rounded-2xl cursor-pointer h-full min-h-[140px] sm:min-h-[180px]"
                gradientColor="rgba(168, 85, 247, 0.1)"
                gradientFrom={feature.gradientFrom}
                gradientTo={feature.gradientTo}
              >
                <motion.button
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  onClick={() => {
                    onFeatureSelect(feature.id);
                    onClose();
                  }}
                  className="relative p-3 sm:p-6 w-full h-full text-left group flex flex-col"
                >
                  {/* Badge */}
                  <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
                    <span className="text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-white/10 text-white/80 border border-white/20">
                      {feature.badge}
                    </span>
                  </div>

                  {/* Icon */}
                  <motion.div
                    className={`w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-2 sm:mb-4 shadow-lg group-hover:shadow-2xl transition-all flex-shrink-0`}
                    whileHover={{ rotate: 12, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <feature.icon className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                  </motion.div>

                  {/* Content */}
                  <h3 className="text-sm sm:text-lg font-bold text-white mb-1 sm:mb-2 group-hover:text-purple-200 transition-colors line-clamp-1">
                    {feature.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-white/60 mb-2 sm:mb-4 group-hover:text-white/80 transition-colors line-clamp-2 flex-1">
                    {feature.description}
                  </p>

                  {/* Play Button */}
                  <div className="flex items-center gap-1 sm:gap-2 text-purple-400 font-semibold text-xs sm:text-sm group-hover:gap-2 sm:group-hover:gap-3 transition-all mt-auto">
                    <motion.div
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-purple-500/20 flex items-center justify-center"
                      whileHover={{ scale: 1.2 }}
                    >
                      <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-purple-400" />
                    </motion.div>
                    <span>Start</span>
                  </div>
                </motion.button>
              </MagicCard>
            </BlurFade>
          ))}
        </div>

        {/* Quick Tips */}
        <BlurFade delay={0.5} inView>
          <div className="mt-4 sm:mt-8 p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5" />
            <div className="flex items-start gap-2 sm:gap-4 relative z-10">
              <motion.div
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              >
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
              </motion.div>
              <div>
                <h4 className="font-bold text-white text-sm sm:text-base mb-1 sm:mb-1.5">Pro Tip</h4>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                  Features can also be triggered naturally during conversation! Just ask for a quiz,
                  share a story for tea time, or request a challenge.
                </p>
              </div>
            </div>
          </div>
        </BlurFade>
      </motion.div>
    </motion.div>
  );
}
