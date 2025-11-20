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

export default function FeaturesPanel({ language, onFeatureSelect, onClose }) {
  const features = [
    {
      id: 'quiz-vocab',
      icon: BookOpen,
      title: 'Vocabulary Quiz',
      description: 'Test your word knowledge with fun quizzes',
      color: 'from-blue-500 to-cyan-500',
      badge: 'Learning',
    },
    {
      id: 'quiz-grammar',
      icon: Brain,
      title: 'Grammar Challenge',
      description: 'Master grammar rules with interactive questions',
      color: 'from-purple-500 to-pink-500',
      badge: 'Challenge',
    },
    {
      id: 'tea-time',
      icon: Coffee,
      title: 'Tea Time Chat',
      description: 'Share your stories and have deep conversations',
      color: 'from-amber-500 to-orange-500',
      badge: 'Social',
    },
    {
      id: 'daily-challenge',
      icon: Flame,
      title: 'Daily Challenge',
      description: 'Complete today\'s language challenge',
      color: 'from-red-500 to-pink-500',
      badge: 'Daily',
    },
    {
      id: 'scenario',
      icon: MessageCircle,
      title: 'Real-Life Scenario',
      description: 'Practice conversations in realistic situations',
      color: 'from-green-500 to-emerald-500',
      badge: 'Practice',
    },
    {
      id: 'speed-round',
      icon: Zap,
      title: 'Speed Round',
      description: 'Quick-fire translation challenges',
      color: 'from-yellow-500 to-amber-500',
      badge: 'Fast',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20 dark:border-gray-700/20"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Interactive Features
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose a fun way to practice {language}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <motion.button
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                onFeatureSelect(feature.id);
                onClose();
              }}
              className="relative p-6 rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/40 dark:border-gray-700/40 shadow-lg hover:shadow-xl transition-all text-left group"
            >
              {/* Badge */}
              <div className="absolute top-3 right-3">
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-700 dark:text-purple-300 border border-purple-300/30">
                  {feature.badge}
                </span>
              </div>

              {/* Icon */}
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {feature.description}
              </p>

              {/* Play Button */}
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold text-sm group-hover:gap-3 transition-all">
                <Play className="w-4 h-4" />
                <span>Start</span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Quick Tips */}
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-300/30 dark:border-purple-600/30">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Pro Tip</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Features can also be triggered naturally during conversation! Just ask for a quiz,
                share a story for tea time, or request a challenge.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
