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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Home, Loader2, Search, Building2, Plus, Pencil, Eye, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/lib/utils';

interface FamilyWithOrg {
  id: string;
  organization_id: string;
  label: string;
  note: string | null;
  address: string | null;
  phone: string | null;
  emergency_contact: string | null;
  created_at: string;
  updated_at: string;
  organization_name: string;
  member_count: number;
}

interface Organization {
  id: string;
  name: string;
}

export default function FamiliesPage() {
  const router = useRouter();
  const [families, setFamilies] = useState<FamilyWithOrg[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<FamilyWithOrg | null>(null);

  // フォーム状態
  const [formOrganizationId, setFormOrganizationId] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmergencyContact, setFormEmergencyContact] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchFamilies();
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) throw error;
      setOrganizations(orgs || []);
    } catch (error: any) {
      console.error('事業所取得エラー:', error);
      toast.error('事業所データの取得に失敗しました');
    }
  };

  const fetchFamilies = async () => {
    try {
      setLoading(true);

      // 家族データ取得
      const { data: familiesData, error: familiesError } = await supabase
        .from('families')
        .select('*')
        .order('created_at', { ascending: false });

      if (familiesError) throw familiesError;

      // 各家族の事業所名とメンバー数を取得
      const familiesWithOrg = await Promise.all(
        (familiesData || []).map(async (family) => {
          // 事業所名取得
          const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', family.organization_id)
            .single();

          // メンバー数取得
          const { count: memberCount } = await supabase
            .from('family_members')
            .select('*', { count: 'exact', head: true })
            .eq('family_id', family.id);

          return {
            ...family,
            organization_name: org?.name || '不明',
            member_count: memberCount || 0,
          };
        })
      );

      setFamilies(familiesWithOrg);
    } catch (error: any) {
      console.error('家族データ取得エラー:', error);
      toast.error('家族データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFamily = async () => {
    if (!formOrganizationId) {
      toast.error('事業所を選択してください');
      return;
    }

    if (!formLabel.trim()) {
      toast.error('家族名を入力してください');
      return;
    }

    try {
      setFormSubmitting(true);

      const { error } = await supabase.from('families').insert({
        organization_id: formOrganizationId,
        label: formLabel.trim(),
        note: formNote.trim() || null,
        address: formAddress.trim() || null,
        phone: formPhone.trim() || null,
        emergency_contact: formEmergencyContact.trim() || null,
      });

      if (error) throw error;

      toast.success('家族を作成しました');
      setCreateDialogOpen(false);
      setFormOrganizationId('');
      setFormLabel('');
      setFormNote('');
      setFormAddress('');
      setFormPhone('');
      setFormEmergencyContact('');
      fetchFamilies();
    } catch (error: any) {
      console.error('家族作成エラー:', error);
      toast.error('家族の作成に失敗しました');
    } finally {
      setFormSubmitting(false);
    }
  };

  const openEditDialog = (family: FamilyWithOrg) => {
    setSelectedFamily(family);
    setFormOrganizationId(family.organization_id);
    setFormLabel(family.label);
    setFormNote(family.note || '');
    setFormAddress(family.address || '');
    setFormPhone(family.phone || '');
    setFormEmergencyContact(family.emergency_contact || '');
    setEditDialogOpen(true);
  };

  const handleUpdateFamily = async () => {
    if (!selectedFamily) return;

    try {
      setFormSubmitting(true);

      const { error } = await supabase
        .from('families')
        .update({
          // label は更新不可（AI検索の識別子として使用）
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
      fetchFamilies();
    } catch (error: any) {
      console.error('家族更新エラー:', error);
      toast.error('家族情報の更新に失敗しました');
    } finally {
      setFormSubmitting(false);
    }
  };

  const filteredFamilies = families.filter(
    (family) =>
      family.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      family.organization_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Home className="h-8 w-8 text-destructive" />
            <h1 className="text-3xl font-bold tracking-tight">家族管理</h1>
          </div>
          <p className="text-muted-foreground">
            全ての家族（介護対象世帯）を管理します
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          家族を作成
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>家族検索</CardTitle>
          <CardDescription>
            家族名または事業所名で検索できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="家族名または事業所名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Families Table */}
      <Card>
        <CardHeader>
          <CardTitle>家族一覧</CardTitle>
          <CardDescription>
            登録されている全ての家族を表示しています（{filteredFamilies.length}件）
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredFamilies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? '検索結果が見つかりません' : '家族が登録されていません'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>家族名</TableHead>
                  <TableHead>所属事業所</TableHead>
                  <TableHead>住所</TableHead>
                  <TableHead>電話番号</TableHead>
                  <TableHead className="text-center">メンバー数</TableHead>
                  <TableHead>作成日時</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFamilies.map((family) => (
                  <TableRow key={family.id}>
                    <TableCell className="font-medium">{family.label}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{family.organization_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {family.address || '-'}
                    </TableCell>
                    <TableCell>{family.phone || '-'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{family.member_count}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelativeTime(family.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/admin/families/${family.id}`)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>家族を作成</DialogTitle>
            <DialogDescription>
              新しい家族（介護対象世帯）を登録します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>重要：家族名は後から変更できません</AlertTitle>
              <AlertDescription>
                家族名はAI検索システムの識別子として使用されるため、作成後は変更できません。慎重に入力してください。
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="create-organization">所属事業所 *</Label>
              <Select value={formOrganizationId} onValueChange={setFormOrganizationId}>
                <SelectTrigger id="create-organization">
                  <SelectValue placeholder="事業所を選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      事業所が登録されていません
                    </div>
                  ) : (
                    organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                この家族が所属する事業所を選択してください
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-label">家族名 *（変更不可）</Label>
              <Input
                id="create-label"
                placeholder="例: 山田家、(山田太郎)家、佐藤様宅"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                <strong>推奨形式：</strong>「○○家」または「（フルネーム）家」<br />
                例: 山田家、(山田太郎)家、田中・佐藤家
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
              <Label htmlFor="edit-organization">所属事業所</Label>
              <Input
                id="edit-organization"
                value={selectedFamily?.organization_name || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                事業所は変更できません
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-label">家族名</Label>
              <Input
                id="edit-label"
                value={formLabel}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                家族名は変更できません（AI検索の識別子として使用されています）
              </p>
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
