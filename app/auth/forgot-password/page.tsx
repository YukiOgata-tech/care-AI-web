'use client';

import { useState } from 'react';
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
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('メールアドレスを入力してください');
      return;
    }

    setIsSending(true);
    try {
      const supabase = createClient();

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast.success('パスワードリセットメールを送信しました');
    } catch (error: any) {
      console.error('パスワードリセットメール送信エラー:', error);
      toast.error(error.message || 'メール送信に失敗しました');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        href="/login"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        ログインに戻る
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>パスワードを忘れた場合</CardTitle>
          <CardDescription>
            登録済みのメールアドレスを入力してください。パスワードリセット用のリンクをお送りします。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!emailSent ? (
            <form onSubmit={handleSendResetEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSending}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    送信中...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    リセットメールを送信
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="text-center space-y-2">
                  <div className="flex justify-center">
                    <Mail className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-sm text-green-900 dark:text-green-100 font-medium">
                    メールを送信しました
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    {email} 宛にパスワードリセット用のリンクを送信しました。
                  </p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>• リセットリンクの有効期限は1時間です</p>
                <p>• メールが届かない場合は、迷惑メールフォルダをご確認ください</p>
                <p>• メールアドレスが登録されていない場合は送信されません</p>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setEmailSent(false);
                  setEmail('');
                }}
              >
                別のメールアドレスで再送信
              </Button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-primary hover:underline"
                >
                  ログインページに戻る
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
