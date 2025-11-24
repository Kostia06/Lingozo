'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ChatInterface from '@/components/ChatInterface';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { MessageSquare, Plus, Clock, Loader2, Menu } from 'lucide-react';

export default function DashboardContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [chats, setChats] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatLanguage, setNewChatLanguage] = useState('');
  const [newChatTitle, setNewChatTitle] = useState('');
  const [selectedChat, setSelectedChat] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const selectedChatId = searchParams.get('chat');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadChats();
      loadPremiumStatus();
    }
  }, [user]);

  const loadPremiumStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', user.id)
        .single();

      // PGRST116 = Row not found - user doesn't have profile yet
      // 42P01 = Table doesn't exist
      if (error) {
        if (error.code === 'PGRST116' || error.code === '42P01') {
          // Silently default to non-premium
          setIsPremium(false);
          return;
        }
        console.error('Error loading premium status:', error);
      }

      setIsPremium(data?.is_premium || false);
    } catch (error) {
      console.error('Error loading premium status:', error);
      setIsPremium(false);
    }
  };

  useEffect(() => {
    if (selectedChatId && chats.length > 0) {
      const chat = chats.find(c => c.id === selectedChatId);
      setSelectedChat(chat);
    } else {
      setSelectedChat(null);
    }
  }, [selectedChatId, chats]);

  const loadChats = async () => {
    try {
      setLoadingChats(true);
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setChats(data || []);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoadingChats(false);
    }
  };

  const handleNewChat = async () => {
    if (!newChatTitle.trim() || !newChatLanguage.trim()) {
      alert('Please fill in all fields');
      return;
    }

    try {
      // Check if user is premium (unlimited)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', user.id)
        .single();

      // Silently handle missing table or profile
      if (profileError && profileError.code !== 'PGRST116' && profileError.code !== '42P01') {
        console.error('Error checking premium status:', profileError);
      }

      const isPremium = profile?.is_premium || false;

      // Check chat limit for non-premium users
      if (!isPremium && chats.length >= 5) {
        alert('You have reached the maximum of 5 chats. Please delete an existing chat to create a new one, or upgrade to premium for unlimited chats.');
        return;
      }

      const { data, error } = await supabase
        .from('chats')
        .insert([
          {
            user_id: user.id,
            title: newChatTitle,
            language: newChatLanguage,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Select the new chat with query parameter
      router.push(`/dashboard?chat=${data.id}`);
      setShowNewChatModal(false);
      setNewChatTitle('');
      setNewChatLanguage('');
    } catch (error) {
      console.error('Error creating chat:', error);
      alert('Failed to create chat');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 relative overflow-hidden">
      {/* Animated background elements - matching landing page */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-white/5 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-white/5 to-transparent rounded-full blur-3xl"
        />
      </div>

      {/* Navbar */}
      <div className="relative">
        <Navbar
          currentChatId={selectedChatId}
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />
      </div>

      {/* Main Content */}
      {selectedChat ? (
        // Show Chat Interface when a chat is selected
        <ChatInterface
          chatId={selectedChat.id}
          language={selectedChat.language}
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />
      ) : (
        // Show Chat List when no chat is selected
        <div className="flex-1 flex flex-col overflow-hidden relative z-10">
          {/* Mobile Floating Menu Button - Top Left */}
          {!isMobileMenuOpen && (
            <motion.button
              onClick={() => setIsMobileMenuOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="md:hidden fixed top-4 left-4 z-[9997] w-12 h-12 bg-gradient-to-br from-purple-600 to-violet-600 rounded-xl shadow-xl flex items-center justify-center text-white backdrop-blur-sm"
            >
              <Menu className="w-5 h-5" />
            </motion.button>
          )}

          {/* Header with Glass Effect */}
          <div className="bg-white/10 backdrop-blur-md border-b border-white/20 px-4 sm:px-6 py-3 sm:py-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1 pl-12 md:pl-0">
                <div className="flex items-center gap-3">
                  <h1 className="text-lg sm:text-2xl font-bold text-white">
                    My Conversations
                  </h1>
                  {!isPremium && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/30"
                    >
                      <span className="text-xs font-semibold text-white">
                        {chats.length}/5 chats
                      </span>
                    </motion.div>
                  )}
                  {isPremium && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="px-3 py-1 bg-gradient-to-r from-amber-400/20 to-yellow-400/20 backdrop-blur-md rounded-full border border-amber-400/40"
                    >
                      <span className="text-xs font-semibold text-amber-200">
                        ✨ Premium - Unlimited
                      </span>
                    </motion.div>
                  )}
                </div>
                <p className="text-white/80 text-xs sm:text-sm mt-1">
                  Choose a conversation or start a new one
                </p>
              </div>
              <motion.button
                onClick={() => setShowNewChatModal(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-xl font-semibold hover:shadow-lg shadow-md transition-all"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">New Chat</span>
              </motion.button>
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loadingChats ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          ) : chats.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <MessageSquare className="w-16 h-16 text-white/40 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No conversations yet</h3>
              <p className="text-white/70 mb-6">
                Start your first conversation to begin learning!
              </p>
              <motion.button
                onClick={() => setShowNewChatModal(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-600 rounded-xl font-semibold hover:shadow-lg transition-all shadow-white/20"
              >
                <Plus className="w-5 h-5" />
                Start First Conversation
              </motion.button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
              {chats.map((chat, index) => (
                <motion.div
                  key={chat.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  onClick={() => router.push(`/dashboard?chat=${chat.id}`)}
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:border-white/40 shadow-lg cursor-pointer hover:shadow-xl transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white text-lg mb-1 truncate">
                        {chat.title}
                      </h3>
                      <p className="text-sm text-white/80 font-medium">
                        {chat.language}
                      </p>
                    </div>
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                      <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/60 mt-4">
                    <Clock className="w-4 h-4" />
                    <span>
                      {new Date(chat.updated_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          </div>
        </div>
      )}

      {/* New Chat Modal */}
      {showNewChatModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowNewChatModal(false);
            setNewChatTitle('');
            setNewChatLanguage('');
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-2xl p-8 w-full max-w-md shadow-2xl border border-white/20 dark:border-gray-700/20"
          >
            <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent mb-6">
              Start New Conversation
            </h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Conversation Title
                </label>
                <input
                  type="text"
                  value={newChatTitle}
                  onChange={(e) => setNewChatTitle(e.target.value)}
                  placeholder="e.g., Spanish Practice"
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-purple-500 transition-colors text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  What Language Do You Want to Learn?
                </label>
                <input
                  type="text"
                  value={newChatLanguage}
                  onChange={(e) => setNewChatLanguage(e.target.value)}
                  placeholder="e.g., Spanish, French, Japanese..."
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-purple-500 transition-colors text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter any language you'd like to practice conversationally
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <motion.button
                  onClick={handleNewChat}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-violet-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Create
                </motion.button>
                <motion.button
                  onClick={() => {
                    setShowNewChatModal(false);
                    setNewChatTitle('');
                    setNewChatLanguage('');
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 rounded-xl font-semibold bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-all"
                >
                  Cancel
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
