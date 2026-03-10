import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { messageId, reaction } = await request.json();

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

    if (!messageId || !reaction) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the authenticated user owns the chat this message belongs to
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get message and verify ownership through chat
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('reactions, chat_id')
      .eq('id', messageId)
      .single();

    if (fetchError) throw fetchError;

    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('user_id')
      .eq('id', message.chat_id)
      .single();

    if (chatError || !chat || chat.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Parse existing reactions (stored as JSON)
    let reactions = message.reactions || {};

    // Toggle the reaction
    if (reactions[reaction]) {
      // Remove reaction if it exists
      delete reactions[reaction];
    } else {
      // Add reaction with timestamp
      reactions[reaction] = new Date().toISOString();
    }

    // Update message with new reactions
    const { error: updateError } = await supabase
      .from('messages')
      .update({ reactions })
      .eq('id', messageId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, reactions });
  } catch (error) {
    console.error('Error updating reaction:', error);
    return NextResponse.json(
      { error: 'Failed to update reaction' },
      { status: 500 }
    );
  }
}
