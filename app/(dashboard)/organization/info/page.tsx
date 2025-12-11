'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, Building2, Loader2, Save, Edit } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface Organization {
  id: string;
  name: string;
  billing_plan: string;
  email: string | null;
  address: string | null;
  business_url: string | null;
  created_at: string;
}

interface OrganizationMember {
  organization_id: string;
  role: string;
}

export default function OrganizationInfoPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<OrganizationMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBusinessUrl, setEditBusinessUrl] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (profile) {
      fetchOrganizationData();
    }
  }, [profile]);

  const fetchOrganizationData = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      // Get user's organization membership
      const { data: membershipData, error: membershipError } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', profile.user_id)
        .single();

      if (membershipError) {
        toast.error('事業所情報の取得に失敗しました');
        router.push('/');
        return;
      }

      setMembership(membershipData);

      // Get organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', membershipData.organization_id)
        .single();

      if (orgError) throw orgError;

      setOrganization(orgData);
      setEditName(orgData.name);
      setEditEmail(orgData.email || '');
      setEditAddress(orgData.address || '');
      setEditBusinessUrl(orgData.business_url || '');
    } catch (error: any) {
      console.error('データ取得エラー:', error);
      toast.error('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organization || !membership) return;

    // Only owner can edit
    if (membership.role !== 'owner') {
      toast.error('オーナーのみが事業所情報を編集できます');
      return;
    }

    if (!editName.trim()) {
      toast.error('事業所名を入力してください');
      return;
    }

    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('organizations')
        .update({
          name: editName.trim(),
          email: editEmail.trim() || null,
          address: editAddress.trim() || null,
          business_url: editBusinessUrl.trim() || null,
        })
        .eq('id', organization.id);

      if (error) throw error;

      toast.success('事業所情報を更新しました');
      setIsEditing(false);
      fetchOrganizationData();
    } catch (error: any) {
      console.error('保存エラー:', error);
      toast.error('事業所情報の更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (organization) {
      setEditName(organization.name);
      setEditEmail(organization.email || '');
      setEditAddress(organization.address || '');
      setEditBusinessUrl(organization.business_url || '');
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!organization || !membership) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">事業所に所属していません</p>
        <Button
          variant="outline"
          onClick={() => router.push('/')}
          className="mt-4"
        >
          ホームに戻る
        </Button>
      </div>
    );
  }

  const isOwner = membership.role === 'owner';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/organization')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          事業所管理に戻る
        </Button>
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">事業所情報</h1>
            <p className="text-muted-foreground mt-1">
              事業所の基本情報を管理します
            </p>
          </div>
        </div>
      </div>

      {/* Edit Mode Banner */}
      {isEditing && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-blue-600" />
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              編集モード
            </p>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
            変更内容は保存ボタンを押すまで反映されません
          </p>
        </div>
      )}

      {/* Organization Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>基本情報</CardTitle>
              <CardDescription>
                事業所の基本情報{isOwner ? 'を編集できます' : '（閲覧のみ）'}
              </CardDescription>
            </div>
            {isOwner && !isEditing && (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                編集
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isEditing ? (
            <>
              {/* Edit Form */}
              <div className="space-y-2">
                <Label htmlFor="name">事業所名 *</Label>
                <Input
                  id="name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="例: ケアサポート株式会社"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="例: info@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">住所</Label>
                <Input
                  id="address"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="例: 東京都渋谷区..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="business-url">ウェブサイトURL</Label>
                <Input
                  id="business-url"
                  type="url"
                  value={editBusinessUrl}
                  onChange={(e) => setEditBusinessUrl(e.target.value)}
                  placeholder="例: https://example.com"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      保存
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="flex-1"
                >
                  キャンセル
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* View Mode */}
              <div className="grid gap-6">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">
                    事業所名
                  </dt>
                  <dd className="text-base font-medium">{organization.name}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">
                    メールアドレス
                  </dt>
                  <dd className="text-base">
                    {organization.email || (
                      <span className="text-muted-foreground">未設定</span>
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">
                    住所
                  </dt>
                  <dd className="text-base">
                    {organization.address || (
                      <span className="text-muted-foreground">未設定</span>
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">
                    ウェブサイト
                  </dt>
                  <dd className="text-base">
                    {organization.business_url ? (
                      <a
                        href={organization.business_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {organization.business_url}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">未設定</span>
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">
                    料金プラン
                  </dt>
                  <dd className="text-base">{organization.billing_plan}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">
                    作成日
                  </dt>
                  <dd className="text-base">
                    {new Date(organization.created_at).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </dd>
                </div>
              </div>

              {!isOwner && (
                <div className="bg-muted/50 rounded-lg p-4 mt-6">
                  <p className="text-sm text-muted-foreground">
                    オーナー権限を持つユーザーのみが事業所情報を編集できます
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
