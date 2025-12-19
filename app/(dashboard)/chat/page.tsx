'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, MessageSquare } from 'lucide-react';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface ChatFamily {
  id: string;
  label: string;
  role: string;
}

export default function ChatIndexPage() {
  const router = useRouter();
  const [families, setFamilies] = useState<ChatFamily[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFamilies = async () => {
      try {
        const supabase = createSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          router.replace('/auth/login');
          return;
        }

        const { data, error } = await supabase
          .from('family_members')
          .select(`family_id, role, families ( label )`)
          .eq('user_id', user.id);

        if (error) {
          console.error('家族一覧の取得に失敗しました:', error);
          toast.error('家族一覧の取得に失敗しました');
          setLoading(false);
          return;
        }

        const familyList: ChatFamily[] =
          data?.map((fm: any) => ({
            id: fm.family_id,
            label: fm.families?.label || '名称未設定の家族',
            role: fm.role,
          })) ?? [];

        setFamilies(familyList);
        setLoading(false);

        // 家族が1つだけの場合は自動でそのチャット画面へ
        if (familyList.length === 1) {
          router.replace(`/chat/${familyList[0].id}`);
        }
      } catch (error) {
        console.error('家族一覧取得中にエラーが発生しました:', error);
        toast.error('家族一覧の取得に失敗しました');
        setLoading(false);
      }
    };

    loadFamilies();
  }, [router]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold tracking-tight">チャット</h1>
          <Badge variant="outline" className="flex items-center gap-1">
            <Home className="h-3 w-3" />
            <span>家族ごとのチャット</span>
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          チャットしたい家族を選択してください。家族ごとに会話履歴とAIチャットが分かれます。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>家族の一覧</CardTitle>
          <CardDescription>
            所属している家族ごとにチャット画面へ移動できます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          ) : families.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              現在、所属している家族がありません。家族を作成するか、招待コードから参加してください。
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {families.map((family) => (
                <Link key={family.id} href={`/chat/${family.id}`}>
                  <Card className="h-full cursor-pointer hover:bg-accent transition-colors">
                    <CardContent className="p-4 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        <span className="font-semibold truncate">
                          {family.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">
                          {family.role === 'family' && '家族メンバー'}
                          {family.role === 'care_staff' && 'ケアスタッフ'}
                          {family.role === 'care_manager' && 'ケアマネージャー'}
                          {family.role !== 'family' &&
                            family.role !== 'care_staff' &&
                            family.role !== 'care_manager' &&
                            family.role}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
