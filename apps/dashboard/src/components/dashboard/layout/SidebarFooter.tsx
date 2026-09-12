import { Settings } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { Navigate, Page } from '../types';

interface SidebarFooterProps {
  page: Page;
  navigate: Navigate;
}

export function SidebarFooter({ page, navigate }: SidebarFooterProps) {
  const isSettingsActive = page === 'settings';

  return (
    <div className="mt-auto space-y-4">
      <button
        type="button"
        onClick={() => navigate('settings')}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isSettingsActive ? 'bg-white/15 text-white' : 'text-teal-50/75 hover:bg-white/10'
        }`}
      >
        <Settings size={17} />
        Settings
      </button>

      <button
        type="button"
        className="w-full rounded-xl border border-white/15 bg-white/10 p-3 text-left transition hover:bg-white/15"
        onClick={() => toast.info('Documentation is coming soon')}
      >
        <p className="text-xs font-semibold text-white">Need help?</p>
        <p className="mt-1 text-[11px] text-teal-100">View documentation</p>
      </button>

      <p className="px-2 text-[10px] text-teal-200">manhaj · v1.0.0</p>
    </div>
  );
}

