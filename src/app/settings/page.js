'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Key, Save, ArrowLeft, Eye, EyeOff, CheckCircle, AlertCircle, Sparkles, Volume2, Mic, Music } from 'lucide-react';

const AI_PROVIDERS = [
  { id: 'gemini', name: 'Google Gemini', getKeyUrl: 'https://aistudio.google.com/apikey', recommended: true },
  { id: 'openai', name: 'OpenAI', getKeyUrl: 'https://platform.openai.com/api-keys', recommended: false },
  { id: 'claude', name: 'Anthropic Claude', getKeyUrl: 'https://console.anthropic.com/settings/keys', recommended: false },
];

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // AI Provider settings
  const [aiProvider, setAiProvider] = useState('gemini');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [showApiKeys, setShowApiKeys] = useState({});

  // Feature toggles
  const [enableMemes, setEnableMemes] = useState(false);
  const [enableTts, setEnableTts] = useState(false);
  const [enableStt, setEnableStt] = useState(true);
  const [enableMusic, setEnableMusic] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [needsSchema, setNeedsSchema] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('ai_provider, gemini_api_key, openai_api_key, claude_api_key, enable_memes, enable_tts, enable_stt, enable_music')
        .eq('id', user.id)
        .single();

      // Check if table doesn't exist
      if (error && (error.message?.includes('relation') || error.message?.includes('does not exist') || error.code === '42P01')) {
        setNeedsSchema(true);
      } else if (error && error.code !== 'PGRST116') {
        // Ignore "no rows returned" error (PGRST116) - user just hasn't set up yet
        console.warn('Settings load warning:', error);
      }

      if (data) {
        setAiProvider(data.ai_provider || 'gemini');
        setGeminiApiKey(data.gemini_api_key || '');
        setOpenaiApiKey(data.openai_api_key || '');
        setClaudeApiKey(data.claude_api_key || '');
        setEnableMemes(data.enable_memes || false);
        setEnableTts(data.enable_tts || false);
        setEnableStt(data.enable_stt !== false); // Default to true
        setEnableMusic(data.enable_music || false);
      }
    } catch (error) {
      console.warn('Settings load error:', error);
      // Don't throw - just continue with empty settings
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSave = async () => {
    // Validate that the selected provider has an API key
    const currentApiKey = aiProvider === 'gemini' ? geminiApiKey :
                          aiProvider === 'openai' ? openaiApiKey : claudeApiKey;

    if (!currentApiKey.trim()) {
      setMessage({ type: 'error', text: `Please enter your ${AI_PROVIDERS.find(p => p.id === aiProvider)?.name} API key` });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert(
          {
            id: user.id,
            ai_provider: aiProvider,
            gemini_api_key: geminiApiKey.trim() || null,
            openai_api_key: openaiApiKey.trim() || null,
            claude_api_key: claudeApiKey.trim() || null,
            enable_memes: enableMemes,
            enable_tts: enableTts,
            enable_stt: enableStt,
            enable_music: enableMusic,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'id',
          }
        );

      if (error) {
        // Check if it's a missing table error
        if (error.message?.includes('relation') || error.message?.includes('does not exist') || error.code === '42P01') {
          setNeedsSchema(true);
          setMessage({
            type: 'error',
            text: 'Database table missing. Please run the migration SQL first (see warning above).'
          });
        } else {
          throw error;
        }
        return;
      }

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setNeedsSchema(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.warn('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const toggleShowKey = (provider) => {
    setShowApiKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  if (loading || loadingSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <motion.button
            onClick={() => router.push('/dashboard')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </motion.button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Configure your AI providers and preferences</p>
        </div>

        {needsSchema && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 p-4 rounded-xl mb-6 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Database Setup Required</p>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Please run <code className="bg-amber-100 dark:bg-amber-800 px-1.5 py-0.5 rounded">supabase-multi-ai-migration.sql</code> in your Supabase SQL Editor.
              </p>
            </div>
          </motion.div>
        )}

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-2 p-4 rounded-xl mb-6 ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
            }`}
          >
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-medium">{message.text}</span>
          </motion.div>
        )}

        <div className="space-y-6">
          {/* AI Provider Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <Key className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">AI Provider</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Choose your preferred AI service</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {AI_PROVIDERS.map((provider) => (
                <motion.button
                  key={provider.id}
                  onClick={() => setAiProvider(provider.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    aiProvider === provider.id
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                  }`}
                >
                  {provider.recommended && (
                    <span className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs px-2 py-1 rounded-full">
                      Cheapest
                    </span>
                  )}
                  <div className="text-left">
                    <h3 className={`font-semibold ${aiProvider === provider.id ? 'text-purple-700 dark:text-purple-300' : 'text-gray-900 dark:text-gray-100'}`}>
                      {provider.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {provider.id === 'gemini' ? 'Fast & Free' : provider.id === 'openai' ? 'GPT-4o Mini' : 'Claude Haiku'}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* API Key Inputs */}
            <div className="space-y-4">
              {AI_PROVIDERS.map((provider) => (
                <div key={provider.id} className={aiProvider === provider.id ? '' : 'opacity-50'}>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {provider.name} API Key {aiProvider === provider.id && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKeys[provider.id] ? 'text' : 'password'}
                      value={
                        provider.id === 'gemini' ? geminiApiKey :
                        provider.id === 'openai' ? openaiApiKey : claudeApiKey
                      }
                      onChange={(e) => {
                        if (provider.id === 'gemini') setGeminiApiKey(e.target.value);
                        else if (provider.id === 'openai') setOpenaiApiKey(e.target.value);
                        else setClaudeApiKey(e.target.value);
                      }}
                      placeholder={`Enter your ${provider.name} API key`}
                      disabled={aiProvider !== provider.id}
                      className="w-full px-4 py-3 pr-12 border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 transition-colors disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowKey(provider.id)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showApiKeys[provider.id] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Get your key at{' '}
                    <a
                      href={provider.getKeyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-purple-600 dark:hover:text-purple-400"
                    >
                      {provider.getKeyUrl.replace('https://', '')}
                    </a>
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Feature Toggles */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Features</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Customize your learning experience</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Memes Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Cultural Memes & Fun</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Get memes and cultural references</p>
                  </div>
                </div>
                <button
                  onClick={() => setEnableMemes(!enableMemes)}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    enableMemes ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                      enableMemes ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* TTS Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Text-to-Speech</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Hear AI responses spoken aloud</p>
                  </div>
                </div>
                <button
                  onClick={() => setEnableTts(!enableTts)}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    enableTts ? 'bg-gradient-to-r from-blue-600 to-cyan-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                      enableTts ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* STT Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center gap-3">
                  <Mic className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Speech-to-Text</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Speak your messages instead of typing</p>
                  </div>
                </div>
                <button
                  onClick={() => setEnableStt(!enableStt)}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    enableStt ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                      enableStt ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Music Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center gap-3">
                  <Music className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Music Recommendations</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Get song suggestions to sing along and learn</p>
                  </div>
                </div>
                <button
                  onClick={() => setEnableMusic(!enableMusic)}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    enableMusic ? 'bg-gradient-to-r from-pink-600 to-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                      enableMusic ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Save Button */}
          <motion.button
            onClick={handleSave}
            disabled={saving}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-6 h-6" />
            {saving ? 'Saving...' : 'Save All Settings'}
          </motion.button>

          {/* Security Notice */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="p-4 bg-gray-100 dark:bg-gray-700/30 rounded-xl"
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Security:</span> Your API keys are encrypted and stored securely. They're only used for making AI requests on your behalf.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
