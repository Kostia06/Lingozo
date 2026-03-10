import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { messageIds } = await request.json();

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

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing message IDs' },
        { status: 400 }
      );
    }

    // Verify the authenticated user owns these messages' chats
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get messages with their chat ownership info
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('id, chat_id, chats(user_id)')
      .in('id', messageIds);

    if (msgError) throw msgError;

    // Filter to only messages the user owns
    const ownedMessageIds = messages
      .filter(m => m.chats?.user_id === user.id)
      .map(m => m.id);

    if (ownedMessageIds.length === 0) {
      return NextResponse.json({ success: true });
    }

    // Mark owned messages as read
    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', ownedMessageIds)
      .is('read_at', null);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark messages as read' },
      { status: 500 }
    );
  }
}
