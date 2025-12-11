'use client';

import { useState, useEffect } from 'react';
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
import { getRoleLabel, getRoleIcon } from '@/hooks/useFamilyPermissions';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Users, Home, AlertCircle, Plus } from 'lucide-react';
import Link from 'next/link';

interface FamilyMembership {
  family_id: string;
  family_label: string;
  organization_name: string;
  role: string;
  relationship: string | null;
}

export default function FamiliesSettingsPage() {
  const router = useRouter();
  const { profile, refetchProfile } = useAuth();
  const [families, setFamilies] = useState<FamilyMembership[]>([]);
  const [invitationCode, setInvitationCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFamilies();
  }, [profile]);

  const fetchFamilies = async () => {
    if (!profile) return;

    setIsLoading(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('family_members')
        .select(`
          family_id,
          role,
          relationship,
          families (
            label,
            organizations (
              name
            )
          )
        `)
        .eq('user_id', profile.user_id);

      if (error) throw error;

      const familyList: FamilyMembership[] = (data || []).map((fm: any) => ({
        family_id: fm.family_id,
        family_label: fm.families?.label || '不明',
        organization_name: fm.families?.organizations?.name || '不明',
        role: fm.role,
        relationship: fm.relationship,
      }));

      setFamilies(familyList);
    } catch (error: any) {
      console.error('家族一覧取得エラー:', error);
      toast.error('家族一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitationCode.trim()) {
      toast.error('招待コードを入力してください');
      return;
    }

    setIsJoining(true);
    try {
      const supabase = createClient();

      // 招待コードを検証
      const { data: invitation, error: invitationError } = await supabase
        .from('family_invitations')
        .select('*')
        .eq('code', invitationCode.trim().toUpperCase())
        .eq('is_active', true)
        .single();

      if (invitationError || !invitation) {
        toast.error('無効な招待コードです');
        return;
      }

      // 有効期限チェック
      if (new Date(invitation.expires_at) < new Date()) {
        toast.error('この招待コードは期限切れです');
        return;
      }

      // 使用回数チェック
      if (invitation.used_count >= invitation.max_uses) {
        toast.error('この招待コードは使用済みです');
        return;
      }

      // 既に参加していないかチェック
      const { data: existingMember } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('family_id', invitation.family_id)
        .eq('user_id', profile!.user_id)
        .single();

      if (existingMember) {
        toast.error('既にこの家族に参加しています');
        return;
      }

      // 家族メンバーとして追加
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: invitation.family_id,
          user_id: profile!.user_id,
          role: invitation.role,
          relationship: invitation.relationship,
        });

      if (memberError) throw memberError;

      // 招待コードの使用回数を増やす
      await supabase
        .from('family_invitations')
        .update({
          used_count: invitation.used_count + 1,
          is_active: invitation.used_count + 1 >= invitation.max_uses ? false : true,
        })
        .eq('id', invitation.id);

      toast.success('家族に参加しました');
      setInvitationCode('');

      // プロフィール情報を再取得
      await refetchProfile();

      // 家族一覧を再取得
      fetchFamilies();
    } catch (error: any) {
      console.error('家族参加エラー:', error);
      toast.error(error.message || '家族への参加に失敗しました');
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
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">家族設定</h1>
            <p className="text-muted-foreground mt-1">
              参加している家族を管理します
            </p>
          </div>
        </div>
      </div>

      {/* 参加している家族 */}
      <Card>
        <CardHeader>
          <CardTitle>参加している家族</CardTitle>
          <CardDescription>
            あなたが参加している家族の一覧
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : families.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="bg-muted p-4 rounded-full mb-4">
                <Home className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                まだ家族に参加していません
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                招待コードを使用して家族に参加してください
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {families.map((family) => (
                <div
                  key={family.family_id}
                  className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/families/${family.family_id}`)}
                >
                  <div className="text-2xl">
                    {getRoleIcon(family.role as any)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{family.family_label}</p>
                      <Badge variant="secondary">
                        {getRoleLabel(family.role as any)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {family.organization_name}
                    </p>
                    {family.relationship && (
                      <p className="text-xs text-muted-foreground mt-1">
                        関係: {family.relationship}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 招待コードで参加 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            招待コードで家族に参加
          </CardTitle>
          <CardDescription>
            家族から受け取った招待コードを入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">招待コードについて</p>
                <p className="text-sm text-muted-foreground mt-1">
                  家族のケアマネージャーまたは事業所の管理者から招待コードを受け取ってください
                </p>
              </div>
            </div>

            <form onSubmit={handleJoinFamily} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invitation-code">招待コード</Label>
                <Input
                  id="invitation-code"
                  type="text"
                  placeholder="例: ABC12345"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                  disabled={isJoining}
                  className="font-mono"
                  maxLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  ※ 招待コードは8文字の英数字です
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
                  戻る
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
