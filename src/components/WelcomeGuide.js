'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenGuide, setHasSeenGuide] = useState(false);

  useEffect(() => {
    // Check if user has seen the guide before
    const seen = localStorage.getItem('lingozo_guide_seen');
    if (!seen) {
      setIsOpen(true);
    }
    setHasSeenGuide(!!seen);
  }, []);

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

  return (
    <>
      {/* Reopen Guide Button */}
      {!isOpen && hasSeenGuide && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all group"
          title="Open Guide"
        >
          <BookOpen className="w-6 h-6 text-white" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
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
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-700/50 pointer-events-auto"
              >
                {/* Header */}
                <div className={`relative bg-gradient-to-r ${currentGuide.color} p-6`}>
                  <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>

                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-1">
                        {currentGuide.title}
                      </h2>
                      <p className="text-white/90 text-sm">
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
                <div className="p-6 overflow-y-auto max-h-[50vh]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      {currentGuide.highlight && (
                        <div className="mb-4 p-3 bg-amber-500/20 border border-amber-500/30 rounded-xl">
                          <p className="text-amber-200 text-sm font-semibold flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            {currentGuide.highlight}
                          </p>
                        </div>
                      )}

                      <ul className="space-y-3">
                        {currentGuide.content.map((item, index) => (
                          <motion.li
                            key={index}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-start gap-3 text-gray-200"
                          >
                            <div className={`mt-1 w-1.5 h-1.5 rounded-full bg-gradient-to-r ${currentGuide.color} flex-shrink-0`} />
                            <span className="text-sm leading-relaxed">{item}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-700/50 bg-gray-800/50">
                  <div className="flex items-center justify-between gap-4">
                    {/* Step Indicator */}
                    <div className="flex items-center gap-2">
                      {GUIDE_STEPS.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentStep(index)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            index === currentStep
                              ? 'bg-purple-500 w-6'
                              : 'bg-gray-600 hover:bg-gray-500'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center gap-2">
                      {currentStep === 0 ? (
                        <button
                          onClick={handleSkip}
                          className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors text-sm font-medium"
                        >
                          Skip
                        </button>
                      ) : (
                        <button
                          onClick={handlePrev}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors flex items-center gap-2 text-white"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Back
                        </button>
                      )}

                      <button
                        onClick={handleNext}
                        className={`px-6 py-2 bg-gradient-to-r ${currentGuide.color} rounded-xl font-semibold transition-all flex items-center gap-2 text-white hover:shadow-lg`}
                      >
                        {currentStep === GUIDE_STEPS.length - 1 ? (
                          <>
                            Get Started
                            <CheckCircle className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            Next
                            <ChevronRight className="w-4 h-4" />
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
