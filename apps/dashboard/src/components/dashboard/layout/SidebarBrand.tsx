import React from 'react';

export function SidebarBrand() {
  return (
    <div className="mb-8 flex items-center gap-3 px-2">
      <div className="grid size-10 place-items-center rounded-xl bg-white text-xl font-bold text-[#006d68] shadow-sm">
        ✚
      </div>
      <div>
        <p className="text-lg font-bold leading-none tracking-tight">Manhaj</p>
        <p className="mt-1 text-[10px] text-teal-100 font-medium">
          Medical content management
        </p>
      </div>
    </div>
  );
}
