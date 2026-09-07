import type { ComponentType, ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';

export type Page = 'dashboard' | 'questions' | 'lectures' | 'grades' | 'terms' | 'modules' | 'subjects' | 'users' | 'settings';
export type Navigate = (page: Page) => void;
export type DashboardIcon = ComponentType<LucideProps>;
export type PageAction = ReactNode;
