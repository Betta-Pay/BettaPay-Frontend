"use client";

import { Bell, Search, Menu, LogOut, Settings, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface TopbarProps {
  onMenuClick?: () => void;
  title?: string;
  unreadNotificationCount?: number;
}

export const Topbar = ({ onMenuClick, title, unreadNotificationCount = 0 }: TopbarProps) => {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const notificationLabel = unreadNotificationCount > 0
    ? `Notifications (${unreadNotificationCount} unread)`
    : 'Notifications';

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    router.push('/auth/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'MC';

  return (
    <header className="h-16 border-b border-slate-100 bg-white flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 shadow-sm shadow-slate-100/50">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden text-slate-400 hover:text-slate-700"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        {title && <h1 className="text-lg font-semibold tracking-tight hidden md:block text-slate-900">{title}</h1>}
      </div>

      <div className="flex items-center gap-3 flex-1 justify-end">
        {/* Search */}
        <div className="relative w-full max-w-xs hidden lg:block" role="search" aria-label="Site search">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" aria-hidden="true" />
          <Input 
            type="search" 
            aria-label="Search transactions and payment links"
            placeholder="Search..." 
            className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-amber-400 rounded-xl h-9 text-sm placeholder:text-slate-300"
          />
        </div>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl h-9 w-9"
          aria-label={notificationLabel}
        >
          <Bell className="h-4.5 w-4.5" aria-hidden="true" />
          {unreadNotificationCount > 0 && (
            <span
              className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border-2 border-white"
              aria-hidden="true"
            />
          )}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button variant="ghost" className="relative h-9 w-9 rounded-xl p-0 hover:bg-slate-100">
              <Avatar className="h-8 w-8 border border-slate-200">
                <AvatarImage src="/avatars/01.png" alt={user?.name ?? 'User'} />
                <AvatarFallback className="bg-amber-500 text-white text-xs font-bold">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          } />
          <DropdownMenuContent className="w-56 border-slate-200 shadow-lg rounded-xl mt-1" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1 py-1">
                <p className="text-sm font-semibold text-slate-900 leading-none">{user?.name ?? 'Merchant User'}</p>
                <p className="text-xs leading-none text-slate-400 mt-1">
                  {user?.email ?? 'merchant@example.com'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem
              className="flex items-center gap-2 text-slate-600 cursor-pointer rounded-lg"
              onClick={() => router.push('/settings')}
            >
              <Settings className="w-4 h-4" /> Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2 text-slate-600 cursor-pointer rounded-lg"
              onClick={() => router.push('/developers')}
            >
              <KeyRound className="w-4 h-4" /> API Keys
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem
              className="flex items-center gap-2 text-red-500 focus:text-red-500 focus:bg-red-50 cursor-pointer rounded-lg"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
