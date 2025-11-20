'use client';

import React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, AlertCircle, Volume2, VolumeX, BookmarkPlus, BookmarkCheck, Reply, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { speak, stopSpeaking, isSpeaking, isTTSSupported } from '@/lib/audio-utils';
import Avatar from 'boring-avatars';

export default function ChatMessage({ message, onWordClick, showTranslation, language, chatId, onReply, replyToMessage }) {
  const [selectedText, setSelectedText] = useState('');
  const [showSaveButton, setShowSaveButton] = useState(false);
  const [savePosition, setSavePosition] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [clickedCorrection, setClickedCorrection] = useState(null);
  const [correctionPosition, setCorrectionPosition] = useState({ x: 0, y: 0 });
  const [englishTranslation, setEnglishTranslation] = useState(null);
  const [loadingTranslation, setLoadingTranslation] = useState(false);
  const [isSpeakingThis, setIsSpeakingThis] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [quickActionsPosition, setQuickActionsPosition] = useState({ x: 0, y: 0 });
  const [loadingAction, setLoadingAction] = useState(null);
  const [quickTranslation, setQuickTranslation] = useState(null);

  // Check TTS support on mount and load reactions
  useEffect(() => {
    setTtsSupported(isTTSSupported());
    // Check if message has reactions
    if (message.reactions && message.reactions.like) {
      setIsLiked(true);
      setShowReactions(true);
    }
  }, [message.reactions]);

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

  // Close quick actions menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Don't close if clicking inside the menu
      if (e.target.closest('.quick-actions-menu')) return;
      setShowQuickActions(false);
    };

    if (showQuickActions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showQuickActions]);

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
    if (word.trim().length > 0) {
      const rect = e.target.getBoundingClientRect();

      // Show Quick Actions Menu for translate/save options
      setSelectedText(word);

      // Position actions menu
      const viewportWidth = window.innerWidth;
      let x = rect.left + rect.width / 2;
      let y = rect.top - 10;

      // Adjust if too close to edge
      if (x + 150 > viewportWidth) {
        x = viewportWidth - 160;
      }
      if (x < 10) {
        x = 10;
      }

      setQuickActionsPosition({ x, y });
      setShowQuickActions(true);
      setShowSaveButton(false);
      setSaved(false);
      setQuickTranslation(null);
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text && text.length > 0 && text.length < 200) {
      setSelectedText(text);
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Position actions menu
      const viewportWidth = window.innerWidth;
      let x = rect.left + rect.width / 2;
      let y = rect.top - 10;

      // Adjust if too close to edge
      if (x + 150 > viewportWidth) {
        x = viewportWidth - 160;
      }
      if (x < 10) {
        x = 10;
      }

      setQuickActionsPosition({ x, y });
      setShowQuickActions(true);
      setShowSaveButton(false);
      setSaved(false);
      setQuickTranslation(null);
    } else {
      setShowQuickActions(false);
      setShowSaveButton(false);
    }
  };

  const handleTranslateSelection = async () => {
    if (!selectedText) return;

    try {
      setLoadingAction('translate');

      const { data: { session } } = await supabase.auth.getSession();
      const translationResponse = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          word: selectedText,
          targetLanguage: language,
          chatId,
        }),
      });

      if (!translationResponse.ok) {
        throw new Error('Translation failed');
      }

      const { translation } = await translationResponse.json();
      setQuickTranslation(translation);
    } catch (error) {
      console.error('Error translating:', error);
      alert('Failed to translate');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSaveVocab = async () => {
    if (!selectedText || !chatId) return;

    try {
      setLoadingAction('save');

      // Get translation first if we don't have it
      let translation = quickTranslation;
      if (!translation) {
        const { data: { session } } = await supabase.auth.getSession();
        const translationResponse = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            word: selectedText,
            targetLanguage: language,
            chatId,
          }),
        });

        if (!translationResponse.ok) {
          throw new Error('Translation failed');
        }

        const data = await translationResponse.json();
        translation = data.translation;
      }

      // Save vocabulary
      const { data: { session } } = await supabase.auth.getSession();
      const saveResponse = await fetch('/api/vocab', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          chatId,
          word: selectedText,
          translation,
          context: message.content.substring(0, 200),
        }),
      });

      if (saveResponse.ok) {
        setSaved(true);
        setTimeout(() => {
          setShowQuickActions(false);
          setQuickTranslation(null);
          window.getSelection().removeAllRanges();
        }, 1500);
      } else {
        const error = await saveResponse.json();
        if (error.error.includes('already saved')) {
          alert('This word is already in your vocabulary!');
        } else {
          throw new Error(error.error);
        }
      }
    } catch (error) {
      console.error('Error saving vocab:', error);
      alert('Failed to save vocabulary');
    } finally {
      setLoadingAction(null);
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

  const handleDoubleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Toggle like reaction
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/reactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          messageId: message.id,
          reaction: 'like',
        }),
      });

      if (response.ok) {
        const { reactions } = await response.json();
        setIsLiked(reactions.like !== undefined);
        setShowReactions(Object.keys(reactions).length > 0);

        // Trigger animation
        if (reactions.like) {
          // Show heart animation
          const heartAnimation = document.createElement('div');
          heartAnimation.className = 'heart-animation';
          heartAnimation.innerHTML = '❤️';
          heartAnimation.style.cssText = `
            position: fixed;
            left: ${e.clientX}px;
            top: ${e.clientY}px;
            font-size: 32px;
            pointer-events: none;
            z-index: 9999;
            animation: heartFloat 1s ease-out forwards;
          `;
          document.body.appendChild(heartAnimation);
          setTimeout(() => heartAnimation.remove(), 1000);
        }
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  const handleReplyClick = () => {
    if (onReply) {
      onReply(message);
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
            className="hover:bg-gradient-to-r hover:from-blue-100 hover:to-purple-100 hover:shadow-sm px-1 py-0.5 rounded cursor-pointer transition-all duration-200 inline-block hover:scale-105 active:scale-95"
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
          className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden shadow-md"
        >
          <Avatar
            size={32}
            name={isUser ? "User" : "AI Assistant"}
            variant="beam"
            colors={isUser
              ? ['#a855f7', '#ec4899', '#8b5cf6', '#d946ef', '#c026d3']
              : ['#3b82f6', '#06b6d4', '#0ea5e9', '#0284c7', '#0369a1']
            }
          />
        </motion.div>

        {/* Message Bubble */}
        <div className="flex flex-col gap-1">
          {/* Reply To Preview */}
          {replyToMessage && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-xs px-3 py-1.5 rounded-lg border-l-2 ${
                isUser
                  ? 'bg-purple-500/20 border-purple-400 text-purple-100'
                  : 'bg-gray-100/80 dark:bg-gray-700/80 border-gray-400 dark:border-gray-500 text-gray-600 dark:text-gray-400'
              }`}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <Reply className="w-3 h-3" />
                <span className="font-semibold">
                  Replying to {replyToMessage.role === 'user' ? 'You' : 'AI'}
                </span>
              </div>
              <p className="truncate opacity-80">
                {replyToMessage.content.substring(0, 60)}
                {replyToMessage.content.length > 60 ? '...' : ''}
              </p>
            </motion.div>
          )}

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.2 }}
            className={`rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-md relative ${
              isUser
                ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white'
                : !message.read_at
                ? 'bg-blue-50/90 dark:bg-blue-950/50 backdrop-blur-lg border-2 border-blue-300/60 dark:border-blue-700/60 text-gray-900 dark:text-gray-100 ring-2 ring-blue-400/30'
                : 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-2 border-white/40 dark:border-gray-700/40 text-gray-900 dark:text-gray-100'
            }`}
            onMouseUp={!isUser ? handleTextSelection : handleTextClick}
            onDoubleClick={handleDoubleClick}
          >
            {/* Unread Badge */}
            {!isUser && !message.read_at && !message.isLoading && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -left-2 bg-blue-500 rounded-full px-2 py-0.5 flex items-center justify-center shadow-lg"
              >
                <span className="text-[10px] font-bold text-white">NEW</span>
              </motion.div>
            )}

            {/* Reaction Badge */}
            {showReactions && isLiked && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 flex items-center justify-center shadow-lg"
              >
                <Heart className="w-3 h-3 text-white fill-white" />
              </motion.div>
            )}

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
                <div className={`text-[11px] sm:text-xs font-medium ${isUser ? 'text-gray-700 dark:text-gray-300' : 'text-gray-600 dark:text-gray-400'}`}>
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>

                {/* Reply Button */}
                {onReply && (
                  <motion.button
                    onClick={handleReplyClick}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-1 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-purple-500"
                    title="Reply to this message"
                  >
                    <Reply className="w-3 h-3 sm:w-4 sm:h-4" />
                  </motion.button>
                )}

                {/* TTS Button - Only for assistant messages with content */}
                {!isUser && ttsSupported && message.content && message.content.trim().length > 0 && (
                  <motion.button
                    onClick={handleSpeak}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className={`p-1 rounded-lg transition-colors ${
                      isSpeakingThis
                        ? 'bg-blue-500 text-white'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-blue-500'
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

                {/* Double-tap hint (only show on first few messages) */}
                {!message.isLoading && !isLiked && (
                  <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
                    Double-tap to ❤️
                  </span>
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

      {/* Quick Actions Menu - Translate & Save */}
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="fixed z-50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-xl shadow-2xl border-2 border-purple-200 dark:border-purple-700 p-3 min-w-[280px] quick-actions-menu"
            style={{
              left: `${quickActionsPosition.x}px`,
              top: `${quickActionsPosition.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            {/* Selected text preview */}
            <div className="text-xs font-semibold text-purple-900 dark:text-purple-300 mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
              "{selectedText.substring(0, 30)}{selectedText.length > 30 ? '...' : ''}"
            </div>

            {/* Translation display (if translated) */}
            {quickTranslation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-3 p-2 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800"
              >
                <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">Translation:</div>
                <div className="text-sm text-gray-700 dark:text-gray-300">{quickTranslation}</div>
              </motion.div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <motion.button
                onClick={handleTranslateSelection}
                disabled={loadingAction === 'translate' || quickTranslation !== null}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  quickTranslation
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 cursor-default'
                    : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
                }`}
              >
                {loadingAction === 'translate' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Translating...</span>
                  </>
                ) : quickTranslation ? (
                  <>
                    <BookmarkCheck className="w-4 h-4" />
                    <span>Translated</span>
                  </>
                ) : (
                  <span>Translate</span>
                )}
              </motion.button>

              <motion.button
                onClick={handleSaveVocab}
                disabled={loadingAction === 'save' || saved}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  saved
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-default'
                    : 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
                }`}
              >
                {loadingAction === 'save' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : saved ? (
                  <>
                    <BookmarkCheck className="w-4 h-4" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-4 h-4" />
                    <span>Save</span>
                  </>
                )}
              </motion.button>
            </div>

            {/* Close hint */}
            <div className="mt-2 text-[10px] text-center text-gray-500 dark:text-gray-400">
              Click anywhere to close
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
