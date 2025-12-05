'use client';

import { useState } from 'react';
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
import { useUserStore, useSettingsStore } from '@/lib/store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { User, Bell, Sparkles, Monitor, Save } from 'lucide-react';

export default function SettingsPage() {
  const user = useUserStore((state) => state.user);
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  const handleSaveProfile = () => {
    // プロフィール更新のダミー処理
    toast.success('プロフィールを更新しました');
  };

  const handleSaveSettings = () => {
    toast.success('設定を保存しました');
  };

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
                    {user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">プロフィール画像</h3>
                  <p className="text-sm text-muted-foreground">
                    クリックして画像を変更
                  </p>
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
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">役割</Label>
                  <Input
                    id="role"
                    value={user?.role === 'caregiver' ? '介護者' : user?.role || ''}
                    disabled
                  />
                </div>
              </div>

              <Button onClick={handleSaveProfile}>
                <Save className="mr-2 h-4 w-4" />
                変更を保存
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
