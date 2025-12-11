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
  Plus,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const { profile } = useAuth();

  // 認証成功時のトースト表示
  useEffect(() => {
    const authStatus = searchParams.get('auth');
    if (authStatus === 'success' && profile) {
      toast.success(`${profile.full_name || 'ユーザー'}さん、ログインしました！`);
      // URLパラメータをクリア
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams, profile]);

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

    </div>
  );
}
