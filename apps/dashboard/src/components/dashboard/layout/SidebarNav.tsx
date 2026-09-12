import {
  Activity,
  BookOpen,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Users,
} from 'lucide-react';
import type { Navigate, Page } from '../types';

interface NavItem {
  key: Page;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: readonly NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'grades', label: 'Grades', icon: ClipboardList },
  { key: 'terms', label: 'Terms', icon: FileText },
  { key: 'modules', label: 'Modules', icon: BookOpen },
  { key: 'subjects', label: 'Subjects', icon: Activity },
  { key: 'lectures', label: 'Lectures', icon: FileText },
  { key: 'questions', label: 'Questions', icon: ClipboardList },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'zekr', label: 'Zekr Catalog', icon: BookOpen },
] as const;

interface SidebarNavProps {
  page: Page;
  navigate: Navigate;
}

export function SidebarNav({ page, navigate }: SidebarNavProps) {
  return (
    <div className="space-y-1">
      <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-teal-200">
        Workspace
      </p>
      <nav className="space-y-1">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const isActive = page === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => navigate(key)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-teal-50/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={17} />
              {label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
