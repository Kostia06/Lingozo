'use client';

import { motion } from 'framer-motion';
import { Key, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function SetupBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      checkApiKey();
    }
  }, [user]);

  const checkApiKey = async () => {
    try {
      const { data } = await supabase
        .from('user_settings')
        .select('gemini_api_key')
        .eq('id', user.id)
        .single();

      if (data?.gemini_api_key) {
        setHasApiKey(true);
      }
    } catch (error) {
      // Ignore errors - just show the banner
    } finally {
      setLoading(false);
    }
  };

  if (dismissed || hasApiKey || loading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 shadow-lg"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm sm:text-base">
                Add your Google AI (Gemini) API key to get started
              </p>
              <p className="text-xs sm:text-sm text-white/80 mt-0.5">
                Get your free API key at{' '}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-white"
                >
                  aistudio.google.com
                </a>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => router.push('/settings')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg font-medium transition-colors backdrop-blur-sm text-sm whitespace-nowrap"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </motion.button>
            <button
              onClick={() => setDismissed(true)}
              className="text-sm text-white/80 hover:text-white transition-colors px-2"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
