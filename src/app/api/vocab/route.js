import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { chatId, word, translation, context } = await request.json();

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

    if (!chatId || !word || !translation) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the authenticated user owns this chat
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('user_id')
      .eq('id', chatId)
      .single();

    if (chatError || !chat || chat.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Check if already saved
    const { data: existing } = await supabase
      .from('saved_vocabulary')
      .select('id')
      .eq('chat_id', chatId)
      .eq('word', word)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'This word is already saved' },
        { status: 409 }
      );
    }

    // Save vocabulary
    const { data, error } = await supabase
      .from('saved_vocabulary')
      .insert([
        {
          chat_id: chatId,
          word: word,
          translation: translation,
          context: context || null,
          starred: false,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error saving vocabulary:', error);
    return NextResponse.json(
      { error: 'Failed to save vocabulary' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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

    // Verify ownership: get vocab item, then check chat ownership
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: vocabItem, error: vocabError } = await supabase
      .from('saved_vocabulary')
      .select('id, chat_id, chats(user_id)')
      .eq('id', id)
      .single();

    if (vocabError || !vocabItem) {
      return NextResponse.json(
        { error: 'Vocabulary item not found' },
        { status: 404 }
      );
    }

    if (vocabItem.chats?.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('saved_vocabulary')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vocabulary:', error);
    return NextResponse.json(
      { error: 'Failed to delete vocabulary' },
      { status: 500 }
    );
  }
}
