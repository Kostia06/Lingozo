'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import Avatar from 'boring-avatars';
import {
  BookmarkCheck,
  Trash2,
  Search,
  Filter,
  Download,
  Star,
  Calendar,
  Loader2,
  BookOpen,
  X,
} from 'lucide-react';

export default function SavedVocab({ chatId, language, isOpen, onClose }) {
  const [vocabItems, setVocabItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, starred, recent
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (isOpen && chatId) {
      loadVocab();
    }
  }, [chatId, isOpen]);

  const loadVocab = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('saved_vocabulary')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVocabItems(data || []);
    } catch (error) {
      console.error('Error loading vocab:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setDeleting(id);
      const { error } = await supabase
        .from('saved_vocabulary')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setVocabItems(vocabItems.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting vocab:', error);
      alert('Failed to delete vocabulary item');
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleStar = async (id, currentStarred) => {
    try {
      const { error } = await supabase
        .from('saved_vocabulary')
        .update({ starred: !currentStarred })
        .eq('id', id);

      if (error) throw error;

      setVocabItems(vocabItems.map(item =>
        item.id === id ? { ...item, starred: !currentStarred } : item
      ));
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  const exportVocab = () => {
    const csv = [
      ['Word/Phrase', 'Translation', 'Context', 'Date'],
      ...filteredItems.map(item => [
        item.word,
        item.translation,
        item.context || '',
        new Date(item.created_at).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${language}_vocabulary_${Date.now()}.csv`;
    a.click();
  };

  const filteredItems = vocabItems.filter(item => {
    const matchesSearch = item.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.translation.toLowerCase().includes(searchQuery.toLowerCase());

    if (filter === 'starred') return matchesSearch && item.starred;
    if (filter === 'recent') {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      return matchesSearch && new Date(item.created_at) > threeDaysAgo;
    }
    return matchesSearch;
  });

  if (!isOpen) return null;

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
        className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-white/20 dark:border-gray-700/20"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/20 dark:border-gray-700/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <BookmarkCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Saved Vocabulary
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {filteredItems.length} items in {language}
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

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vocabulary..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/60 dark:bg-gray-700/60 backdrop-blur-lg border border-white/40 dark:border-gray-600/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  filter === 'all'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md'
                    : 'bg-white/60 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700/80'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('starred')}
                className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-1.5 ${
                  filter === 'starred'
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-md'
                    : 'bg-white/60 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700/80'
                }`}
              >
                <Star className="w-4 h-4" />
                Starred
              </button>
              <button
                onClick={() => setFilter('recent')}
                className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-1.5 ${
                  filter === 'recent'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                    : 'bg-white/60 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700/80'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Recent
              </button>
              <button
                onClick={exportVocab}
                className="px-4 py-2.5 rounded-xl font-semibold text-sm bg-white/60 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all flex items-center gap-1.5"
                title="Export to CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Vocab List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                {searchQuery ? 'No matching vocabulary' : 'No saved vocabulary yet'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? 'Try a different search term' : 'Start saving words and phrases from your conversations!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/40 dark:border-gray-700/40 shadow-lg hover:shadow-xl transition-all group"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <Avatar
                        size={40}
                        name={item.word}
                        variant="beam"
                        colors={['#10b981', '#059669', '#047857', '#065f46', '#064e3b']}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-lg text-gray-900 dark:text-white truncate">
                            {item.word}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {item.translation}
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggleStar(item.id, item.starred)}
                          className="p-1 hover:bg-yellow-500/20 rounded-lg transition-colors flex-shrink-0"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              item.starred
                                ? 'fill-yellow-500 text-yellow-500'
                                : 'text-gray-400'
                            }`}
                          />
                        </button>
                      </div>

                      {item.context && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                          "{item.context}"
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(item.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deleting === item.id}
                          className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors text-red-600 dark:text-red-400 disabled:opacity-50"
                        >
                          {deleting === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
