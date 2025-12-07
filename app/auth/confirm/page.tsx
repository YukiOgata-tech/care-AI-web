'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Heart } from 'lucide-react';
import Link from 'next/link';

export default function ConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('メールアドレスを確認しています...');

  useEffect(() => {
    const confirmEmail = async () => {
      const supabase = createClient();

      // URLからトークンとタイプを取得
      const token_hash = searchParams.get('token_hash');
      const type = searchParams.get('type');

      if (!token_hash || type !== 'email') {
        setStatus('error');
        setMessage('無効な確認リンクです');
        return;
      }

      try {
        // メールアドレス確認
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: 'email',
        });

        if (error) {
          setStatus('error');
          setMessage(error.message || 'メールアドレスの確認に失敗しました');
        } else {
          setStatus('success');
          setMessage('メールアドレスが確認されました！');

          // 3秒後にログインページへリダイレクト
          setTimeout(() => {
            router.push('/login');
          }, 3000);
        }
      } catch (error) {
        setStatus('error');
        setMessage('エラーが発生しました');
      }
    };

    confirmEmail();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-3 rounded-2xl">
              <Heart className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Care AI</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>メールアドレスの確認</CardTitle>
            <CardDescription>
              アカウントの確認処理中です
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              {status === 'loading' && (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">{message}</p>
                </>
              )}

              {status === 'success' && (
                <>
                  <CheckCircle className="h-12 w-12 text-green-500" />
                  <div className="text-center space-y-2">
                    <p className="text-sm font-medium">{message}</p>
                    <p className="text-xs text-muted-foreground">
                      ログインページに自動的に移動します...
                    </p>
                  </div>
                </>
              )}

              {status === 'error' && (
                <>
                  <XCircle className="h-12 w-12 text-red-500" />
                  <div className="text-center space-y-2">
                    <p className="text-sm font-medium text-red-600">{message}</p>
                    <p className="text-xs text-muted-foreground">
                      リンクの有効期限が切れている可能性があります
                    </p>
                  </div>
                </>
              )}
            </div>

            {status === 'error' && (
              <div className="flex gap-2">
                <Link href="/signup" className="flex-1">
                  <Button variant="outline" className="w-full">
                    再登録
                  </Button>
                </Link>
                <Link href="/login" className="flex-1">
                  <Button className="w-full">
                    ログイン
                  </Button>
                </Link>
              </div>
            )}

            {status === 'success' && (
              <Link href="/login" className="block">
                <Button className="w-full">
                  今すぐログイン
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
