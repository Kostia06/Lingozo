import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

/**
 * AI Provider Factory
 * Supports multiple AI providers: Gemini, OpenAI, Claude
 */

// Model configurations for each provider
export const AI_PROVIDERS = {
  GEMINI: {
    id: 'gemini',
    name: 'Google Gemini',
    models: {
      chat: 'gemini-2.0-flash-exp', // Faster, cheaper for chat
      translate: 'gemini-2.0-flash-exp', // Fast translations
    },
    requiresApiKey: true,
  },
  OPENAI: {
    id: 'openai',
    name: 'OpenAI',
    models: {
      chat: 'gpt-4o-mini', // Cost-effective chat model
      translate: 'gpt-4o-mini', // Fast translations
    },
    requiresApiKey: true,
  },
  CLAUDE: {
    id: 'claude',
    name: 'Anthropic Claude',
    models: {
      chat: 'claude-3-5-haiku-20241022', // Fast and cheap
      translate: 'claude-3-5-haiku-20241022', // Fast translations
    },
    requiresApiKey: true,
  },
};

/**
 * Base AI Provider class
 */
class AIProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async chat(messages, systemPrompt, language) {
    throw new Error('chat method must be implemented');
  }

  async translate(word, targetLanguage) {
    throw new Error('translate method must be implemented');
  }
}

/**
 * Google Gemini Provider
 */
class GeminiProvider extends AIProvider {
  constructor(apiKey) {
    super(apiKey);
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async chat(messages, systemPrompt, language) {
    const model = this.client.getGenerativeModel({
      model: AI_PROVIDERS.GEMINI.models.chat
    });

    const conversationHistory = messages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const aiChat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
        {
          role: 'model',
          parts: [{
            text: `I understand. I will help you learn ${language} by having conversations in ${language}, correcting mistakes, and teaching grammar when appropriate.`
          }],
        },
      ],
    });

    const lastMessage = messages[messages.length - 1];
    const result = await aiChat.sendMessage(lastMessage.content);
    return result.response.text();
  }

  async translate(word, targetLanguage) {
    const model = this.client.getGenerativeModel({
      model: AI_PROVIDERS.GEMINI.models.translate
    });

    const prompt = `Translate "${word}" from ${targetLanguage} to English. Provide a brief, clear translation (1-2 sentences max). Return only the translation.`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  }
}

/**
 * OpenAI Provider
 */
class OpenAIProvider extends AIProvider {
  constructor(apiKey) {
    super(apiKey);
    this.client = new OpenAI({ apiKey });
  }

