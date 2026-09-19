import { Bell, Menu, Search } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { Navigate, Page } from '../types';
import { UserMenu } from './UserMenu';

interface DashboardHeaderProps {
  page: Page;
  navigate: Navigate;
  onOpenMenu: () => void;
}

export function DashboardHeader({ page, navigate, onOpenMenu }: DashboardHeaderProps) {
  const pageTitle = page[0].toUpperCase() + page.slice(1);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-8">
      {/* Mobile Menu Button */}
      <button
        type="button"
        className="rounded-md p-2 hover:bg-slate-100 lg:hidden cursor-pointer"
        onClick={onOpenMenu}
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Breadcrumb */}
      <div className="hidden items-center gap-2 text-sm sm:flex">
        <span className="text-slate-400">Workspace</span>
        <span className="text-slate-300">/</span>
        <strong className="text-slate-800 font-semibold">{pageTitle}</strong>
      </div>

      {/* Right Controls */}
      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          className="hidden h-9 w-72 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-left text-xs text-slate-400 transition hover:bg-slate-100 md:flex cursor-pointer"
          onClick={() => toast.info('Global search opened')}
        >
          <Search size={15} />
          Search content...
        </button>

        <button
          type="button"
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          onClick={() => toast.info('No new notifications')}
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>

        <UserMenu navigate={navigate} />
      </div>
    </header>
  );
}

