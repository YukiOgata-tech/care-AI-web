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
import { Input } from '@/components/ui/input';
import { UserCog, Loader2, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PrimaryRole } from '@/lib/supabase/types';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/lib/utils';

interface UserProfile {
  user_id: string;
  full_name: string | null;
  primary_role: PrimaryRole | null;
  phone: string | null;
  gender: string | null;
  created_at: string;
  updated_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // 全ユーザーのプロフィールを取得
      const { data: profiles, error } = await supabase
        .from('app_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(profiles || []);
    } catch (error: any) {
      console.error('ユーザーデータ取得エラー:', error);
      toast.error('ユーザーデータの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      user.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: PrimaryRole | null) => {
    if (!role) return <Badge variant="outline">未設定</Badge>;

    const variants: Record<PrimaryRole, { variant: 'default' | 'destructive' | 'secondary' | 'outline', label: string }> = {
      super_admin: { variant: 'destructive', label: 'スーパー管理者' },
      admin: { variant: 'destructive', label: '管理者' },
      manager: { variant: 'default', label: 'マネージャー' },
      staff: { variant: 'secondary', label: 'スタッフ' },
      family: { variant: 'outline', label: '家族' },
    };

    const config = variants[role];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getGenderLabel = (gender: string | null) => {
    if (!gender) return '-';
    const labels: Record<string, string> = {
      male: '男性',
      female: '女性',
      other: 'その他',
    };
    return labels[gender] || gender;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <UserCog className="h-8 w-8 text-destructive" />
          <h1 className="text-3xl font-bold tracking-tight">ユーザー管理</h1>
        </div>
        <p className="text-muted-foreground">
          全てのユーザーを閲覧・管理します
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">総ユーザー数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">管理者</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.primary_role === 'super_admin' || u.primary_role === 'admin').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">スタッフ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.primary_role === 'staff' || u.primary_role === 'manager').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">家族</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.primary_role === 'family').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>ユーザー検索</CardTitle>
          <CardDescription>
            名前またはユーザーIDで検索できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="名前またはユーザーIDで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>ユーザー一覧</CardTitle>
          <CardDescription>
            登録されている全てのユーザーを表示しています（{filteredUsers.length}件）
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? '検索結果が見つかりません' : 'ユーザーが登録されていません'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名前</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>ロール</TableHead>
                  <TableHead>性別</TableHead>
                  <TableHead>電話番号</TableHead>
                  <TableHead>作成日時</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium">
                      {user.full_name || '未設定'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {user.user_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(user.primary_role)}
                    </TableCell>
                    <TableCell>
                      {getGenderLabel(user.gender)}
                    </TableCell>
                    <TableCell>{user.phone || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelativeTime(user.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
