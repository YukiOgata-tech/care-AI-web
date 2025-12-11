'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, ArrowLeft, Edit, Loader2, User, Calendar, Users as UsersIcon, Shield, Key } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useFamilyPermissions } from '@/hooks/useFamilyPermissions';

interface CarePerson {
  id: string;
  family_id: string;
  full_name: string;
  birthday: string | null;
  gender: string | null;
  created_at: string;
  updated_at: string;
}

interface Family {
  id: string;
  label: string;
  organization_id: string;
}

export default function CarePersonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const [carePerson, setCarePerson] = useState<CarePerson | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [verifyPassword, setVerifyPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editBirthday, setEditBirthday] = useState('');
  const [editGender, setEditGender] = useState<'male' | 'female' | 'other'>('male');
  const [isSaving, setIsSaving] = useState(false);

  const supabase = createClient();
  const familyId = params.id as string;
  const carePersonId = params.carePersonId as string;
  const permissions = useFamilyPermissions(familyId);

  useEffect(() => {
    if (carePersonId && familyId && profile) {
      fetchCarePersonDetail();
    }
  }, [carePersonId, familyId, profile]);

  const fetchCarePersonDetail = async () => {
    try {
      setLoading(true);

      // 被介護者情報取得
      const { data: carePersonData, error: carePersonError } = await supabase
        .from('care_persons')
        .select('*')
        .eq('id', carePersonId)
        .eq('family_id', familyId)
        .single();

      if (carePersonError) {
        toast.error('被介護者が見つかりません');
        router.replace(`/families/${familyId}`);
        return;
      }

      // 家族情報取得
      const { data: familyData } = await supabase
        .from('families')
        .select('id, label, organization_id')
        .eq('id', familyId)
        .single();

      setCarePerson(carePersonData);
      setFamily(familyData);
      setEditName(carePersonData.full_name);
      setEditBirthday(carePersonData.birthday || '');
      setEditGender((carePersonData.gender as 'male' | 'female' | 'other') || 'male');
    } catch (error: any) {
      console.error('被介護者詳細取得エラー:', error);
      toast.error('被介護者情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const handleRequestEdit = () => {
    if (!permissions.isFamily && !permissions.isCareManager) {
      toast.error('編集権限がありません');
      return;
    }
    setShowPasswordModal(true);
  };

  const handleVerifyPassword = async () => {
    if (!verifyPassword.trim()) {
      toast.error('パスワードを入力してください');
      return;
    }

    setIsVerifying(true);
    try {
      const passwordHash = await hashPassword(verifyPassword);

      const { data: currentData } = await supabase
        .from('care_persons')
        .select('edit_password_hash')
        .eq('id', carePersonId)
        .single();

      if (currentData?.edit_password_hash !== passwordHash) {
        toast.error('パスワードが正しくありません');
        setIsVerifying(false);
        return;
      }

      // パスワード検証成功
      setShowPasswordModal(false);
      setVerifyPassword('');
      setIsEditing(true);
      toast.success('編集モードに入りました');
    } catch (error: any) {
      console.error('パスワード検証エラー:', error);
      toast.error('パスワードの検証に失敗しました');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error('氏名を入力してください');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('care_persons')
        .update({
          full_name: editName.trim(),
          birthday: editBirthday || null,
          gender: editGender,
        })
        .eq('id', carePersonId);

      if (error) throw error;

      toast.success('被介護者情報を更新しました');
      setIsEditing(false);
      await fetchCarePersonDetail();
    } catch (error: any) {
      console.error('被介護者更新エラー:', error);
      toast.error(error.message || '被介護者情報の更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (!carePerson) return;
    setEditName(carePerson.full_name);
    setEditBirthday(carePerson.birthday || '');
    setEditGender((carePerson.gender as 'male' | 'female' | 'other') || 'male');
    setIsEditing(false);
  };

  const calculateAge = (birthday: string | null): number | null => {
    if (!birthday) return null;
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!carePerson || !family) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">被介護者が見つかりません</p>
      </div>
    );
  }

  const age = calculateAge(carePerson.birthday);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/families/${familyId}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          家族詳細に戻る
        </Button>

        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-3 rounded-lg">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{carePerson.full_name}</h1>
            <p className="text-muted-foreground mt-1">
              {family.label} の被介護者
            </p>
          </div>
          {(permissions.isFamily || permissions.isCareManager) && !isEditing && (
            <Button onClick={handleRequestEdit}>
              <Edit className="h-4 w-4 mr-2" />
              情報を編集
            </Button>
          )}
        </div>
      </div>

      {/* Edit Mode Warning */}
      {isEditing && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-orange-900 dark:text-orange-100">編集モード</p>
                <p className="text-sm text-orange-700 dark:text-orange-200 mt-1">
                  情報を変更中です。変更を保存するか、キャンセルしてください。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
          <CardDescription>
            被介護者の基本的な情報
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isEditing ? (
            // Edit Mode
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-name">氏名 *</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="例: 山田 太郎"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-birthday">生年月日</Label>
                <Input
                  id="edit-birthday"
                  type="date"
                  value={editBirthday}
                  onChange={(e) => setEditBirthday(e.target.value)}
                  disabled={isSaving}
                />
                {editBirthday && (
                  <p className="text-sm text-muted-foreground">
                    年齢: {calculateAge(editBirthday)}歳
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-gender">性別</Label>
                <Select
                  value={editGender}
                  onValueChange={(value: 'male' | 'female' | 'other') => setEditGender(value)}
                  disabled={isSaving}
                >
                  <SelectTrigger id="edit-gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">男性</SelectItem>
                    <SelectItem value="female">女性</SelectItem>
                    <SelectItem value="other">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  保存
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="flex-1"
                >
                  キャンセル
                </Button>
              </div>
            </>
          ) : (
            // View Mode
            <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  氏名
                </dt>
                <dd className="text-lg font-semibold">{carePerson.full_name}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  生年月日
                </dt>
                <dd className="text-lg">
                  {carePerson.birthday ? (
                    <>
                      {new Date(carePerson.birthday).toLocaleDateString('ja-JP')}
                      {age !== null && (
                        <span className="text-sm text-muted-foreground ml-2">
                          ({age}歳)
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">未設定</span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                  <UsersIcon className="h-4 w-4" />
                  性別
                </dt>
                <dd className="text-lg">
                  {carePerson.gender === 'male' && '男性 👨'}
                  {carePerson.gender === 'female' && '女性 👩'}
                  {carePerson.gender === 'other' && 'その他 👤'}
                  {!carePerson.gender && <span className="text-muted-foreground">未設定</span>}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-muted-foreground mb-1">登録日</dt>
                <dd className="text-sm text-muted-foreground">
                  {formatRelativeTime(carePerson.created_at)}
                </dd>
              </div>

              {carePerson.updated_at !== carePerson.created_at && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">最終更新</dt>
                  <dd className="text-sm text-muted-foreground">
                    {formatRelativeTime(carePerson.updated_at)}
                  </dd>
                </div>
              )}
            </dl>
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      {!isEditing && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  編集にはパスワードが必要です
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                  被介護者情報を保護するため、編集時には作成時に設定したパスワードの入力が必要です。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Password Verification Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-600" />
              編集パスワードの確認
            </DialogTitle>
            <DialogDescription>
              被介護者情報を編集するには、作成時に設定したパスワードを入力してください。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    重要な情報の編集
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-200 mt-1">
                    この操作は被介護者の基本情報を変更します。慎重に行ってください。
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verify-password">パスワード</Label>
              <Input
                id="verify-password"
                type="password"
                placeholder="作成時に設定したパスワード"
                value={verifyPassword}
                onChange={(e) => setVerifyPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleVerifyPassword();
                  }
                }}
                disabled={isVerifying}
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleVerifyPassword}
                disabled={isVerifying}
                className="flex-1"
              >
                {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                確認して編集を開始
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordModal(false);
                  setVerifyPassword('');
                }}
                disabled={isVerifying}
              >
                キャンセル
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
