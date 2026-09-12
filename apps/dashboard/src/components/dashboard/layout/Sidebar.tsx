import React from 'react';
import type { Navigate, Page } from '../types';
import { SidebarBrand } from './SidebarBrand';
import { SidebarNav } from './SidebarNav';
import { SidebarFooter } from './SidebarFooter';

interface SidebarProps {
  page: Page;
  navigate: Navigate;
}

export function Sidebar({ page, navigate }: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-[#006d68] px-4 py-5 text-white shadow-xl lg:flex">
      <SidebarBrand />
      <SidebarNav page={page} navigate={navigate} />
      <SidebarFooter page={page} navigate={navigate} />
    </aside>
  );
}

