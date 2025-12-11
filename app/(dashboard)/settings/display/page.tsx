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
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';
import { Loader2, ArrowLeft, Monitor, Sun, Moon, Laptop } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function DisplaySettingsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // マウント後のみレンダリング（hydration mismatch回避）
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentTheme = theme === 'system' ? systemTheme : theme;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          設定に戻る
        </Link>
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-3 rounded-lg">
            <Monitor className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">表示設定</h1>
            <p className="text-muted-foreground mt-1">
              テーマやUIの表示方法を設定します
            </p>
          </div>
        </div>
      </div>

      {/* テーマ設定 */}
      <Card>
        <CardHeader>
          <CardTitle>テーマ</CardTitle>
          <CardDescription>
            アプリケーションの外観を選択してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 現在のテーマ表示 */}
          {mounted && (
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2">
                {currentTheme === 'light' && <Sun className="h-5 w-5 text-yellow-600" />}
                {currentTheme === 'dark' && <Moon className="h-5 w-5 text-blue-600" />}
                <div>
                  <p className="text-sm font-medium">
                    現在のテーマ: {' '}
                    {theme === 'system' && 'システム設定に従う'}
                    {theme === 'light' && 'ライトモード'}
                    {theme === 'dark' && 'ダークモード'}
                  </p>
                  {theme === 'system' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      端末設定: {currentTheme === 'light' ? 'ライト' : 'ダーク'}モード
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>テーマを選択</Label>
            <div className="grid gap-3">
              {/* ライトモード */}
              <button
                onClick={() => setTheme('light')}
                className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                  theme === 'light'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  theme === 'light'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}>
                  <Sun className="h-5 w-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">ライトモード</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    明るい配色で表示します
                  </p>
                </div>
                {theme === 'light' && (
                  <div className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                )}
              </button>

              {/* ダークモード */}
              <button
                onClick={() => setTheme('dark')}
                className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                  theme === 'dark'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  theme === 'dark'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}>
                  <Moon className="h-5 w-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">ダークモード</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    暗い配色で表示します（目に優しい）
                  </p>
                </div>
                {theme === 'dark' && (
                  <div className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                )}
              </button>

              {/* システム設定 */}
              <button
                onClick={() => setTheme('system')}
                className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                  theme === 'system'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  theme === 'system'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}>
                  <Laptop className="h-5 w-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">システム設定に従う</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    端末のテーマ設定を自動的に適用します
                  </p>
                  {mounted && theme === 'system' && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      {currentTheme === 'light' ? (
                        <>
                          <Sun className="h-3 w-3" />
                          現在: ライトモード
                        </>
                      ) : (
                        <>
                          <Moon className="h-3 w-3" />
                          現在: ダークモード
                        </>
                      )}
                    </p>
                  )}
                </div>
                {theme === 'system' && (
                  <div className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                )}
              </button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => router.push('/settings')}
              className="w-full"
            >
              戻る
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* テーマのヒント */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">💡 テーマのヒント</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>ライトモード</strong>: 明るい場所での使用に最適です</p>
          <p>• <strong>ダークモード</strong>: 暗い場所や夜間の使用で目の疲れを軽減します</p>
          <p>• <strong>システム設定</strong>: 端末の時刻に応じて自動的にテーマが切り替わります</p>
        </CardContent>
      </Card>
    </div>
  );
}
