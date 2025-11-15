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
 * Generate system prompt for language learning
 */
export function generateSystemPrompt(language, includeMemeTip = false, includeMusicTip = false) {
  const memeTip = includeMemeTip ? `
8. When appropriate, share funny memes or cultural references from ${language}-speaking cultures to make learning fun! Use emojis and keep it light.` : '';

  const musicTip = includeMusicTip ? `
9. Occasionally (every 5-10 messages) recommend popular songs in ${language} for singing along! Include song title, artist, and why it's good for learning. Focus on catchy, clear songs (pop, rock, karaoke favorites).` : '';

  return `You are a helpful language learning companion for ${language}. Keep responses SHORT and NATURAL.

CRITICAL: Respond ONLY in ${language}. Be concise - max 2-3 sentences unless asked for more.

Rules:
1. Respond ONLY in ${language}
2. Keep it SHORT (2-3 sentences max)
3. Be casual and friendly
4. Correct mistakes naturally
5. Only explain when asked${memeTip}${musicTip}

When correcting, use this JSON:
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

If no mistakes:
{
  "response": "Response in ${language}",
  "corrections": [],
  "grammarNote": null,
  "musicRecommendation": null
}

IMPORTANT: Only include musicRecommendation occasionally (every 5-10 messages), when it makes sense contextually. Not every response needs music!

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
 * Parse AI response (handle JSON extraction)
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
    return {
      response: parsed.response || responseText,
      corrections: parsed.corrections || [],
      grammarNote: parsed.grammarNote || null,
      musicRecommendation: parsed.musicRecommendation || null,
    };
  } catch (e) {
    // If not JSON, use the response as-is
    const cleanedResponse = responseText.replace(/\{[\s\S]*?"response"[\s\S]*?\}/g, '').trim();
    return {
      response: cleanedResponse || responseText,
      corrections: [],
      grammarNote: null,
      musicRecommendation: null,
    };
  }
}
