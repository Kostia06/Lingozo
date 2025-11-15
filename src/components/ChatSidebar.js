'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageCircle, Trash2, LogOut, Loader2, TrendingUp } from 'lucide-react';
import AnalyticsDashboard from './AnalyticsDashboard';

export default function ChatSidebar({ currentChatId, onChatSelect, onNewChat }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (user) {
      loadChats();
    }
  }, [user]);

  const loadChats = async () => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading chats:', error);
        // If table doesn't exist, just show empty state
        setChats([]);
      } else {
        setChats(data || []);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat?')) return;

    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (error) throw error;
      setChats(chats.filter(chat => chat.id !== chatId));
      if (currentChatId === chatId) {
        onChatSelect(null);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const getLanguageFlag = (language) => {
    const flags = {
      'Spanish': '🇪🇸',
      'French': '🇫🇷',
      'German': '🇩🇪',
      'Italian': '🇮🇹',
      'Portuguese': '🇵🇹',
      'Japanese': '🇯🇵',
      'Korean': '🇰🇷',
      'Chinese': '🇨🇳',
      'Russian': '🇷🇺',
      'Arabic': '🇸🇦'
    };
    return flags[language] || '🌐';
  };

  return (
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      className="w-72 sm:w-80 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 text-white flex flex-col h-screen border-r border-gray-800/50 backdrop-blur-sm"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-800/50">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Kang
          </h1>
          <p className="text-xs text-gray-500 mt-1">AI Language Learning</p>
        </motion.div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 space-y-2">
        <motion.button
          onClick={onNewChat}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition-all"
        >
          <Plus className="w-5 h-5" />
          New Conversation
        </motion.button>
        <motion.button
          onClick={() => setShowAnalytics(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border border-gray-700 transition-all"
        >
          <TrendingUp className="w-5 h-5" />
          Analytics
        </motion.button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-3 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 text-gray-500"
            >
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <p className="text-sm">Loading chats...</p>
            </motion.div>
          ) : chats.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center py-12 px-4"
            >
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-3">
                <MessageCircle className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-gray-500 text-sm text-center">
                No conversations yet
              </p>
              <p className="text-gray-600 text-xs text-center mt-1">
                Start a new chat to begin learning!
              </p>
            </motion.div>
          ) : (
            <motion.div className="space-y-2 pb-4">
              {chats.map((chat, index) => (
                <motion.div
                  key={chat.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => onChatSelect(chat.id)}
                  className={`p-4 rounded-xl cursor-pointer group relative transition-all ${
                    currentChatId === chat.id
                      ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 shadow-lg shadow-purple-500/10'
                      : 'bg-gray-800/30 hover:bg-gray-800/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 text-2xl">
                      {getLanguageFlag(chat.language)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-white">
                        {chat.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {chat.language}
                      </p>
                    </div>
                    <motion.button
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                  {currentChatId === chat.id && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-r-full"
                    />
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-4 border-t border-gray-800/50 bg-gray-900/50 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-semibold">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-white">
                {user?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <motion.button
            onClick={signOut}
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(107, 114, 128, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.5);
        }
      `}</style>

      {/* Analytics Modal */}
      {showAnalytics && (
        <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />
      )}
    </motion.div>
  );
}
