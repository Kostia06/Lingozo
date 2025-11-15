/**
 * Audio utilities for Text-to-Speech and Speech-to-Text
 * Uses browser built-in Web Speech API (free and fast)
 */

// Check if browser supports Speech Synthesis (TTS)
export const isTTSSupported = () => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
};

// Check if browser supports Speech Recognition (STT)
export const isSTTSupported = () => {
  if (typeof window === 'undefined') return false;
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

/**
 * Text-to-Speech: Speak text aloud
 * @param {string} text - Text to speak
 * @param {string} language - Language code (e.g., 'es-ES', 'fr-FR', 'en-US')
 * @param {number} rate - Speech rate (0.1 to 10, default 1)
 * @param {number} pitch - Speech pitch (0 to 2, default 1)
 * @returns {Promise} Resolves when speech finishes
 */
export function speak(text, language = 'en-US', rate = 0.9, pitch = 1) {
  return new Promise((resolve, reject) => {
    if (!isTTSSupported()) {
      reject(new Error('Text-to-speech not supported in this browser'));
      return;
    }

    if (!text || text.trim().length === 0) {
      reject(new Error('No text to speak'));
      return;
    }

    // Cancel any ongoing speech
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn('Failed to cancel speech:', e);
    }

    // Wait a bit for cancel to complete
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = getVoiceLanguageCode(language);
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = 1;

      let hasStarted = false;
      let hasEnded = false;
      let errorFired = false;

      // Load voices and set appropriate voice
      const setVoiceAndSpeak = () => {
        const voices = window.speechSynthesis.getVoices();

        if (voices.length === 0) {
          console.warn('No voices available, speaking without voice selection');
        } else {
          const targetLang = utterance.lang.split('-')[0];
          const matchingVoice = voices.find(voice =>
            voice.lang.toLowerCase().startsWith(targetLang.toLowerCase())
          );

          if (matchingVoice) {
            utterance.voice = matchingVoice;
            console.log('Using voice:', matchingVoice.name, matchingVoice.lang);
          } else {
            console.warn('No matching voice found for', language, '- using default');
          }
        }

        utterance.onstart = () => {
          hasStarted = true;
          console.log('Speech started');
        };

        utterance.onend = () => {
          if (hasEnded) return; // Prevent double-firing
          hasEnded = true;
          console.log('Speech finished');
          resolve();
        };

        utterance.onerror = (event) => {
          if (errorFired) return; // Prevent double-firing
          errorFired = true;

          // Handle empty or malformed error events
          const errorType = event?.error || 'unknown';
          const errorMessage = event?.message || '';

          console.log('Speech error:', {
            type: errorType,
            message: errorMessage,
            hasStarted: hasStarted,
            event: event
          });

          // If speech started successfully, ignore subsequent errors
          if (hasStarted) {
            console.log('Speech started successfully, ignoring error');
            if (!hasEnded) {
              hasEnded = true;
              resolve();
            }
            return;
          }

          // Don't treat "interrupted", "canceled", or empty errors as failures
          if (errorType === 'interrupted' ||
              errorType === 'canceled' ||
              errorType === 'unknown' ||
              errorType === '') {
            console.log('Non-critical speech error, resolving');
            if (!hasEnded) {
              hasEnded = true;
              resolve();
            }
          } else {
            reject(new Error(errorType + (errorMessage ? ': ' + errorMessage : '')));
          }
        };

        try {
          window.speechSynthesis.speak(utterance);
          console.log('Started speaking:', text.substring(0, 50) + '...');

          // Safety timeout - if speech doesn't start in 5 seconds, something went wrong
          const timeout = setTimeout(() => {
            if (window.speechSynthesis.speaking) {
              console.log('Speech is still in progress');
            } else {
              console.warn('Speech may have failed silently');
              resolve(); // Don't fail, just resolve
            }
          }, 5000);

          // Clear timeout when speech ends
          const originalOnEnd = utterance.onend;
          utterance.onend = () => {
            clearTimeout(timeout);
            if (originalOnEnd) originalOnEnd();
          };
        } catch (e) {
          console.error('Exception starting speech:', e);
          reject(new Error('Failed to start speech: ' + e.message));
        }
      };

      // Check if voices are loaded
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setVoiceAndSpeak();
      } else {
        // Wait for voices to load
        console.log('Waiting for voices to load...');
        window.speechSynthesis.onvoiceschanged = () => {
          console.log('Voices loaded');
          setVoiceAndSpeak();
        };

        // Fallback timeout
        setTimeout(() => {
          if (window.speechSynthesis.getVoices().length === 0) {
            console.warn('Voices still not loaded, proceeding anyway');
          }
          setVoiceAndSpeak();
        }, 100);
      }
    }, 100);
  });
}

/**
 * Stop any ongoing speech
 */
