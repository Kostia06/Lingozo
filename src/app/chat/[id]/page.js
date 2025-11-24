'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import ChatInterface from '@/components/ChatInterface';
import Sidebar from '@/components/Sidebar';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const [chat, setChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) {
      return;
    }

    // If auth is done loading and there's no user, redirect to login
    if (!user) {
      router.push('/login');
      return;
    }

    // Only load chat once we have a confirmed user
    loadChat();
  }, [user, authLoading, params.id]);

  const loadChat = async () => {
    try {
      setLoading(true);

      // Ensure we have a valid session before querying
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('No valid session:', sessionError);
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading chat:', error);

        // If it's an auth error, try to refresh session
        if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError) {
            // Retry loading chat after refresh
            await loadChat();
            return;
          }
        }

        router.push('/dashboard');
        return;
      }

      setChat(data);
    } catch (error) {
      console.error('Error loading chat:', error);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while auth is loading OR while chat is loading
  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">
            {authLoading ? 'Authenticating...' : 'Loading chat...'}
          </p>
        </motion.div>
      </div>
    );
  }

  if (!chat) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block fixed md:relative inset-0 z-40`}>
        <Sidebar currentChatId={chat.id} onChatSelect={(id) => router.push(`/chat/${id}`)} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Chat Interface */}
      <ChatInterface
        chatId={chat.id}
        language={chat.language}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
      />
    </div>
  );
}
