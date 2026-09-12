import React from 'react';

interface MedicalIconProps {
  className: string;
  icon: React.ReactNode;
}

export function MedicalIcon({ className, icon }: MedicalIconProps) {
  return (
    <span
      className={`absolute grid size-14 place-items-center rounded-2xl border border-[#cfe5e1] bg-white/70 text-[#a8ceca] shadow-sm ${className}`}
    >
      {icon}
    </span>
  );
}
