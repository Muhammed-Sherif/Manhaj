import * as React from 'react';
import { cn } from '@/lib/utils';

export const Badge = ({ className, variant = 'default', ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'secondary' | 'outline' | 'success' }) => <div className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', { 'border-transparent bg-primary text-primary-foreground': variant === 'default', 'border-transparent bg-secondary text-secondary-foreground': variant === 'secondary', 'text-foreground': variant === 'outline', 'border-transparent bg-emerald-100 text-emerald-700': variant === 'success' }, className)} {...props} />;
