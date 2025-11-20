import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAIProvider, generateSystemPrompt, parseAIResponse, detectMessageLanguage, AI_PROVIDERS } from '@/lib/ai-providers';

export async function POST(request) {
  try {
    const { chatId, message, language, featureMode, replyToId } = await request.json();

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

    // Check if user is premium (unlimited)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', chatData.user_id)
      .single();

    // Silently handle missing table or profile (default to non-premium)
    if (profileError && profileError.code !== 'PGRST116' && profileError.code !== '42P01') {
      console.error('Error checking premium status:', profileError);
    }

    const isPremium = profile?.is_premium || false;

    // Check message limit for non-premium users (20 messages per day)
    if (!isPremium) {
      // Get today's start timestamp (midnight UTC)
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Count user's messages sent today
      const { count, error: countError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chatId)
        .eq('role', 'user')
        .gte('created_at', todayISO);

      if (countError) {
        console.error('Error counting messages:', countError);
      }

      if (count >= 20) {
        return NextResponse.json(
          { error: 'You have reached the daily limit of 20 messages. Your limit will reset tomorrow, or you can upgrade to premium for unlimited messages.' },
          { status: 429 }
        );
      }
    }

    // Always use Gemini with the server's API key for all users
    const aiProvider = 'gemini';
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
      console.error('GOOGLE_AI_API_KEY is not configured on server');
      return NextResponse.json(
        { error: 'AI service is not available. Please contact support.' },
        { status: 500 }
      );
    }

    // Get user's preferences (memes, music) - enable by default
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('enable_memes, enable_music')
      .eq('id', chatData.user_id)
      .single();

    // Enable memes and music by default for everyone
    const enableMemes = userSettings?.enable_memes !== false; // Default to true
    const enableMusic = userSettings?.enable_music !== false; // Default to true

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
          reply_to_id: replyToId || null,
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
      // Generate system prompt (with feature mode support)
      const systemPrompt = generateSystemPrompt(language, enableMemes, enableMusic, featureMode);

      // Override language in prompt if user asked for explanation in English
      const finalSystemPrompt = shouldRespondInTargetLanguage
        ? systemPrompt
        : systemPrompt.replace(/ONLY in \${language}/g, `in English when explaining, otherwise in ${language}`);

      // Build conversation history with reply context
      const conversationHistory = [
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ];

      // Add current user message with reply context if replying
      let userMessageContent = message;
      if (replyToId) {
        const repliedMessage = messages.find(m => m.id === replyToId);
        if (repliedMessage) {
          userMessageContent = `[Replying to: "${repliedMessage.content.substring(0, 100)}${repliedMessage.content.length > 100 ? '...' : ''}"]\n\n${message}`;
        }
      }

      conversationHistory.push({ role: 'user', content: userMessageContent });

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

    // Determine if AI should reply to the user message (if user was replying to AI, AI should reply back)
    let aiReplyToId = null;
    if (replyToId) {
      const { data: repliedMessage } = await supabase
        .from('messages')
        .select('role')
        .eq('id', replyToId)
        .single();

      // If user replied to an AI message, AI should reply to user's message
      if (repliedMessage && repliedMessage.role === 'assistant') {
        aiReplyToId = userMessage.id;
      }
    }

    // Save AI response(s) - handle both single and multiple messages
    let assistantMessage = null;
    if (aiResponse.isMultiMessage && aiResponse.messages) {
      // Save multiple messages with slight delays
      const savedMessages = [];
      for (let i = 0; i < aiResponse.messages.length; i++) {
        const msg = aiResponse.messages[i];
        const { data } = await supabase
          .from('messages')
          .insert([
            {
              chat_id: chatId,
              role: 'assistant',
              content: msg.content,
              reply_to_id: i === 0 ? aiReplyToId : null, // Only first message replies
              read_at: null, // Mark as unread
            },
          ])
          .select()
          .single();

        savedMessages.push(data);

        // Add small delay between messages (except for last one)
        if (i < aiResponse.messages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      assistantMessage = savedMessages[savedMessages.length - 1]; // Last message for references
    } else {
      // Save single AI response
      const { data } = await supabase
        .from('messages')
        .insert([
          {
            chat_id: chatId,
            role: 'assistant',
            content: aiResponse.response,
            reply_to_id: aiReplyToId,
            read_at: null, // Mark as unread
          },
        ])
        .select()
        .single();
      assistantMessage = data;
    }

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
