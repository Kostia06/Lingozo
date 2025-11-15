'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronDown, Trash2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function GrammarNotes({ chatId }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedNote, setExpandedNote] = useState(null);

  useEffect(() => {
    if (chatId) {
      loadNotes();
      subscribeToNotes();
    }
  }, [chatId]);

  const loadNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('grammar_notes')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error loading grammar notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotes = () => {
    const subscription = supabase
      .channel(`grammar_notes:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grammar_notes',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotes((prev) => [payload.new, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Delete this grammar note?')) return;

    try {
      const { error } = await supabase
        .from('grammar_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      setNotes(notes.filter(note => note.id !== noteId));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Grammar Notes</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-6 h-6 border-2 border-purple-600/30 dark:border-purple-400/30 border-t-purple-600 dark:border-t-purple-400 rounded-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Grammar Notes</h3>
        {notes.length > 0 && (
          <span className="ml-auto bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 text-xs font-medium px-2.5 py-1 rounded-full">
            {notes.length}
          </span>
        )}
      </div>

      {notes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center flex-1 text-center px-4 py-8"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-950/50 dark:to-pink-950/50 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">No notes yet</p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Grammar tips will appear here as you chat!
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence>
            {notes.map((note, index) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <motion.div
                  className="p-4 cursor-pointer"
                  onClick={() =>
                    setExpandedNote(expandedNote === note.id ? null : note.id)
                  }
                  whileHover={{ backgroundColor: 'var(--hover-bg)' }}
                  style={{ '--hover-bg': 'rgb(249, 250, 251)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 leading-snug">
                        {note.title}
                      </h4>
                      {note.category && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-950/50 dark:to-pink-950/50 text-purple-700 dark:text-purple-400 rounded-full">
                          <Sparkles className="w-3 h-3" />
                          {note.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                      <motion.div
                        animate={{ rotate: expandedNote === note.id ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      </motion.div>
                    </div>
                  </div>
                </motion.div>

                <AnimatePresence>
                  {expandedNote === note.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-li:text-gray-700 dark:prose-li:text-gray-300">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h2: ({node, ...props}) => <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mt-3 mb-2" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-2 mb-1" {...props} />,
                              p: ({node, ...props}) => <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-2" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1 my-2" {...props} />,
                              li: ({node, ...props}) => <li className="text-sm text-gray-700 dark:text-gray-300" {...props} />,
                              strong: ({node, ...props}) => <strong className="font-bold text-gray-900 dark:text-gray-100" {...props} />,
                              em: ({node, ...props}) => <em className="italic text-gray-800 dark:text-gray-200" {...props} />,
                            }}
                          >
                            {note.content}
                          </ReactMarkdown>
                        </div>
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(note.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
