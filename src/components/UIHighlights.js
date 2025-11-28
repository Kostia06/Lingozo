'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  Sparkles,
  MessageSquarePlus,
  Settings,
  BarChart3,
  BookOpen,
  FileText
} from 'lucide-react';

const HIGHLIGHTS = [
  {
    id: 'new-chat',
    title: 'Create New Chat',
    description: 'Click here to start a new conversation in any language you want to learn!',
    icon: MessageSquarePlus,
    position: 'right',
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Set up your AI provider here (required to use Lingozo). Get your free API key!',
    icon: Settings,
    position: 'right',
    color: 'from-blue-500 to-cyan-500',
    priority: true // Show this first
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Track your learning progress, vocabulary growth, and conversation history.',
    icon: BarChart3,
    position: 'right',
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'grammar-notes',
    title: 'Grammar Notes',
    description: 'View grammar corrections and explanations from your conversations.',
    icon: BookOpen,
    position: 'right',
    color: 'from-amber-500 to-orange-500'
  },
  {
    id: 'saved-vocab',
    title: 'Vocabulary',
    description: 'Access your saved words and phrases. Click any word in a chat to translate and save it!',
    icon: FileText,
    position: 'right',
    color: 'from-pink-500 to-rose-500'
  }
];

export default function UIHighlights({ isVisible = true, onComplete }) {
  const [currentHighlight, setCurrentHighlight] = useState(0);
  const [showHighlights, setShowHighlights] = useState(false);
  const [hasSeenTour, setHasSeenTour] = useState(false);
  const [hasCompletedTour, setHasCompletedTour] = useState(false);

  useEffect(() => {
    // Check if user has seen the tour
    const seenTour = localStorage.getItem('lingozo_tour_seen');
    const completedTour = localStorage.getItem('lingozo_tour_completed');

    if (!seenTour && isVisible) {
      // Wait a bit before showing to let the UI load
      const timer = setTimeout(() => {
        setShowHighlights(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
    setHasSeenTour(!!seenTour);
    setHasCompletedTour(!!completedTour);
  }, [isVisible]);

  // Hide highlights when not visible
  useEffect(() => {
    if (!isVisible) {
      setShowHighlights(false);
    }
  }, [isVisible]);

  const handleNext = () => {
    if (currentHighlight < HIGHLIGHTS.length - 1) {
      setCurrentHighlight(currentHighlight + 1);
    } else {
      // User completed the entire tour
      handleComplete(true);
    }
  };

  const handleSkip = () => {
    // User skipped the tour
    handleComplete(false);
  };

  const handleComplete = (completed = false) => {
    setShowHighlights(false);
    localStorage.setItem('lingozo_tour_seen', 'true');
    setHasSeenTour(true);

    if (completed) {
      // Mark tour as completed (will hide restart button permanently)
      localStorage.setItem('lingozo_tour_completed', 'true');
      setHasCompletedTour(true);
    }

    if (onComplete) onComplete();
  };

  const handleRestart = () => {
    setCurrentHighlight(0);
    setShowHighlights(true);
  };

  const currentItem = HIGHLIGHTS[currentHighlight];
  const Icon = currentItem?.icon;

  // Get element position to calculate tooltip placement
  const getHighlightPosition = (highlightId) => {
    // These positions are approximations for the sidebar items
    const positions = {
      'new-chat': { top: '120px', left: '64px' },
      'settings': { top: 'auto', bottom: '160px', left: '64px' },
      'analytics': { top: 'auto', bottom: '120px', left: '64px' },
      'grammar-notes': { top: '200px', left: '64px' },
      'saved-vocab': { top: '240px', left: '64px' }
    };
    return positions[highlightId] || { top: '120px', left: '64px' };
  };

  const position = currentItem ? getHighlightPosition(currentItem.id) : {};

  return (
    <>
      {/* Restart Tour Button - Only show if tour was skipped (not completed) */}
      {!showHighlights && hasSeenTour && !hasCompletedTour && isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          onClick={handleRestart}
          className="fixed bottom-24 right-6 z-[45] p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-2xl hover:shadow-green-500/50 transition-all"
          title="Restart Tour"
        >
          <Sparkles className="w-5 h-5 text-white" />
        </motion.button>
      )}

      {/* Highlights Overlay */}
      <AnimatePresence>
        {showHighlights && currentItem && (
          <>
            {/* Dark Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
              onClick={handleSkip}
            />

            {/* Spotlight Effect on Target Element */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                position: 'fixed',
                ...position,
                width: '48px',
                height: '48px',
                zIndex: 61
              }}
              className="pointer-events-none"
            >
              {/* Pulsing ring */}
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 0, 0.5]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className={`absolute inset-0 rounded-xl bg-gradient-to-r ${currentItem.color} blur-xl`}
              />
              {/* Static ring */}
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${currentItem.color} opacity-30`} />
            </motion.div>

            {/* Tooltip/Info Card */}
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.9 }}
              style={{
                position: 'fixed',
                ...position,
                left: '120px', // Position to the right of the highlighted element
                transform: position.bottom ? 'translateY(50%)' : 'translateY(-50%)',
                zIndex: 62
              }}
              className="pointer-events-auto"
            >
              <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-6 max-w-sm">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${currentItem.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white mb-1">
                      {currentItem.title}
                    </h3>
                    {currentItem.priority && (
                      <span className="inline-block px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs text-amber-200 font-semibold">
                        Required
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleSkip}
                    className="flex-shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Description */}
                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                  {currentItem.description}
                </p>

                {/* Progress & Actions */}
                <div className="flex items-center justify-between gap-3">
                  {/* Step Indicators */}
                  <div className="flex items-center gap-1.5">
                    {HIGHLIGHTS.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentHighlight(index)}
                        className={`h-1.5 rounded-full transition-all ${
                          index === currentHighlight
                            ? 'bg-purple-500 w-6'
                            : 'bg-gray-600 w-1.5 hover:bg-gray-500'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center gap-2">
                    {currentHighlight === 0 ? (
                      <button
                        onClick={handleSkip}
                        className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        Skip Tour
                      </button>
                    ) : (
                      <button
                        onClick={() => setCurrentHighlight(currentHighlight - 1)}
                        className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-white"
                      >
                        Back
                      </button>
                    )}

                    <button
                      onClick={handleNext}
                      className={`px-4 py-1.5 text-sm bg-gradient-to-r ${currentItem.color} rounded-lg font-semibold transition-all flex items-center gap-1 text-white hover:shadow-lg`}
                    >
                      {currentHighlight === HIGHLIGHTS.length - 1 ? 'Finish' : 'Next'}
                      {currentHighlight < HIGHLIGHTS.length - 1 && (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Counter */}
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                  <p className="text-xs text-gray-500 text-center">
                    Step {currentHighlight + 1} of {HIGHLIGHTS.length}
                  </p>
                </div>
              </div>

              {/* Arrow pointing to element */}
              <div
                className={`absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 bg-gray-900/95 border-l border-b border-gray-700/50 rotate-45`}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
