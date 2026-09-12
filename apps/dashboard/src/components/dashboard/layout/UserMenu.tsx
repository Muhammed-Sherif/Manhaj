import { ChevronDown, LogOut, Settings, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { authClient } from '@/lib/auth-client';
import { toast } from '@/components/ui/sonner';
import type { Navigate } from '../types';

interface UserMenuProps {
  navigate: Navigate;
}

export function UserMenu({ navigate }: UserMenuProps) {
  const { data: session } = authClient.useSession();
  const currentUser = session?.user;
  const userName = currentUser?.name || 'Admin';
  const userEmail = currentUser?.email || '';
  const userImage = currentUser?.image;
  const userInitials =
    userName
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0].toUpperCase())
      .slice(0, 2)
      .join('') || 'AD';

  const handleLogout = async () => {
    try {
      await authClient.signOut();
    } catch {}
    localStorage.removeItem('manhaj_access_token');
    toast.success('Logged out successfully');
    window.location.href = '/';
  };

  const handleProfile = () => {
    navigate('settings');
    toast.info('Profile settings opened');
  };


  const handleSettings = () => {
    navigate('settings');
  };

  return (
    <DropdownMenu
      trigger={
        <button
          type="button"
          className="flex items-center gap-2.5 border-l border-slate-200 pl-3 transition hover:opacity-80 cursor-pointer"
        >
          {userImage ? (
            <img
              src={userImage}
              alt={userName}
              className="size-8 rounded-full object-cover ring-2 ring-teal-600/30"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="grid size-8 place-items-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">
              {userInitials}
            </span>
          )}
          <span className="hidden text-left sm:block">
            <b className="block text-xs font-semibold text-slate-800 max-w-[130px] truncate">
              {userName}
            </b>
            <small className="text-[11px] text-slate-400 capitalize">
              {(currentUser as any)?.role || 'Content manager'}
            </small>
          </span>
          <ChevronDown size={14} className="text-slate-400" />
        </button>
      }
    >
      <div className="px-3 py-2 border-b border-slate-100 mb-1">
        <p className="text-xs font-semibold text-slate-800 truncate">{userName}</p>
        <p className="text-[11px] text-slate-400 truncate">{userEmail}</p>
      </div>
      <DropdownMenuItem onClick={handleProfile}>
        <User size={16} className="mr-2" />
        Profile
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleSettings}>
        <Settings size={16} className="mr-2" />
        Settings
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleLogout}>
        <LogOut size={16} className="mr-2 text-red-500" />
        <span className="text-red-600">Logout</span>
      </DropdownMenuItem>
    </DropdownMenu>
  );
}
