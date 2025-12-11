'use client';

import { Menu, Bell, Building2, User, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUIStore, useNotificationStore } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatRelativeTime } from '@/lib/utils';

export function Header() {
  const router = useRouter();
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const notifications = useNotificationStore((state) => state.notifications);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const { profile, signOut } = useAuth();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'manager':
        return 'secondary';
      case 'staff':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'オーナー';
      case 'manager':
        return 'マネージャー';
      case 'staff':
        return 'スタッフ';
      default:
        return role;
    }
  };

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-card px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1"></div>

      {/* User Organization Info */}
      {profile && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 hidden sm:flex">
              <Building2 className="h-4 w-4" />
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium leading-none">
                  {profile.organizations && profile.organizations.length > 0
                    ? profile.organizations[0].organization_name
                    : profile.is_super_admin
                    ? 'システム管理者'
                    : '未所属'}
                </span>
                {profile.organizations && profile.organizations.length > 0 && (
                  <span className="text-xs text-muted-foreground leading-none mt-1">
                    {getRoleLabel(profile.organizations[0].role)}
                  </span>
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{profile.full_name || 'ユーザー'}</p>
                <p className="text-xs text-muted-foreground">{profile.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {profile.organizations && profile.organizations.length > 0 && (
              <>
                <div className="px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {profile.organizations[0].organization_name}
                      </p>
                      <Badge
                        variant={getRoleBadgeVariant(profile.organizations[0].role) as any}
                        className="mt-1"
                      >
                        {getRoleLabel(profile.organizations[0].role)}
                      </Badge>
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            {profile.is_super_admin && (
              <>
                <div className="px-2 py-1.5">
                  <Badge variant="destructive" className="w-full justify-center">
                    システム管理者
                  </Badge>
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              設定
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              ログアウト
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Mobile User Info - Badge only */}
      {profile && (
        <div className="sm:hidden">
          {profile.organizations && profile.organizations.length > 0 ? (
            <Badge variant={getRoleBadgeVariant(profile.organizations[0].role) as any}>
              {getRoleLabel(profile.organizations[0].role)}
            </Badge>
          ) : profile.is_super_admin ? (
            <Badge variant="destructive">管理者</Badge>
          ) : null}
        </div>
      )}

      {/* Notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>通知</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notifications.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              通知はありません
            </div>
          ) : (
            notifications.slice(0, 5).map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex items-start gap-2 w-full">
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full mt-2',
                      notification.read ? 'bg-muted' : 'bg-blue-600'
                    )}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

function cn(...args: any[]) {
  return args.filter(Boolean).join(' ');
}
