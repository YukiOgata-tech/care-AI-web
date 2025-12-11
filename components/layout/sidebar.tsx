'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  MessageSquare,
  FileText,
  Settings,
  Heart,
  LogOut,
  ShieldCheck,
  Building2,
  Users,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const navigation = [
  { name: 'ホーム', href: '/', icon: Home },
  { name: 'チャット', href: '/chat', icon: MessageSquare },
  { name: 'ファイル管理', href: '/files', icon: FileText },
  { name: '設定', href: '/settings', icon: Settings },
];

const organizationNavigation = [
  { name: '事業所管理', href: '/organization', icon: Building2 },
  { name: '家族管理', href: '/families', icon: Users },
];

const adminNavigation = [
  { name: '事業所管理', href: '/admin/organizations', icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [isOrgMember, setIsOrgMember] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    checkOrganizationMembership();
  }, [profile]);

  const checkOrganizationMembership = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', profile.user_id)
      .single();

    setIsOrgMember(data && ['owner', 'manager'].includes(data.role));
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('ログアウトしました');
      router.push('/login');
    } catch (error) {
      toast.error('ログアウトに失敗しました');
    }
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-lg">
          <Heart className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold">Care AI</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}

        {/* Organization Navigation (Owner/Manager only) */}
        {isOrgMember && !profile?.is_super_admin && (
          <>
            <Separator className="my-4" />
            <div className="px-3 mb-2">
              <Badge variant="secondary" className="text-xs">
                管理機能
              </Badge>
            </div>
            {organizationNavigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </>
        )}

        {/* Admin Navigation */}
        {profile?.is_super_admin && (
          <>
            <Separator className="my-4" />
            <div className="px-3 mb-2">
              <Badge variant="destructive" className="text-xs">
                ADMIN
              </Badge>
            </div>
            {adminNavigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-destructive text-destructive-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User Profile */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar>
            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white">
              {profile?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{profile?.full_name || 'ゲスト'}</p>
            <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
          </div>
        </div>
        <Separator className="mb-3" />
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          ログアウト
        </Button>
      </div>
    </div>
  );
}
