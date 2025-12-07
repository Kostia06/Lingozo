'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ChatInterface from '@/components/ChatInterface';
import WelcomeGuide from '@/components/WelcomeGuide';
import UIHighlights from '@/components/UIHighlights';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, Clock, Loader2, Menu, Sparkles } from 'lucide-react';
import { MagicCard } from '@/components/ui/magic-card';
import { Particles } from '@/components/ui/particles';
import { BlurFade } from '@/components/ui/blur-fade';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { ShineBorder } from '@/components/ui/shine-border';

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

      // Add new chat to state immediately for instant UI update
      setChats(prevChats => [data, ...prevChats]);

      // Set selected chat directly for instant navigation
      setSelectedChat(data);

      // Close modal and reset form
      setShowNewChatModal(false);
      setNewChatTitle('');
      setNewChatLanguage('');

      // Update URL without full page reload
      router.push(`/dashboard?chat=${data.id}`, { scroll: false });
    } catch (error) {
      console.error('Error creating chat:', error);
      alert('Failed to create chat');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-black">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black relative overflow-hidden">
      {/* Welcome Guide */}
      <WelcomeGuide />

      {/* UI Highlights Tour - Only show when no chat is selected */}
      <UIHighlights isVisible={!selectedChatId} />

      {/* Particles Background */}
      <Particles
        className="absolute inset-0 z-0"
        quantity={80}
        staticity={40}
        ease={70}
        color="#a855f7"
        size={0.5}
      />

      {/* Animated background elements - matching landing page */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 180, 360],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-600/15 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.3, 1, 1.3],
            rotate: [180, 360, 180],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-violet-600/15 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, 80, 0],
            y: [0, -40, 0],
            opacity: [0.1, 0.25, 0.1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 right-1/3 w-80 h-80 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl"
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
          <div className="bg-white/10 backdrop-blur-xl border-b border-white/20 px-4 sm:px-6 py-3 sm:py-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1 pl-12 md:pl-0">
                <BlurFade delay={0.1} inView>
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
                </BlurFade>
                <BlurFade delay={0.2} inView>
                  <p className="text-white/80 text-xs sm:text-sm mt-1">
                    Choose a conversation or start a new one
                  </p>
                </BlurFade>
              </div>
              <BlurFade delay={0.3} inView>
                <ShimmerButton
                  onClick={() => setShowNewChatModal(true)}
                  shimmerColor="#ffffff"
                  shimmerSize="0.08em"
                  borderRadius="12px"
                  shimmerDuration="2.5s"
                  background="linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #7c3aed 100%)"
                  className="px-4 py-2 font-semibold shadow-lg shadow-purple-500/30"
                >
                  <Plus className="w-5 h-5 mr-1" />
                  <span className="hidden sm:inline">New Chat</span>
                </ShimmerButton>
              </BlurFade>
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loadingChats ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          ) : chats.length === 0 ? (
            <BlurFade delay={0.2} inView>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <motion.div
                  animate={{
                    y: [0, -10, 0],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <MessageSquare className="w-20 h-20 text-purple-400/60 mx-auto mb-6" />
                </motion.div>
                <h3 className="text-2xl font-bold text-white mb-3">No conversations yet</h3>
                <p className="text-white/70 mb-8 max-w-md mx-auto">
                  Start your first conversation to begin your language learning journey!
                </p>
                <ShimmerButton
                  onClick={() => setShowNewChatModal(true)}
                  shimmerColor="#ffffff"
                  shimmerSize="0.1em"
                  borderRadius="16px"
                  shimmerDuration="2s"
                  background="linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #7c3aed 100%)"
                  className="px-8 py-4 text-lg font-semibold shadow-2xl shadow-purple-500/40"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start First Conversation
                </ShimmerButton>
              </motion.div>
            </BlurFade>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-7xl mx-auto">
              {chats.map((chat, index) => (
                <BlurFade key={chat.id} delay={0.1 + index * 0.05} inView>
                  <MagicCard
                    className="rounded-2xl cursor-pointer h-full"
                    gradientColor="rgba(168, 85, 247, 0.12)"
                    gradientFrom="#a855f7"
                    gradientTo="#6366f1"
                  >
                    <motion.div
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      onClick={() => router.push(`/dashboard?chat=${chat.id}`)}
                      className="p-6 h-full"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white text-lg mb-1.5 truncate">
                            {chat.title}
                          </h3>
                          <p className="text-sm text-purple-300 font-medium">
                            {chat.language}
                          </p>
                        </div>
                        <motion.div
                          className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/30"
                          whileHover={{ rotate: 10, scale: 1.1 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          <MessageSquare className="w-6 h-6 text-white" />
                        </motion.div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/50 mt-4 pt-4 border-t border-white/10">
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
                  </MagicCard>
                </BlurFade>
              ))}
            </div>
          )}
          </div>
        </div>
      )}

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChatModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-lg flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowNewChatModal(false);
              setNewChatTitle('');
              setNewChatLanguage('');
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative rounded-3xl overflow-hidden w-full max-w-md">
                <ShineBorder
                  shineColor={["#a855f7", "#6366f1", "#ec4899"]}
                  borderWidth={2}
                  duration={10}
                />
                <div className="bg-gray-900/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 w-full shadow-2xl">
                  <div className="flex items-center gap-3 mb-6">
                    <motion.div
                      className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg"
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Sparkles className="w-6 h-6 text-white" />
                    </motion.div>
                    <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
                      Start New Conversation
                    </h3>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-white/80 mb-2">
                        Conversation Title
                      </label>
                      <input
                        type="text"
                        value={newChatTitle}
                        onChange={(e) => setNewChatTitle(e.target.value)}
                        placeholder="e.g., Spanish Practice"
                        className="w-full px-4 py-3 text-sm border-2 border-white/10 bg-white/5 backdrop-blur-lg rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 hover:border-white/20 transition-all text-white placeholder:text-white/40"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white/80 mb-2">
                        What Language Do You Want to Learn?
                      </label>
                      <input
                        type="text"
                        value={newChatLanguage}
                        onChange={(e) => setNewChatLanguage(e.target.value)}
                        placeholder="e.g., Spanish, French, Japanese..."
                        className="w-full px-4 py-3 text-sm border-2 border-white/10 bg-white/5 backdrop-blur-lg rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 hover:border-white/20 transition-all text-white placeholder:text-white/40"
                      />
                      <p className="text-xs text-white/50 mt-2">
                        Enter any language you'd like to practice conversationally
                      </p>
                    </div>
                    <div className="flex gap-3 pt-3">
                      <ShimmerButton
                        onClick={handleNewChat}
                        shimmerColor="#ffffff"
                        shimmerSize="0.1em"
                        borderRadius="12px"
                        shimmerDuration="2s"
                        background="linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #7c3aed 100%)"
                        className="flex-1 py-3 font-semibold shadow-lg shadow-purple-500/30"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Create
                      </ShimmerButton>
                      <motion.button
                        onClick={() => {
                          setShowNewChatModal(false);
                          setNewChatTitle('');
                          setNewChatLanguage('');
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-6 py-3 rounded-xl font-semibold bg-white/10 hover:bg-white/20 text-white/80 transition-all border border-white/10"
                      >
                        Cancel
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
