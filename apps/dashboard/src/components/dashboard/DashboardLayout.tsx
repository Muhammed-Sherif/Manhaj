import { useCallback, useState, type ReactNode } from 'react';
import type { Navigate, Page } from './types';
import { Sidebar, DashboardHeader } from './layout';

interface DashboardLayoutProps {
  page: Page;
  navigate: Navigate;
  children: ReactNode;
}

/**
 * DashboardLayout Component
 * High-level layout orchestrator combining the Sidebar, sticky DashboardHeader,
 * and main scrollable content area following SOLID principles.
 */
export function DashboardLayout({
  page,
  navigate,
  children,
}: DashboardLayoutProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const openMobileNav = useCallback(() => setIsMobileNavOpen(true), []);
  const closeMobileNav = useCallback(() => setIsMobileNavOpen(false), []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Navigation Sidebar (fixed on desktop, slide-over drawer on mobile) */}
      <Sidebar
        page={page}
        navigate={navigate}
        mobileOpen={isMobileNavOpen}
        onClose={closeMobileNav}
      />

      {/* Main Content Area */}
      <main className="lg:pl-64">
        <DashboardHeader page={page} navigate={navigate} onOpenMenu={openMobileNav} />
        <div className="mx-auto max-w-[1500px] p-4 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
