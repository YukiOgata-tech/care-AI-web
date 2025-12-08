'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Heart } from 'lucide-react';

/**
 * 認証プロバイダー
 * 認証状態に応じてリダイレクトとローディング表示を管理
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  // 認証不要なパス
  const publicPaths = ['/login', '/signup', '/auth/callback', '/auth/confirm'];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  useEffect(() => {
    // ローディング中は何もしない
    if (loading) {
      hasRedirected.current = false;
      return;
    }

    // 既にリダイレクト済みの場合はスキップ
    if (hasRedirected.current) {
      return;
    }

    // 認証済みユーザーがログイン/サインアップページにアクセスした場合
    if (user && isPublicPath && pathname !== '/auth/callback' && pathname !== '/auth/confirm') {
      hasRedirected.current = true;
      // super_adminの場合は管理画面へ、それ以外はダッシュボードへ
      if (profile?.is_super_admin) {
        router.replace('/admin/organizations');
      } else {
        router.replace('/');
      }
      return;
    }

    // super_adminが一般ユーザー用ページにアクセスした場合、管理画面にリダイレクト
    if (user && profile?.is_super_admin && !pathname.startsWith('/admin') && !isPublicPath) {
      hasRedirected.current = true;
      router.replace('/admin/organizations');
      return;
    }

    // 未認証ユーザーが保護されたページにアクセスした場合
    if (!user && !isPublicPath) {
      hasRedirected.current = true;
      router.replace('/login');
      return;
    }
  }, [user, profile, loading, pathname, router, isPublicPath]);

  // ローディング中の表示
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-4 rounded-2xl animate-pulse">
            <Heart className="h-12 w-12 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  // リダイレクトが必要な場合は何も表示しない
  if (!loading) {
    // 未認証で保護されたページにアクセス → ログインページへリダイレクト
    if (!user && !isPublicPath) {
      return null;
    }

    // 認証済みでパブリックページにアクセス → ダッシュボードへリダイレクト
    if (user && isPublicPath && pathname !== '/auth/callback' && pathname !== '/auth/confirm') {
      return null;
    }
  }

  return <>{children}</>;
}
