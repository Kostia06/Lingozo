import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAIProvider, generateSystemPrompt, parseAIResponse, detectMessageLanguage, AI_PROVIDERS } from '@/lib/ai-providers';

export async function POST(request) {
  try {
    const { chatId, message, language } = await request.json();

    // Get auth token from request header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create authenticated Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    if (!chatId || !message || !language) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
  

    // Get user ID from chat
    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .select('user_id')
      .eq('id', chatId)
      .single();


    if (chatError) {
      console.error('Failed to fetch chat:', chatError);
      return NextResponse.json(
        { error: 'Chat not found. Please create a new chat.' },
        { status: 404 }
      );
    }



    // Get user's settings (AI provider, API keys, preferences)
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('ai_provider, gemini_api_key, openai_api_key, claude_api_key, enable_memes, enable_music')
      .eq('id', chatData.user_id)
      .single();

    // Ignore "no rows" error and table not found errors
    if (settingsError &&
        settingsError.code !== 'PGRST116' &&
        !settingsError.message?.includes('relation') &&
        !settingsError.message?.includes('does not exist') &&
        settingsError.code !== '42P01') {
      console.error('Error fetching user settings:', settingsError);
    }

    // Determine AI provider and get appropriate API key
    const aiProvider = userSettings?.ai_provider || 'gemini';
    let apiKey;

    switch (aiProvider) {
      case 'openai':
        apiKey = userSettings?.openai_api_key || process.env.OPENAI_API_KEY;
        break;
      case 'claude':
        apiKey = userSettings?.claude_api_key || process.env.ANTHROPIC_API_KEY;
        break;
      case 'gemini':
      default:
        apiKey = userSettings?.gemini_api_key || process.env.GOOGLE_AI_API_KEY;
    }

    if (!apiKey) {
      const providerName = AI_PROVIDERS[aiProvider.toUpperCase()]?.name || 'AI';
      return NextResponse.json(
        { error: `Please add your ${providerName} API key in Settings.` },
        { status: 401 }
      );
    }

    // Create AI provider instance
    const ai = createAIProvider(aiProvider, apiKey);

    // Get conversation history
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    // Save user message first
    const { data: userMessage, error: userMessageError } = await supabase
      .from('messages')
      .insert([
        {
          chat_id: chatId,
          role: 'user',
          content: message,
          corrections: [],
        },
      ])
      .select()
      .single();

    if (userMessageError) throw userMessageError;

    // Detect if user is asking for explanation in English
    const messageLanguageType = detectMessageLanguage(message);
    const shouldRespondInTargetLanguage = messageLanguageType === 'target';

    // Check response cache first (to save API costs)
    const cacheKey = `${chatId}_${message.toLowerCase().trim()}`;
    const { data: cachedResponse } = await supabase
      .from('response_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    let responseText;
    let aiResponse;

    if (cachedResponse) {
      // Use cached response and increment hit count
      console.log('Using cached response');
      aiResponse = cachedResponse.response_data;
      await supabase
        .from('response_cache')
        .update({ hit_count: cachedResponse.hit_count + 1 })
        .eq('id', cachedResponse.id);
    } else {
      // Generate system prompt
      const enableMemes = userSettings?.enable_memes || false;
      const enableMusic = userSettings?.enable_music || false;
      const systemPrompt = generateSystemPrompt(language, enableMemes, enableMusic);

      // Override language in prompt if user asked for explanation in English
      const finalSystemPrompt = shouldRespondInTargetLanguage
        ? systemPrompt
        : systemPrompt.replace(/ONLY in \${language}/g, `in English when explaining, otherwise in ${language}`);

      // Build conversation history
      const conversationHistory = [
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user', content: message }
      ];

      // Call AI provider
      responseText = await ai.chat(conversationHistory, finalSystemPrompt, language);

      // Parse AI response
      aiResponse = parseAIResponse(responseText);

      // Cache the response (expires in 24 hours)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      try {
        await supabase
          .from('response_cache')
          .insert({
            cache_key: cacheKey,
            response_data: aiResponse,
            language: language,
            expires_at: expiresAt.toISOString()
          });
        console.log('Response cached');
      } catch (err) {
        console.log('Cache insert failed (might already exist):', err.message || err);
      }
    }

    const corrections = aiResponse.corrections || [];
    const grammarNote = aiResponse.grammarNote || null;
    const musicRecommendation = aiResponse.musicRecommendation || null;

    // Update user message with corrections
    if (corrections.length > 0) {
      await supabase
        .from('messages')
        .update({ corrections })
        .eq('id', userMessage.id);
    }

    // Save AI response
    const { data: assistantMessage } = await supabase
      .from('messages')
      .insert([
        {
          chat_id: chatId,
          role: 'assistant',
          content: aiResponse.response,
        },
      ])
      .select()
      .single();

    // Save grammar note if provided
    if (grammarNote && grammarNote.title) {
      await supabase
        .from('grammar_notes')
        .insert([
          {
            chat_id: chatId,
            title: grammarNote.title,
            content: grammarNote.content,
            category: grammarNote.category || 'General',
          },
        ]);
    }

    // Save music recommendation if provided
    if (musicRecommendation && musicRecommendation.title && musicRecommendation.artist) {
      try {
        await supabase
          .from('music_recommendations')
          .insert([
            {
              chat_id: chatId,
              message_id: assistantMessage?.id,
              title: musicRecommendation.title,
              artist: musicRecommendation.artist,
              reason: musicRecommendation.reason || 'Great for learning!',
              difficulty: musicRecommendation.difficulty || 'medium',
              genre: musicRecommendation.genre || 'pop',
              language: language,
            },
          ]);
        console.log('Music recommendation saved');
      } catch (err) {
        console.log('Failed to save music:', err.message || err);
      }
    }

    // Update chat timestamp
    await supabase
      .from('chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chatId);

    // Track usage
    try {
      await supabase.rpc('increment_usage', {
        p_user_id: chatData.user_id,
        p_usage_type: 'message'
      });
    } catch (err) {
      console.log('Usage tracking failed:', err.message || err);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in chat API:', error);

    // Provide more specific error message
    let errorMessage = 'Failed to process message';
    let statusCode = 500;

    if (error.code === 'PGRST116') {
      errorMessage = 'Please add your API key in Settings';
      statusCode = 401;
    } else if (error.message?.includes('API key')) {
      errorMessage = error.message;
      statusCode = 401;
    } else if (error.message?.includes('rate limit') || error.status === 429) {
      errorMessage = 'Rate limit exceeded. Please try again later.';
      statusCode = 429;
    } else if (error.message?.includes('quota')) {
      errorMessage = 'API quota exceeded. Please check your API key or upgrade your plan.';
      statusCode = 402;
    } else if (error.status === 401) {
      errorMessage = 'Invalid API key. Please check your settings.';
      statusCode = 401;
    } else if (error.status === 403) {
      errorMessage = 'Access forbidden. Please verify your API key permissions.';
      statusCode = 403;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
