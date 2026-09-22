import { BookOpen, Check, ClipboardList, Plus, Upload } from 'lucide-react';
import { useGetAdminStudyUnits, useGetAdminQuestions } from '@manhaj/api-client/src/admin/admin';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Navigate } from './types';
import { Heading } from './Heading';

export function DashboardPage({ navigate }: { navigate: Navigate }) {
  const { data: session } = authClient.useSession();
  const userName = session?.user?.name || 'Admin';
  const firstName = userName.split(' ')[0] || 'Admin';

  const questions = useGetAdminQuestions({ studyUnitId: 'null' }); 
  const allQuestions = useGetAdminQuestions({});
  const studyUnits = useGetAdminStudyUnits(); 
  const unclassified = questions.data?.data.length || 0; 
  const studyUnitCount = studyUnits.data?.data.length || 0;
  const totalQuestions = allQuestions.data?.data.length || 0;
  const classified = totalQuestions - unclassified;
  const stats = [
    ['Unclassified Questions', unclassified, ClipboardList, 'questions'],
    ['Pending Video Uploads', '—', Upload, 'studyUnits'],
    ['Study Units', studyUnitCount, BookOpen, 'studyUnits'],
    ['Classified Questions', classified, Check, 'questions'],
  ] as const;

  return (
    <>
      <Heading
        eyebrow="Live workspace"
        title={`Good morning, ${firstName}`}
        description="Overview loaded from the Neon-backed admin API."
        action={
          <Button onClick={() => navigate('questions')}>
            <Plus size={16} />Manage content
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value, Icon, target]) => (
          <button
            key={label}
            onClick={() => navigate(target)}
            className="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:border-teal-500"
          >
            <span className="grid size-10 place-items-center rounded-lg bg-teal-50 text-teal-700">
              <Icon size={20} />
            </span>
            <p className="mt-4 text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-bold">{value}</p>
            <p className="mt-1 text-xs text-slate-400">Live API value</p>
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="transition hover:border-teal-500 hover:shadow-md">
          <CardHeader>
            <CardTitle>Unclassified questions</CardTitle>
            <CardDescription>Questions without a study unit</CardDescription>
          </CardHeader>
          <CardContent>
            {questions.isLoading ? (
              <p className="text-sm text-slate-500">Loading...</p>
            ) : questions.isError ? (
              <p className="text-sm text-red-600">Unable to load questions.</p>
            ) : (
              <p className="text-4xl font-bold text-teal-700">{unclassified}</p>
            )}
          </CardContent>
        </Card>
        <Card className="transition hover:border-teal-500 hover:shadow-md">
          <CardHeader>
            <CardTitle>Study Units</CardTitle>
            <CardDescription>Available through the admin API</CardDescription>
          </CardHeader>
          <CardContent>
            {studyUnits.isLoading ? (
              <p className="text-sm text-slate-500">Loading...</p>
            ) : studyUnits.isError ? (
              <p className="text-sm text-red-600">Unable to load study units.</p>
            ) : (
              <p className="text-4xl font-bold text-teal-700">{studyUnitCount}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
