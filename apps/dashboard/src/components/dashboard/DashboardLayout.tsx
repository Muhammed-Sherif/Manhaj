import type { ReactNode } from 'react';
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
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop Fixed Navigation Sidebar */}
      <Sidebar page={page} navigate={navigate} />

      {/* Main Content Area */}
      <main className="lg:pl-64">
        <DashboardHeader page={page} navigate={navigate} />
        <div className="mx-auto max-w-[1500px] p-4 sm:p-8">{children}</div>
      </main>
    </div>
  );
}

