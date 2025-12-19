import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type MessageCategory = 'general' | 'personal' | 'medicine' | 'relations' | 'other';

async function classifyMessageCategory(
  content: string
): Promise<{ category: MessageCategory | null; confidence: number | null }> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            'あなたは在宅介護チャットのメッセージを分類するアシスタントです。' +
            'ユーザーの発言を次のカテゴリのいずれか1つに分類し、0〜1の自信度をJSONのみで返してください。' +
            "カテゴリ: 'general'（一般的な雑談や事務的な話題）, 'personal'（生活・気持ち・家族関係などの個人的な話題）, 'medicine'（薬や服薬、症状、病気に関する話題）, 'relations'（家族関係・介護者同士の関係・人間関係）, 'other'（上記以外）。" +
            "レスポンスは必ず次の形式のJSONのみとし、日本語文は含めないでください: {\"category\":\"general|personal|medicine|relations|other\",\"confidence\":0.0〜1.0}",
        },
        {
          role: 'user',
          content: `次のユーザー発話を分類してください:\n\n${content}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '';
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      return { category: null, confidence: null };
    }
    const jsonText = raw.slice(start, end + 1);
    const parsed = JSON.parse(jsonText) as {
      category?: string;
      confidence?: number;
    };

    const allowed: MessageCategory[] = [
      'general',
      'personal',
      'medicine',
      'relations',
      'other',
    ];

    const category = allowed.includes(parsed.category as MessageCategory)
      ? (parsed.category as MessageCategory)
      : null;
    const confidence =
      typeof parsed.confidence === 'number' &&
      parsed.confidence >= 0 &&
      parsed.confidence <= 1
        ? parsed.confidence
        : null;

    return { category, confidence };
  } catch (error) {
    console.error('Failed to classify message category:', error);
    return { category: null, confidence: null };
  }
}

async function getAuthedUserAndCheckFamily(
  familyId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Unauthorized' as const, status: 401, user: null };
  }

  const { data: member, error: memberError } = await supabase
    .from('family_members')
    .select('role')
    .eq('family_id', familyId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (memberError || !member) {
    return { error: 'Forbidden' as const, status: 403, user: null };
  }

  return { user, role: member.role as string };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId');

    if (!familyId) {
      return NextResponse.json(
        { error: 'familyId は必須です' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const authResult = await getAuthedUserAndCheckFamily(familyId, supabase);

    if (!('user' in authResult) || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { data: convRows, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('family_id', familyId)
      .eq('archived', false)
      .order('last_message_at', { ascending: false, nullsLast: true })
      .limit(20);

    if (convError) {
      console.error('Failed to fetch conversations:', convError);
      return NextResponse.json(
        { error: '会話の取得に失敗しました' },
        { status: 500 }
      );
    }

    const conversations = convRows ?? [];
    const conversationIds = conversations.map((c: any) => c.id);

    let messagesByConversation: Record<string, any[]> = {};

    if (conversationIds.length > 0) {
      const { data: msgRows, error: msgError } = await supabase
        .from('conversation_messages')
        .select('id, conversation_id, role, content, created_at, metadata')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: true });

      if (msgError) {
        console.error('Failed to fetch messages:', msgError);
      } else {
        messagesByConversation = (msgRows ?? []).reduce(
          (acc: Record<string, any[]>, msg: any) => {
            const convId = msg.conversation_id;
            if (!acc[convId]) acc[convId] = [];
            acc[convId].push(msg);
            return acc;
          },
          {}
        );
      }
    }

    const result = conversations.map((conv: any) => {
      const msgs = messagesByConversation[conv.id] ?? [];
      return {
        id: conv.id,
        familyId: conv.family_id,
        title: conv.title ?? '新しい会話',
        fileSearchEnabled: true,
        createdAt: conv.created_at,
        updatedAt: conv.last_message_at ?? conv.created_at,
        messages: msgs.map((m: any) => ({
          id: m.id,
          role:
            m.role === 'assistant'
              ? 'assistant'
              : m.role === 'user'
              ? 'user'
              : 'assistant',
          content: m.content,
          timestamp: m.created_at,
          fileSearchUsed:
            (m.metadata as any)?.file_search_enabled === true || false,
        })),
      };
    });

    return NextResponse.json({ conversations: result });
  } catch (error: any) {
    console.error('Chat GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId');
    const conversationId = searchParams.get('conversationId');

    if (!familyId || !conversationId) {
      return NextResponse.json(
        { error: 'familyId と conversationId は必須です' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const authResult = await getAuthedUserAndCheckFamily(familyId, supabase);

    if (!('user' in authResult) || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const user = authResult.user;

    // 該当会話が指定のfamilyに属していることを確認しつつ、archived=true に更新
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        archived: true,
        archived_at: new Date().toISOString(),
        archived_by: user.id,
      })
      .eq('id', conversationId)
      .eq('family_id', familyId);

    if (updateError) {
      console.error('Failed to archive conversation:', updateError);
      return NextResponse.json(
        { error: '会話の削除に失敗しました' },
        { status: 500 }
      );
    }

    // archived=true の会話はクライアント側では「削除されたもの」として扱う
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Chat DELETE API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { familyId, conversationId, title } = await request.json();

    if (!familyId || !conversationId) {
      return NextResponse.json(
        { error: 'familyId と conversationId は必須です' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const authResult = await getAuthedUserAndCheckFamily(familyId, supabase);

    if (!('user' in authResult) || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const newTitle =
      typeof title === 'string' && title.trim().length > 0
        ? title.trim()
        : null;

    const { data, error } = await supabase
      .from('conversations')
      .update({ title: newTitle })
      .eq('id', conversationId)
      .eq('family_id', familyId)
      .select('id, title')
      .maybeSingle();

    if (error) {
      console.error('Failed to update conversation title:', error);
      return NextResponse.json(
        { error: '会話タイトルの更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      conversationId,
      title: data?.title ?? null,
    });
  } catch (error: any) {
    console.error('Chat PATCH API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      familyId,
      message,
      fileSearchEnabled,
      conversationId: rawConversationId,
      clientMessageId,
    } = await request.json();

    if (!familyId || !message) {
      return NextResponse.json(
        { error: 'familyId と message は必須です' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const authResult = await getAuthedUserAndCheckFamily(familyId, supabase);

    if (!('user' in authResult) || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const user = authResult.user;

    if (authResult.role === 'external_family') {
      return NextResponse.json(
        { error: '閲覧専用メンバーはチャットを送信できません' },
        { status: 403 }
      );
    }

    // 既存会話があれば取得、なければ新規作成
    let conversation: any = null;
    let conversationId: string | null = rawConversationId || null;

    if (conversationId) {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .maybeSingle();

      if (!error && data) {
        conversation = data;
      } else {
        conversationId = null;
      }
    }

    if (!conversationId) {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          family_id: familyId,
          created_by: user.id,
          title: null,
          archived: false,
          message_count: 0,
        })
        .select('*')
        .single();

      if (error || !data) {
        console.error('Failed to create conversation:', error);
        return NextResponse.json(
          { error: '会話の作成に失敗しました' },
          { status: 500 }
        );
      }

      conversation = data;
      conversationId = data.id;
    }

    // 直近の会話履歴を取得（コンテキスト用）
    const { data: historyRows, error: historyError } = await supabase
      .from('conversation_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    if (historyError) {
      console.error('Failed to fetch conversation history:', historyError);
    }

    const systemPrompt =
      'あなたは在宅介護をサポートする日本語のAIアシスタントです。' +
      '利用者は家族や介護スタッフであり、不安や疑問に丁寧かつ具体的に答えてください。' +
      '医療的判断が必要な場合は、必ず医師や専門職への相談を促してください。' +
      (fileSearchEnabled
        ? ' 必要な場合のみ、介護計画や医師指示書などの資料を参照して回答してください。毎回資料検索を行うのではなく、本当に必要なときだけ利用してください。'
        : '');

    const contextMessages =
      historyRows?.map((m: any) => ({
        role:
          m.role === 'assistant' ||
          m.role === 'staff' ||
          m.role === 'system'
            ? 'assistant'
            : 'user',
        content: m.content as string,
      })) ?? [];
    let reply: string;

    // ファイルサーチ用Vector Storeの有無を確認
    const { data: familyMeta } = await supabase
      .from('families')
      .select('openai_vector_store_id')
      .eq('id', familyId)
      .maybeSingle();

    const vectorStoreId = (familyMeta as any)?.openai_vector_store_id as
      | string
      | null
      | undefined;

    if (fileSearchEnabled && vectorStoreId) {
      // File Search を利用するパス（Responses API）
      const historyText =
        historyRows
          ?.map((m: any) => {
            const prefix =
              m.role === 'assistant' || m.role === 'staff'
                ? 'AI:'
                : m.role === 'system'
                ? 'system:'
                : 'ユーザー:';
            return `${prefix} ${m.content}`;
          })
          .join('\n') ?? '';

      const combinedInput = historyText
        ? `これまでの会話履歴:\n${historyText}\n\nユーザーからの新しい質問:\n${message}`
        : (message as string);

      const response = await openai.responses.create({
        model: 'gpt-5.1-mini',
        instructions: systemPrompt,
        input: combinedInput,
        tools: [
          {
            type: 'file_search',
            vector_store_ids: [vectorStoreId],
          } as any,
        ],
        include: ['file_search_call.results'],
        temperature: 0.4,
      });

      const outputItems = (response as any).output as any[];
      const messageItem =
        outputItems?.find((item: any) => item.type === 'message') ??
        outputItems?.[0];
      const textItem =
        messageItem?.content?.find(
          (c: any) => c.type === 'output_text'
        ) ?? null;

      reply =
        textItem?.text ??
        '申し訳ありません。現在、回答を生成できませんでした。時間をおいて再度お試しください。';
    } else {
      // 通常のチャット（ファイルサーチなし）
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...contextMessages,
          { role: 'user', content: message },
        ],
        temperature: 0.4,
      });

      reply =
        completion.choices[0]?.message?.content ??
        '申し訳ありません。現在、回答を生成できませんでした。時間をおいて再度お試しください。';
    }

    const nowIso = new Date().toISOString();

    // ユーザーメッセージのカテゴリを分類
    const { category, confidence } = await classifyMessageCategory(
      message as string
    );

    // メッセージをconversation_messagesに保存
    const messagesToInsert = [
      {
        conversation_id: conversationId,
        sender_user_id: user.id,
        role: 'user',
        content: message,
        category,
        category_confidence: confidence,
        client_message_id: clientMessageId ?? null,
        metadata: {
          file_search_enabled: !!fileSearchEnabled,
          source: 'web',
        },
      },
      {
        conversation_id: conversationId,
        sender_user_id: null,
        role: 'assistant',
        content: reply,
        category: null,
        category_confidence: null,
        client_message_id: null,
        metadata: {
          file_search_enabled: !!fileSearchEnabled,
          source: 'openai',
        },
      },
    ];

    const { error: messageError } = await supabase
      .from('conversation_messages')
      .insert(messagesToInsert);

    if (messageError) {
      console.error('Failed to insert messages:', messageError);
    }

    // conversationsテーブルを更新（タイトル・最終メッセージ時刻・件数）
    const previousCount = conversation?.message_count ?? 0;
    const newCount = previousCount + 2;
    const newTitle =
      (conversation?.title ?? (message as string).slice(0, 30)) ||
      '新しい会話';

    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        last_message_at: nowIso,
        message_count: newCount,
        title: newTitle,
      })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Failed to update conversation:', updateError);
    }

    return NextResponse.json({
      reply,
      familyId,
      fileSearchEnabled: !!fileSearchEnabled,
      conversationId,
      title: newTitle,
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
