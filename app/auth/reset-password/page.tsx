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
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    // セッションの確認
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setIsValidSession(true);
      } else {
        toast.error('リセットリンクが無効または期限切れです');
        setTimeout(() => router.push('/login'), 2000);
      }
      setIsCheckingSession(false);
    };

    checkSession();
  }, [router]);

  const handleResetPassword = async () => {
    // バリデーション
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

    setIsResetting(true);
    try {
      const supabase = createClient();

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success('パスワードをリセットしました。ログインページへ移動します。');

      // パスワードリセット後、ログインページへリダイレクト
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error: any) {
      console.error('パスワードリセットエラー:', error);
      toast.error(error.message || 'パスワードのリセットに失敗しました');
    } finally {
      setIsResetting(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isValidSession) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            パスワードリセット
          </CardTitle>
          <CardDescription className="text-center">
            新しいパスワードを設定してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 新しいパスワード */}
          <div className="space-y-2">
            <Label htmlFor="new-password">新しいパスワード</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="6文字以上"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* 新しいパスワード（確認） */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password">新しいパスワード（確認）</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="もう一度入力"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                パスワードが一致しません
              </p>
            )}
          </div>

          <Button
            onClick={handleResetPassword}
            disabled={isResetting}
            className="w-full"
          >
            {isResetting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                リセット中...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                パスワードをリセット
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            リセット後、ログインページへ移動します
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
