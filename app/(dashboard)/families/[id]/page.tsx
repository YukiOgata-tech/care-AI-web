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
import { Badge } from '@/components/ui/badge';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Home, Loader2, ArrowLeft, Building2, Users, Phone, MapPin, AlertCircle, Plus, Copy, CheckCircle, XCircle, Trash2, UserPlus, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useFamilyPermissions, getRoleLabel, getRoleIcon, getRoleDescription, type FamilyRole } from '@/hooks/useFamilyPermissions';

interface FamilyDetail {
  id: string;
  organization_id: string;
  label: string;
  note: string | null;
  address: string | null;
  phone: string | null;
  emergency_contact: string | null;
  subscription_type: string;
  service_status: string;
  created_at: string;
  updated_at: string;
}

interface FamilyMemberDetail {
  user_id: string;
  role: FamilyRole;
  relationship: string | null;
  joined_at: string;
  app_profiles: {
    full_name: string | null;
    email: string;
  };
}

interface FamilyInvitation {
  id: string;
  code: string;
  role: FamilyRole;
  relationship: string | null;
  expires_at: string;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  created_at: string;
}

interface CarePerson {
  id: string;
  full_name: string;
  birthday: string | null;
  gender: string | null;
  created_at: string;
  updated_at: string;
}

export default function FamilyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const [family, setFamily] = useState<FamilyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberCount, setMemberCount] = useState(0);
  const [carePersonCount, setCarePersonCount] = useState(0);
  const [members, setMembers] = useState<FamilyMemberDetail[]>([]);
  const [invitations, setInvitations] = useState<FamilyInvitation[]>([]);
  const [carePersons, setCarePersons] = useState<CarePerson[]>([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [showCarePersonDialog, setShowCarePersonDialog] = useState(false);
  const [editingCarePerson, setEditingCarePerson] = useState<CarePerson | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [pendingCarePersonId, setPendingCarePersonId] = useState<string | null>(null);

  // Invitation form state
  const [inviteRole, setInviteRole] = useState<FamilyRole>('family');
  const [inviteRelationship, setInviteRelationship] = useState('');
  const [inviteExpiryDays, setInviteExpiryDays] = useState('5');
  const [inviteMaxUses, setInviteMaxUses] = useState('1');

  // Care person form state
  const [carePersonName, setCarePersonName] = useState('');
  const [carePersonBirthday, setCarePersonBirthday] = useState('');
  const [carePersonGender, setCarePersonGender] = useState<'male' | 'female' | 'other'>('male');
  const [carePersonPassword, setCarePersonPassword] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [isSavingCarePerson, setIsSavingCarePerson] = useState(false);

  const supabase = createClient();
  const familyId = params.id as string;
  const permissions = useFamilyPermissions(familyId);

  useEffect(() => {
    if (params.id && profile) {
      checkAccessAndFetch(params.id as string);
    }
  }, [params.id, profile]);

  const checkAccessAndFetch = async (familyId: string) => {
    if (!profile) return;

    try {
      setLoading(true);

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

      // 家族情報取得
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .select('*')
        .eq('id', familyId)
        .eq('organization_id', membership.organization_id) // 自分の事業所の家族のみ
        .single();

      if (familyError) {
        toast.error('家族が見つかりません');
        router.replace('/families');
        return;
      }

      // メンバー数取得
      const { count: memberCnt } = await supabase
        .from('family_members')
        .select('*', { count: 'exact', head: true })
        .eq('family_id', familyId);

      // 被介護者数取得
      const { count: carePersonCnt } = await supabase
        .from('care_persons')
        .select('*', { count: 'exact', head: true })
        .eq('family_id', familyId);

      setFamily(familyData);
      setMemberCount(memberCnt || 0);
      setCarePersonCount(carePersonCnt || 0);

      // メンバー詳細取得
      await fetchMembers(familyId);

      // 被介護者取得
      await fetchCarePersons(familyId);

      // 招待コード取得（権限がある場合のみ）
      if (permissions.canInviteMembers || ['owner', 'manager'].includes(membership.role)) {
        await fetchInvitations(familyId);
      }
    } catch (error: any) {
      console.error('家族詳細取得エラー:', error);
      toast.error('家族情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (familyId: string) => {
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select(`
          user_id,
          role,
          relationship,
          joined_at,
          app_profiles (
            full_name,
            email
          )
        `)
        .eq('family_id', familyId)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      setMembers(data as any || []);
    } catch (error: any) {
      console.error('メンバー取得エラー:', error);
    }
  };

  const fetchInvitations = async (familyId: string) => {
    try {
      const { data, error } = await supabase
        .from('family_invitations')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error: any) {
      console.error('招待コード取得エラー:', error);
    }
  };

  const generateInvitationCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateInvitation = async () => {
    if (!profile || !family) return;

    setIsCreatingInvite(true);
    try {
      const code = generateInvitationCode();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(inviteExpiryDays));

      const { error } = await supabase
        .from('family_invitations')
        .insert({
          family_id: familyId,
          code,
          role: inviteRole,
          relationship: inviteRelationship.trim() || null,
          created_by: profile.user_id,
          expires_at: expiresAt.toISOString(),
          max_uses: parseInt(inviteMaxUses),
        });

      if (error) throw error;

      toast.success('招待コードを作成しました');
      setShowInviteDialog(false);
      resetInviteForm();
      await fetchInvitations(familyId);
    } catch (error: any) {
      console.error('招待コード作成エラー:', error);
      toast.error(error.message || '招待コードの作成に失敗しました');
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('招待コードをコピーしました');
  };

  const handleDeactivateInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('family_invitations')
        .update({ is_active: false })
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('招待コードを無効化しました');
      await fetchInvitations(familyId);
    } catch (error: any) {
      console.error('招待コード無効化エラー:', error);
      toast.error('招待コードの無効化に失敗しました');
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('family_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('招待コードを削除しました');
      await fetchInvitations(familyId);
    } catch (error: any) {
      console.error('招待コード削除エラー:', error);
      toast.error('招待コードの削除に失敗しました');
    }
  };

  const resetInviteForm = () => {
    setInviteRole('family');
    setInviteRelationship('');
    setInviteExpiryDays('5');
    setInviteMaxUses('1');
  };

  const fetchCarePersons = async (familyId: string) => {
    try {
      const { data, error } = await supabase
        .from('care_persons')
        .select('id, full_name, birthday, gender, created_at, updated_at')
        .eq('family_id', familyId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCarePersons(data || []);
    } catch (error: any) {
      console.error('被介護者取得エラー:', error);
    }
  };

  const hashPassword = async (password: string): Promise<string> => {
    // SHA256でハッシュ化（簡易実装）
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const handleOpenCarePersonDialog = (carePerson?: CarePerson) => {
    if (carePerson) {
      setEditingCarePerson(carePerson);
      setCarePersonName(carePerson.full_name);
      setCarePersonBirthday(carePerson.birthday || '');
      setCarePersonGender((carePerson.gender as 'male' | 'female' | 'other') || 'male');
    } else {
      setEditingCarePerson(null);
      setCarePersonName('');
      setCarePersonBirthday('');
      setCarePersonGender('male');
      setCarePersonPassword('');
    }
    setShowCarePersonDialog(true);
  };

  const handleSaveCarePerson = async () => {
    if (!carePersonName.trim()) {
      toast.error('氏名を入力してください');
      return;
    }

    // 新規作成時はパスワード必須
    if (!editingCarePerson && !carePersonPassword.trim()) {
      toast.error('編集パスワードを設定してください');
      return;
    }

    setIsSavingCarePerson(true);
    try {
      if (editingCarePerson) {
        // 編集 - パスワード検証が必要
        const passwordHash = await hashPassword(verifyPassword);

        // パスワード検証（簡易実装）
        const { data: currentData } = await supabase
          .from('care_persons')
          .select('edit_password_hash')
          .eq('id', editingCarePerson.id)
          .single();

        if (currentData?.edit_password_hash !== passwordHash) {
          toast.error('パスワードが正しくありません');
          setIsSavingCarePerson(false);
          return;
        }

        const { error } = await supabase
          .from('care_persons')
          .update({
            full_name: carePersonName.trim(),
            birthday: carePersonBirthday || null,
            gender: carePersonGender,
          })
          .eq('id', editingCarePerson.id);

        if (error) throw error;
        toast.success('被介護者情報を更新しました');
      } else {
        // 新規作成
        const passwordHash = await hashPassword(carePersonPassword);

        const { error } = await supabase
          .from('care_persons')
          .insert({
            family_id: familyId,
            full_name: carePersonName.trim(),
            birthday: carePersonBirthday || null,
            gender: carePersonGender,
            edit_password_hash: passwordHash,
          });

        if (error) throw error;
        toast.success('被介護者を追加しました');
      }

      setShowCarePersonDialog(false);
      setVerifyPassword('');
      await fetchCarePersons(familyId);

      // 被介護者数も更新
      const { count } = await supabase
        .from('care_persons')
        .select('*', { count: 'exact', head: true })
        .eq('family_id', familyId);
      setCarePersonCount(count || 0);
    } catch (error: any) {
      console.error('被介護者保存エラー:', error);
      toast.error(error.message || '被介護者の保存に失敗しました');
    } finally {
      setIsSavingCarePerson(false);
    }
  };

  const handleDeleteCarePerson = async (carePersonId: string) => {
    if (!confirm('本当にこの被介護者を削除しますか？')) return;

    setPendingCarePersonId(carePersonId);
    setShowPasswordDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!pendingCarePersonId) return;

    const passwordHash = await hashPassword(verifyPassword);

    try {
      // パスワード検証
      const { data: currentData } = await supabase
        .from('care_persons')
        .select('edit_password_hash')
        .eq('id', pendingCarePersonId)
        .single();

      if (currentData?.edit_password_hash !== passwordHash) {
        toast.error('パスワードが正しくありません');
        return;
      }

      const { error } = await supabase
        .from('care_persons')
        .delete()
        .eq('id', pendingCarePersonId);

      if (error) throw error;

      toast.success('被介護者を削除しました');
      setShowPasswordDialog(false);
      setVerifyPassword('');
      setPendingCarePersonId(null);
      await fetchCarePersons(familyId);

      // 被介護者数も更新
      const { count } = await supabase
        .from('care_persons')
        .select('*', { count: 'exact', head: true })
        .eq('family_id', familyId);
      setCarePersonCount(count || 0);
    } catch (error: any) {
      console.error('被介護者削除エラー:', error);
      toast.error(error.message || '被介護者の削除に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!family) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">家族が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/families')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          戻る
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Home className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">{family.label}</h1>
            <Badge
              variant={family.service_status === 'active' ? 'default' : 'secondary'}
              className={family.service_status === 'active' ? 'bg-green-600' : ''}
            >
              {family.service_status === 'active' && '稼働中'}
              {family.service_status === 'paused' && '一時停止'}
              {family.service_status === 'terminated' && '終了'}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            家族の詳細情報とメンバー管理
          </p>
        </div>

        {/* User Role Status */}
        {permissions.role && (
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{getRoleIcon(permissions.role)}</div>
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    あなたの立ち位置
                  </p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {getRoleLabel(permissions.role)}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {getRoleDescription(permissions.role)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">メンバー数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memberCount}</div>
            <p className="text-xs text-muted-foreground">登録メンバー</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">被介護者数</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{carePersonCount}</div>
            <p className="text-xs text-muted-foreground">登録被介護者</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">作成日</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {formatRelativeTime(family.created_at)}
            </div>
            <p className="text-xs text-muted-foreground">
              更新: {formatRelativeTime(family.updated_at)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>クイックアクション</CardTitle>
          <CardDescription>
            この家族に関連する機能にアクセスします
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Button
              variant="outline"
              className="justify-start h-auto py-4"
              onClick={() => router.push(`/families/${familyId}/files`)}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium">ファイル管理</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    資料の閲覧・アップロード
                  </div>
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto py-4"
              disabled
            >
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium">AIチャット</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    準備中
                  </div>
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto py-4"
              disabled
            >
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Home className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium">ケア記録</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    準備中
                  </div>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Family Details */}
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
          <CardDescription>
            家族の基本情報
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground mb-1">電話番号</dt>
              <dd className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{family.phone || '-'}</span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground mb-1">緊急連絡先</dt>
              <dd className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span>{family.emergency_contact || '-'}</span>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-muted-foreground mb-1">住所</dt>
              <dd className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{family.address || '-'}</span>
              </dd>
            </div>
            {family.note && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-muted-foreground mb-1">メモ</dt>
                <dd className="text-sm">{family.note}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Family Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>家族メンバー</CardTitle>
              <CardDescription>
                この家族に参加しているメンバー
              </CardDescription>
            </div>
            {permissions.canInviteMembers && (
              <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    メンバー招待
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>メンバー招待コード作成</DialogTitle>
                    <DialogDescription>
                      新しいメンバーを招待するための招待コードを作成します
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="role">ロール</Label>
                      <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as FamilyRole)}>
                        <SelectTrigger id="role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="family">
                            <div className="flex items-center gap-2">
                              <span>{getRoleIcon('family')}</span>
                              <div className="flex flex-col">
                                <span className="font-medium">{getRoleLabel('family')}</span>
                                <span className="text-xs text-muted-foreground">フルアクセス・AIチャット可能</span>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="external_family">
                            <div className="flex items-center gap-2">
                              <span>{getRoleIcon('external_family')}</span>
                              <div className="flex flex-col">
                                <span className="font-medium">{getRoleLabel('external_family')}</span>
                                <span className="text-xs text-muted-foreground">閲覧のみ・AIチャット不可</span>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="care_staff">
                            <div className="flex items-center gap-2">
                              <span>{getRoleIcon('care_staff')}</span>
                              <div className="flex flex-col">
                                <span className="font-medium">{getRoleLabel('care_staff')}</span>
                                <span className="text-xs text-muted-foreground">ケア記録管理・AIチャット可能</span>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="care_manager">
                            <div className="flex items-center gap-2">
                              <span>{getRoleIcon('care_manager')}</span>
                              <div className="flex flex-col">
                                <span className="font-medium">{getRoleLabel('care_manager')}</span>
                                <span className="text-xs text-muted-foreground">全権限・メンバー招待可能</span>
                              </div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {getRoleDescription(inviteRole)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="relationship">関係性（任意）</Label>
                      <Input
                        id="relationship"
                        placeholder="例: 息子、娘、担当スタッフ"
                        value={inviteRelationship}
                        onChange={(e) => setInviteRelationship(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiry">有効期限（日数）</Label>
                        <Input
                          id="expiry"
                          type="number"
                          min="1"
                          max="30"
                          value={inviteExpiryDays}
                          onChange={(e) => setInviteExpiryDays(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">最大30日</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="max-uses">使用回数</Label>
                        <Input
                          id="max-uses"
                          type="number"
                          min="1"
                          max="100"
                          value={inviteMaxUses}
                          onChange={(e) => setInviteMaxUses(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={handleCreateInvitation}
                        disabled={isCreatingInvite}
                        className="flex-1"
                      >
                        {isCreatingInvite && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        招待コードを作成
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowInviteDialog(false)}
                        disabled={isCreatingInvite}
                      >
                        キャンセル
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              メンバーがいません
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-start gap-3 p-4 border rounded-lg"
                >
                  <div className="text-2xl">
                    {getRoleIcon(member.role)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {member.app_profiles?.full_name || 'ユーザー'}
                      </p>
                      <Badge variant="secondary">
                        {getRoleLabel(member.role)}
                      </Badge>
                      {member.user_id === profile?.user_id && (
                        <Badge variant="outline" className="text-xs">
                          あなた
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {member.app_profiles?.email}
                    </p>
                    {member.relationship && (
                      <p className="text-xs text-muted-foreground mt-1">
                        関係: {member.relationship}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      参加日: {formatRelativeTime(member.joined_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Care Persons */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>被介護者情報</CardTitle>
              <CardDescription>
                ケアを提供する対象者の情報
              </CardDescription>
            </div>
            {(permissions.isFamily || permissions.isCareManager) && (
              <Dialog open={showCarePersonDialog} onOpenChange={setShowCarePersonDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => handleOpenCarePersonDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    被介護者追加
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCarePerson ? '被介護者情報編集' : '被介護者追加'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingCarePerson
                        ? '被介護者の情報を更新します。編集には設定したパスワードが必要です。'
                        : '新しい被介護者を追加します。編集用のパスワードを設定してください。'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="care-person-name">氏名 *</Label>
                      <Input
                        id="care-person-name"
                        placeholder="例: 山田 太郎"
                        value={carePersonName}
                        onChange={(e) => setCarePersonName(e.target.value)}
                        disabled={isSavingCarePerson}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="care-person-birthday">生年月日</Label>
                      <Input
                        id="care-person-birthday"
                        type="date"
                        value={carePersonBirthday}
                        onChange={(e) => setCarePersonBirthday(e.target.value)}
                        disabled={isSavingCarePerson}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="care-person-gender">性別</Label>
                      <Select
                        value={carePersonGender}
                        onValueChange={(value: 'male' | 'female' | 'other') => setCarePersonGender(value)}
                        disabled={isSavingCarePerson}
                      >
                        <SelectTrigger id="care-person-gender">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">男性</SelectItem>
                          <SelectItem value="female">女性</SelectItem>
                          <SelectItem value="other">その他</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {!editingCarePerson && (
                      <div className="space-y-2">
                        <Label htmlFor="care-person-password">編集パスワード *</Label>
                        <Input
                          id="care-person-password"
                          type="password"
                          placeholder="情報編集時に必要なパスワード"
                          value={carePersonPassword}
                          onChange={(e) => setCarePersonPassword(e.target.value)}
                          disabled={isSavingCarePerson}
                        />
                        <p className="text-xs text-muted-foreground">
                          ※ このパスワードは情報を編集・削除する際に必要になります。忘れないようにしてください。
                        </p>
                      </div>
                    )}

                    {editingCarePerson && (
                      <div className="space-y-2">
                        <Label htmlFor="verify-password">編集パスワード *</Label>
                        <Input
                          id="verify-password"
                          type="password"
                          placeholder="設定したパスワードを入力"
                          value={verifyPassword}
                          onChange={(e) => setVerifyPassword(e.target.value)}
                          disabled={isSavingCarePerson}
                        />
                        <p className="text-xs text-muted-foreground">
                          ※ 編集には作成時に設定したパスワードが必要です
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={handleSaveCarePerson}
                        disabled={isSavingCarePerson}
                        className="flex-1"
                      >
                        {isSavingCarePerson && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingCarePerson ? '更新' : '追加'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowCarePersonDialog(false)}
                        disabled={isSavingCarePerson}
                      >
                        キャンセル
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {carePersons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              被介護者が登録されていません
            </div>
          ) : (
            <div className="space-y-3">
              {carePersons.map((carePerson) => (
                <div
                  key={carePerson.id}
                  className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/families/${familyId}/care-persons/${carePerson.id}`)}
                >
                  <div className="text-2xl">
                    {carePerson.gender === 'male' && '👨'}
                    {carePerson.gender === 'female' && '👩'}
                    {carePerson.gender === 'other' && '👤'}
                    {!carePerson.gender && '👤'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{carePerson.full_name}</p>
                    {carePerson.birthday && (
                      <p className="text-sm text-muted-foreground mt-1">
                        生年月日: {new Date(carePerson.birthday).toLocaleDateString('ja-JP')}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      登録日: {formatRelativeTime(carePerson.created_at)}
                    </p>
                  </div>
                  {(permissions.isFamily || permissions.isCareManager) && (
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenCarePersonDialog(carePerson)}
                      >
                        編集
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCarePerson(carePerson.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Verification Dialog for Delete */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>削除の確認</DialogTitle>
            <DialogDescription>
              被介護者を削除するには、設定したパスワードを入力してください。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-password">パスワード</Label>
              <Input
                id="delete-password"
                type="password"
                placeholder="設定したパスワードを入力"
                value={verifyPassword}
                onChange={(e) => setVerifyPassword(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                className="flex-1"
              >
                削除
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordDialog(false);
                  setVerifyPassword('');
                  setPendingCarePersonId(null);
                }}
              >
                キャンセル
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Active Invitations */}
      {permissions.canInviteMembers && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>招待コード一覧</CardTitle>
            <CardDescription>
              発行済みの招待コード
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map((invitation) => {
                const isExpired = new Date(invitation.expires_at) < new Date();
                const isExhausted = invitation.used_count >= invitation.max_uses;
                const isInactive = !invitation.is_active || isExpired || isExhausted;

                return (
                  <div
                    key={invitation.id}
                    className={`flex items-start gap-3 p-4 border rounded-lg ${
                      isInactive ? 'opacity-50 bg-muted/30' : ''
                    }`}
                  >
                    <div className="text-2xl">
                      {getRoleIcon(invitation.role)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <code className="px-3 py-1 bg-muted rounded font-mono text-lg font-bold">
                          {invitation.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyCode(invitation.code)}
                          disabled={isInactive}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {isInactive ? (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            無効
                          </Badge>
                        ) : (
                          <Badge variant="default" className="gap-1 bg-green-600">
                            <CheckCircle className="h-3 w-3" />
                            有効
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">ロール:</span>
                          <span>{getRoleLabel(invitation.role)}</span>
                        </div>
                        {invitation.relationship && (
                          <div className="flex items-center gap-1">
                            <span className="font-medium">関係:</span>
                            <span>{invitation.relationship}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="font-medium">使用回数:</span>
                          <span>{invitation.used_count} / {invitation.max_uses}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">有効期限:</span>
                          <span className={isExpired ? 'text-red-600' : ''}>
                            {formatRelativeTime(invitation.expires_at)}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        {invitation.is_active && !isExpired && !isExhausted && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeactivateInvitation(invitation.id)}
                          >
                            無効化
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteInvitation(invitation.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          削除
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
