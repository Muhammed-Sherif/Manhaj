import type { ComponentType, ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';

export type Page = 'dashboard' | 'questions' | 'studyUnits' | 'grades' | 'terms' | 'modules' | 'subjects' | 'users' | 'settings' | 'zekr';
export type Navigate = (page: Page) => void;
export type DashboardIcon = ComponentType<LucideProps>;
export type PageAction = ReactNode;
