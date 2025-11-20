"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Menu,
  BarChart3,
  MessageCircle,
  Globe,
  LogOut,
  Plus,
  ChevronRight,
  Trash2,
  Loader2,
} from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Navbar({ onChatSelect, currentChatId }) {
  const [isOpen, setIsOpen] = useState(true);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatLanguage, setNewChatLanguage] = useState("");
  const [newChatTitle, setNewChatTitle] = useState("");
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (user) {
      loadChats();
    }
  }, [user]);

  const loadChats = async () => {
    try {
      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error loading chats:", error);
        setChats([]);
      } else {
        setChats(data || []);
      }
    } catch (error) {
      console.error("Error loading chats:", error);
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this chat?")) return;

    try {
      const { error } = await supabase.from("chats").delete().eq("id", chatId);

      if (error) throw error;
      setChats(chats.filter((chat) => chat.id !== chatId));

      // If the deleted chat is currently selected, clear the selection
      const currentChatParam = searchParams.get('chat');
      if (currentChatParam === chatId) {
        router.push(pathname);
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };

  const handleChatSelect = (chatId) => {
    if (onChatSelect) {
      onChatSelect(chatId);
    } else {
      // Always navigate to dashboard with query parameter
      router.push(`/dashboard?chat=${chatId}`, { scroll: false });
    }
  };

  const handleNewChat = async () => {
    if (!newChatTitle.trim() || !newChatLanguage.trim()) {
      alert("Please fill in all fields");
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
        .from("chats")
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
      setNewChatTitle("");
      setNewChatLanguage("");
      // Navigate to dashboard with query parameter
      router.push(`/dashboard?chat=${data.id}`, { scroll: false });
    } catch (error) {
      console.error("Error creating chat:", error);
      alert("Failed to create chat");
    }
  };

  const navItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: BarChart3, label: "Analytics", path: "/analytics" },
  ];

  const getLanguageFlag = (language) => {
    const flags = {
      Spanish: "🇪🇸",
      French: "🇫🇷",
      German: "🇩🇪",
      Italian: "🇮🇹",
      Portuguese: "🇵🇹",
      Japanese: "🇯🇵",
      Korean: "🇰🇷",
      Chinese: "🇨🇳",
      Russian: "🇷🇺",
      Arabic: "🇸🇦",
    };
    return flags[language] || "🌐";
  };

  return (
    <>
      <aside
        className={`${
          isOpen ? "w-64" : "w-16"
        } flex flex-col border-r border-white/20 bg-white/10 backdrop-blur-md text-white h-screen transition-all duration-300 ease-in-out relative shadow-xl`}
      >
        {/* Header */}
        <div className={`flex h-16 items-center ${isOpen ? 'justify-between' : 'justify-center'} border-b border-white/20 px-4`}>
          {isOpen ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => router.push("/dashboard")}
            >
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">
                  Lingozo
                </h1>
              </div>
            </motion.div>
          ) : null}
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="flex-shrink-0">
            <Menu className="h-6 w-6" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-1">
            {/* Main Navigation */}
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                onClick={() => router.push(item.path)}
                title={!isOpen ? item.label : undefined}
                className={`w-full ${isOpen ? 'justify-start' : 'justify-center px-0'} ${
                  pathname === item.path
                    ? "bg-white text-purple-600 hover:bg-white/90 shadow-lg"
                    : "text-white hover:text-white hover:bg-white/20"
                }`}
              >
                <item.icon className={`${isOpen ? 'h-5 w-5 mr-2' : 'h-6 w-6'}`} />
                {isOpen && item.label}
              </Button>
            ))}

            {/* Conversations Section */}
            {isOpen && (
              <>
                <div className="pt-4 pb-2 px-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                      Conversations
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setShowNewChatModal(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Collapsible defaultOpen={true}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Recent Chats
                      <ChevronRight className="ml-auto h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="ml-4 space-y-1 mt-1">
                    {loading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      </div>
                    ) : chats.length === 0 ? (
                      <p className="text-xs text-white/60 px-2 py-2">
                        No chats yet
                      </p>
                    ) : (
                      chats.slice(0, 5).map((chat) => {
                        const selectedChatId = currentChatId || searchParams.get('chat');
                        const isSelected = selectedChatId === chat.id;

                        return (
                        <div
                          key={chat.id}
                          onClick={() => handleChatSelect(chat.id)}
                          className={`group relative p-2 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? "bg-white/20 border border-white/40 shadow-md"
                              : "hover:bg-white/10"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {getLanguageFlag(chat.language)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate text-white">
                                {chat.title}
                              </p>
                              <p className="text-xs text-white/70">
                                {chat.language}
                              </p>
                            </div>
                            <button
                              onClick={(e) => handleDeleteChat(chat.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                            >
                              <Trash2 className="w-3 h-3 text-white/60 hover:text-red-400" />
                            </button>
                          </div>
                        </div>
                        );
                      })
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}
          </nav>
        </ScrollArea>

        {/* User Section with Glass Effect */}
        <div className="p-4 border-t border-white/20 bg-white/10 backdrop-blur-md">
          {isOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-semibold flex-shrink-0 text-base text-white">
                {user?.email?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-white">
                  {user?.email?.split("@")[0]}
                </p>
                <p className="text-xs text-white/70 truncate">{user?.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="hover:text-red-400"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              onClick={signOut}
              title="Sign out"
              className="w-full p-0 h-auto hover:text-red-400 flex justify-center"
            >
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-semibold text-base text-white">
                {user?.email?.[0]?.toUpperCase()}
              </div>
            </Button>
          )}
        </div>
      </aside>

      {/* New Chat Modal with Glass Effect */}
      {showNewChatModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowNewChatModal(false);
            setNewChatTitle("");
            setNewChatLanguage("");
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-2xl p-8 w-full max-w-md shadow-2xl border border-white/20 dark:border-gray-700/20"
          >
            <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent mb-6">
              Start New Conversation
            </h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Conversation Title
                </label>
                <input
                  type="text"
                  value={newChatTitle}
                  onChange={(e) => setNewChatTitle(e.target.value)}
                  placeholder="e.g., Spanish Practice"
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-purple-500 transition-colors text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Language
                </label>
                <input
                  type="text"
                  value={newChatLanguage}
                  onChange={(e) => setNewChatLanguage(e.target.value)}
                  placeholder="e.g., Spanish, French, Japanese..."
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-purple-500 transition-colors text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                />
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
                    setNewChatTitle("");
                    setNewChatLanguage("");
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 rounded-xl font-semibold bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-all"
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
