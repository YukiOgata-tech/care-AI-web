'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, Heart, Users, Home } from 'lucide-react';

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

export default function SignupPage() {
  const router = useRouter();
  const { signUp, signInWithGoogle } = useAuth();
  const [userType, setUserType] = useState<'staff' | 'family'>('family');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('パスワードが一致しません');
      return;
    }

    if (password.length < 6) {
      toast.error('パスワードは6文字以上で入力してください');
      return;
    }

    // スタッフの場合は招待コード必須
    if (userType === 'staff' && !invitationCode.trim()) {
      toast.error('スタッフとして登録するには招待コードが必要です');
      return;
    }

    setIsLoading(true);

    try {
      await signUp(email, password, name, userType, invitationCode || undefined);
      toast.success('アカウントを作成しました。確認メールをご確認ください。');
      router.push('/login');
    } catch (error: any) {
      console.error('サインアップエラー:', error);
      toast.error(error.message || 'アカウント作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Google認証画面にリダイレクトされるため、ここには戻らない
    } catch (error: any) {
      console.error('Google認証エラー:', error);
      toast.error(error.message || 'Google認証に失敗しました');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-3 rounded-2xl">
            <Heart className="h-8 w-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Care AI</h1>
        <p className="text-muted-foreground">新しいアカウントを作成</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新規登録</CardTitle>
          <CardDescription>
            必要事項を入力してアカウントを作成してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Google Signup */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignup}
            disabled={isGoogleLoading || isLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            <span className="ml-2">Googleで登録</span>
          </Button>

          <div className="relative my-4">
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-card px-2 text-xs text-muted-foreground">
                または
              </span>
            </div>
          </div>

          {/* Email/Password Signup */}
          <form onSubmit={handleSignup} className="space-y-4">
            {/* User Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="userType">登録タイプ</Label>
              <Select
                value={userType}
                onValueChange={(value: 'staff' | 'family') => setUserType(value)}
                disabled={isLoading}
              >
                <SelectTrigger id="userType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="family">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      <span>ご家族</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="staff">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>事業所スタッフ</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {userType === 'staff'
                  ? '事業所スタッフとして登録する場合は招待コードが必要です'
                  : 'ご家族として登録できます'}
              </p>
            </div>

            {/* Invitation Code - Required for staff, optional for family */}
            {(userType === 'staff' || userType === 'family') && (
              <div className="space-y-2">
                <Label htmlFor="invitationCode">
                  招待コード
                  {userType === 'staff' && <span className="text-red-500 ml-1">*</span>}
                  {userType === 'family' && <span className="text-muted-foreground ml-1">(任意)</span>}
                </Label>
                <Input
                  id="invitationCode"
                  type="text"
                  placeholder="例: ABC123XYZ"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                  required={userType === 'staff'}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  {userType === 'staff'
                    ? '事業所管理者から受け取った8文字の招待コードを入力してください'
                    : '事業所から招待コードを受け取っている場合は入力してください'}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">お名前</Label>
              <Input
                id="name"
                type="text"
                placeholder="田中 花子"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">パスワード（確認）</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              アカウント作成
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>
              既にアカウントをお持ちの方は{' '}
              <a href="/login" className="text-primary hover:underline">
                ログイン
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        デモ用: 入力内容は保存されません
      </p>
    </div>
  );
}
