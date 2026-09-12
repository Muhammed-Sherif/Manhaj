import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { EntityPage } from '@/components/dashboard/EntityPage';
import { LecturesPage } from '@/components/dashboard/LecturesPage';
import { QuestionsPage } from '@/components/dashboard/QuestionsPage';
import { SettingsPage } from '@/components/dashboard/SettingsPage';
import { UsersPage } from '@/components/dashboard/users';
import { ZekrPage } from '@/components/dashboard/ZekrPage';
import type { Navigate as NavigatePage, Page } from '@/components/dashboard/types';

export function AppRoutes() {
  const routerNavigate = useNavigate();
  const navigate: NavigatePage = (page) => routerNavigate(page === 'dashboard' ? '/' : `/${page}`);
  const route = (page: Page, element: React.ReactNode) => (
    <DashboardLayout page={page} navigate={navigate}>
      {element}
    </DashboardLayout>
  );

  return (
    <Routes>
      <Route path="/" element={route('dashboard', <DashboardPage navigate={navigate} />)} />
      <Route path="/questions" element={route('questions', <QuestionsPage />)} />
      <Route path="/lectures" element={route('lectures', <LecturesPage />)} />
      <Route path="/settings" element={route('settings', <SettingsPage />)} />
      <Route path="/grades" element={route('grades', <EntityPage type="grades" />)} />
      <Route path="/terms" element={route('terms', <EntityPage type="terms" />)} />
      <Route path="/modules" element={route('modules', <EntityPage type="modules" />)} />
      <Route path="/subjects" element={route('subjects', <EntityPage type="subjects" />)} />
      <Route path="/users" element={route('users', <UsersPage />)} />
      <Route path="/zekr" element={route('zekr', <ZekrPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}