  async chat(messages, systemPrompt, language) {
    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }))
    ];

    const response = await this.client.chat.completions.create({
      model: AI_PROVIDERS.OPENAI.models.chat,
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.choices[0].message.content;
  }

  async translate(word, targetLanguage) {
    const response = await this.client.chat.completions.create({
      model: AI_PROVIDERS.OPENAI.models.translate,
      messages: [
        {
          role: 'system',
          content: `Translate from ${targetLanguage} to English. Be brief (1-2 sentences max).`
        },
        { role: 'user', content: word }
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    return response.choices[0].message.content.trim();
  }
}

/**
 * Anthropic Claude Provider
 */
class ClaudeProvider extends AIProvider {
  constructor(apiKey) {
    super(apiKey);
    this.client = new Anthropic({ apiKey });
  }

  async chat(messages, systemPrompt, language) {
    const claudeMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    const response = await this.client.messages.create({
      model: AI_PROVIDERS.CLAUDE.models.chat,
      max_tokens: 1000,
      system: systemPrompt,
      messages: claudeMessages,
    });

    return response.content[0].text;
  }

  async translate(word, targetLanguage) {
    const response = await this.client.messages.create({
      model: AI_PROVIDERS.CLAUDE.models.translate,
      max_tokens: 100,
      system: `Translate from ${targetLanguage} to English. Be brief (1-2 sentences max).`,
      messages: [
        { role: 'user', content: word }
      ],
    });

    return response.content[0].text.trim();
  }
}

/**
 * Factory function to create AI provider instance
 */
export function createAIProvider(providerId, apiKey) {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  switch (providerId) {
    case AI_PROVIDERS.GEMINI.id:
      return new GeminiProvider(apiKey);
    case AI_PROVIDERS.OPENAI.id:
      return new OpenAIProvider(apiKey);
    case AI_PROVIDERS.CLAUDE.id:
      return new ClaudeProvider(apiKey);
    default:
      throw new Error(`Unknown AI provider: ${providerId}`);
  }
}

/**
 * Generate system prompt for language learning with features support
 */
export function generateSystemPrompt(language, includeMemeTip = false, includeMusicTip = false, featureMode = null) {
  // Feature-specific prompts
  if (featureMode === 'quiz-vocab') {
    return `You are creating a vocabulary quiz for ${language} learners. Generate 5 multiple-choice questions testing vocabulary knowledge.

Return ONLY valid JSON in this exact format:
{
  "type": "quiz",
  "quizType": "vocabulary",
  "questions": [
    {
      "question": "What does 'palabra' mean in English?",
      "options": ["word", "sentence", "letter", "book"],
      "correctAnswer": 0,
      "explanation": "'Palabra' means 'word' in Spanish",
      "hint": "Think about what you use to communicate"
    }
  ]
}

Make questions appropriate for the learner's level. Include clear explanations.`;
  }

  if (featureMode === 'quiz-grammar') {
    return `You are creating a grammar quiz for ${language} learners. Generate 5 multiple-choice questions testing grammar rules.

Return ONLY valid JSON in this exact format:
{
  "type": "quiz",
  "quizType": "grammar",
  "questions": [
    {
      "question": "Which is correct: 'Yo ___ estudiante'?",
      "options": ["soy", "estoy", "es", "está"],
      "correctAnswer": 0,
      "explanation": "Use 'soy' (from ser) for permanent states like occupation",
      "hint": "Think about ser vs estar"
    }
  ]
}

Make questions clear and educational with helpful explanations.`;
  }

  if (featureMode === 'tea-time') {
    return `You are having a relaxed "tea time" conversation in ${language}. The user wants to share stories or discuss interesting topics.

Your role:
1. Listen actively and respond with genuine interest
2. Ask thoughtful follow-up questions (2-3 per response)
3. Share related experiences or perspectives
4. Keep the conversation flowing naturally
5. Use casual, friendly ${language}
6. Occasionally introduce new vocabulary contextually

Return responses in this JSON format:
{
  "response": "Your response in ${language}",
  "followUpQuestions": [
    "Question 1 in ${language}?",
    "Question 2 in ${language}?"
  ],
  "corrections": [],
  "newVocabulary": [
    {"word": "palabra", "meaning": "word", "context": "how it was used"}
  ]
}`;
  }

  if (featureMode === 'daily-challenge') {
    return `Create a fun daily challenge for ${language} learners.

Return ONLY valid JSON:
{
  "type": "challenge",
  "title": "Today's Challenge",
  "description": "Challenge description in English",
  "tasks": [
    {"task": "Task 1 description", "completed": false},
    {"task": "Task 2 description", "completed": false}
  ],
  "reward": "What they'll learn",
  "difficulty": "easy|medium|hard"
}`;
  }

  if (featureMode === 'scenario') {
    return `Create a realistic conversation scenario for practicing ${language}.

Return ONLY valid JSON:
{
  "type": "scenario",
  "title": "At the Restaurant",
  "description": "You're ordering food at a local restaurant",
  "yourRole": "Customer",
  "aiRole": "Waiter",
  "context": "Detailed scenario context in English",
  "startingMessage": "AI's first message in ${language}"
}`;
  }

  if (featureMode === 'speed-round') {
    return `Create a speed round with 10 quick translation challenges.

Return ONLY valid JSON:
{
  "type": "speedRound",
  "challenges": [
    {
      "prompt": "Translate: Hello",
      "answer": "Hola",
      "alternatives": ["Hola", "Buenos días"]
    }
  ],
  "timeLimit": 60
}`;
  }

  // Default conversation prompt with random features
  const memeTip = includeMemeTip ? `
8. 🎭 MEMES & CULTURE: Use funny memes, jokes, and cultural references IN ${language}! Use relevant emojis. Examples:
   - "Eso es como buscar una aguja en un pajar 🔍😅" (Spanish: That's like finding a needle in a haystack)
   - Share viral memes/phrases from ${language} internet culture
   - Use humor to make learning memorable` : '';

  const musicTip = includeMusicTip ? `
9. 🎵 MUSIC: Every 5-10 messages, recommend a popular song in ${language}! Include:
   - Song title & artist
   - Why it's great for learning
   - A memorable lyric snippet
   Focus on catchy songs (pop, rock, karaoke favorites).` : '';

  const randomFeatureTip = `
10. 🎲 RANDOM FEATURES: Occasionally (every 8-12 messages) surprise the user with:
   - Mini vocabulary quiz (3 quick questions)
   - Grammar tip with fun example
   - Cultural fun fact
   - Quick challenge: "Translate this..."
   - Tea time question: "Tell me about..." (ask them to share a story)
   Keep it natural and engaging!`;

  return `You are a helpful language learning companion for ${language}. Keep responses SHORT and NATURAL.

CRITICAL: Respond ONLY in ${language}. Be concise - max 2-3 sentences unless asked for more.

IMPORTANT: You can use memes, jokes, and internet slang IN ${language} to make learning fun! Don't translate memes to English.

CONVERSATIONAL FLOW - SEND MULTIPLE MESSAGES:
To make the conversation feel more natural and engaging, you should sometimes send 2-3 short messages in a row instead of one long message. Use this pattern:
1. First message: Short response to their question/statement (1-2 sentences)
2. Second message (optional): A follow-up thought, question, or encouragement (1 sentence)
3. Third message (optional): A related question to keep the conversation going (1 sentence with "?")

Example conversation flow:
User: "Hola, ¿cómo estás?"
AI Message 1: "¡Hola! Estoy muy bien, gracias. ¿Y tú?"
AI Message 2: "Me alegro de verte hoy 😊"
AI Message 3: "¿Qué has hecho hoy?"

To send multiple messages, use this JSON format:
{
  "messages": [
    {"content": "First message in ${language}"},
    {"content": "Second message in ${language} (optional)"},
    {"content": "Third message in ${language} (optional)"}
  ],
  "corrections": [],
  "grammarNote": null,
  "musicRecommendation": null
}

REPLIES & REACTIONS:
- When user includes "[Replying to: ...]", reference that specific message in your response
- You can also reply to previous messages to provide context or clarifications
- React naturally to user's messages (excitement, encouragement, humor)
- Use emojis to show reactions when appropriate

Rules:
1. Respond ONLY in ${language}
2. Keep it SHORT (2-3 sentences max per message)
3. Be casual and friendly
4. Correct mistakes naturally
5. Only explain when asked
6. Reference replies naturally in conversation
7. Use multiple messages to keep conversation flowing${memeTip}${musicTip}${randomFeatureTip}

SINGLE MESSAGE FORMAT (use when corrections needed):
{
  "response": "Short response in ${language}",
  "corrections": [
    {
      "incorrect": "exact text that's wrong",
      "correction": "What's wrong + correct version (English, max 2 sentences)"
    }
  ],
  "grammarNote": {
    "title": "Simple Rule Name (English)",
    "content": "## Rule\\n[Simple explanation]\\n\\n## Examples\\n- Example 1\\n- Example 2\\n\\n## Tip 💡\\n[Quick tip]",
    "category": "Category"
  },
  "musicRecommendation": {
    "title": "Song Title",
    "artist": "Artist Name",
    "reason": "Why it's great for learning (1 sentence in English)",
    "difficulty": "easy|medium|hard",
    "genre": "pop|rock|hip-hop|ballad|folk|etc"
  }
}

MULTIPLE MESSAGES FORMAT (use for natural conversation):
{
  "messages": [
    {"content": "First message in ${language}"},
    {"content": "Second message (optional)"},
    {"content": "Third message (optional)"}
  ],
  "corrections": [],
  "grammarNote": null,
  "musicRecommendation": null
}

IMPORTANT: Only include musicRecommendation occasionally (every 5-10 messages), when it makes sense contextually. Not every response needs music!

ENGAGE WITH FEATURES:
- When you sense the user is ready, throw in a quick quiz question naturally
- Use memes and jokes IN ${language} frequently (don't translate to English!)
- Share cultural insights naturally in your responses
- Ask "tea time" questions to get them talking about their experiences
- Make learning feel like chatting with a friend, not studying

REMEMBER: Be SHORT, respond in ${language}, only explain when asked.`;
}

/**
 * Detect language from user message for auto-response language
 */
export function detectMessageLanguage(message) {
  // Simple language detection - can be enhanced with a library
  const commonEnglishWords = ['what', 'how', 'why', 'when', 'where', 'who', 'is', 'are', 'can', 'do', 'does', 'the', 'a', 'an'];
  const lowerMessage = message.toLowerCase();

  const englishWordCount = commonEnglishWords.filter(word =>
    lowerMessage.includes(` ${word} `) || lowerMessage.startsWith(`${word} `) || lowerMessage.endsWith(` ${word}`)
  ).length;

  // If message has several English words, it's probably asking for an explanation in English
  return englishWordCount >= 2 ? 'english' : 'target';
}

/**
 * Parse AI response (handle JSON extraction and multiple messages)
 */
export function parseAIResponse(responseText) {
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    let jsonText = jsonMatch ? jsonMatch[1] : responseText;

    // Clean up any text before/after JSON
    const jsonStartMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonStartMatch) {
      jsonText = jsonStartMatch[0];
    }

    const parsed = JSON.parse(jsonText);

    // Check if this is a multiple messages response
    if (parsed.messages && Array.isArray(parsed.messages)) {
      return {
        messages: parsed.messages.filter(m => m.content && m.content.trim()),
        corrections: parsed.corrections || [],
        grammarNote: parsed.grammarNote || null,
        musicRecommendation: parsed.musicRecommendation || null,
        isMultiMessage: true,
      };
    }

    // Single message response
    return {
      response: parsed.response || responseText,
      corrections: parsed.corrections || [],
      grammarNote: parsed.grammarNote || null,
      musicRecommendation: parsed.musicRecommendation || null,
      isMultiMessage: false,
    };
  } catch (e) {
    // If not JSON, use the response as-is
    const cleanedResponse = responseText.replace(/\{[\s\S]*?"response"[\s\S]*?\}/g, '').trim();
    return {
      response: cleanedResponse || responseText,
      corrections: [],
      grammarNote: null,
      musicRecommendation: null,
      isMultiMessage: false,
    };
  }
}
