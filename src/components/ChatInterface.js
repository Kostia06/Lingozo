'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import ChatMessage from './ChatMessage';
import GrammarNotes from './GrammarNotes';
import MusicCard from './MusicCard';
import { Menu, Send, Loader2, Moon, Sun, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { startListening, isSTTSupported } from '@/lib/audio-utils';

export default function ChatInterface({ chatId, language, onMenuClick }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTranslation, setShowTranslation] = useState(null);
  const [loadingTranslation, setLoadingTranslation] = useState(false);
  const [showGrammarNotes, setShowGrammarNotes] = useState(false);
  const [showAllTranslations, setShowAllTranslations] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sttSupported, setSttSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [musicRecommendations, setMusicRecommendations] = useState([]);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const { theme, toggleTheme } = useTheme();

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
        console.warn('No session available, skipping chat initialization');
        return;
      }

      await loadMessages();
      await loadMusicRecommendations();

      // Set up subscription and store cleanup function
      subscriptionCleanup = subscribeToMessages();
    };

    initChat();

    // Cleanup function for the effect
    return () => {
      if (subscriptionCleanup) {
        subscriptionCleanup();
      }
    };
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
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

  const subscribeToMessages = () => {
    console.log('Setting up subscription for chat:', chatId);

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
          console.log('📨 New message received:', payload.new.role, payload.new.content?.substring(0, 30));

          setMessages((prev) => {
            // Check if message already exists (avoid duplicates)
            const exists = prev.some(msg => msg.id === payload.new.id);
            if (exists) {
              console.log('⚠️ Message already exists, skipping');
              return prev;
            }

            // Remove temp message of the same role
            const filtered = prev.filter(msg => {
              if (!msg.id.startsWith('temp-')) return true;
              return msg.role !== payload.new.role;
            });

            console.log('✅ Adding new message to UI');
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
          console.log('📝 Message updated:', payload.new.id);
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
          console.log('🎵 New music recommendation received:', payload.new.title);
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
        console.log('📡 Subscription status:', status);
      });

    return () => {
      console.log('🧹 Cleaning up subscription for chat:', chatId);
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
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

      // Real-time subscription will replace temp messages with actual ones
      // Fallback: reload messages after a short delay if real-time doesn't fire
      setTimeout(async () => {
        // Check if temp messages are still there (meaning real-time didn't fire)
        setMessages((prev) => {
          const hasTempMessages = prev.some(msg => msg.id.startsWith('temp-'));
          if (hasTempMessages) {
            console.log('⚠️ Real-time didn\'t fire, reloading messages manually');
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
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black p-4">
        {/* Mobile Menu Button */}
        {onMenuClick && (
          <motion.button
            onClick={onMenuClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="md:hidden absolute top-4 left-4 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
          >
            <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </motion.button>
        )}
        {/* Theme Toggle */}
        <motion.button
          onClick={toggleTheme}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="absolute top-4 right-4 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="w-6 h-6 text-yellow-500" />
          ) : (
            <Moon className="w-6 h-6 text-gray-700" />
          )}
        </motion.button>
        <div className="text-center max-w-md">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl"
          >
            <span className="text-4xl">💬</span>
          </motion.div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-3">
            Welcome to Kang
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
            Select a conversation or create a new one to start learning with AI
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Menu Button */}
          {onMenuClick && (
            <motion.button
              onClick={onMenuClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors flex-shrink-0"
            >
              <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </motion.button>
          )}
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent truncate">
              Learning {language}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <motion.button
            onClick={toggleTheme}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors flex-shrink-0"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-yellow-500" />
            ) : (
              <Moon className="w-5 h-5 text-gray-700" />
            )}
          </motion.button>
          <motion.button
            onClick={() => setShowAllTranslations(!showAllTranslations)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors flex-shrink-0 border ${
              showAllTranslations
                ? 'text-white bg-gradient-to-r from-blue-500 to-cyan-500 border-blue-400'
                : 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-950 border-blue-200 dark:border-blue-800'
            }`}
          >
            <span className="hidden sm:inline">
              {showAllTranslations ? 'Hide' : 'Show'} Translations
            </span>
            <span className="sm:hidden">EN</span>
          </motion.button>
          <motion.button
            onClick={() => setShowGrammarNotes(!showGrammarNotes)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-950 rounded-xl transition-colors flex-shrink-0 border border-purple-200 dark:border-purple-800"
          >
            <span className="hidden sm:inline">
              {showGrammarNotes ? 'Hide' : 'Show'} Notes
            </span>
            <span className="sm:hidden">Notes</span>
          </motion.button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-6">
            {/* Music Recommendations Section */}
            {musicRecommendations.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
                  <span>🎵</span>
                  <span>Recommended Songs for Learning</span>
                </h3>
                {musicRecommendations.slice(0, 3).map((music) => (
                  <MusicCard key={music.id} music={music} />
                ))}
              </div>
            )}

            {/* Chat Messages */}
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onWordClick={handleWordClick}
                showTranslation={showAllTranslations}
                language={language}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 dark:border-gray-800 px-3 sm:px-6 py-3 sm:py-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={isListening ? 'Listening...' : `Type in ${language}...`}
                  disabled={loading}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-12 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-purple-400 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900 disabled:opacity-50 text-sm sm:text-base transition-all text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder:text-gray-500 dark:placeholder:text-gray-400"
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
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-purple-500'
                    }`}
                    title={isListening ? 'Stop listening' : 'Speak to type'}
                  >
                    {isListening ? (
                      <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </motion.button>
                )}
                {/* Interim transcript indicator */}
                <AnimatePresence>
                  {interimTranscript && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute -top-8 left-0 bg-blue-500 text-white text-xs px-3 py-1 rounded-lg shadow-lg"
                    >
                      {interimTranscript}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <motion.button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-500 hover:to-pink-500 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm sm:text-base flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    <span className="hidden sm:inline">Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">Send</span>
                  </>
                )}
              </motion.button>
            </form>
          </div>
        </div>

        {/* Grammar Notes Panel */}
        {showGrammarNotes && (
          <div className="hidden lg:block w-80 border-l border-gray-200 dark:border-gray-800 overflow-y-auto bg-white dark:bg-gray-900">
            <GrammarNotes chatId={chatId} />
          </div>
        )}

        {/* Mobile Grammar Notes Modal */}
        {showGrammarNotes && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            className="lg:hidden fixed inset-0 bg-white dark:bg-gray-900 z-50 overflow-y-auto"
          >
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Grammar Notes</h3>
              <button
                onClick={() => setShowGrammarNotes(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <GrammarNotes chatId={chatId} />
          </motion.div>
        )}
      </div>

      {/* Translation Popup */}
      {showTranslation && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 5 }}
          className="fixed bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-700 rounded-xl shadow-2xl px-4 py-3 z-50 min-w-[200px] max-w-[300px]"
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
    </div>
  );
}
