'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  ArrowLeft,
  Building2,
  Users,
  UserPlus,
  Trash2,
  Loader2,
  Home,
  Pencil,
  Ticket,
  Copy,
  XCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { OrganizationMemberWithUser, OrganizationMemberRole } from '@/lib/supabase/types';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

interface Organization {
  id: string;
  name: string;
  billing_plan: string;
  logo_url: string | null;
  custom_domain: string | null;
  email: string | null;
  address: string | null;
  current_family_count: number;
  current_staff_count: number;
  business_url: string | null;
  created_at: string;
  updated_at: string;
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

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.id as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMemberWithUser[]>([]);
  const [familyCount, setFamilyCount] = useState(0);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createInvitationDialogOpen, setCreateInvitationDialogOpen] = useState(false);

  // フォーム状態
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<OrganizationMemberRole>('staff');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBillingPlan, setEditBillingPlan] = useState('standard');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBusinessUrl, setEditBusinessUrl] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editCustomDomain, setEditCustomDomain] = useState('');

  // 招待コード作成フォーム
  const [invitationRole, setInvitationRole] = useState<OrganizationMemberRole>('staff');
  const [invitationMaxUses, setInvitationMaxUses] = useState('1');
  const [invitationExpiresInHours, setInvitationExpiresInHours] = useState('24');

  const supabase = createClient();

  useEffect(() => {
    if (organizationId) {
      fetchOrganizationData();
    }
  }, [organizationId]);

  const fetchOrganizationData = async () => {
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
      setEditName(org.name);
      setEditBillingPlan(org.billing_plan);
      setEditEmail(org.email || '');
      setEditAddress(org.address || '');
      setEditBusinessUrl(org.business_url || '');
      setEditLogoUrl(org.logo_url || '');
      setEditCustomDomain(org.custom_domain || '');

      // メンバー情報取得（ユーザー情報も含む）
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          user_id,
          role,
          created_at
        `)
        .eq('organization_id', organizationId);

      if (membersError) throw membersError;

      // 各メンバーのユーザー情報を取得
      const membersWithUser = await Promise.all(
        (membersData || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('app_profiles')
            .select('full_name, phone')
            .eq('user_id', member.user_id)
            .single();

          // user_idの最初の8文字を表示
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

  const handleUpdateOrganization = async () => {
    if (!editName.trim()) {
      toast.error('事業所名を入力してください');
      return;
    }

    try {
      setFormSubmitting(true);

      const { error } = await supabase
        .from('organizations')
        .update({
          name: editName,
          billing_plan: editBillingPlan,
          email: editEmail || null,
          address: editAddress || null,
          business_url: editBusinessUrl || null,
          logo_url: editLogoUrl || null,
          custom_domain: editCustomDomain || null,
        })
        .eq('id', organizationId);

      if (error) throw error;

      toast.success('事業所情報を更新しました');
      setEditDialogOpen(false);
      fetchOrganizationData();
    } catch (error: any) {
      console.error('事業所更新エラー:', error);
      toast.error('事業所の更新に失敗しました');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleAddMember = async () => {
    if (!memberEmail.trim()) {
      toast.error('ユーザーIDを入力してください');
      return;
    }

    try {
      setFormSubmitting(true);

      // メンバーを追加
      const { error: insertError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: memberEmail,
          role: memberRole,
        });

      if (insertError) {
        if (insertError.code === '23505') {
          toast.error('このユーザーは既にメンバーです');
        } else {
          throw insertError;
        }
        return;
      }

      toast.success('メンバーを追加しました');
      setAddMemberDialogOpen(false);
      setMemberEmail('');
      setMemberRole('staff');
      fetchOrganizationData();
    } catch (error: any) {
      console.error('メンバー追加エラー:', error);
      toast.error('メンバーの追加に失敗しました');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('このメンバーを削除しますか？')) return;

    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', organizationId)
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('メンバーを削除しました');
      fetchOrganizationData();
    } catch (error: any) {
      console.error('メンバー削除エラー:', error);
      toast.error('メンバーの削除に失敗しました');
    }
  };

  const handleUpdateMemberRole = async (userId: string, newRole: OrganizationMemberRole) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('organization_id', organizationId)
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('ロールを更新しました');
      fetchOrganizationData();
    } catch (error: any) {
      console.error('ロール更新エラー:', error);
      toast.error('ロールの更新に失敗しました');
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
    try {
      setFormSubmitting(true);

      const maxUses = parseInt(invitationMaxUses) || 1;
      const expiresInHours = parseInt(invitationExpiresInHours);

      // 有効期限の範囲チェック（1〜120時間）
      if (expiresInHours < 1 || expiresInHours > 120) {
        toast.error('有効期限は1〜120時間の範囲で設定してください');
        setFormSubmitting(false);
        return;
      }

      // 現在のユーザーIDを取得
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ユーザーが見つかりません');

      // 過去7日間の招待コード作成数をチェック（週5件制限）
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentInvitations, error: countError } = await supabase
        .from('organization_invitations')
        .select('id')
        .eq('organization_id', organizationId)
        .gte('created_at', sevenDaysAgo);

      if (countError) throw countError;

      if (recentInvitations && recentInvitations.length >= 5) {
        toast.error('この事業所は過去7日間で既に5件の招待コードを作成しています。時間をおいて再度お試しください。');
        setFormSubmitting(false);
        return;
      }

      // 有効期限を設定（時間単位）
      const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

      const code = generateInvitationCode();

      const { error } = await supabase
        .from('organization_invitations')
        .insert({
          organization_id: organizationId,
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
      fetchOrganizationData();
    } catch (error: any) {
      console.error('招待コード作成エラー:', error);
      toast.error('招待コードの作成に失敗しました');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeactivateInvitation = async (invitationId: string) => {
    if (!confirm('この招待コードを無効化しますか？')) return;

    try {
      const { error } = await supabase
        .from('organization_invitations')
        .update({ is_active: false })
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('招待コードを無効化しました');
      fetchOrganizationData();
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
        <p className="text-muted-foreground">事業所が見つかりません</p>
        <Link href="/admin/organizations">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            一覧に戻る
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <Link href="/admin/organizations">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            事業所一覧に戻る
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-8 w-8 text-destructive" />
            <h1 className="text-3xl font-bold tracking-tight">{organization.name}</h1>
            <Badge variant="outline">{organization.billing_plan}</Badge>
          </div>
          <Button onClick={() => setEditDialogOpen(true)} variant="outline">
            <Pencil className="h-4 w-4 mr-2" />
            編集
          </Button>
        </div>
        <p className="text-muted-foreground">
          事業所の詳細情報とメンバー管理
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
          <CardTitle>事業所詳細情報</CardTitle>
          <CardDescription>
            事業所の基本情報を表示しています
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
              <dt className="text-sm font-medium text-muted-foreground">カスタムドメイン</dt>
              <dd className="mt-1 text-sm">{organization.custom_domain || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">ロゴURL</dt>
              <dd className="mt-1 text-sm">
                {organization.logo_url ? (
                  <a href={organization.logo_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {organization.logo_url}
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>メンバー管理</CardTitle>
              <CardDescription>
                事業所に所属するメンバーを管理します
              </CardDescription>
            </div>
            <Button onClick={() => setAddMemberDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              メンバー追加
            </Button>
          </div>
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
                  <TableHead className="text-right">操作</TableHead>
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
                      <Select
                        value={member.role}
                        onValueChange={(value) =>
                          handleUpdateMemberRole(member.user_id, value as OrganizationMemberRole)
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">オーナー</SelectItem>
                          <SelectItem value="manager">マネージャー</SelectItem>
                          <SelectItem value="staff">スタッフ</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelativeTime(member.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.user_id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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

      {/* Edit Organization Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>事業所を編集</DialogTitle>
            <DialogDescription>
              事業所情報を更新します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="edit-name">事業所名</Label>
              <Input
                id="edit-name"
                placeholder="例: ○○訪問介護"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">メールアドレス</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="info@example.com"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">住所</Label>
              <Input
                id="edit-address"
                placeholder="東京都〇〇区..."
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-business-url">ウェブサイトURL</Label>
              <Input
                id="edit-business-url"
                type="url"
                placeholder="https://example.com"
                value={editBusinessUrl}
                onChange={(e) => setEditBusinessUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-logo-url">ロゴURL</Label>
              <Input
                id="edit-logo-url"
                type="url"
                placeholder="https://example.com/logo.png"
                value={editLogoUrl}
                onChange={(e) => setEditLogoUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-custom-domain">カスタムドメイン</Label>
              <Input
                id="edit-custom-domain"
                placeholder="example.care-ai.jp"
                value={editCustomDomain}
                onChange={(e) => setEditCustomDomain(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-plan">料金プラン</Label>
              <Select value={editBillingPlan} onValueChange={setEditBillingPlan}>
                <SelectTrigger id="edit-plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">無料プラン</SelectItem>
                  <SelectItem value="standard">スタンダード</SelectItem>
                  <SelectItem value="premium">プレミアム</SelectItem>
                  <SelectItem value="enterprise">エンタープライズ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={formSubmitting}
            >
              キャンセル
            </Button>
            <Button onClick={handleUpdateOrganization} disabled={formSubmitting}>
              {formSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>メンバーを追加</DialogTitle>
            <DialogDescription>
              既存のユーザーをこの事業所のメンバーとして追加します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="member-email">ユーザーID</Label>
              <Input
                id="member-email"
                type="text"
                placeholder="ユーザーのUUID"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                追加するユーザーのuser_id（UUID）を入力してください
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-role">ロール</Label>
              <Select value={memberRole} onValueChange={(value) => setMemberRole(value as OrganizationMemberRole)}>
                <SelectTrigger id="member-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">オーナー</SelectItem>
                  <SelectItem value="manager">マネージャー</SelectItem>
                  <SelectItem value="staff">スタッフ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddMemberDialogOpen(false)}
              disabled={formSubmitting}
            >
              キャンセル
            </Button>
            <Button onClick={handleAddMember} disabled={formSubmitting}>
              {formSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
