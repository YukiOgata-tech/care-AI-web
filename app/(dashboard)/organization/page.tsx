'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  Users,
  Ticket,
  Copy,
  XCircle,
  Loader2,
  Home,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { OrganizationMemberRole } from '@/lib/supabase/types';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface Organization {
  id: string;
  name: string;
  billing_plan: string;
  email: string | null;
  address: string | null;
  current_family_count: number;
  current_staff_count: number;
  business_url: string | null;
  created_at: string;
}

interface OrganizationMember {
  organization_id: string;
  user_id: string;
  role: OrganizationMemberRole;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
}

interface Invitation {
  id: string;
  organization_id: string;
  code: string;
  role: OrganizationMemberRole;
  created_by: string;
  expires_at: string;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  created_at: string;
}

export default function OrganizationPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [familyCount, setFamilyCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createInvitationDialogOpen, setCreateInvitationDialogOpen] = useState(false);

  // 招待コード作成フォーム
  const [invitationRole, setInvitationRole] = useState<OrganizationMemberRole>('staff');
  const [invitationMaxUses, setInvitationMaxUses] = useState('1');
  const [invitationExpiresInHours, setInvitationExpiresInHours] = useState('24');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    checkAccess();
  }, [profile]);

  const checkAccess = async () => {
    if (!profile) return;

    // owner/manager のみアクセス可能
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', profile.user_id)
      .single();

    if (!membership || !['owner', 'manager'].includes(membership.role)) {
      toast.error('この機能にアクセスする権限がありません');
      router.replace('/');
      return;
    }

    fetchOrganizationData(membership.organization_id);
  };

  const fetchOrganizationData = async (organizationId: string) => {
    try {
      setLoading(true);

      // 事業所情報取得
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (orgError) throw orgError;
      setOrganization(org);

      // メンバー情報取得
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', organizationId);

      if (membersError) throw membersError;

      const membersWithUser = await Promise.all(
        (membersData || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('app_profiles')
            .select('full_name, phone')
            .eq('user_id', member.user_id)
            .single();

          const shortId = member.user_id.substring(0, 8) + '...';

          return {
            ...member,
            user_name: profile?.full_name || null,
            user_email: shortId,
            user_phone: profile?.phone || null,
          };
        })
      );

      setMembers(membersWithUser);

      // 家族数取得
      const { count } = await supabase
        .from('families')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      setFamilyCount(count || 0);

      // 招待コード取得
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('organization_invitations')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (invitationsError) {
        console.error('招待コード取得エラー:', invitationsError);
      } else {
        setInvitations(invitationsData || []);
      }
    } catch (error: any) {
      console.error('データ取得エラー:', error);
      toast.error('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const generateInvitationCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateInvitation = async () => {
    if (!organization) return;

    try {
      setFormSubmitting(true);

      const maxUses = parseInt(invitationMaxUses) || 1;
      const expiresInHours = parseInt(invitationExpiresInHours);

      if (expiresInHours < 1 || expiresInHours > 120) {
        toast.error('有効期限は1〜120時間の範囲で設定してください');
        setFormSubmitting(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ユーザーが見つかりません');

      // 過去7日間の招待コード作成数をチェック（週5件制限）
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentInvitations, error: countError } = await supabase
        .from('organization_invitations')
        .select('id')
        .eq('organization_id', organization.id)
        .gte('created_at', sevenDaysAgo);

      if (countError) throw countError;

      if (recentInvitations && recentInvitations.length >= 5) {
        toast.error('過去7日間で既に5件の招待コードを作成しています。時間をおいて再度お試しください。');
        setFormSubmitting(false);
        return;
      }

      const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
      const code = generateInvitationCode();

      const { error } = await supabase
        .from('organization_invitations')
        .insert({
          organization_id: organization.id,
          code,
          role: invitationRole,
          created_by: user.id,
          expires_at: expiresAt,
          max_uses: maxUses,
        });

      if (error) throw error;

      toast.success(`招待コード「${code}」を作成しました（有効期限: ${expiresInHours}時間）`);
      setCreateInvitationDialogOpen(false);
      setInvitationRole('staff');
      setInvitationMaxUses('1');
      setInvitationExpiresInHours('24');
      fetchOrganizationData(organization.id);
    } catch (error: any) {
      console.error('招待コード作成エラー:', error);
      toast.error('招待コードの作成に失敗しました');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeactivateInvitation = async (invitationId: string) => {
    if (!confirm('この招待コードを無効化しますか？')) return;
    if (!organization) return;

    try {
      const { error } = await supabase
        .from('organization_invitations')
        .update({ is_active: false })
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('招待コードを無効化しました');
      fetchOrganizationData(organization.id);
    } catch (error: any) {
      console.error('招待コード無効化エラー:', error);
      toast.error('招待コードの無効化に失敗しました');
    }
  };

  const handleCopyInvitationCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('招待コードをコピーしました');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">事業所に所属していません</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">{organization.name}</h1>
          <Badge variant="outline">{organization.billing_plan}</Badge>
        </div>
        <p className="text-muted-foreground">
          事業所の情報とメンバー管理
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">メンバー数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organization.current_staff_count}</div>
            <p className="text-xs text-muted-foreground">登録: {members.length}人</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">担当家族数</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organization.current_family_count}</div>
            <p className="text-xs text-muted-foreground">実測: {familyCount}件</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">作成日</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {formatRelativeTime(organization.created_at)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organization Details */}
      <Card>
        <CardHeader>
          <CardTitle>事業所情報</CardTitle>
          <CardDescription>
            事業所の基本情報
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">メールアドレス</dt>
              <dd className="mt-1 text-sm">{organization.email || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">住所</dt>
              <dd className="mt-1 text-sm">{organization.address || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">ウェブサイト</dt>
              <dd className="mt-1 text-sm">
                {organization.business_url ? (
                  <a href={organization.business_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {organization.business_url}
                  </a>
                ) : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">料金プラン</dt>
              <dd className="mt-1 text-sm">
                <Badge variant="outline">{organization.billing_plan}</Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>メンバー一覧</CardTitle>
          <CardDescription>
            事業所に所属するメンバー
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              メンバーが登録されていません
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名前</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>電話番号</TableHead>
                  <TableHead>ロール</TableHead>
                  <TableHead>追加日</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.user_id}>
                    <TableCell className="font-medium">
                      {member.user_name || '未設定'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{member.user_email}</TableCell>
                    <TableCell>{member.user_phone || '未設定'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {member.role === 'owner' && 'オーナー'}
                        {member.role === 'manager' && 'マネージャー'}
                        {member.role === 'staff' && 'スタッフ'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelativeTime(member.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invitation Codes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>招待コード管理</CardTitle>
              <CardDescription>
                新しいスタッフや家族を招待するためのコードを管理します
              </CardDescription>
            </div>
            <Button onClick={() => setCreateInvitationDialogOpen(true)}>
              <Ticket className="h-4 w-4 mr-2" />
              新規作成
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              招待コードが作成されていません
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>コード</TableHead>
                  <TableHead>ロール</TableHead>
                  <TableHead>使用状況</TableHead>
                  <TableHead>有効期限</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>作成日</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => {
                  const isExpired = new Date(invitation.expires_at) < new Date();
                  const isMaxed = invitation.used_count >= invitation.max_uses;
                  const isUsable = invitation.is_active && !isExpired && !isMaxed;

                  return (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-mono font-bold">
                        {invitation.code}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {invitation.role === 'owner' && 'オーナー'}
                          {invitation.role === 'manager' && 'マネージャー'}
                          {invitation.role === 'staff' && 'スタッフ'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={isMaxed ? 'text-destructive' : ''}>
                          {invitation.used_count} / {invitation.max_uses}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className={isExpired ? 'text-destructive' : ''}>
                          {formatRelativeTime(invitation.expires_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isUsable ? (
                          <Badge variant="default" className="bg-green-600">有効</Badge>
                        ) : (
                          <Badge variant="secondary">無効</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatRelativeTime(invitation.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyInvitationCode(invitation.code)}
                            title="コピー"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {invitation.is_active && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeactivateInvitation(invitation.id)}
                              title="無効化"
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Invitation Dialog */}
      <Dialog open={createInvitationDialogOpen} onOpenChange={setCreateInvitationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>招待コードを作成</DialogTitle>
            <DialogDescription>
              新しいメンバーを招待するためのコードを生成します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invitation-role">付与するロール</Label>
              <Select value={invitationRole} onValueChange={(value) => setInvitationRole(value as OrganizationMemberRole)}>
                <SelectTrigger id="invitation-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">オーナー</SelectItem>
                  <SelectItem value="manager">マネージャー</SelectItem>
                  <SelectItem value="staff">スタッフ</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                このコードを使用して登録したユーザーに付与されるロールです
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invitation-max-uses">最大使用回数</Label>
              <Input
                id="invitation-max-uses"
                type="number"
                min="1"
                placeholder="1"
                value={invitationMaxUses}
                onChange={(e) => setInvitationMaxUses(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                このコードを使用できる最大回数を設定します
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invitation-expires">有効期限（時間）</Label>
              <div className="flex gap-2 mb-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setInvitationExpiresInHours('1')}
                  className={invitationExpiresInHours === '1' ? 'bg-accent' : ''}
                >
                  1時間
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setInvitationExpiresInHours('6')}
                  className={invitationExpiresInHours === '6' ? 'bg-accent' : ''}
                >
                  6時間
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setInvitationExpiresInHours('24')}
                  className={invitationExpiresInHours === '24' ? 'bg-accent' : ''}
                >
                  24時間
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setInvitationExpiresInHours('120')}
                  className={invitationExpiresInHours === '120' ? 'bg-accent' : ''}
                >
                  5日
                </Button>
              </div>
              <Input
                id="invitation-expires"
                type="number"
                min="1"
                max="120"
                placeholder="24"
                value={invitationExpiresInHours}
                onChange={(e) => setInvitationExpiresInHours(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                1〜120時間（最大5日間）の範囲で設定してください
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateInvitationDialogOpen(false)}
              disabled={formSubmitting}
            >
              キャンセル
            </Button>
            <Button onClick={handleCreateInvitation} disabled={formSubmitting}>
              {formSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              作成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
