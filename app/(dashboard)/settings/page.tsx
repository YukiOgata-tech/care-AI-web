'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, User, Shield, Building2, Users, Bell, Sparkles, Monitor, ChevronRight, Settings } from 'lucide-react';

const settingsItems = [
  {
    id: 'profile',
    title: 'プロフィール設定',
    description: '名前、電話番号などの基本情報を管理',
    icon: User,
    href: '/settings/profile',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
  },
  {
    id: 'security',
    title: 'セキュリティ設定',
    description: '認証方法とパスワードの管理',
    icon: Shield,
    href: '/settings/security',
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
  },
  {
    id: 'organization',
    title: '事業所設定',
    description: '所属事業所の管理と招待コード入力',
    icon: Building2,
    href: '/organization/info',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
  },
  {
    id: 'families',
    title: '家族設定',
    description: '参加している家族の管理と招待コード入力',
    icon: Users,
    href: '/settings/families',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/20',
  },
  {
    id: 'notifications',
    title: '通知設定',
    description: 'メールやプッシュ通知の設定',
    icon: Bell,
    href: '/settings/notifications',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    disabled: true,
  },
  {
    id: 'ai',
    title: 'AI設定',
    description: 'AIモデルや応答スタイルの設定',
    icon: Sparkles,
    href: '/settings/ai',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 dark:bg-pink-950/20',
    disabled: true,
  },
  {
    id: 'display',
    title: '表示設定',
    description: 'テーマ（ライト/ダーク）の切り替え',
    icon: Monitor,
    href: '/settings/display',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/20',
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { profile } = useAuth();

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-3 rounded-lg">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">設定</h1>
          <p className="text-muted-foreground mt-1">
            アカウント情報やアプリケーションの設定を管理します
          </p>
        </div>
      </div>

      {/* User Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {profile.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{profile.full_name || 'ユーザー'}</h3>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              {profile.organizations && profile.organizations.length > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {profile.organizations[0].organization_name} •{' '}
                  {profile.organizations[0].role === 'owner' && 'オーナー'}
                  {profile.organizations[0].role === 'manager' && 'マネージャー'}
                  {profile.organizations[0].role === 'staff' && 'スタッフ'}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {settingsItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.id}
              className={`transition-all ${
                item.disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:shadow-md cursor-pointer'
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${item.bgColor}`}>
                      <Icon className={`h-5 w-5 ${item.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {item.title}
                        {item.disabled && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            (準備中)
                          </span>
                        )}
                      </CardTitle>
                    </div>
                  </div>
                  {!item.disabled && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <CardDescription className="mt-2">
                  {item.description}
                </CardDescription>
              </CardHeader>
              {!item.disabled && (
                <CardContent>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => router.push(item.href)}
                  >
                    設定を開く
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </Button>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
