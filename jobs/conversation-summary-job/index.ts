import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
  metadata: Json;
}

interface ConversationSummary {
  id: string;
  conversation_id: string;
  start_message_created_at: string;
  end_message_created_at: string;
  summary_text: string;
  status: 'ready' | 'failed';
  last_error: string | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を環境変数に設定してください');
}

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY を環境変数に設定してください');
}

const CHUNK_SIZE = Number(process.env.SUMMARY_CHUNK_SIZE || 20);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function getConversations() {
  const { data, error } = await supabase
    .from('conversations')
    .select('id')
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data as { id: string }[];
}

async function getLatestSummary(conversationId: string): Promise<ConversationSummary | null> {
  const { data, error } = await supabase
    .from('conversation_summaries')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('end_message_created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as ConversationSummary) ?? null;
}

async function getMessagesForSummary(conversationId: string, since?: string) {
  let query = supabase
    .from('conversation_messages')
    .select('id, conversation_id, role, content, created_at, metadata')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (since) {
    query = query.gt('created_at', since);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data as ConversationMessage[];
}

async function createSummary(
  conversationId: string,
  messages: ConversationMessage[]
) {
  if (messages.length === 0) return;

  const content = messages
    .map((m) => {
      const prefix =
        m.role === 'assistant'
          ? 'AI:'
          : m.role === 'user'
          ? '利用者:'
          : m.role === 'staff'
          ? 'スタッフ:'
          : 'system:';
      return `${prefix} ${m.content}`;
    })
    .join('\n');

  const systemPrompt =
    'あなたは在宅介護分野の要約アシスタントです。' +
    '以下の会話履歴から、重要な事実・相談内容・AIの提案を日本語で簡潔に要約してください。' +
    '次回以降の会話の文脈として使えるように、箇条書き中心でまとめてください。';

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ],
      temperature: 0.3,
    });

    const summaryText =
      completion.choices[0]?.message?.content ??
      '要約を生成できませんでした。';

    const usage = completion.usage;

    const startAt = messages[0].created_at;
    const endAt = messages[messages.length - 1].created_at;

    await supabase.from('conversation_summaries').insert({
      conversation_id: conversationId,
      start_message_created_at: startAt,
      end_message_created_at: endAt,
      summary_text: summaryText,
      status: 'ready',
      last_error: null,
      model: completion.model || 'gpt-4o-mini',
      input_tokens: usage?.prompt_tokens ?? null,
      output_tokens: usage?.completion_tokens ?? null,
    });
  } catch (error: any) {
    console.error('Failed to create summary:', error);

    const startAt = messages[0].created_at;
    const endAt = messages[messages.length - 1].created_at;

    await supabase.from('conversation_summaries').insert({
      conversation_id: conversationId,
      start_message_created_at: startAt,
      end_message_created_at: endAt,
      summary_text: '',
      status: 'failed',
      last_error: error.message || 'Unknown error',
      model: 'gpt-4o-mini',
      input_tokens: null,
      output_tokens: null,
    });
  }
}

async function main() {
  console.log('Conversation summary job started');

  const conversations = await getConversations();

  for (const conv of conversations) {
    try {
      const latestSummary = await getLatestSummary(conv.id);
      const since = latestSummary?.end_message_created_at;
      const messages = await getMessagesForSummary(conv.id, since);

      if (messages.length >= CHUNK_SIZE) {
        console.log(
          `Creating summary for conversation ${conv.id} (${messages.length} messages)`
        );
        await createSummary(conv.id, messages);
      } else {
        console.log(
          `Skipping conversation ${conv.id}: only ${messages.length} new messages`
        );
      }
    } catch (error) {
      console.error(`Error processing conversation ${conv.id}:`, error);
    }
  }

  console.log('Conversation summary job completed');
}

// Cloud Run Jobs エントリポイント
main().catch((error) => {
  console.error('Job failed:', error);
  process.exit(1);
});

