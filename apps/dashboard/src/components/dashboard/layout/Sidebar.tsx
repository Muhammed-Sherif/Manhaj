import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { Navigate, Page } from '../types';
import { SidebarBrand } from './SidebarBrand';
import { SidebarNav } from './SidebarNav';
import { SidebarFooter } from './SidebarFooter';

const PANEL_CLASSES =
  'flex w-64 flex-col bg-[#006d68] px-4 py-5 text-white';

interface SidebarProps {
  page: Page;
  navigate: Navigate;
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ page, navigate, mobileOpen, onClose }: SidebarProps) {
  // Lock body scroll and close on Escape while the mobile drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen, onClose]);

  // Any navigation from inside the drawer should dismiss it.
  const navigateAndClose: Navigate = (target) => {
    navigate(target);
    onClose();
  };

  return (
    <>
      {/* Desktop Fixed Navigation Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 hidden shadow-xl lg:flex ${PANEL_CLASSES}`}>
        <SidebarBrand />
        <SidebarNav page={page} navigate={navigate} />
        <SidebarFooter page={page} navigate={navigate} />
      </aside>

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${mobileOpen ? '' : 'pointer-events-none'}`}
        inert={!mobileOpen}
      >
        <div
          className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-300 ${
            mobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onClose}
          aria-hidden="true"
        />

        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Main navigation"
          className={`absolute inset-y-0 left-0 flex max-w-[85vw] overflow-y-auto shadow-2xl transition-transform duration-300 ease-out ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          } ${PANEL_CLASSES}`}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="absolute right-3 top-4 cursor-pointer rounded-md p-1.5 text-teal-100 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>

          <SidebarBrand />
          <SidebarNav page={page} navigate={navigateAndClose} />
          <SidebarFooter page={page} navigate={navigateAndClose} />
        </aside>
      </div>
    </>
  );
}
