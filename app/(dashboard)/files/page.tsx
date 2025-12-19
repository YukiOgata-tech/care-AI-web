'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, FileText, Loader2, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getRoleLabel, getRoleIcon, type FamilyRole } from '@/hooks/useFamilyPermissions';
import { toast } from 'sonner';

interface FamilyWithFileCount {
  id: string;
  label: string;
  service_status: string;
  file_count: number;
  user_role: FamilyRole | null;
}

export default function FilesPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [families, setFamilies] = useState<FamilyWithFileCount[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (profile) {
      fetchFamilies();
    }
  }, [profile]);

  const fetchFamilies = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      // ユーザーが所属する家族を取得（ロール情報も含む）
      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .select('family_id, role')
        .eq('user_id', profile.user_id);

      if (memberError) throw memberError;

      if (!memberData || memberData.length === 0) {
        setFamilies([]);
        setLoading(false);
        return;
      }

      const familyIds = memberData.map((m) => m.family_id);

      // 家族情報を取得
      const { data: familiesData, error: familiesError } = await supabase
        .from('families')
        .select('id, label, service_status')
        .in('id', familyIds)
        .order('label', { ascending: true });

      if (familiesError) throw familiesError;

      // 各家族のファイル数とロール情報を取得
      const familiesWithCount = await Promise.all(
        (familiesData || []).map(async (family) => {
          const { count } = await supabase
            .from('family_files')
            .select('*', { count: 'exact', head: true })
            .eq('family_id', family.id);

          // このユーザーのロールを取得
          const memberInfo = memberData.find((m) => m.family_id === family.id);

          return {
            ...family,
            file_count: count || 0,
            user_role: (memberInfo?.role as FamilyRole) || null,
          };
        })
      );

      setFamilies(familiesWithCount);
    } catch (error: any) {
      console.error('家族一覧取得エラー:', error);
      toast.error('家族一覧の取得に失敗しました');
    } finally {
      setLoading(false);
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
      <div>
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">ファイル管理</h1>
        </div>
        <p className="text-muted-foreground">
          所属している家族のファイルを管理します。家族を選択してください。
        </p>
      </div>

      {/* Families List */}
      {families.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Home className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              所属している家族がありません
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {families.map((family) => (
            <Card
              key={family.id}
              className="cursor-pointer hover:shadow-md transition-all"
              onClick={() => router.push(`/families/${family.id}/files`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Home className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{family.label}</CardTitle>
                      <CardDescription className="mt-1">
                        {family.file_count}件のファイル
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={family.service_status === 'active' ? 'default' : 'secondary'}
                      className={family.service_status === 'active' ? 'bg-green-600' : ''}
                    >
                      {family.service_status === 'active' && '稼働中'}
                      {family.service_status === 'paused' && '一時停止'}
                      {family.service_status === 'terminated' && '終了'}
                    </Badge>
                  </div>

                  {/* User Role Display */}
                  {family.user_role && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                      <span className="text-lg">{getRoleIcon(family.user_role)}</span>
                      <div className="flex-1">
                        <p className="text-xs text-blue-600 dark:text-blue-400">あなたの立ち位置</p>
                        <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                          {getRoleLabel(family.user_role)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
