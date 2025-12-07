'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useUIStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Loader2, Heart, ShieldAlert } from 'lucide-react';

/**
 * スーパーadmin専用レイアウト
 * is_super_admin = true のユーザーのみアクセス可能
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);

  useEffect(() => {
    if (loading) return;

    // スーパーadminでない場合はダッシュボードにリダイレクト
    if (!profile?.is_super_admin) {
      router.replace('/');
    }
  }, [profile, loading, router]);

  // ローディング中
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

  // スーパーadminでない場合は何も表示しない（リダイレクト中）
  if (!profile?.is_super_admin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <ShieldAlert className="h-16 w-16 text-destructive" />
          <p className="text-sm text-muted-foreground">アクセス権限がありません</p>
        </div>
      </div>
    );
  }

  // スーパーadminの場合は通常のダッシュボードレイアウトを表示
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:relative md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar />
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => useUIStore.getState().setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
