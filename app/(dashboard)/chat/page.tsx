'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ChatPage() {
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('id');

  const conversations = useConversationStore((state) => state.conversations);
  const currentConversation = useConversationStore(
    (state) => state.currentConversation
  );
  const setCurrentConversation = useConversationStore(
    (state) => state.setCurrentConversation
  );
  const createConversation = useConversationStore(
    (state) => state.createConversation
  );
  const sendMessage = useConversationStore((state) => state.sendMessage);
  const deleteConversation = useConversationStore(
    (state) => state.deleteConversation
  );
  const isLoading = useConversationStore((state) => state.isLoading);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversationId) {
      setCurrentConversation(conversationId);
    }
  }, [conversationId, setCurrentConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages]);

  const handleNewChat = () => {
    createConversation();
    toast.success('新しい会話を開始しました');
  };

  const handleDeleteChat = (id: string) => {
    if (confirm('この会話を削除してもよろしいですか？')) {
      deleteConversation(id);
      toast.success('会話を削除しました');
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Conversations Sidebar */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">会話履歴</CardTitle>
            <Button size="sm" onClick={handleNewChat}>
              <Plus className="h-4 w-4 mr-1" />
              新規
            </Button>
          </div>
          <CardDescription>過去の会話を選択</CardDescription>
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
              会話履歴がありません
            </p>
          )}
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            <CardHeader className="border-b">
              <CardTitle>{currentConversation.title}</CardTitle>
              <CardDescription>
                {currentConversation.fileSearchEnabled
                  ? '資料検索モード: 登録された資料を参照して回答'
                  : '通常モード: 一般的なAI回答'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4">
              {currentConversation.messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center">
                  <div className="space-y-2">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h3 className="text-lg font-semibold">
                      介護サポートAIへようこそ
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      介護に関する疑問や不安なこと、何でもお気軽にご質問ください。
                      登録された資料を参照して、適切な回答をサポートします。
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentConversation.messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </CardContent>
            <ChatInput onSend={sendMessage} isLoading={isLoading} />
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-center p-6">
            <div className="space-y-4">
              <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground" />
              <h3 className="text-xl font-semibold">会話を選択してください</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                左側の会話履歴から選択するか、新しい会話を開始してください
              </p>
              <Button onClick={handleNewChat}>
                <Plus className="mr-2 h-4 w-4" />
                新しい会話を開始
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
