import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
    size?: 'default' | 'sm' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <button ref={ref} className={cn('inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50', { 'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'default', 'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary', 'border border-input bg-card hover:bg-muted': variant === 'outline', 'hover:bg-muted': variant === 'ghost', 'bg-destructive text-destructive-foreground hover:bg-destructive/90': variant === 'destructive', 'h-10 px-4 py-2': size === 'default', 'h-9 px-3': size === 'sm', 'h-9 w-9': size === 'icon' }, className)} {...props} />
));
Button.displayName = 'Button';
