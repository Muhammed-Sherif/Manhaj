import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { EntityPage } from '@/components/dashboard/EntityPage';
import { LecturesPage } from '@/components/dashboard/LecturesPage';
import { QuestionsPage } from '@/components/dashboard/QuestionsPage';
import { SettingsPage } from '@/components/dashboard/SettingsPage';
import type { Navigate as NavigatePage, Page } from '@/components/dashboard/types';

export function AppRoutes({ notify }: { notify: (message: string) => void }) {
  const routerNavigate = useNavigate();
  const navigate: NavigatePage = (page) => routerNavigate(page === 'dashboard' ? '/' : `/${page}`);
  const route = (page: Page, element: React.ReactNode) => <DashboardLayout page={page} navigate={navigate} notify={notify}>{element}</DashboardLayout>;

  return <Routes>
    <Route path="/" element={route('dashboard', <DashboardPage navigate={navigate} />)} />
    <Route path="/questions" element={route('questions', <QuestionsPage notify={notify} />)} />
    <Route path="/lectures" element={route('lectures', <LecturesPage notify={notify} />)} />
    <Route path="/settings" element={route('settings', <SettingsPage notify={notify} />)} />
    <Route path="/grades" element={route('grades', <EntityPage type="grades" notify={notify} />)} />
    <Route path="/terms" element={route('terms', <EntityPage type="terms" notify={notify} />)} />
    <Route path="/modules" element={route('modules', <EntityPage type="modules" notify={notify} />)} />
    <Route path="/subjects" element={route('subjects', <EntityPage type="subjects" notify={notify} />)} />
    <Route path="/users" element={route('users', <EntityPage type="users" notify={notify} />)} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}