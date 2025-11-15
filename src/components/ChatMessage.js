'use client';

import React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, AlertCircle, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { speak, stopSpeaking, isSpeaking, isTTSSupported } from '@/lib/audio-utils';

export default function ChatMessage({ message, onWordClick, showTranslation, language }) {
  const [clickedCorrection, setClickedCorrection] = useState(null);
  const [correctionPosition, setCorrectionPosition] = useState({ x: 0, y: 0 });
  const [englishTranslation, setEnglishTranslation] = useState(null);
  const [loadingTranslation, setLoadingTranslation] = useState(false);
  const [isSpeakingThis, setIsSpeakingThis] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);

  // Check TTS support on mount
  useEffect(() => {
    setTtsSupported(isTTSSupported());
  }, []);

  // Close correction tooltip when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Don't close if clicking on a correction
      if (e.target.closest('.correction-word')) return;
      setClickedCorrection(null);
    };

    if (clickedCorrection !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [clickedCorrection]);

  // Fetch translation when showTranslation is enabled for assistant messages
  useEffect(() => {
    const fetchTranslation = async () => {
      if (showTranslation && message.role === 'assistant' && !message.isLoading && !englishTranslation) {
        setLoadingTranslation(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();

          const response = await fetch('/api/translate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              word: message.content,
              targetLanguage: language,
              chatId: message.chat_id,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            setEnglishTranslation(data.translation);
          }
        } catch (error) {
          console.error('Error fetching translation:', error);
        } finally {
          setLoadingTranslation(false);
        }
      }
    };

    fetchTranslation();
  }, [showTranslation, message.role, message.content, message.isLoading, language, message.chat_id]);

  // Process corrections once to add indices
  const processedCorrections = useMemo(() => {
    if (!message.corrections || message.corrections.length === 0) {
      return [];
    }

    // Calculate indices from incorrect text, add to corrections
    const correctionsWithIndices = message.corrections.map((correction) => {
      // If correction already has indices (old format), use them
      if (correction.startIndex !== undefined && correction.endIndex !== undefined) {
        return correction;
      }

      // New format: find the incorrect text in the message
      if (correction.incorrect) {
        const startIndex = message.content.toLowerCase().indexOf(correction.incorrect.toLowerCase());
        if (startIndex !== -1) {
          return {
            ...correction,
            startIndex,
            endIndex: startIndex + correction.incorrect.length
          };
        }
      }

      // If we can't find the text, return null
      return null;
    }).filter(c => c !== null);

    // Sort corrections by startIndex to ensure proper ordering
    return correctionsWithIndices.sort((a, b) => a.startIndex - b.startIndex);
  }, [message.corrections, message.content]);

  const renderMessageWithCorrections = () => {
    if (processedCorrections.length === 0) {
      return <span>{message.content}</span>;
    }

    const sortedCorrections = processedCorrections;

    let lastIndex = 0;
    const elements = [];

    sortedCorrections.forEach((correction, idx) => {
      const start = correction.startIndex;
      const end = correction.endIndex;

      // Skip if indices overlap with previous correction
      if (start < lastIndex) {
        return;
      }

      // Add text before correction
      if (start > lastIndex) {
        elements.push(
          <span key={`text-${idx}`}>
            {message.content.substring(lastIndex, start)}
          </span>
        );
      }

      // Add corrected text with underline - make it clickable
      elements.push(
        <span
          key={`correction-${idx}`}
          className="relative inline-block correction-word"
          onClick={(e) => {
            e.stopPropagation();

            // Toggle correction - if already clicked, close it
            if (clickedCorrection === idx) {
              setClickedCorrection(null);
              return;
            }

            const rect = e.target.getBoundingClientRect();
            const viewportWidth = window.innerWidth;

            // Calculate position
            let x = rect.left;
            let y = rect.top - 10;
            let showBelow = false;

            // Adjust horizontal position if too close to edge
            if (x + 340 > viewportWidth) {
              x = viewportWidth - 350;
            }
            if (x < 10) {
              x = 10;
            }

            // Adjust vertical position if too close to top
            if (y < 120) {
              y = rect.bottom + 10;
              showBelow = true;
            }

            setCorrectionPosition({ x, y, showBelow });
            setClickedCorrection(idx);
          }}
        >
          <span className={`border-b-2 border-amber-500 dark:border-amber-400 cursor-pointer transition-all rounded px-0.5 ${
            clickedCorrection === idx ? 'bg-amber-100 dark:bg-amber-900/30' : 'hover:bg-amber-50 dark:hover:bg-amber-900/20'
          }`}>
            {message.content.substring(start, end)}
          </span>
        </span>
      );

      lastIndex = end;
    });

    // Add remaining text
    if (lastIndex < message.content.length) {
      elements.push(
        <span key="text-end">{message.content.substring(lastIndex)}</span>
      );
    }

    return elements;
  };

  const handleTextClick = (e) => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText && onWordClick) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      onWordClick(selectedText, { x: rect.left, y: rect.top });
    }
  };

  const handleWordClick = (word, e) => {
    e.stopPropagation();
    if (onWordClick && word.trim().length > 0) {
      const rect = e.target.getBoundingClientRect();
      onWordClick(word, { x: rect.left, y: rect.top });
    }
  };

  const handleSpeak = async () => {
    if (isSpeakingThis) {
      stopSpeaking();
      setIsSpeakingThis(false);
    } else {
      try {
        setIsSpeakingThis(true);
        await speak(message.content, language);
        setIsSpeakingThis(false);
      } catch (error) {
        console.error('TTS error:', error);
        setIsSpeakingThis(false);

        // Only show alert for actual errors (not canceled/interrupted)
        if (error && error.message) {
          const errorMsg = error.message.toLowerCase();

          // Don't show alerts for these non-critical cases
          if (errorMsg.includes('unknown') ||
              errorMsg.includes('canceled') ||
              errorMsg.includes('interrupted')) {
            console.log('Non-critical TTS error, ignoring');
            return;
          }

          // Show user-friendly error message for real errors
          let errorMessage = 'Could not play audio. ';
          if (errorMsg.includes('not supported')) {
            errorMessage += 'Your browser does not support text-to-speech. Try Chrome or Edge.';
          } else if (errorMsg.includes('no text')) {
            errorMessage += 'No text to speak.';
          } else if (errorMsg.includes('failed to start')) {
            errorMessage += 'Please try again in a moment.';
          } else {
            errorMessage += error.message;
          }

          alert(errorMessage);
        }
      }
    }
  };

  const renderTranslatableText = (text) => {
    // Create a custom component for text nodes that makes words clickable
    const ClickableText = ({ children }) => {
      // Handle arrays of children (from ReactMarkdown)
      if (Array.isArray(children)) {
        return children.map((child, i) => (
          <ClickableText key={i}>{child}</ClickableText>
        ));
      }

      // Handle non-string children (like React elements)
      if (typeof children !== 'string') {
        return children;
      }

      const words = children.split(/(\s+)/);
      return words.map((word, idx) => {
        // If it's just whitespace, render as-is
        if (/^\s+$/.test(word)) {
          return <span key={idx}>{word}</span>;
        }

        // If it's a word, make it clickable with hover highlight
        return (
          <span
            key={idx}
            className="hover:bg-gradient-to-r hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/30 dark:hover:to-purple-900/30 hover:shadow-sm px-1 py-0.5 rounded cursor-pointer transition-all duration-200 inline-block hover:scale-105 active:scale-95"
            onClick={(e) => handleWordClick(word.replace(/[.,!?;:]/g, ''), e)}
          >
            {word}
          </span>
        );
      });
    };

    return (
      <div className="markdown-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({node, children, ...props}) => (
              <p className="mb-2 last:mb-0" {...props}>
                <ClickableText>{children}</ClickableText>
              </p>
            ),
            strong: ({node, children, ...props}) => (
              <strong className="font-bold" {...props}>
                <ClickableText>{children}</ClickableText>
              </strong>
            ),
            em: ({node, children, ...props}) => (
              <em className="italic" {...props}>
                <ClickableText>{children}</ClickableText>
              </em>
            ),
            li: ({node, children, ...props}) => (
              <li className="ml-4" {...props}>
                <ClickableText>{children}</ClickableText>
              </li>
            ),
            ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2" {...props} />,
            h1: ({node, children, ...props}) => (
              <h1 className="text-lg font-bold mb-2" {...props}>
                <ClickableText>{children}</ClickableText>
              </h1>
            ),
            h2: ({node, children, ...props}) => (
              <h2 className="text-base font-bold mb-2" {...props}>
                <ClickableText>{children}</ClickableText>
              </h2>
            ),
            h3: ({node, children, ...props}) => (
              <h3 className="text-sm font-bold mb-1" {...props}>
                <ClickableText>{children}</ClickableText>
              </h3>
            ),
            code: ({node, inline, children, ...props}) => (
              inline ? (
                <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm" {...props}>
                  {children}
                </code>
              ) : (
                <code className="block bg-gray-200 dark:bg-gray-700 p-2 rounded text-sm my-2" {...props}>
                  {children}
                </code>
              )
            ),
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    );
  };

  const isUser = message.role === 'user';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
      <div className={`flex gap-2 sm:gap-3 max-w-[85%] sm:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-md ${
            isUser
              ? 'bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600'
              : 'bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500'
          }`}
        >
          {isUser ? (
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          ) : (
            <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          )}
        </motion.div>

        {/* Message Bubble */}
        <div className="flex flex-col gap-1">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.2 }}
            className={`rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-md ${
              isUser
                ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white'
                : 'bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 text-gray-900 dark:text-gray-100'
            }`}
            onMouseUp={handleTextClick}
          >
            <div className="text-sm sm:text-base leading-relaxed select-text">
              {message.isLoading ? (
                <div className="flex items-center gap-1.5 py-1">
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="text-gray-400 dark:text-gray-500"
                  >
                    ●
                  </motion.span>
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.2, ease: "easeInOut" }}
                    className="text-gray-400 dark:text-gray-500"
                  >
                    ●
                  </motion.span>
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.4, ease: "easeInOut" }}
                    className="text-gray-400 dark:text-gray-500"
                  >
                    ●
                  </motion.span>
                </div>
              ) : isUser ? renderMessageWithCorrections() : renderTranslatableText(message.content)}
            </div>
          </motion.div>

          {!message.isLoading && (
            <>
              {showTranslation && !isUser && (
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`mt-2 px-3 py-2 rounded-xl text-xs sm:text-sm ${
                      isUser
                        ? 'bg-purple-500/20 text-white'
                        : 'bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {loadingTranslation ? (
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-3 h-3 border-2 border-blue-600/30 border-t-blue-600 rounded-full"
                        />
                        <span>Translating...</span>
                      </div>
                    ) : englishTranslation ? (
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-blue-600 dark:text-blue-400 flex-shrink-0">EN:</span>
                        <span className="leading-relaxed">{englishTranslation}</span>
                      </div>
                    ) : null}
                  </motion.div>
                </AnimatePresence>
              )}
              <div className={`flex items-center gap-2 px-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`text-[10px] sm:text-xs ${isUser ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                {/* TTS Button - Only for assistant messages with content */}
                {!isUser && ttsSupported && message.content && message.content.trim().length > 0 && (
                  <motion.button
                    onClick={handleSpeak}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className={`p-1 rounded-lg transition-colors ${
                      isSpeakingThis
                        ? 'bg-blue-500 text-white'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-blue-500'
                    }`}
                    title={isSpeakingThis ? 'Stop speaking' : 'Listen to message'}
                  >
                    {isSpeakingThis ? (
                      <VolumeX className="w-3 h-3 sm:w-4 sm:h-4" />
                    ) : (
                      <Volume2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    )}
                  </motion.button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      </motion.div>

      {/* Correction Tooltip - Fixed Position - Click to Show/Hide */}
      <AnimatePresence>
        {clickedCorrection !== null && processedCorrections.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            className="fixed bg-gradient-to-br from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600 text-white rounded-xl px-4 py-3 z-50 shadow-2xl max-w-[340px] border-2 border-amber-300 dark:border-amber-700"
            style={{
              left: correctionPosition.x,
              top: correctionPosition.y,
            }}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 bg-white/20 rounded-full p-1.5 mt-0.5">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold mb-1.5 flex items-center gap-1.5">
                  💡 Better way to say it:
                </p>
                <p className="text-sm leading-relaxed break-words bg-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
                  {processedCorrections[clickedCorrection]?.correction || 'Suggestion not available'}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setClickedCorrection(null);
                }}
                className="flex-shrink-0 hover:bg-white/20 rounded-full p-1.5 transition-colors"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Arrow */}
            {!correctionPosition.showBelow ? (
              <div className="absolute top-full left-6 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-transparent border-t-amber-500 dark:border-t-amber-600"></div>
            ) : (
              <div className="absolute bottom-full left-6 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-transparent border-b-amber-500 dark:border-b-amber-600"></div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
