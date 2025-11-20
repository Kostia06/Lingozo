'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  MessageCircle,
  Trash2,
  LogOut,
  Loader2,
  Home,
  Settings,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Globe
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export default function Sidebar({ currentChatId, onChatSelect, onClose, isCollapsed, onToggle }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatLanguage, setNewChatLanguage] = useState('');
  const [newChatTitle, setNewChatTitle] = useState('');
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading chats:', error);
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

      // If we're on the deleted chat page, go to dashboard
      if (pathname === `/chat/${chatId}`) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const handleNewChat = async () => {
    if (!newChatTitle.trim() || !newChatLanguage.trim()) {
      alert('Please fill in all fields');
      return;
    }

    try {
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

      setShowNewChatModal(false);
      setNewChatTitle('');
      setNewChatLanguage('');
      router.push(`/chat/${data.id}`);
      if (onClose) onClose();
    } catch (error) {
      console.error('Error creating chat:', error);
      alert('Failed to create chat');
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

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const sidebarVariants = {
    expanded: {
      width: '288px',
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    },
    collapsed: {
      width: '80px',
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    }
  };

  return (
    <>
      <motion.div
        initial={{ x: -300 }}
        animate={isCollapsed ? 'collapsed' : 'expanded'}
        variants={sidebarVariants}
        className="bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 text-white flex flex-col h-screen border-r border-gray-800/50 backdrop-blur-sm relative"
      >
        {/* Toggle Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onToggle}
          className="absolute -right-3 top-6 z-50 w-6 h-6 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
        >
          {isCollapsed ? (
            <ChevronRight className="w-3 h-3 text-white" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-white" />
          )}
        </motion.button>

        {/* Header */}
        <div className="p-6 border-b border-gray-800/50">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="cursor-pointer flex items-center gap-3"
            onClick={() => {
              router.push('/dashboard');
              if (onClose) onClose();
            }}
          >
            <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-violet-400 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
                  Lingozo
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">AI Language Learning</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Navigation */}
        <div className="p-4 space-y-1 border-b border-gray-800/50">
          {navItems.map((item) => (
            <motion.button
              key={item.path}
              onClick={() => {
                router.push(item.path);
                if (onClose) onClose();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full px-3 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all ${
                pathname === item.path
                  ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-500/20'
                  : 'bg-gray-800/30 hover:bg-gray-800/50 text-gray-300 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </motion.button>
          ))}
        </div>

        {/* Action Button */}
        {!isCollapsed && (
          <div className="p-4">
            <motion.button
              onClick={() => setShowNewChatModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition-all"
            >
              <Plus className="w-5 h-5" />
              New Conversation
            </motion.button>
          </div>
        )}

        {/* Chat List */}
        {!isCollapsed && (
          <div className="flex-1 overflow-y-auto px-3 custom-scrollbar">
            <div className="px-1 mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Recent Chats
              </h3>
            </div>
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
                  {chats.slice(0, 5).map((chat, index) => (
                    <motion.div
                      key={chat.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => {
                        if (onChatSelect) {
                          onChatSelect(chat.id);
                        } else {
                          router.push(`/chat/${chat.id}`);
                        }
                        if (onClose) onClose();
                      }}
                      className={`p-3 rounded-xl cursor-pointer group relative transition-all ${
                        (currentChatId === chat.id || pathname === `/chat/${chat.id}`)
                          ? 'bg-gradient-to-r from-purple-600/20 to-violet-600/20 border border-purple-500/30 shadow-lg shadow-purple-500/10'
                          : 'bg-gray-800/30 hover:bg-gray-800/50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 text-lg">
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
                          className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </motion.button>
                      </div>
                      {(currentChatId === chat.id || pathname === `/chat/${chat.id}`) && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-purple-500 to-violet-500 rounded-r-full"
                        />
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* User Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 border-t border-gray-800/50 bg-gray-900/50 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-500 rounded-full flex items-center justify-center font-semibold flex-shrink-0">
                {user?.email?.[0]?.toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-white">
                    {user?.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <motion.button
                onClick={signOut}
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex-shrink-0"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </motion.button>
            )}
          </div>
        </motion.div>

      </motion.div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
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
            className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl"
          >
            <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent mb-6">
              Start New Conversation
            </h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Conversation Title
                </label>
                <input
                  type="text"
                  value={newChatTitle}
                  onChange={(e) => setNewChatTitle(e.target.value)}
                  placeholder="e.g., Spanish Practice"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-colors text-gray-900 placeholder:text-gray-400"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  What Language Do You Want to Learn?
                </label>
                <input
                  type="text"
                  value={newChatLanguage}
                  onChange={(e) => setNewChatLanguage(e.target.value)}
                  placeholder="e.g., Spanish, French, Japanese..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-colors text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
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
                  className="px-6 py-3 rounded-xl font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all"
                >
                  Cancel
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}