'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import {
  X,
  MessageSquare,
  Settings,
  BookOpen,
  Volume2,
  Mic,
  Music,
  FileText,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CheckCircle,
  Target,
  Zap
} from 'lucide-react';

const GUIDE_STEPS = [
  {
    title: "Welcome to Lingozo!",
    icon: Sparkles,
    description: "Your AI-powered language learning companion",
    content: [
      "Learn languages through natural conversations with AI",
      "Get instant grammar corrections and explanations",
      "Build your vocabulary with smart tracking",
      "Practice speaking with text-to-speech and speech-to-text"
    ],
    color: "from-purple-600 to-pink-600"
  },
  {
    title: "Setup Your AI Provider",
    icon: Settings,
    description: "First, configure your AI provider to start learning",
    content: [
      "Go to Settings (gear icon in sidebar)",
      "Choose your AI provider (Google Gemini recommended)",
      "Enter your API key - get it free at the provided link",
      "Enable features like TTS (Text-to-Speech), STT (Speech-to-Text), and more",
      "Click 'Save Settings' when done"
    ],
    color: "from-blue-600 to-cyan-600",
    highlight: "Required to use Lingozo"
  },
  {
    title: "Start a Conversation",
    icon: MessageSquare,
    description: "Create your first language learning chat",
    content: [
      "Click the '+ New Chat' button on the dashboard",
      "Enter the language you want to learn (e.g., Spanish, French, Japanese)",
      "Give your chat a title (e.g., 'Spanish Practice', 'French Basics')",
      "Start chatting with your AI tutor in your target language",
      "The AI will respond and help you learn naturally"
    ],
    color: "from-green-600 to-emerald-600"
  },
  {
    title: "Learning Features",
    icon: Target,
    description: "Make the most of Lingozo's powerful features",
    content: [
      "📝 Grammar Notes - Get instant grammar corrections and explanations",
      "📚 Vocabulary - Save words and phrases for later review",
      "🎯 Quizzes - Test your knowledge with AI-generated quizzes",
      "💬 Custom Notes - Add your own notes and observations",
      "🔊 Audio - Listen to pronunciations with text-to-speech",
      "🎤 Voice Input - Practice speaking with speech-to-text"
    ],
    color: "from-violet-600 to-purple-600"
  },
  {
    title: "Interactive Features",
    icon: Zap,
    description: "Enhance your learning experience",
    content: [
      "Click any word to get instant translations",
      "React to messages with emojis (if enabled)",
      "Reply to specific messages for context",
      "Use the quiz feature to test what you've learned",
      "Track your progress in the analytics section"
    ],
    color: "from-amber-600 to-orange-600"
  },
  {
    title: "Tips for Success",
    icon: CheckCircle,
    description: "Get the most out of your language learning",
    content: [
      "💡 Practice daily - consistency is key",
      "🎯 Start with simple conversations and gradually increase difficulty",
      "📖 Review your grammar notes and vocabulary regularly",
      "🗣️ Use voice features to practice pronunciation",
      "📊 Check analytics to see your progress",
      "🎵 Enable music for a more immersive experience"
    ],
    color: "from-pink-600 to-rose-600"
  }
];

export default function WelcomeGuide() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenGuide, setHasSeenGuide] = useState(false);

  useEffect(() => {
    // Only show guide if user is authenticated
    if (!user) {
      return;
    }

    // Check if user has seen the guide before
    const seen = localStorage.getItem('lingozo_guide_seen');
    if (!seen) {
      setIsOpen(true);
    }
    setHasSeenGuide(!!seen);
  }, [user]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('lingozo_guide_seen', 'true');
    setHasSeenGuide(true);
  };

  const handleNext = () => {
    if (currentStep < GUIDE_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleClose();
  };

  const currentGuide = GUIDE_STEPS[currentStep];
  const Icon = currentGuide.icon;
  const progress = ((currentStep + 1) / GUIDE_STEPS.length) * 100;

  // Don't render anything if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <>
      {/* Reopen Guide Button */}
      {!isOpen && hasSeenGuide && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[50] p-3 sm:p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all"
          title="Open Welcome Guide"
          aria-label="Open Welcome Guide"
        >
          <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse" />
        </motion.button>
      )}

      {/* Guide Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              onClick={handleClose}
            />

            {/* Guide Content */}
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-3 sm:p-4 pointer-events-none">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-gray-900/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-700/50 pointer-events-auto"
              >
                {/* Header */}
                <div className={`relative bg-gradient-to-r ${currentGuide.color} p-4 sm:p-6`}>
                  <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 sm:p-2 hover:bg-white/20 rounded-full transition-colors"
                    aria-label="Close guide"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </button>

                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-md rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <div className="flex-1 pr-6">
                      <h2 className="text-lg sm:text-2xl font-bold text-white mb-0.5 sm:mb-1">
                        {currentGuide.title}
                      </h2>
                      <p className="text-white/90 text-xs sm:text-sm">
                        {currentGuide.description}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 bg-white/20 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                      className="h-full bg-white rounded-full"
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 overflow-y-auto max-h-[50vh] custom-scrollbar">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      {currentGuide.highlight && (
                        <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg sm:rounded-xl">
                          <p className="text-amber-200 text-xs sm:text-sm font-semibold flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            {currentGuide.highlight}
                          </p>
                        </div>
                      )}

                      <ul className="space-y-2.5 sm:space-y-3">
                        {currentGuide.content.map((item, index) => (
                          <motion.li
                            key={index}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-start gap-2.5 sm:gap-3 text-gray-200"
                          >
                            <div className={`mt-1 w-1.5 h-1.5 rounded-full bg-gradient-to-r ${currentGuide.color} flex-shrink-0`} />
                            <span className="text-xs sm:text-sm leading-relaxed">{item}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="p-3 sm:p-6 border-t border-gray-700/50 bg-gray-800/50">
                  <div className="flex items-center justify-between gap-2 sm:gap-4">
                    {/* Step Indicator */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {GUIDE_STEPS.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentStep(index)}
                          className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all ${
                            index === currentStep
                              ? 'bg-purple-500 w-4 sm:w-6'
                              : 'bg-gray-600 hover:bg-gray-500'
                          }`}
                          aria-label={`Go to step ${index + 1}`}
                        />
                      ))}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {currentStep === 0 ? (
                        <button
                          onClick={handleSkip}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 text-gray-400 hover:text-gray-200 transition-colors text-xs sm:text-sm font-medium"
                        >
                          Skip
                        </button>
                      ) : (
                        <button
                          onClick={handlePrev}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-700 hover:bg-gray-600 rounded-lg sm:rounded-xl transition-colors flex items-center gap-1.5 text-white text-xs sm:text-sm"
                        >
                          <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Back</span>
                        </button>
                      )}

                      <button
                        onClick={handleNext}
                        className={`px-4 sm:px-6 py-1.5 sm:py-2 bg-gradient-to-r ${currentGuide.color} rounded-lg sm:rounded-xl font-semibold transition-all flex items-center gap-1.5 text-white hover:shadow-lg text-xs sm:text-sm`}
                      >
                        {currentStep === GUIDE_STEPS.length - 1 ? (
                          <>
                            <span className="hidden sm:inline">Get Started</span>
                            <span className="sm:hidden">Start</span>
                            <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </>
                        ) : (
                          <>
                            Next
                            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
