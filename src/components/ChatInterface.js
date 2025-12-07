'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import ChatMessage from './ChatMessage';
import CustomNotes from './CustomNotes';
import MusicCard from './MusicCard';
import FeaturesPanel from './FeaturesPanel';
import QuizComponent from './QuizComponent';
import SavedVocab from './SavedVocab';
import { Menu, Send, Loader2, Mic, MicOff, Sparkles, BookmarkCheck, X, StickyNote, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { startListening, isSTTSupported } from '@/lib/audio-utils';
import { Particles } from '@/components/ui/particles';
import { BlurFade } from '@/components/ui/blur-fade';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { BorderBeam } from '@/components/ui/border-beam';

export default function ChatInterface({ chatId, language, onMenuClick }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTranslation, setShowTranslation] = useState(null);
  const [loadingTranslation, setLoadingTranslation] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showAllTranslations, setShowAllTranslations] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sttSupported, setSttSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [musicRecommendations, setMusicRecommendations] = useState([]);
  const [showFeaturesPanel, setShowFeaturesPanel] = useState(false);
  const [activeFeature, setActiveFeature] = useState(null);
  const [featureData, setFeatureData] = useState(null);
  const [showVocabPanel, setShowVocabPanel] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [todayMessageCount, setTodayMessageCount] = useState(0);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Check STT support on mount
  useEffect(() => {
    setSttSupported(isSTTSupported());
  }, []);

  useEffect(() => {
    if (!chatId) return;

    let subscriptionCleanup = null;

    const initChat = async () => {
      // Verify session before loading
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return;
      }

      await loadMessages();
      await loadMusicRecommendations();
      await loadPremiumStatus();
      await loadTodayMessageCount();

      // Set up subscription and store cleanup function
      subscriptionCleanup = subscribeToMessages();

      // Check for proactive message after initial load
      setTimeout(() => checkProactiveMessage(), 5000);
    };

    initChat();

    // Set up periodic check for proactive messages (every 15 minutes)
    const proactiveCheckInterval = setInterval(() => {
      checkProactiveMessage();
    }, 15 * 60 * 1000);

    // Cleanup function for the effect
    return () => {
      if (subscriptionCleanup) {
        subscriptionCleanup();
      }
      clearInterval(proactiveCheckInterval);
    };
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark messages as read when they appear in viewport
  useEffect(() => {
    if (messages.length === 0) return;

    const markMessagesAsRead = async () => {
      // Find unread AI messages
      const unreadMessages = messages.filter(
        msg => msg.role === 'assistant' && !msg.read_at
      );

      if (unreadMessages.length === 0) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const messageIds = unreadMessages.map(msg => msg.id);

        await fetch('/api/messages/read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ messageIds }),
        });

        // Update local state
        setMessages(prev =>
          prev.map(msg =>
            messageIds.includes(msg.id)
              ? { ...msg, read_at: new Date().toISOString() }
              : msg
          )
        );
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    };

    // Delay to ensure messages are rendered and visible
    const timer = setTimeout(markMessagesAsRead, 1000);
    return () => clearTimeout(timer);
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadMusicRecommendations = async () => {
    try {
      const { data, error } = await supabase
        .from('music_recommendations')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMusicRecommendations(data || []);
    } catch (error) {
      console.error('Error loading music:', error);
    }
  };

  const loadPremiumStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', session.user.id)
        .single();

      // Silently handle missing table or profile
      if (error) {
        if (error.code === 'PGRST116' || error.code === '42P01') {
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

  const loadTodayMessageCount = async () => {
    try {
      // Get today's start timestamp (midnight UTC)
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Count user's messages sent today
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chatId)
        .eq('role', 'user')
        .gte('created_at', todayISO);

      if (error) {
        console.error('Error counting messages:', error);
      }

      setTodayMessageCount(count || 0);
    } catch (error) {
      console.error('Error counting messages:', error);
    }
  };

  const checkProactiveMessage = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Only check if user is on the page and not currently typing
      if (document.hidden || loading) return;

      const response = await fetch('/api/proactive-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ chatId }),
      });

      const data = await response.json();

      if (data.shouldSend && data.message) {
        // Message will appear via real-time subscription
      }
    } catch (error) {
      console.error('Error checking proactive message:', error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase.channel(`chat-${chatId}-${Date.now()}`, {
      config: {
        broadcast: { self: true },
        presence: { key: chatId }
      }
    });

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          // Check if message contains feature data (quiz, challenge, etc.)
          try {
            const content = payload.new.content;
            if (typeof content === 'string' && (content.includes('"type":') || content.includes('"quiz'))) {
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const featureData = JSON.parse(jsonMatch[0]);
                if (featureData.type === 'quiz') {
                  setFeatureData(featureData);
                  setLoading(false);
                  return;
                }
              }
            }
          } catch (e) {
            // Not feature data, continue as normal message
          }

          setMessages((prev) => {
            // Check if message already exists (avoid duplicates)
            const exists = prev.some(msg => msg.id === payload.new.id);
            if (exists) {
              return prev;
            }

            // Remove temp message of the same role
            const filtered = prev.filter(msg => {
              if (!msg.id.startsWith('temp-')) return true;
              return msg.role !== payload.new.role;
            });

            return [...filtered, payload.new];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.id ? payload.new : msg
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'music_recommendations',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          setMusicRecommendations((prev) => {
            const exists = prev.some(music => music.id === payload.new.id);
            if (exists) return prev;
            return [payload.new, ...prev];
          });
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('❌ Subscription error:', err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleFeatureSelect = async (featureId) => {
    // For tea-time, just set the active feature and stay in normal chat
    if (featureId === 'tea-time') {
      setActiveFeature(featureId);
      setLoading(false);
      return;
    }

    setActiveFeature(featureId);
    setLoading(true);
    setFeatureData(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Request feature content from AI
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          chatId,
          message: `Start ${featureId}`,
          language,
          featureMode: featureId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start feature');
      }

      // Wait a moment for the message to be processed and saved
      // Then check for the feature data in recent messages
      setTimeout(async () => {
        try {
          const { data: recentMessages } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chatId)
            .eq('role', 'assistant')
            .order('created_at', { ascending: false })
            .limit(1);

          if (recentMessages && recentMessages.length > 0) {
            const content = recentMessages[0].content;
            // Try to parse JSON from the message content
            try {
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.type === 'quiz' || parsed.questions) {
                  setFeatureData({
                    type: 'quiz',
                    quizType: parsed.quizType || 'vocabulary',
                    questions: parsed.questions
                  });
                  setLoading(false);
                  return;
                }
              }
            } catch (e) {
              console.log('Message is not a feature response');
            }
          }
          // If no quiz data found, show in chat
          setActiveFeature(null);
          setLoading(false);
        } catch (err) {
          console.error('Error checking for feature data:', err);
          setActiveFeature(null);
          setLoading(false);
        }
      }, 2000);
    } catch (error) {
      console.error('Error starting feature:', error);
      alert('Failed to start feature. Please try again.');
      setActiveFeature(null);
      setLoading(false);
    }
  };

  const handleFeatureComplete = () => {
    setActiveFeature(null);
    setFeatureData(null);
  };

  const handleReply = (message) => {
    setReplyingTo(message);
  };

  const handleSendMessage = async (e, featureMode = null) => {
    e?.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userMessage = inputMessage.trim();
    const replyToId = replyingTo?.id || null;
    setInputMessage('');
    setReplyingTo(null);
    setLoading(true);

    // Optimistically add user message and AI loading placeholder in one update
    const timestamp = Date.now();
    const tempUserMessage = {
      id: `temp-user-${timestamp}`,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
      chat_id: chatId,
      corrections: [],
      reply_to_id: replyToId,
    };

    const tempAiMessage = {
      id: `temp-ai-${timestamp}`,
      role: 'assistant',
      content: '...',
      created_at: new Date(Date.now() + 1).toISOString(), // Ensure AI message is after user message
      chat_id: chatId,
      isLoading: true,
    };

    // Add both messages in correct order (user first, then AI loading)
    setMessages((prev) => [...prev, tempUserMessage, tempAiMessage]);

    try {
      // Get the user's session token
      const { data: { session } } = await supabase.auth.getSession();

      // Send message to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          chatId,
          message: userMessage,
          language,
          featureMode: featureMode || activeFeature,
          replyToId: replyToId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));

        // Handle 401 specifically - session might be expired
        if (response.status === 401) {
          // Try to refresh session before showing error
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError) {
            // Refresh succeeded, ask user to retry
            throw new Error('Session expired. Please try sending your message again.');
          } else {
            throw new Error('Session expired. Please log in again.');
          }
        }

        throw new Error(errorData.error || 'Failed to send message');
      }

      // Increment message count after successful send
      setTodayMessageCount(prev => prev + 1);

      // Real-time subscription will replace temp messages with actual ones
      // Fallback: reload messages after a short delay if real-time doesn't fire
      setTimeout(async () => {
        // Check if temp messages are still there (meaning real-time didn't fire)
        setMessages((prev) => {
          const hasTempMessages = prev.some(msg => msg.id.startsWith('temp-'));
          if (hasTempMessages) {
            loadMessages();
          }
          return prev;
        });
      }, 1500);
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic messages on error
      setMessages((prev) => prev.filter(msg => !msg.id.startsWith('temp-')));
      alert(error.message || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWordClick = async (word, position) => {
    // Toggle off if clicking the same word
    if (showTranslation && showTranslation.word === word) {
      setShowTranslation(null);
      return;
    }

    try {
      setLoadingTranslation(true);
      setShowTranslation({
        word,
        translation: null,
        position,
      });

      // Get the user's session token
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          word,
          targetLanguage: language,
          chatId,
        }),
      });

      if (!response.ok) throw new Error('Translation failed');

      const data = await response.json();

      // Improve positioning to prevent off-screen issues
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      let adjustedX = position.x;
      let adjustedY = position.y - 70;

      // Adjust horizontal position if too close to edge
      if (adjustedX + 250 > viewportWidth) {
        adjustedX = viewportWidth - 260;
      }
      if (adjustedX < 10) {
        adjustedX = 10;
      }

      // Adjust vertical position if too close to top
      if (adjustedY < 10) {
        adjustedY = position.y + 30; // Show below the word instead
      }

      setShowTranslation({
        word,
        translation: data.translation,
        position: { x: adjustedX, y: adjustedY },
      });
      setLoadingTranslation(false);
    } catch (error) {
      console.error('Error translating word:', error);
      setLoadingTranslation(false);
      setShowTranslation(null);
    }
  };

  const handleStartListening = () => {
    if (!sttSupported) {
      alert('Speech recognition is not supported in your browser. Try Chrome or Edge.');
      return;
    }

    if (isListening) {
      // Stop listening
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setInterimTranscript('');
    } else {
      // Start listening
      setIsListening(true);
      setInterimTranscript('');

      recognitionRef.current = startListening(
        language,
        (interim) => {
          // Interim results (while speaking)
          setInterimTranscript(interim);
        },
        (final) => {
          // Final result (when done speaking)
          setInputMessage(prev => prev ? `${prev} ${final}` : final);
          setInterimTranscript('');
          setIsListening(false);
        },
        (error) => {
          console.error('STT error:', error);
          setIsListening(false);
          setInterimTranscript('');
          if (error !== 'no-speech' && error !== 'aborted') {
            alert(`Speech recognition error: ${error}`);
          }
        }
      );

      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    }
  };

  // Cleanup STT on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  if (!chatId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-black relative overflow-hidden p-4">
        {/* Particles Background */}
        <Particles
          className="absolute inset-0 z-0"
          quantity={60}
          staticity={40}
          ease={80}
          color="#a855f7"
          size={0.5}
        />

        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, 180, 360],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-600/20 to-transparent rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1.3, 1, 1.3],
              rotate: [180, 360, 180],
              opacity: [0.15, 0.35, 0.15],
            }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-violet-600/20 to-transparent rounded-full blur-3xl"
          />
        </div>

        {/* Mobile Floating Menu Button - Top Left */}
        {onMenuClick && (
          <motion.button
            onClick={onMenuClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="md:hidden fixed top-3 left-3 z-[9997] w-12 h-12 bg-gradient-to-br from-purple-600 to-violet-600 rounded-xl shadow-xl flex items-center justify-center text-white backdrop-blur-sm"
          >
            <Menu className="w-5 h-5" />
          </motion.button>
        )}
        <div className="text-center max-w-md relative z-10">
          <BlurFade delay={0.1} inView>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-24 h-24 mx-auto mb-8 relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-violet-600/30 rounded-3xl blur-xl" />
              <motion.div
                animate={{
                  y: [0, -8, 0],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="relative w-full h-full bg-gradient-to-br from-purple-500/20 to-violet-600/20 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-2xl border border-purple-400/30"
              >
                <span className="text-5xl">💬</span>
              </motion.div>
            </motion.div>
          </BlurFade>
          <BlurFade delay={0.2} inView>
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
              Welcome to <span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">Lingozo</span>
            </h2>
          </BlurFade>
          <BlurFade delay={0.3} inView>
            <p className="text-white/70 text-sm md:text-lg max-w-sm mx-auto leading-relaxed">
              Select a conversation or create a new one to start learning with AI
            </p>
          </BlurFade>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-900 via-slate-900 to-black relative overflow-hidden">
      {/* Particles Background - subtle in chat */}
      <Particles
        className="absolute inset-0 z-0 opacity-50"
        quantity={40}
        staticity={50}
        ease={90}
        color="#a855f7"
        size={0.4}
      />

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-600/15 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-violet-600/15 to-transparent rounded-full blur-3xl"
        />
      </div>

      {/* Mobile Floating Menu Button - Top Left */}
      {onMenuClick && (
        <motion.button
          onClick={onMenuClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="md:hidden fixed top-3 left-3 z-[9997] w-12 h-12 bg-gradient-to-br from-purple-600 to-violet-600 rounded-xl shadow-xl flex items-center justify-center text-white backdrop-blur-sm"
        >
          <Menu className="w-5 h-5" />
        </motion.button>
      )}

      {/* Header with Glass Effect */}
      <div className="bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50 px-3 sm:px-6 py-2 sm:py-4 flex items-center justify-between gap-2 shadow-lg relative z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Mobile: Add left padding to avoid hamburger overlap */}
          <div className="pl-12 md:pl-0 min-w-0 flex items-center gap-2 flex-1">
            <h2 className="text-sm sm:text-lg font-bold text-white truncate">
              Learning {language}
            </h2>
            {!isPremium && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`hidden sm:flex px-2 sm:px-3 py-1 backdrop-blur-md rounded-full border ${
                  todayMessageCount >= 18
                    ? 'bg-red-500/20 border-red-400/40'
                    : 'bg-white/20 border-white/30'
                }`}
              >
                <span className={`text-xs font-semibold ${
                  todayMessageCount >= 18 ? 'text-red-200' : 'text-white'
                }`}>
                  {todayMessageCount}/20
                </span>
              </motion.div>
            )}
            {isPremium && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="hidden sm:flex px-2 sm:px-3 py-1 bg-gradient-to-r from-amber-400/20 to-yellow-400/20 backdrop-blur-md rounded-full border border-amber-400/40"
              >
                <span className="text-xs font-semibold text-amber-200">
                  ✨ Premium
                </span>
              </motion.div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <motion.button
            onClick={() => setShowAllTranslations(!showAllTranslations)}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className={`p-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl transition-all flex-shrink-0 border shadow-md ${
              showAllTranslations
                ? 'text-white bg-gradient-to-r from-blue-500 to-cyan-500 border-blue-400 shadow-blue-500/30'
                : 'text-white bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/30'
            }`}
          >
            <span className="hidden sm:inline">
              {showAllTranslations ? 'Hide' : 'Show'} Translations
            </span>
            <span className="sm:hidden">EN</span>
          </motion.button>
          <motion.button
            onClick={() => setShowNotes(!showNotes)}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="p-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-white/10 hover:bg-white/20 rounded-lg sm:rounded-xl transition-all flex-shrink-0 border border-white/20 hover:border-white/30 flex items-center gap-1.5 shadow-md"
          >
            <StickyNote className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">My Notes</span>
          </motion.button>
          <motion.button
            onClick={() => setShowFeaturesPanel(true)}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="p-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white rounded-lg sm:rounded-xl transition-all flex-shrink-0 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Features</span>
          </motion.button>
          <motion.button
            onClick={() => setShowVocabPanel(true)}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="p-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-white/10 hover:bg-white/20 rounded-lg sm:rounded-xl transition-all flex-shrink-0 border border-white/20 hover:border-white/30 flex items-center gap-1.5 shadow-md"
          >
            <BookmarkCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Vocab</span>
          </motion.button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Messages */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-6">
            {/* Active Feature Display */}
            {activeFeature && featureData && featureData.type === 'quiz' && (
              <QuizComponent
                quiz={featureData}
                onComplete={handleFeatureComplete}
                language={language}
              />
            )}

            {/* Regular Messages */}
            {!activeFeature && (
              <>
            {/* Music Recommendations Section */}
            {musicRecommendations.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-white/90 mb-3 flex items-center gap-2">
                  <span>🎵</span>
                  <span>Recommended Songs for Learning</span>
                </h3>
                {musicRecommendations.slice(0, 3).map((music) => (
                  <MusicCard key={music.id} music={music} />
                ))}
              </div>
            )}

            {/* Chat Messages */}
            {messages.map((message) => {
              // Find the message this is replying to (if any)
              const replyToMessage = message.reply_to_id
                ? messages.find(m => m.id === message.reply_to_id)
                : null;

              return (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onWordClick={handleWordClick}
                  showTranslation={showAllTranslations}
                  language={language}
                  chatId={chatId}
                  onReply={handleReply}
                  replyToMessage={replyToMessage}
                />
              );
            })}
            <div ref={messagesEndRef} />
            </>
            )}
          </div>

          {/* Input with Glass Effect */}
          <div className="border-t border-gray-700/50 px-3 sm:px-6 py-3 sm:py-4 bg-gray-900/90 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            {/* Subtle gradient border effect */}
            <div className={`absolute top-0 left-0 right-0 h-px ${
              activeFeature === 'tea-time'
                ? 'bg-gradient-to-r from-transparent via-amber-500/50 to-transparent'
                : 'bg-gradient-to-r from-transparent via-purple-500/50 to-transparent'
            }`} />

            {/* Tea Time Mode Indicator */}
            {activeFeature === 'tea-time' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 px-4 py-2.5 bg-amber-500/10 backdrop-blur-lg rounded-xl border border-amber-500/30 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">☕</span>
                  <span className="text-sm font-semibold text-amber-300">Tea Time Mode</span>
                  <span className="text-xs text-amber-200/70">Share your stories!</span>
                </div>
                <motion.button
                  onClick={() => setActiveFeature(null)}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400 }}
                  className="flex-shrink-0 p-1.5 hover:bg-white/20 rounded-lg transition-colors text-amber-300 hover:text-amber-100"
                  title="Exit tea time"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </motion.div>
            )}

            {/* Reply Preview Banner */}
            <AnimatePresence>
              {replyingTo && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="mb-3 px-4 py-2.5 bg-purple-500/10 backdrop-blur-lg rounded-xl border border-purple-500/30 flex items-start justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-purple-300 mb-1 flex items-center gap-1.5">
                      <Zap className="w-3 h-3" />
                      Replying to {replyingTo.role === 'user' ? 'yourself' : 'AI'}
                    </div>
                    <div className="text-sm text-white/70 truncate">
                      {replyingTo.content.substring(0, 80)}
                      {replyingTo.content.length > 80 ? '...' : ''}
                    </div>
                  </div>
                  <motion.button
                    onClick={() => setReplyingTo(null)}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400 }}
                    className="flex-shrink-0 p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSendMessage} className="flex gap-3">
              <div className="flex-1 relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/20 to-violet-600/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={isListening ? 'Listening...' : `Type in ${language}...`}
                  disabled={loading}
                  className="relative w-full px-4 sm:px-5 py-3 sm:py-3.5 pr-12 border-2 border-white/10 bg-white/5 backdrop-blur-xl rounded-xl focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50 text-sm sm:text-base transition-all text-white placeholder:text-white/40 shadow-lg hover:border-white/20"
                />
                {/* Microphone Button */}
                {sttSupported && (
                  <motion.button
                    type="button"
                    onClick={handleStartListening}
                    disabled={loading}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
                      isListening
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                        : 'hover:bg-white/10 text-white/50 hover:text-white'
                    }`}
                    title={isListening ? 'Stop listening' : 'Speak to type'}
                  >
                    {isListening ? (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />
                      </motion.div>
                    ) : (
                      <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </motion.button>
                )}
                {/* Interim transcript indicator */}
                <AnimatePresence>
                  {interimTranscript && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute -top-10 left-0 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs px-4 py-1.5 rounded-lg shadow-lg shadow-blue-500/30"
                    >
                      {interimTranscript}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <ShimmerButton
                type="submit"
                disabled={loading || !inputMessage.trim()}
                shimmerColor="#ffffff"
                shimmerSize="0.08em"
                borderRadius="12px"
                shimmerDuration="2.5s"
                background={loading || !inputMessage.trim()
                  ? "rgba(100, 100, 100, 0.5)"
                  : "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #7c3aed 100%)"
                }
                className="px-4 sm:px-6 py-3 font-semibold text-sm sm:text-base shadow-lg shadow-purple-500/30 disabled:shadow-none disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    <span className="hidden sm:inline ml-2">Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline ml-2">Send</span>
                  </>
                )}
              </ShimmerButton>
            </form>
          </div>
        </div>

        {/* Custom Notes Panel with Glass Effect */}
        {showNotes && (
          <div className="hidden lg:block w-80 border-l border-gray-700/50 overflow-y-auto bg-gray-900/80 backdrop-blur-md relative z-10">
            {/* Custom Notes Panel - Will be created next */}
            <CustomNotes chatId={chatId} language={language} />
          </div>
        )}

        {/* Mobile Custom Notes Modal with Glass Effect */}
        {showNotes && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            className="lg:hidden fixed inset-0 bg-gray-900/95 backdrop-blur-xl z-50 overflow-y-auto"
          >
            <div className="sticky top-0 bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50 px-4 py-3 flex items-center justify-between shadow-lg">
              <h3 className="font-semibold text-lg text-white">My Notes</h3>
              <button
                onClick={() => setShowNotes(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <CustomNotes chatId={chatId} language={language} />
          </motion.div>
        )}
      </div>

      {/* Translation Popup with Glass Effect */}
      {showTranslation && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 5 }}
          className="fixed bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-2 border-purple-300/60 dark:border-purple-600/60 rounded-xl shadow-2xl px-4 py-3 z-50 min-w-[200px] max-w-[300px]"
          style={{
            left: showTranslation.position.x,
            top: showTranslation.position.y,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-purple-900 dark:text-purple-300 text-sm">{showTranslation.word}</span>
            <button
              onClick={() => setShowTranslation(null)}
              className="ml-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {loadingTranslation || !showTranslation.translation ? (
              <div className="flex items-center gap-2 py-1">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                <span className="text-gray-500 dark:text-gray-400 italic">Translating...</span>
              </div>
            ) : (
              showTranslation.translation
            )}
          </div>
        </motion.div>
      )}

      {/* Features Panel */}
      <AnimatePresence>
        {showFeaturesPanel && (
          <FeaturesPanel
            language={language}
            onFeatureSelect={handleFeatureSelect}
            onClose={() => setShowFeaturesPanel(false)}
          />
        )}
      </AnimatePresence>

      {/* Saved Vocabulary Panel */}
      <SavedVocab
        chatId={chatId}
        language={language}
        isOpen={showVocabPanel}
        onClose={() => setShowVocabPanel(false)}
      />
    </div>
  );
}
