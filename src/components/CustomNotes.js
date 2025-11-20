'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Save, X, Loader2, Search } from 'lucide-react';

export default function CustomNotes({ chatId, language }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [showNewNoteForm, setShowNewNoteForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (chatId) {
      loadNotes();
    }
  }, [chatId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('custom_notes')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase
        .from('custom_notes')
        .insert([
          {
            chat_id: chatId,
            user_id: session.user.id,
            content: newNoteContent.trim(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setNotes([data, ...notes]);
      setNewNoteContent('');
      setShowNewNoteForm(false);
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Failed to add note');
    }
  };

  const handleUpdateNote = async (noteId, content) => {
    if (!content.trim()) return;

    try {
      const { error } = await supabase
        .from('custom_notes')
        .update({ content: content.trim() })
        .eq('id', noteId);

      if (error) throw error;

      setNotes(notes.map(note =>
        note.id === noteId ? { ...note, content: content.trim() } : note
      ));
      setEditingNote(null);
    } catch (error) {
      console.error('Error updating note:', error);
      alert('Failed to update note');
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const { error } = await supabase
        .from('custom_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      setNotes(notes.filter(note => note.id !== noteId));
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note');
    }
  };

  // Filter notes based on search query
  const filteredNotes = notes.filter(note =>
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">My Notes</h3>
        <motion.button
          onClick={() => setShowNewNoteForm(!showNewNoteForm)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
        >
          {showNewNoteForm ? (
            <X className="w-5 h-5 text-white" />
          ) : (
            <Plus className="w-5 h-5 text-white" />
          )}
        </motion.button>
      </div>

      {/* Search Bar */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notes..."
          className="w-full pl-10 pr-3 py-2 bg-white/20 text-white placeholder:text-white/60 rounded-lg border border-white/30 focus:outline-none focus:border-white/60 text-sm"
        />
        {searchQuery && (
          <motion.button
            onClick={() => setSearchQuery('')}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded"
          >
            <X className="w-4 h-4 text-white/60" />
          </motion.button>
        )}
      </div>

      {/* New Note Form */}
      <AnimatePresence>
        {showNewNoteForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Write your note..."
              className="w-full px-3 py-2 bg-white/20 text-white placeholder:text-white/60 rounded-lg border border-white/30 focus:outline-none focus:border-white/60 resize-none"
              rows={4}
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <motion.button
                onClick={handleAddNote}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={!newNoteContent.trim()}
                className="flex-1 px-3 py-2 bg-white text-purple-600 rounded-lg font-semibold hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </motion.button>
              <motion.button
                onClick={() => {
                  setShowNewNoteForm(false);
                  setNewNoteContent('');
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-3 py-2 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-all"
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/60 text-sm">No notes yet</p>
            <p className="text-white/40 text-xs mt-1">Click + to add your first note</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-white/40 mx-auto mb-3" />
            <p className="text-white/60 text-sm">No notes found</p>
            <p className="text-white/40 text-xs mt-1">Try a different search term</p>
          </div>
        ) : (
          filteredNotes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20"
            >
              {editingNote === note.id ? (
                <div>
                  <textarea
                    defaultValue={note.content}
                    className="w-full px-3 py-2 bg-white/20 text-white placeholder:text-white/60 rounded-lg border border-white/30 focus:outline-none focus:border-white/60 resize-none mb-2"
                    rows={4}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setEditingNote(null);
                      }
                    }}
                    id={`edit-${note.id}`}
                  />
                  <div className="flex gap-2">
                    <motion.button
                      onClick={() => {
                        const content = document.getElementById(`edit-${note.id}`).value;
                        handleUpdateNote(note.id, content);
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 px-2 py-1 bg-white text-purple-600 rounded text-sm font-semibold hover:bg-white/90 transition-all flex items-center justify-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      Save
                    </motion.button>
                    <motion.button
                      onClick={() => setEditingNote(null)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-2 py-1 bg-white/10 text-white rounded text-sm font-semibold hover:bg-white/20 transition-all"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-white text-sm whitespace-pre-wrap mb-2">
                    {note.content}
                  </p>
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>
                      {new Date(note.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <div className="flex gap-2">
                      <motion.button
                        onClick={() => setEditingNote(note.id)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-1 hover:bg-white/20 rounded transition-colors"
                      >
                        <Edit2 className="w-3 h-3 text-white/80" />
                      </motion.button>
                      <motion.button
                        onClick={() => handleDeleteNote(note.id)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-1 hover:bg-red-500/20 rounded transition-colors"
                      >
                        <Trash2 className="w-3 h-3 text-red-400/80" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
