import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAIProvider } from '@/lib/ai-providers';

export async function POST(request) {
  try {
    const { word, targetLanguage, chatId } = await request.json();

    if (!word || !targetLanguage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get auth token from request header
    const authHeader = request.headers.get('authorization');

    // Create authenticated Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      authHeader ? {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      } : undefined
    );

    // Check translation cache first (to save API costs)
    const cacheKey = `${word.toLowerCase().trim()}_${targetLanguage}`;
    const { data: cachedTranslation } = await supabase
      .from('translation_cache')
      .select('*')
      .eq('word', word.toLowerCase().trim())
      .eq('target_language', targetLanguage)
      .single();

    if (cachedTranslation) {
      // Use cached translation and increment hit count
      console.log('Using cached translation');
      try {
        await supabase
          .from('translation_cache')
          .update({ hit_count: cachedTranslation.hit_count + 1 })
          .eq('id', cachedTranslation.id);
      } catch (err) {
        console.log('Cache update failed:', err.message || err);
      }

      return NextResponse.json({ translation: cachedTranslation.translation });
    }

    // Always use Gemini with server API key
    const aiProvider = 'gemini';
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
      console.error('GOOGLE_AI_API_KEY is not configured on server');
      return NextResponse.json(
        { error: 'Translation service is not available' },
        { status: 500 }
      );
    }

    // Get user ID for usage tracking (optional)
    let userId = null;
    if (chatId && authHeader) {
      const { data: chat } = await supabase
        .from('chats')
        .select('user_id')
        .eq('id', chatId)
        .single();

      if (chat) {
        userId = chat.user_id;
      }
    }

    // Create AI provider and translate
    const ai = createAIProvider(aiProvider, apiKey);
    const translation = await ai.translate(word, targetLanguage);

    // Cache the translation
    try {
      await supabase
        .from('translation_cache')
        .insert({
          word: word.toLowerCase().trim(),
          target_language: targetLanguage,
          translation: translation,
        });
      console.log('Translation cached');
    } catch (err) {
      console.log('Cache insert failed (might already exist):', err.message || err);
    }

    // Track usage if user is identified
    if (userId) {
      try {
        await supabase.rpc('increment_usage', {
          p_user_id: userId,
          p_usage_type: 'translation'
        });
      } catch (err) {
        console.log('Usage tracking failed:', err.message || err);
      }
    }

    return NextResponse.json({ translation });
  } catch (error) {
    console.error('Error in translate API:', error);

    let errorMessage = 'Failed to translate';
    let statusCode = 500;

    if (error.message?.includes('API key')) {
      errorMessage = error.message;
      statusCode = 401;
    } else if (error.message?.includes('rate limit') || error.status === 429) {
      errorMessage = 'Rate limit exceeded. Please try again later.';
      statusCode = 429;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
