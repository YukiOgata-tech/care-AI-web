'use client';

import { useEffect, useState } from 'react';
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
import { Plus, Building2, Users, Home, Pencil, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { OrganizationWithStats } from '@/lib/supabase/types';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/lib/utils';

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<OrganizationWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationWithStats | null>(null);

  // フォーム状態
  const [formName, setFormName] = useState('');
  const [formBillingPlan, setFormBillingPlan] = useState('standard');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);

      // 事業所データ取得
      const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgError) throw orgError;

      // 各事業所のメンバー数と家族数を取得
      const orgsWithStats = await Promise.all(
        (orgs || []).map(async (org) => {
          // メンバー数取得
          const { count: memberCount } = await supabase
            .from('organization_members')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id);

          // 家族数取得
          const { count: familyCount } = await supabase
            .from('families')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id);

          return {
            ...org,
            member_count: memberCount || 0,
            family_count: familyCount || 0,
          };
        })
      );

      setOrganizations(orgsWithStats);
    } catch (error: any) {
      console.error('事業所取得エラー:', error);
      toast.error('事業所データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = async () => {
    if (!formName.trim()) {
      toast.error('事業所名を入力してください');
      return;
    }

    try {
      setFormSubmitting(true);

      const { error } = await supabase.from('organizations').insert({
        name: formName,
        billing_plan: formBillingPlan,
      });

      if (error) throw error;

      toast.success('事業所を作成しました');
      setCreateDialogOpen(false);
      setFormName('');
      setFormBillingPlan('standard');
      fetchOrganizations();
    } catch (error: any) {
      console.error('事業所作成エラー:', error);
      toast.error('事業所の作成に失敗しました');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdateOrganization = async () => {
    if (!selectedOrg || !formName.trim()) {
      toast.error('事業所名を入力してください');
      return;
    }

    try {
      setFormSubmitting(true);

      const { error } = await supabase
        .from('organizations')
        .update({
          name: formName,
          billing_plan: formBillingPlan,
        })
        .eq('id', selectedOrg.id);

      if (error) throw error;

      toast.success('事業所情報を更新しました');
      setEditDialogOpen(false);
      setSelectedOrg(null);
      fetchOrganizations();
    } catch (error: any) {
      console.error('事業所更新エラー:', error);
      toast.error('事業所の更新に失敗しました');
    } finally {
      setFormSubmitting(false);
    }
  };

  const openEditDialog = (org: OrganizationWithStats) => {
    setSelectedOrg(org);
    setFormName(org.name);
    setFormBillingPlan(org.billing_plan);
    setEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">事業所管理</h1>
            <Badge variant="destructive" className="text-xs">
              SUPER ADMIN
            </Badge>
          </div>
          <p className="text-muted-foreground">
            介護事業所の作成・編集を行います
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          事業所を作成
        </Button>
      </div>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle>事業所一覧</CardTitle>
          <CardDescription>
            登録されている全ての事業所を表示しています
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : organizations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              事業所が登録されていません
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>事業所名</TableHead>
                  <TableHead>料金プラン</TableHead>
                  <TableHead className="text-center">メンバー数</TableHead>
                  <TableHead className="text-center">家族数</TableHead>
                  <TableHead>作成日時</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{org.billing_plan}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{org.member_count}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        <span>{org.family_count}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelativeTime(org.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(org)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        編集
                      </Button>
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
            <DialogTitle>事業所を作成</DialogTitle>
            <DialogDescription>
              新しい介護事業所を登録します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">事業所名</Label>
              <Input
                id="create-name"
                placeholder="例: ○○訪問介護"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-plan">料金プラン</Label>
              <Select value={formBillingPlan} onValueChange={setFormBillingPlan}>
                <SelectTrigger id="create-plan">
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
              onClick={() => setCreateDialogOpen(false)}
              disabled={formSubmitting}
            >
              キャンセル
            </Button>
            <Button onClick={handleCreateOrganization} disabled={formSubmitting}>
              {formSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              作成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>事業所を編集</DialogTitle>
            <DialogDescription>
              事業所情報を更新します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">事業所名</Label>
              <Input
                id="edit-name"
                placeholder="例: ○○訪問介護"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-plan">料金プラン</Label>
              <Select value={formBillingPlan} onValueChange={setFormBillingPlan}>
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
    </div>
  );
}