export function stopSpeaking() {
  if (isTTSSupported()) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Check if currently speaking
 */
export function isSpeaking() {
  if (!isTTSSupported()) return false;
  return window.speechSynthesis.speaking;
}

/**
 * Speech-to-Text: Listen to microphone and convert to text
 * @param {string} language - Language code (e.g., 'es-ES', 'fr-FR', 'en-US')
 * @param {function} onResult - Callback for interim results
 * @param {function} onFinalResult - Callback for final result
 * @param {function} onError - Callback for errors
 * @returns {Object} Recognition instance with start() and stop() methods
 */
export function startListening(language = 'en-US', onResult, onFinalResult, onError) {
  if (!isSTTSupported()) {
    onError?.(new Error('Speech recognition not supported in this browser'));
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.lang = getVoiceLanguageCode(language);
  recognition.continuous = false; // Stop after one phrase
  recognition.interimResults = true; // Get results while speaking
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const last = event.results.length - 1;
    const result = event.results[last];
    const transcript = result[0].transcript;

    if (result.isFinal) {
      onFinalResult?.(transcript);
    } else {
      onResult?.(transcript);
    }
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    onError?.(event.error);
  };

  recognition.onend = () => {
    // Automatically called when speech ends
  };

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
    abort: () => recognition.abort(),
  };
}

/**
 * Convert language name to proper language code for Speech API
 * Maps common language names to BCP 47 language tags
 */
function getVoiceLanguageCode(language) {
  const languageMap = {
    // Common language mappings
    'spanish': 'es-ES',
    'español': 'es-ES',
    'french': 'fr-FR',
    'français': 'fr-FR',
    'german': 'de-DE',
    'deutsch': 'de-DE',
    'italian': 'it-IT',
    'italiano': 'it-IT',
    'portuguese': 'pt-PT',
    'português': 'pt-PT',
    'russian': 'ru-RU',
    'русский': 'ru-RU',
    'japanese': 'ja-JP',
    '日本語': 'ja-JP',
    'chinese': 'zh-CN',
    '中文': 'zh-CN',
    'korean': 'ko-KR',
    '한국어': 'ko-KR',
    'arabic': 'ar-SA',
    'العربية': 'ar-SA',
    'hindi': 'hi-IN',
    'हिन्दी': 'hi-IN',
    'dutch': 'nl-NL',
    'nederlands': 'nl-NL',
    'polish': 'pl-PL',
    'polski': 'pl-PL',
    'turkish': 'tr-TR',
    'türkçe': 'tr-TR',
    'swedish': 'sv-SE',
    'svenska': 'sv-SE',
    'norwegian': 'no-NO',
    'norsk': 'no-NO',
    'danish': 'da-DK',
    'dansk': 'da-DK',
    'finnish': 'fi-FI',
    'suomi': 'fi-FI',
    'greek': 'el-GR',
    'ελληνικά': 'el-GR',
    'hebrew': 'he-IL',
    'עברית': 'he-IL',
    'thai': 'th-TH',
    'ไทย': 'th-TH',
    'vietnamese': 'vi-VN',
    'tiếng việt': 'vi-VN',
    'indonesian': 'id-ID',
    'bahasa indonesia': 'id-ID',
    'malay': 'ms-MY',
    'bahasa melayu': 'ms-MY',
    'english': 'en-US',
  };

  const lowerLang = language.toLowerCase().trim();

  // Check if it's already a valid language code (e.g., 'es-ES')
  if (/^[a-z]{2}-[A-Z]{2}$/.test(language)) {
    return language;
  }

  // Check if it's a simple language code (e.g., 'es')
  if (/^[a-z]{2}$/.test(lowerLang)) {
    return `${lowerLang}-${lowerLang.toUpperCase()}`;
  }

  // Look up in mapping
  return languageMap[lowerLang] || 'en-US';
}

/**
 * Get available voices for a language
 * @param {string} language - Language code or name
 * @returns {Array} Array of available voices
 */
export function getVoicesForLanguage(language) {
  if (!isTTSSupported()) return [];

  const langCode = getVoiceLanguageCode(language);
  const targetLang = langCode.split('-')[0];

  return window.speechSynthesis.getVoices().filter(voice =>
    voice.lang.toLowerCase().startsWith(targetLang.toLowerCase())
  );
}

/**
 * Load voices (needed for some browsers)
 * @returns {Promise<Array>} Promise that resolves with available voices
 */
export function loadVoices() {
  return new Promise((resolve) => {
    if (!isTTSSupported()) {
      resolve([]);
      return;
    }

    let voices = window.speechSynthesis.getVoices();

    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    // Some browsers load voices asynchronously
    window.speechSynthesis.onvoiceschanged = () => {
      voices = window.speechSynthesis.getVoices();
      resolve(voices);
    };

    // Fallback timeout
    setTimeout(() => {
      resolve(window.speechSynthesis.getVoices());
    }, 1000);
  });
}
