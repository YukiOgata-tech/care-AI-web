'use client';

import { useState, useEffect } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Shield, AlertTriangle, Lock, Eye, EyeOff, CheckCircle2, Info } from 'lucide-react';
import Link from 'next/link';

export default function PasswordSetupPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasEmailAuth, setHasEmailAuth] = useState(false);

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const checkAuthMethod = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user?.identities) {
          const hasEmail = user.identities.some(
            (identity) => identity.provider === 'email'
          );
          setHasEmailAuth(hasEmail);

          // 既にパスワードが設定されている場合はセキュリティページへ
          if (hasEmail) {
            toast.info('既にパスワードが設定されています');
            router.push('/settings/security');
            return;
          }
        }
      } catch (error) {
        console.error('認証方法確認エラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthMethod();
  }, [router]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // バリデーション
    if (!formData.password || !formData.confirmPassword) {
      toast.error('パスワードを入力してください');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('パスワードが一致しません');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('パスワードは6文字以上で入力してください');
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();

      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (error) throw error;

      toast.success('パスワードを設定しました');

      // セキュリティページへリダイレクト
      setTimeout(() => {
        router.push('/settings/security');
      }, 1500);
    } catch (error: any) {
      console.error('パスワード設定エラー:', error);
      toast.error(error.message || 'パスワードの設定に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 既にパスワードが設定されている場合（リダイレクト前）
  if (hasEmailAuth) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings/security"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          セキュリティ設定に戻る
        </Link>
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-3 rounded-lg">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">パスワードの設定</h1>
            <p className="text-muted-foreground mt-1">
              メール/パスワードでログインできるようにします
            </p>
          </div>
        </div>
      </div>

      {/* 重要な注意事項 */}
      <Alert className="border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/20">
        <AlertTriangle className="h-5 w-5 text-yellow-600" />
        <AlertTitle className="text-yellow-900 dark:text-yellow-200">
          通常はパスワード設定は不要です
        </AlertTitle>
        <AlertDescription className="text-yellow-800 dark:text-yellow-300 space-y-2 mt-2">
          <p>
            現在、<strong>Googleアカウント</strong>で安全に認証されています。
          </p>
          <p>
            パスワードを設定すると、メールアドレスとパスワードでもログインできるようになりますが、
            <strong>Google認証だけで十分に安全</strong>です。
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Googleの2段階認証が利用可能</li>
            <li>パスワード忘れのリスクがない</li>
            <li>セキュリティ管理がシンプル</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* パスワードを設定するメリット */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            パスワードを設定するメリット
          </CardTitle>
          <CardDescription>
            以下のような場合に役立つことがあります
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">バックアップのログイン手段</p>
                <p className="text-sm text-muted-foreground">
                  Googleアカウントにアクセスできない時の予備手段
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">柔軟なログイン方法</p>
                <p className="text-sm text-muted-foreground">
                  Google認証とパスワードログインのどちらでも利用可能
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">別デバイスでの利用</p>
                <p className="text-sm text-muted-foreground">
                  Googleアカウントが設定されていない環境でもログイン可能
                </p>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* パスワード設定フォーム */}
      <Card>
        <CardHeader>
          <CardTitle>パスワードを設定</CardTitle>
          <CardDescription>
            6文字以上のパスワードを入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="6文字以上"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  disabled={isSaving}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={isSaving}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">パスワード（確認）</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="もう一度入力"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  disabled={isSaving}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={isSaving}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {formData.confirmPassword &&
                formData.password !== formData.confirmPassword && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    パスワードが一致しません
                  </p>
                )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Shield className="mr-2 h-4 w-4" />
                パスワードを設定
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/settings/security')}
                disabled={isSaving}
              >
                キャンセル
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
