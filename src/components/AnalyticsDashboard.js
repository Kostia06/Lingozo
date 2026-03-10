'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  TrendingUp,
  MessageSquare,
  AlertCircle,
  BookOpen,
  Clock,
  Target,
  Award,
  Globe,
  Flame,
  X
} from 'lucide-react';

export default function AnalyticsDashboard({ onClose }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [chatStats, setChatStats] = useState([]);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    try {
      // Load aggregate stats
      const { data: aggregateData, error: aggregateError } = await supabase
        .from('user_aggregate_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!aggregateError && aggregateData) {
        setStats(aggregateData);
      }

      // Load per-chat stats
      const { data: chatData, error: chatError } = await supabase
        .from('user_stats')
        .select('*, chats(title, language)')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (!chatError && chatData) {
        setChatStats(chatData);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = stats ? [
    {
      icon: MessageSquare,
      label: 'Total Messages',
      value: stats.total_messages || 0,
      color: 'from-blue-500 to-cyan-500',
      trend: '+12%'
    },
    {
      icon: Target,
      label: 'Accuracy',
      value: `${stats.overall_accuracy_percentage || 100}%`,
      color: 'from-green-500 to-emerald-500',
      trend: '+5%'
    },
    {
      icon: AlertCircle,
      label: 'Corrections',
      value: stats.total_corrections || 0,
      color: 'from-orange-500 to-red-500',
      trend: '-8%'
    },
    {
      icon: BookOpen,
      label: 'Grammar Notes',
      value: stats.total_grammar_notes || 0,
      color: 'from-purple-500 to-pink-500',
      trend: '+15%'
    },
    {
      icon: Clock,
      label: 'Learning Time',
      value: `${Math.round((stats.total_learning_time_minutes || 0) / 60)}h`,
      color: 'from-indigo-500 to-purple-500',
      trend: '+20%'
    },
    {
      icon: Flame,
      label: 'Current Streak',
      value: `${stats.current_streak_days || 0} days`,
      color: 'from-yellow-500 to-orange-500',
      trend: 'Active'
    }
  ] : [];

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <div className="bg-white rounded-2xl p-8">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 border-2 border-purple-600/30 border-t-purple-600 rounded-full"
            />
            <span className="text-gray-600">Loading analytics...</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl my-8"
      >
        {/* Header */}
        <div className="border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Learning Analytics
            </h2>
            <p className="text-gray-500 text-sm mt-1">Track your progress and improvements</p>
          </div>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </motion.button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {!stats ? (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Data Yet</h3>
              <p className="text-gray-500">
                Start chatting to see your learning analytics!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {statCards.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                      <stat.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                    <div className="text-xs text-gray-600 mb-2">{stat.label}</div>
                    <div className="text-xs text-green-600 font-medium">{stat.trend}</div>
                  </motion.div>
                ))}
              </div>

              {/* Languages Learning */}
              {stats.languages_learning && stats.languages_learning.length > 0 && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Languages Learning</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {stats.languages_learning.map((lang, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="px-4 py-2 bg-white rounded-lg border border-purple-200 text-purple-700 font-medium"
                      >
                        {lang}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Achievement Badge */}
              {stats.overall_accuracy_percentage >= 90 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 rounded-xl p-6 text-white"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                      <Award className="w-10 h-10 text-yellow-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-1">Excellent Progress!</h3>
                      <p className="text-white/90">
                        You're maintaining {stats.overall_accuracy_percentage}% accuracy. Keep it up!
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Per-Chat Stats */}
              {chatStats.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Performance by Conversation
                  </h3>
                  <div className="space-y-3">
                    {chatStats.map((chat, index) => (
                      <motion.div
                        key={chat.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {chat.chats?.title || 'Untitled Chat'}
                            </h4>
                            <p className="text-sm text-gray-500">{chat.chats?.language}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-purple-600">
                              {chat.accuracy_percentage || 100}%
                            </div>
                            <div className="text-xs text-gray-500">Accuracy</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-lg font-semibold text-gray-900">
                              {chat.total_messages}
                            </div>
                            <div className="text-xs text-gray-500">Messages</div>
                          </div>
                          <div>
                            <div className="text-lg font-semibold text-orange-600">
                              {chat.total_corrections}
                            </div>
                            <div className="text-xs text-gray-500">Corrections</div>
                          </div>
                          <div>
                            <div className="text-lg font-semibold text-purple-600">
                              {chat.grammar_notes_received || 0}
                            </div>
                            <div className="text-xs text-gray-500">Grammar Notes</div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
