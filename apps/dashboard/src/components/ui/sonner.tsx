import React from 'react';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

export const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:border-slate-200 group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl font-sans text-sm',
          description: 'group-[.toast]:text-slate-500',
          actionButton:
            'group-[.toast]:bg-teal-700 group-[.toast]:text-white font-medium',
          cancelButton:
            'group-[.toast]:bg-slate-100 group-[.toast]:text-slate-600',
          success:
            'group-[.toaster]:border-emerald-200 group-[.toaster]:bg-emerald-50/50 group-[.toaster]:text-emerald-950',
          error:
            'group-[.toaster]:border-red-200 group-[.toaster]:bg-red-50/50 group-[.toaster]:text-red-950',
        },
      }}
      {...props}
    />
  );
};

export { toast } from 'sonner';
