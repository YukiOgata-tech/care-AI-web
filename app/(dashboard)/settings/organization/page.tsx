'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const { profile, joinOrganization } = useAuth();
  const [invitationCode, setInvitationCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinOrganization = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitationCode.trim()) {
      toast.error('招待コードを入力してください');
      return;
    }

    setIsJoining(true);
    try {
      await joinOrganization(invitationCode.trim());
      toast.success('事業所に参加しました');
      setInvitationCode('');
    } catch (error: any) {
      console.error('事業所参加エラー:', error);
      toast.error(error.message || '事業所への参加に失敗しました');
    } finally {
      setIsJoining(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasOrganization = profile.organizations && profile.organizations.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          設定に戻る
        </Link>
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-3 rounded-lg">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">事業所設定</h1>
            <p className="text-muted-foreground mt-1">
              所属する事業所を管理します
            </p>
          </div>
        </div>
      </div>

      {/* 所属事業所情報 */}
      {hasOrganization ? (
        <Card>
          <CardHeader>
            <CardTitle>所属事業所</CardTitle>
            <CardDescription>
              現在所属している事業所の情報
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="mt-1">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-lg">
                    {profile.organizations[0].organization_name}
                  </p>
                  <Badge variant="secondary">
                    {profile.organizations[0].role === 'owner' && 'オーナー'}
                    {profile.organizations[0].role === 'manager' && 'マネージャー'}
                    {profile.organizations[0].role === 'staff' && 'スタッフ'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  この事業所に所属しています
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* 招待コード入力フォーム */
        <Card>
          <CardHeader>
            <CardTitle>事業所に参加</CardTitle>
            <CardDescription>
              招待コードを入力して事業所に参加できます
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm">事業所に所属していません</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    事業所の管理者から招待コードを受け取って参加してください
                  </p>
                </div>
              </div>

              <form onSubmit={handleJoinOrganization} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invitationCode">招待コード</Label>
                  <Input
                    id="invitationCode"
                    type="text"
                    placeholder="例: ABC123XYZ"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                    disabled={isJoining}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    ※ 招待コードは事業所の管理者から提供されます
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={isJoining}>
                    {isJoining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    参加する
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/settings')}
                    disabled={isJoining}
                  >
                    キャンセル
                  </Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
