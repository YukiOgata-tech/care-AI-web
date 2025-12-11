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
import { Textarea } from '@/components/ui/textarea';
import { Home, Loader2, Plus, Users, Pencil, Eye, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface Family {
  id: string;
  organization_id: string;
  label: string;
  note: string | null;
  address: string | null;
  phone: string | null;
  emergency_contact: string | null;
  created_at: string;
  updated_at: string;
  member_count: number;
}

interface ConfirmDialogData {
  title: string;
  description: string;
  onConfirm: () => void;
}

export default function FamiliesPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [families, setFamilies] = useState<Family[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [confirmDialogData, setConfirmDialogData] = useState<ConfirmDialogData | null>(null);

  // フォーム状態
  const [formLabel, setFormLabel] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmergencyContact, setFormEmergencyContact] = useState('');
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

    setOrganizationId(membership.organization_id);
    fetchFamilies(membership.organization_id);
  };

  const fetchFamilies = async (orgId: string) => {
    try {
      setLoading(true);

      // 家族データ取得（自分の事業所のみ）
      const { data: familiesData, error: familiesError } = await supabase
        .from('families')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (familiesError) throw familiesError;

      // 各家族のメンバー数を取得
      const familiesWithMembers = await Promise.all(
        (familiesData || []).map(async (family) => {
          const { count: memberCount } = await supabase
            .from('family_members')
            .select('*', { count: 'exact', head: true })
            .eq('family_id', family.id);

          return {
            ...family,
            member_count: memberCount || 0,
          };
        })
      );

      setFamilies(familiesWithMembers);
    } catch (error: any) {
      console.error('家族データ取得エラー:', error);
      toast.error('家族データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFamily = async () => {
    if (!organizationId) {
      toast.error('事業所情報が取得できません');
      return;
    }

    if (!formLabel.trim()) {
      toast.error('家族名を入力してください');
      return;
    }

    try {
      setFormSubmitting(true);

      const { error } = await supabase.from('families').insert({
        organization_id: organizationId,
        label: formLabel.trim(),
        note: formNote.trim() || null,
        address: formAddress.trim() || null,
        phone: formPhone.trim() || null,
        emergency_contact: formEmergencyContact.trim() || null,
      });

      if (error) throw error;

      toast.success('家族を作成しました');
      setCreateDialogOpen(false);
      setFormLabel('');
      setFormNote('');
      setFormAddress('');
      setFormPhone('');
      setFormEmergencyContact('');
      fetchFamilies(organizationId);
    } catch (error: any) {
      console.error('家族作成エラー:', error);
      toast.error('家族の作成に失敗しました');
    } finally {
      setFormSubmitting(false);
    }
  };

  const openEditDialog = (family: Family) => {
    // 編集前に確認ダイアログを表示
    setConfirmDialogData({
      title: '家族情報を編集しますか？',
      description: `「${family.label}」の情報を編集します。この操作により既存の情報が変更されます。よろしいですか？`,
      onConfirm: () => {
        setSelectedFamily(family);
        setFormLabel(family.label);
        setFormNote(family.note || '');
        setFormAddress(family.address || '');
        setFormPhone(family.phone || '');
        setFormEmergencyContact(family.emergency_contact || '');
        setConfirmDialogOpen(false);
        setEditDialogOpen(true);
      },
    });
    setConfirmDialogOpen(true);
  };

  const handleUpdateFamily = async () => {
    if (!selectedFamily || !organizationId) return;

    if (!formLabel.trim()) {
      toast.error('家族名を入力してください');
      return;
    }

    try {
      setFormSubmitting(true);

      const { error } = await supabase
        .from('families')
        .update({
          label: formLabel.trim(),
          note: formNote.trim() || null,
          address: formAddress.trim() || null,
          phone: formPhone.trim() || null,
          emergency_contact: formEmergencyContact.trim() || null,
        })
        .eq('id', selectedFamily.id);

      if (error) throw error;

      toast.success('家族情報を更新しました');
      setEditDialogOpen(false);
      setSelectedFamily(null);
      fetchFamilies(organizationId);
    } catch (error: any) {
      console.error('家族更新エラー:', error);
      toast.error('家族情報の更新に失敗しました');
    } finally {
      setFormSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Home className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">家族管理</h1>
          </div>
          <p className="text-muted-foreground">
            担当する家族（介護対象世帯）を管理します
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          家族を作成
        </Button>
      </div>

      {/* Stats Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">登録家族数</CardTitle>
          <Home className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{families.length}</div>
          <p className="text-xs text-muted-foreground">担当家族の総数</p>
        </CardContent>
      </Card>

      {/* Families Table */}
      <Card>
        <CardHeader>
          <CardTitle>家族一覧</CardTitle>
          <CardDescription>
            登録されている家族を表示しています
          </CardDescription>
        </CardHeader>
        <CardContent>
          {families.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              家族が登録されていません
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>家族名</TableHead>
                  <TableHead>住所</TableHead>
                  <TableHead>電話番号</TableHead>
                  <TableHead>緊急連絡先</TableHead>
                  <TableHead className="text-center">メンバー数</TableHead>
                  <TableHead>作成日時</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {families.map((family) => (
                  <TableRow key={family.id}>
                    <TableCell className="font-medium">{family.label}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {family.address || '-'}
                    </TableCell>
                    <TableCell>{family.phone || '-'}</TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {family.emergency_contact || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{family.member_count}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelativeTime(family.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/families/${family.id}`)}
                          title="詳細"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(family)}
                          title="編集"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>家族を作成</DialogTitle>
            <DialogDescription>
              新しい家族（介護対象世帯）を登録します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-label">家族名 *</Label>
              <Input
                id="create-label"
                placeholder="例: 山田家、佐藤様宅"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                識別しやすい名前を入力してください
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-address">住所（任意）</Label>
              <Input
                id="create-address"
                placeholder="例: 東京都渋谷区..."
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                訪問介護の訪問先住所など
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-phone">電話番号（任意）</Label>
                <Input
                  id="create-phone"
                  type="tel"
                  placeholder="例: 03-1234-5678"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-emergency">緊急連絡先（任意）</Label>
                <Input
                  id="create-emergency"
                  placeholder="例: 山田太郎 090-xxxx-xxxx"
                  value={formEmergencyContact}
                  onChange={(e) => setFormEmergencyContact(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-note">メモ（任意）</Label>
              <Textarea
                id="create-note"
                placeholder="特記事項があれば入力してください"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={formSubmitting}
            >
              キャンセル
            </Button>
            <Button onClick={handleCreateFamily} disabled={formSubmitting}>
              {formSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              作成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <DialogTitle>{confirmDialogData?.title}</DialogTitle>
            </div>
            <DialogDescription>
              {confirmDialogData?.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              variant="default"
              onClick={() => confirmDialogData?.onConfirm()}
            >
              続行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>家族情報を編集</DialogTitle>
            <DialogDescription>
              家族（介護対象世帯）の情報を更新します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-label">家族名 *</Label>
              <Input
                id="edit-label"
                placeholder="例: 山田家、佐藤様宅"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">住所（任意）</Label>
              <Input
                id="edit-address"
                placeholder="例: 東京都渋谷区..."
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">電話番号（任意）</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  placeholder="例: 03-1234-5678"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-emergency">緊急連絡先（任意）</Label>
                <Input
                  id="edit-emergency"
                  placeholder="例: 山田太郎 090-xxxx-xxxx"
                  value={formEmergencyContact}
                  onChange={(e) => setFormEmergencyContact(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-note">メモ（任意）</Label>
              <Textarea
                id="edit-note"
                placeholder="特記事項があれば入力してください"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                rows={3}
              />
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
            <Button onClick={handleUpdateFamily} disabled={formSubmitting}>
              {formSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
