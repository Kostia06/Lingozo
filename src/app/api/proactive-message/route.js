import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAIProvider, generateSystemPrompt } from '@/lib/ai-providers';

export async function POST(request) {
  try {
    const { chatId } = await request.json();

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

    if (!chatId) {
      return NextResponse.json(
        { error: 'Missing chatId' },
        { status: 400 }
      );
    }

    // Get chat info
    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .select('user_id, language')
      .eq('id', chatId)
      .single();

    if (chatError) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Check rate limiting - max 2 proactive messages per day
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const { data: proactiveMessages, error: countError } = await supabase
      .from('messages')
      .select('id')
      .eq('chat_id', chatId)
      .eq('role', 'assistant')
      .eq('is_proactive', true)
      .gte('created_at', todayISO);

    if (countError) {
      console.error('Error counting proactive messages:', countError);
    }

    // Limit: 2 proactive messages per day
    if (proactiveMessages && proactiveMessages.length >= 2) {
      return NextResponse.json(
        { shouldSend: false, reason: 'Daily limit reached' },
        { status: 200 }
      );
    }

    // Check last message time (any message)
    const { data: lastMessage, error: lastMsgError } = await supabase
      .from('messages')
      .select('created_at, role')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastMsgError && lastMsgError.code !== 'PGRST116') {
      console.error('Error fetching last message:', lastMsgError);
    }

    // Don't send if there was activity in the last 30 minutes
    if (lastMessage) {
      const lastMessageTime = new Date(lastMessage.created_at);
      const timeSinceLastMessage = Date.now() - lastMessageTime.getTime();
      const thirtyMinutes = 30 * 60 * 1000;

      if (timeSinceLastMessage < thirtyMinutes) {
        return NextResponse.json(
          { shouldSend: false, reason: 'Too soon after last message' },
          { status: 200 }
        );
      }

      // Don't send if last message was within 2 hours
      const twoHours = 2 * 60 * 60 * 1000;
      if (timeSinceLastMessage < twoHours) {
        return NextResponse.json(
          { shouldSend: false, reason: 'Within 2 hour cooldown' },
          { status: 200 }
        );
      }
    }

    // Get conversation history for context
    const { data: recentMessages, error: historyError } = await supabase
      .from('messages')
      .select('role, content')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (historyError) {
      console.error('Error fetching message history:', historyError);
    }

    const conversationHistory = (recentMessages || [])
      .reverse()
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    // Generate proactive message
    const aiProvider = 'gemini';
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI service not available' },
        { status: 500 }
      );
    }

    const ai = createAIProvider(aiProvider, apiKey);

    const systemPrompt = `You are a friendly language learning assistant. The user is learning ${chatData.language}.

Send a SHORT, friendly proactive message to the user. Choose ONE of these types:
1. A quick check-in asking how they're doing (in ${chatData.language})
2. A gentle reminder to practice
3. A word of encouragement about their learning progress
4. A fun fact or tip about ${chatData.language}

IMPORTANT:
- Keep it VERY short (1-2 sentences max)
- Be natural and casual, not pushy
- Write ONLY in ${chatData.language} (except for any brief explanations in parentheses)
- Don't ask too many questions
- Make it feel like a friendly nudge, not a lesson

Just send the message directly, no JSON format needed.`;

    const userMessage = conversationHistory
      ? `Based on our recent conversation, send me a friendly message:\n${conversationHistory}`
      : `Send me a friendly check-in message in ${chatData.language}`;

    const response = await ai.chat(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
      chatData.language
    );

    // Save the proactive message
    const { data: savedMessage, error: saveError } = await supabase
      .from('messages')
      .insert([
        {
          chat_id: chatId,
          role: 'assistant',
          content: response,
          is_proactive: true,
          read_at: null,
        },
      ])
      .select()
      .single();

    if (saveError) {
      console.error('Error saving proactive message:', saveError);
      return NextResponse.json(
        { error: 'Failed to save message' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: savedMessage,
        shouldSend: true
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in proactive message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
