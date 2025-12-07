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
  created_at: string;
  updated_at: string;
}

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.id as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMemberWithUser[]>([]);
  const [familyCount, setFamilyCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);

  // フォーム状態
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<OrganizationMemberRole>('staff');
  const [formSubmitting, setFormSubmitting] = useState(false);

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

          // クライアントサイドではauth.adminは使えないため、
          // emailはapp_profilesに保存するか、サーバーサイドAPIを使う必要がある
          // 一時的にuser_idを表示
          return {
            ...member,
            user_name: profile?.full_name || null,
            user_email: member.user_id, // 一時的にuser_idを表示
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
    } catch (error: any) {
      console.error('データ取得エラー:', error);
      toast.error('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    // 一時的にuser_idで直接追加する実装
    // 本来はサーバーサイドAPIでemailからuser_idを検索すべき
    if (!memberEmail.trim()) {
      toast.error('ユーザーIDを入力してください');
      return;
    }

    try {
      setFormSubmitting(true);

      // メンバーを追加（user_idで直接指定）
      const { error: insertError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: memberEmail, // 一時的にuser_idを直接入力
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

  const getRoleBadge = (role: OrganizationMemberRole) => {
    const variants = {
      owner: { variant: 'destructive' as const, label: 'オーナー' },
      manager: { variant: 'default' as const, label: 'マネージャー' },
      staff: { variant: 'secondary' as const, label: 'スタッフ' },
    };
    const config = variants[role];
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">{organization.name}</h1>
          <Badge variant="outline">{organization.billing_plan}</Badge>
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
            <div className="text-2xl font-bold">{members.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">担当家族数</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{familyCount}</div>
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
                  <TableHead>メールアドレス</TableHead>
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
                    <TableCell>{member.user_email || '不明'}</TableCell>
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
    </div>
  );
}
