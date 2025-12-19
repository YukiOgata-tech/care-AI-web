'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ChatMessage } from '@/components/chat/chat-message';
import { ChatInput } from '@/components/chat/chat-input';
import { useConversationStore } from '@/lib/store';
import { Plus, MessageSquare, Trash2, Bot, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function FamilyChatPage() {
  const params = useParams<{ familyId: string }>();
  const router = useRouter();
  const familyId = params.familyId;

  const conversations = useConversationStore((state) => state.conversations);
  const currentConversation = useConversationStore(
    (state) => state.currentConversation
  );
  const setCurrentConversation = useConversationStore(
    (state) => state.setCurrentConversation
  );
  const setCurrentFamily = useConversationStore(
    (state) => state.setCurrentFamily
  );
  const setConversations = useConversationStore(
    (state) => state.setConversations
  );
  const updateConversationTitle = useConversationStore(
    (state) => state.updateConversationTitle
  );
  const sendMessage = useConversationStore((state) => state.sendMessage);
  const deleteConversation = useConversationStore(
    (state) => state.deleteConversation
  );
  const isLoading = useConversationStore((state) => state.isLoading);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [familyLabel, setFamilyLabel] = useState<string | null>(null);
  const [hasFiles, setHasFiles] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');

  // 家族IDに応じて会話一覧を取得
  useEffect(() => {
    if (!familyId) return;
    setCurrentFamily(familyId);

    const loadConversations = async () => {
      try {
        // 家族名の取得
        const supabase = createSupabaseClient();

        // 家族名の取得
        const { data: family, error: familyError } = await supabase
          .from('families')
          .select('label')
          .eq('id', familyId)
          .maybeSingle();

        if (!familyError && family) {
          setFamilyLabel(family.label);
        }

        // ファイル有無の判定
        const { count: fileCount } = await supabase
          .from('family_files')
          .select('*', { count: 'exact', head: true })
          .eq('family_id', familyId);

        setHasFiles((fileCount ?? 0) > 0);

        const res = await fetch(`/api/chat?familyId=${familyId}`);

        if (res.status === 401 || res.status === 403) {
          toast.error('この家族のチャットにアクセスする権限がありません');
          router.replace('/chat');
          return;
        }

        if (!res.ok) {
          console.error('会話一覧の取得に失敗しました:', await res.text());
          toast.error('会話一覧の取得に失敗しました');
          return;
        }

        const data: {
          conversations: Array<{
            id: string;
            familyId: string;
            title: string;
            fileSearchEnabled: boolean;
            createdAt: string;
            updatedAt: string;
            messages: Array<{
              id: string;
              role: 'user' | 'assistant';
              content: string;
              timestamp: string;
              fileSearchUsed?: boolean;
            }>;
          }>;
        } = await res.json();

        const mapped = data.conversations.map((c) => ({
          id: c.id,
          familyId: c.familyId,
          title: c.title,
          fileSearchEnabled: c.fileSearchEnabled,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
          messages: c.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.timestamp),
            fileSearchUsed: m.fileSearchUsed,
          })),
        }));

        setConversations(mapped);
      } catch (error) {
        console.error('会話一覧取得中にエラーが発生しました:', error);
        toast.error('会話一覧の取得に失敗しました');
      }
    };

    loadConversations();
  }, [familyId, setCurrentFamily, setConversations, router]);

  // メッセージ末尾までスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages]);

  const handleNewChat = () => {
    setCurrentConversation(null);
    toast.success('新しい会話を開始しました。メッセージを入力してください。');
  };

  const handleDeleteChat = async (id: string) => {
    if (confirm('この会話を削除してもよろしいですか？')) {
      await deleteConversation(id);
      toast.success('会話を削除しました');
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Conversations Sidebar */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">会話履歴</CardTitle>
            <Button size="sm" onClick={handleNewChat}>
              <Plus className="h-4 w-4 mr-1" />
              新規
            </Button>
          </div>
          <CardDescription>この家族との会話を管理します</CardDescription>
          <div className="text-xs text-muted-foreground">
            <Link href="/chat" className="underline">
              他の家族を選択
            </Link>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-2 p-4 pt-0">
          {conversations.map((conv) => {
            const isActive = currentConversation?.id === conv.id;
            return (
              <div
                key={conv.id}
                className={`group flex items-start gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                }`}
                onClick={() => setCurrentConversation(conv.id)}
              >
                <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{conv.title}</p>
                  <p className="text-xs opacity-70">
                    {conv.messages.length}件のメッセージ
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className={`h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ${
                    isActive ? 'text-primary-foreground' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChat(conv.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
          {conversations.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              まだ会話がありません。画面下部からメッセージを送信して開始してください。
            </p>
          )}
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="border-b flex items-center justify-between gap-3">
          <div>
            <CardTitle>{familyLabel || '家族チャット'}</CardTitle>
            <CardDescription>
              {isEditingTitle && currentConversation ? (
                <input
                  className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  maxLength={100}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void (async () => {
                        if (!currentConversation) return;
                        const trimmed = editingTitle.trim();
                        try {
                          const res = await fetch('/api/chat', {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              familyId,
                              conversationId: currentConversation.id,
                              title: trimmed,
                            }),
                          });
                          if (!res.ok) {
                            toast.error('タイトルの更新に失敗しました');
                            return;
                          }
                          updateConversationTitle(
                            currentConversation.id,
                            trimmed || '新しい会話'
                          );
                          setIsEditingTitle(false);
                          toast.success('会話タイトルを更新しました');
                        } catch (error) {
                          console.error('タイトル更新エラー:', error);
                          toast.error('タイトルの更新に失敗しました');
                        }
                      })();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setIsEditingTitle(false);
                    }
                  }}
                />
              ) : (
                currentConversation?.title || '新しい会話'
              )}
            </CardDescription>
          </div>
          {currentConversation && !isLoading && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setEditingTitle(currentConversation.title || '');
                setIsEditingTitle(true);
              }}
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">会話タイトルを編集</span>
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4">
          {currentConversation && currentConversation.messages.length > 0 ? (
            <div className="space-y-4">
              {currentConversation.messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isLoading && (
                <div className="flex gap-3 py-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-br from-green-600 to-teal-600 text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-1 rounded-lg px-4 py-3 max-w-[80%] bg-muted">
                    <span className="sr-only">AIが応答を生成中です</span>
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/70 animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center">
              {isLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-br from-green-600 to-teal-600 text-white">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-1 rounded-lg px-4 py-3 max-w-[80%] bg-muted">
                      <span className="sr-only">AIが応答を生成中です</span>
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/70 animate-bounce" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    AIが最初の応答を作成しています...
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-semibold">
                    介護サポートAIチャットを開始しましょう
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    この家族に関する質問や相談を、画面下部の入力欄から送信してください。
                    登録された資料を参照しながら、日本語で丁寧に回答します。
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <ChatInput
          onSend={sendMessage}
          isLoading={isLoading}
          fileSearchAvailable={hasFiles}
        />
      </Card>
    </div>
  );
}
