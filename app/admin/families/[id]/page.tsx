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
import { Home, Loader2, ArrowLeft, Building2, Users, Phone, MapPin, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/lib/utils';

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
  organization_name: string;
}

export default function FamilyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [family, setFamily] = useState<FamilyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberCount, setMemberCount] = useState(0);
  const [carePersonCount, setCarePersonCount] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    if (params.id) {
      fetchFamilyDetail(params.id as string);
    }
  }, [params.id]);

  const fetchFamilyDetail = async (familyId: string) => {
    try {
      setLoading(true);

      // 家族情報取得
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .select('*')
        .eq('id', familyId)
        .single();

      if (familyError) throw familyError;

      // 事業所名取得
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', familyData.organization_id)
        .single();

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

      setFamily({
        ...familyData,
        organization_name: org?.name || '不明',
      });
      setMemberCount(memberCnt || 0);
      setCarePersonCount(carePersonCnt || 0);
    } catch (error: any) {
      console.error('家族詳細取得エラー:', error);
      toast.error('家族情報の取得に失敗しました');
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
          onClick={() => router.push('/admin/families')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          戻る
        </Button>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-2">
          <Home className="h-8 w-8 text-destructive" />
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
              <dt className="text-sm font-medium text-muted-foreground mb-1">所属事業所</dt>
              <dd className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{family.organization_name}</span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground mb-1">電話番号</dt>
              <dd className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{family.phone || '-'}</span>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-muted-foreground mb-1">住所</dt>
              <dd className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{family.address || '-'}</span>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-muted-foreground mb-1">緊急連絡先</dt>
              <dd className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span>{family.emergency_contact || '-'}</span>
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

      {/* Subscription Info */}
      <Card>
        <CardHeader>
          <CardTitle>契約情報</CardTitle>
          <CardDescription>
            サブスクリプションと契約状態
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground mb-1">契約タイプ</dt>
              <dd>
                <Badge variant="outline">
                  {family.subscription_type === 'organization' && '事業所経由'}
                  {family.subscription_type === 'individual' && '個人契約'}
                  {family.subscription_type === 'free' && '無料プラン'}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground mb-1">サービス状態</dt>
              <dd>
                <Badge
                  variant={family.service_status === 'active' ? 'default' : 'secondary'}
                  className={family.service_status === 'active' ? 'bg-green-600' : ''}
                >
                  {family.service_status === 'active' && '稼働中'}
                  {family.service_status === 'paused' && '一時停止'}
                  {family.service_status === 'terminated' && '終了'}
                </Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
