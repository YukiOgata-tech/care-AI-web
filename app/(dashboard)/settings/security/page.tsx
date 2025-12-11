'use client';

import { useState, useEffect } from 'react';
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
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Shield, Mail, Lock, AlertTriangle, ChevronRight } from 'lucide-react';
import Link from 'next/link';

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function SecuritySettingsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [authMethods, setAuthMethods] = useState({
    hasEmail: false,
    hasGoogle: false,
  });

  useEffect(() => {
    const fetchAuthMethods = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user?.identities) {
          const hasEmail = user.identities.some(
            (identity) => identity.provider === 'email'
          );
          const hasGoogle = user.identities.some(
            (identity) => identity.provider === 'google'
          );

          setAuthMethods({ hasEmail, hasGoogle });
        }
      } catch (error) {
        console.error('認証方法取得エラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuthMethods();
  }, []);

  const handleSendResetEmail = async () => {
    if (!profile?.email) {
      toast.error('メールアドレスが取得できません');
      return;
    }

    setIsSendingResetEmail(true);
    try {
      const supabase = createClient();

      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      toast.success('パスワードリセットメールを送信しました');
    } catch (error: any) {
      console.error('パスワードリセットメール送信エラー:', error);
      toast.error(error.message || 'メール送信に失敗しました');
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  if (!profile || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">セキュリティ設定</h1>
            <p className="text-muted-foreground mt-1">
              アカウントのセキュリティを管理します
            </p>
          </div>
        </div>
      </div>

      {/* 認証方法の表示 */}
      <Card>
        <CardHeader>
          <CardTitle>認証方法</CardTitle>
          <CardDescription>
            現在のログイン方法を確認できます
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google認証 */}
          {authMethods.hasGoogle && (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <GoogleIcon />
                </div>
                <div>
                  <p className="font-medium">Google認証</p>
                  <p className="text-sm text-muted-foreground">
                    Googleアカウントでログイン
                  </p>
                </div>
              </div>
              <Badge variant="secondary">有効</Badge>
            </div>
          )}

          {/* メール/パスワード認証 */}
          {authMethods.hasEmail && (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <Mail className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">メール/パスワード認証</p>
                  <p className="text-sm text-muted-foreground">
                    メールアドレスとパスワードでログイン
                  </p>
                </div>
              </div>
              <Badge variant="secondary">有効</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* パスワード管理 */}
      <Card>
        <CardHeader>
          <CardTitle>パスワード</CardTitle>
          <CardDescription>
            パスワードの設定・変更を行います
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* メール/パスワードユーザー向け */}
          {authMethods.hasEmail && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm">パスワードの変更</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    セキュリティのため、メールでパスワードリセットリンクを送信します
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSendResetEmail}
                disabled={isSendingResetEmail}
                className="w-full"
              >
                {isSendingResetEmail && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Mail className="mr-2 h-4 w-4" />
                パスワードリセットメールを送信
              </Button>
            </div>
          )}

          {/* Google認証ユーザー向け */}
          {authMethods.hasGoogle && !authMethods.hasEmail && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Google認証でログイン中</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    現在、Googleアカウントで安全に管理されています。<br />
                    通常はパスワードの設定は不要です。
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/settings/security/password')}
              >
                <Lock className="mr-2 h-4 w-4" />
                パスワードを設定する（オプション）
                <ChevronRight className="ml-auto h-4 w-4" />
              </Button>
            </div>
          )}

          {/* 両方持っているユーザー */}
          {authMethods.hasGoogle && authMethods.hasEmail && (
            <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
              <Shield className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">複数の認証方法が設定されています</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Googleアカウントとメールアドレスのどちらでもログインできます
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
