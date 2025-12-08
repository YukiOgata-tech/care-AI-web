'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useSettingsStore } from '@/lib/store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { User, Bell, Sparkles, Monitor, Save, Lock, Loader2, Building2 } from 'lucide-react';
import { Gender } from '@/lib/supabase/types';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, updateProfile, joinOrganization } = useAuth();
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);

  // プロフィール情報
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [isProfileSaving, setIsProfileSaving] = useState(false);

  // パスワード変更
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordChanging, setIsPasswordChanging] = useState(false);

  // 招待コードで組織に参加
  const [invitationCode, setInvitationCode] = useState('');
  const [isJoiningOrganization, setIsJoiningOrganization] = useState(false);

  // プロフィール情報を初期化
  useEffect(() => {
    if (profile) {
      setName(profile.full_name || '');
      setPhone(profile.phone || '');
      setGender(profile.gender || '');
    }
  }, [profile]);

  // プロフィール保存
  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error('名前を入力してください');
      return;
    }

    setIsProfileSaving(true);
    try {
      await updateProfile({
        full_name: name,
        phone: phone || undefined,
        gender: gender || undefined,
      });
      toast.success('プロフィールを更新しました');
    } catch (error: any) {
      console.error('プロフィール更新エラー:', error);
      toast.error(error.message || 'プロフィールの更新に失敗しました');
    } finally {
      setIsProfileSaving(false);
    }
  };

  // パスワード変更
  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('新しいパスワードを入力してください');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('パスワードが一致しません');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('パスワードは6文字以上で入力してください');
      return;
    }

    setIsPasswordChanging(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success('パスワードを変更しました');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('パスワード変更エラー:', error);
      toast.error(error.message || 'パスワードの変更に失敗しました');
    } finally {
      setIsPasswordChanging(false);
    }
  };

  const handleSaveSettings = () => {
    toast.success('設定を保存しました');
  };

  // 招待コードで組織に参加
  const handleJoinOrganization = async () => {
    if (!invitationCode.trim()) {
      toast.error('招待コードを入力してください');
      return;
    }

    setIsJoiningOrganization(true);
    try {
      await joinOrganization(invitationCode);
      toast.success('事業所への参加が完了しました');
      setInvitationCode('');
      // ページをリロードして最新の組織情報を表示
      router.refresh();
    } catch (error: any) {
      console.error('組織参加エラー:', error);
      toast.error(error.message || '事業所への参加に失敗しました');
    } finally {
      setIsJoiningOrganization(false);
    }
  };

  // ローディング中
  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">設定</h1>
        <p className="text-muted-foreground">
          アカウント情報やアプリケーションの設定を変更できます
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            プロフィール
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="h-4 w-4" />
            セキュリティ
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            通知
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI設定
          </TabsTrigger>
          <TabsTrigger value="display" className="gap-2">
            <Monitor className="h-4 w-4" />
            表示
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>プロフィール情報</CardTitle>
              <CardDescription>
                アカウントの基本情報を管理します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-2xl">
                    {profile.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{profile.full_name || 'ユーザー'}</h3>
                  <p className="text-sm text-muted-foreground">
                    {profile.email}
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    {profile.primary_role === 'super_admin' && 'スーパー管理者'}
                    {profile.primary_role === 'admin' && '管理者'}
                    {profile.primary_role === 'manager' && 'マネージャー'}
                    {profile.primary_role === 'staff' && 'スタッフ'}
                    {profile.primary_role === 'family' && '家族'}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">名前</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="山田 太郎"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    メールアドレスは変更できません
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">電話番号（任意）</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="090-1234-5678"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">法的性別（任意）</Label>
                  <Select
                    value={gender}
                    onValueChange={(value) => setGender(value as Gender)}
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">男性</SelectItem>
                      <SelectItem value="female">女性</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    あなたの法的な性別を選択してください
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user_id">ユーザーID</Label>
                  <Input
                    id="user_id"
                    value={profile.user_id}
                    disabled
                    className="bg-muted font-mono text-xs"
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={isProfileSaving}
              >
                {isProfileSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    変更を保存
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* 所属情報 */}
          {(profile.families && profile.families.length > 0 ||
            profile.organizations && profile.organizations.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>所属情報</CardTitle>
                <CardDescription>
                  あなたが所属している家族や組織
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.families && profile.families.length > 0 && (
                  <div>
                    <Label className="text-sm text-muted-foreground">所属家族</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {profile.families.map((family) => (
                        <Badge key={family.family_id} variant="outline">
                          {family.family_label}
                          {family.relationship && ` (${family.relationship})`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {profile.organizations && profile.organizations.length > 0 && (
                  <div>
                    <Label className="text-sm text-muted-foreground">所属組織</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {profile.organizations.map((org) => (
                        <Badge key={org.organization_id} variant="outline">
                          {org.organization_name}
                          {` (${org.role})`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 招待コードで事業所に参加（組織に未所属の場合のみ表示） */}
          {(!profile.organizations || profile.organizations.length === 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  招待コードで事業所に参加
                </CardTitle>
                <CardDescription>
                  事業所から受け取った招待コードを入力して参加できます
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invitation-code">招待コード</Label>
                  <Input
                    id="invitation-code"
                    type="text"
                    placeholder="例: ABC123XY"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                    disabled={isJoiningOrganization}
                    maxLength={8}
                  />
                  <p className="text-xs text-muted-foreground">
                    事業所管理者から受け取った8文字の招待コードを入力してください
                  </p>
                </div>

                <Button
                  onClick={handleJoinOrganization}
                  disabled={isJoiningOrganization || !invitationCode.trim()}
                  className="w-full"
                >
                  {isJoiningOrganization ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      参加処理中...
                    </>
                  ) : (
                    <>
                      <Building2 className="mr-2 h-4 w-4" />
                      事業所に参加
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>パスワード変更</CardTitle>
              <CardDescription>
                アカウントのパスワードを変更します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">新しいパスワード</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="6文字以上"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">新しいパスワード（確認）</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="もう一度入力"
                />
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={isPasswordChanging}
              >
                {isPasswordChanging ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    変更中...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    パスワードを変更
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>通知設定</CardTitle>
              <CardDescription>
                通知の受け取り方法を設定します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>メール通知</Label>
                  <p className="text-sm text-muted-foreground">
                    重要な更新をメールで受け取る
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.email}
                  onCheckedChange={(checked) =>
                    updateSettings({
                      notifications: { ...settings.notifications, email: checked },
                    })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>プッシュ通知</Label>
                  <p className="text-sm text-muted-foreground">
                    ブラウザでプッシュ通知を受け取る
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.push}
                  onCheckedChange={(checked) =>
                    updateSettings({
                      notifications: { ...settings.notifications, push: checked },
                    })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>週次レポート</Label>
                  <p className="text-sm text-muted-foreground">
                    毎週の利用状況レポートを受け取る
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.weeklyReport}
                  onCheckedChange={(checked) =>
                    updateSettings({
                      notifications: {
                        ...settings.notifications,
                        weeklyReport: checked,
                      },
                    })
                  }
                />
              </div>

              <Button onClick={handleSaveSettings}>
                <Save className="mr-2 h-4 w-4" />
                変更を保存
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Settings */}
        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI設定</CardTitle>
              <CardDescription>
                AIの動作や応答スタイルを設定します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>デフォルトモデル</Label>
                <Select
                  value={settings.ai.defaultModel}
                  onValueChange={(value: any) =>
                    updateSettings({
                      ai: { ...settings.ai, defaultModel: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">
                      GPT-4o Mini（高速・経済的）
                    </SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o（高精度）</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  通常の会話で使用するAIモデルを選択
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>File Searchをデフォルトで有効化</Label>
                  <p className="text-sm text-muted-foreground">
                    新しい会話で資料検索を自動的に有効にする
                  </p>
                </div>
                <Switch
                  checked={settings.ai.fileSearchDefault}
                  onCheckedChange={(checked) =>
                    updateSettings({
                      ai: { ...settings.ai, fileSearchDefault: checked },
                    })
                  }
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>応答の長さ</Label>
                <Select
                  value={settings.ai.responseLength}
                  onValueChange={(value: any) =>
                    updateSettings({
                      ai: { ...settings.ai, responseLength: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concise">簡潔</SelectItem>
                    <SelectItem value="normal">標準</SelectItem>
                    <SelectItem value="detailed">詳細</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  AIの応答の詳細度を設定
                </p>
              </div>

              <Button onClick={handleSaveSettings}>
                <Save className="mr-2 h-4 w-4" />
                変更を保存
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Display Settings */}
        <TabsContent value="display" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>表示設定</CardTitle>
              <CardDescription>
                アプリケーションの表示方法を設定します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>テーマ</Label>
                <Select
                  value={settings.display.theme}
                  onValueChange={(value: any) =>
                    updateSettings({
                      display: { ...settings.display, theme: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">ライト</SelectItem>
                    <SelectItem value="dark">ダーク</SelectItem>
                    <SelectItem value="system">システム設定に従う</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>言語</Label>
                <Select
                  value={settings.display.language}
                  onValueChange={(value: any) =>
                    updateSettings({
                      display: { ...settings.display, language: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSaveSettings}>
                <Save className="mr-2 h-4 w-4" />
                変更を保存
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
