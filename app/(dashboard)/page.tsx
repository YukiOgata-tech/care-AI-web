'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  FileText,
  TrendingUp,
  Plus,
  Clock,
  Search,
  CheckCircle,
} from 'lucide-react';
import { useConversationStore, useDocumentStore } from '@/lib/store';
import { dummyStats } from '@/lib/dummy-data';
import { formatRelativeTime, getCategoryColor, getCategoryLabel } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const conversations = useConversationStore((state) => state.conversations);
  const documents = useDocumentStore((state) => state.documents);

  // 認証成功時のトースト表示
  useEffect(() => {
    const authStatus = searchParams.get('auth');
    if (authStatus === 'success' && profile) {
      toast.success(`${profile.full_name || 'ユーザー'}さん、ログインしました！`);
      // URLパラメータをクリア
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams, profile]);

  const recentConversations = conversations.slice(0, 5);
  const recentDocuments = documents.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">ダッシュボード</h1>
          {profile && (
            <Badge variant="outline" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>ログイン中</span>
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">
          {profile?.full_name ? `${profile.full_name}さん、` : ''}介護サポートAIへようこそ。今日も安心安全なケアをサポートします。
        </p>

        {/* ユーザー情報表示 */}
        {profile && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
            <h3 className="text-sm font-semibold mb-2">アカウント情報</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">名前:</span>{' '}
                <span className="font-medium">{profile.full_name || '未設定'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">メール:</span>{' '}
                <span className="font-medium">{profile.email || '未設定'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">ロール:</span>{' '}
                <Badge variant="secondary">
                  {profile.primary_role === 'super_admin' && 'スーパー管理者'}
                  {profile.primary_role === 'admin' && '管理者'}
                  {profile.primary_role === 'manager' && 'マネージャー'}
                  {profile.primary_role === 'staff' && 'スタッフ'}
                  {profile.primary_role === 'family' && '家族'}
                </Badge>
              </div>
              {profile.is_super_admin && (
                <div>
                  <Badge variant="destructive" className="text-xs">
                    全データアクセス可能
                  </Badge>
                </div>
              )}
            </div>

            {/* 所属情報 */}
            {profile.families && profile.families.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <span className="text-xs text-muted-foreground">所属家族:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {profile.families.map((family) => (
                    <Badge key={family.family_id} variant="outline" className="text-xs">
                      {family.family_label || '未設定'}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {profile.organizations && profile.organizations.length > 0 && (
              <div className="mt-2">
                <span className="text-xs text-muted-foreground">所属組織:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {profile.organizations.map((org) => (
                    <Badge key={org.organization_id} variant="outline" className="text-xs">
                      {org.organization_name || '未設定'}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">総会話数</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dummyStats.totalConversations}</div>
            <p className="text-xs text-muted-foreground">
              今週 +{dummyStats.conversationsThisWeek}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">登録ファイル</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dummyStats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              今週 +{dummyStats.documentsThisWeek}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">AI検索利用</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78%</div>
            <p className="text-xs text-muted-foreground">
              File Search機能の利用率
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">応答速度</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.2秒</div>
            <p className="text-xs text-muted-foreground">平均応答時間</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>クイックアクション</CardTitle>
          <CardDescription>よく使う機能へすぐにアクセス</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Link href="/chat">
            <Button className="w-full h-auto py-6" variant="outline">
              <div className="flex flex-col items-center gap-2">
                <MessageSquare className="h-6 w-6" />
                <div>
                  <div className="font-semibold">新しいチャット</div>
                  <div className="text-xs text-muted-foreground">
                    AIに質問する
                  </div>
                </div>
              </div>
            </Button>
          </Link>

          <Link href="/files">
            <Button className="w-full h-auto py-6" variant="outline">
              <div className="flex flex-col items-center gap-2">
                <Plus className="h-6 w-6" />
                <div>
                  <div className="font-semibold">ファイル追加</div>
                  <div className="text-xs text-muted-foreground">
                    資料をアップロード
                  </div>
                </div>
              </div>
            </Button>
          </Link>

          <Link href="/chat">
            <Button className="w-full h-auto py-6" variant="outline">
              <div className="flex flex-col items-center gap-2">
                <Clock className="h-6 w-6" />
                <div>
                  <div className="font-semibold">前回の続き</div>
                  <div className="text-xs text-muted-foreground">
                    会話を再開
                  </div>
                </div>
              </div>
            </Button>
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Conversations */}
        <Card>
          <CardHeader>
            <CardTitle>最近の会話</CardTitle>
            <CardDescription>直近の会話履歴</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentConversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/chat?id=${conversation.id}`}
                  className="block"
                >
                  <div className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent transition-colors">
                    <MessageSquare className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium line-clamp-1">
                        {conversation.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {conversation.messages.length}件のメッセージ •{' '}
                        {formatRelativeTime(conversation.updatedAt)}
                      </p>
                    </div>
                    {conversation.fileSearchEnabled && (
                      <Badge variant="secondary" className="text-xs">
                        検索ON
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
              {recentConversations.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  まだ会話がありません
                </p>
              )}
            </div>
            {recentConversations.length > 0 && (
              <Link href="/chat">
                <Button variant="outline" className="w-full mt-4">
                  すべて表示
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card>
          <CardHeader>
            <CardTitle>最近のファイル</CardTitle>
            <CardDescription>直近にアップロードされたファイル</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentDocuments.map((document) => (
                <div
                  key={document.id}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <FileText className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium line-clamp-1">
                      {document.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(document.uploadedAt)}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={getCategoryColor(document.category)}
                  >
                    {getCategoryLabel(document.category)}
                  </Badge>
                </div>
              ))}
              {recentDocuments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  まだファイルがありません
                </p>
              )}
            </div>
            {recentDocuments.length > 0 && (
              <Link href="/files">
                <Button variant="outline" className="w-full mt-4">
                  すべて表示
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
