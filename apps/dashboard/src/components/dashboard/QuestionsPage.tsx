import { useState, useEffect } from 'react';
import { Pencil, Trash2, Upload, X, BookOpen, ChevronRight } from 'lucide-react';
import {
  useDeleteAdminQuestionsId,
  useGetAdminQuestions,
  usePatchAdminQuestionsBulkAssignLecture,
  useGetAdminGrades,
  useGetAdminTerms,
  useGetAdminModules,
  useGetAdminSubjects,
  useGetAdminLectures,
} from '@manhaj/api-client';
import type { Choice, Question } from '@manhaj/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Heading } from './Heading';
import { Toolbar } from './Toolbar';
import { UploadQuestionsModal } from './UploadQuestionsModal';

type Step = 'grade' | 'term' | 'module' | 'subject' | 'lecture';
interface Item { id: string; name: string; description?: string }

// `getQuestions` in the API fetches questions `with: { choices: true }`, but the generated
// `Question` model predates that embed and does not declare it.
type QuestionRow = Question & { choices?: Choice[] };

const STEPS: { key: Step; label: string }[] = [
  { key: 'grade',   label: 'Grade' },
  { key: 'term',    label: 'Term' },
  { key: 'module',  label: 'Module' },
  { key: 'subject', label: 'Subject' },
  { key: 'lecture', label: 'Lecture' },
];

function StepList({ items, loading, selected, onSelect }: {
  items: Item[];
  loading: boolean;
  selected: string;
  onSelect: (id: string) => void;
}) {
  if (loading) return <p className="py-6 text-center text-sm text-slate-400">Loading…</p>;
  if (!items.length) return <p className="py-6 text-center text-sm text-slate-400">No items found.</p>;
  return (
    <div className="max-h-64 space-y-1.5 overflow-y-auto">
      {items.map(item => (
        <label
          key={item.id}
          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
            selected === item.id ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:bg-slate-50'
          }`}
        >
          <input
            type="radio"
            name="step-item"
            value={item.id}
            checked={selected === item.id}
            onChange={() => onSelect(item.id)}
            className="accent-teal-600"
          />
          <div className="flex-1">
            <p className="font-medium text-slate-800">{item.name}</p>
            {item.description && <p className="text-xs text-slate-500">{item.description}</p>}
          </div>
        </label>
      ))}
    </div>
  );
}

function AssignModal({
  selectedCount,
  onClose,
  onConfirm,
  isPending,
}: {
  selectedCount: number;
  onClose: () => void;
  onConfirm: (lectureId: string) => void;
  isPending: boolean;
}) {
  const [step, setStep] = useState<Step>('grade');
  const [gradeId,   setGradeId]   = useState('');
  const [termId,    setTermId]    = useState('');
  const [moduleId,  setModuleId]  = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [lectureId, setLectureId] = useState('');

  const grades = useGetAdminGrades();
  const terms = useGetAdminTerms(
    gradeId ? { gradeId } : undefined,
    { query: { enabled: !!gradeId } }
  );
  const modules = useGetAdminModules(
    termId ? { termId } : undefined,
    { query: { enabled: !!termId } }
  );
  const subjects = useGetAdminSubjects(
    moduleId ? { moduleId } : undefined,
    { query: { enabled: !!moduleId } }
  );
  const lectures = useGetAdminLectures(
    subjectId ? { subjectId } : undefined,
    { query: { enabled: !!subjectId } }
  );

  const stepIdx = STEPS.findIndex(s => s.key === step);

  const currentItems = ((
    step === 'grade' ? (Array.isArray(grades.data?.data) ? grades.data.data : []) :
    step === 'term' ? (gradeId && Array.isArray(terms.data?.data) ? terms.data.data : []) :
    step === 'module' ? (termId && Array.isArray(modules.data?.data) ? modules.data.data : []) :
    step === 'subject' ? (moduleId && Array.isArray(subjects.data?.data) ? subjects.data.data : []) :
    (subjectId && Array.isArray(lectures.data?.data) ? lectures.data.data : [])
  ) || []) as Item[];

  const currentLoading =
    step === 'grade' ? grades.isLoading :
    step === 'term' ? terms.isLoading :
    step === 'module' ? modules.isLoading :
    step === 'subject' ? subjects.isLoading :
    lectures.isLoading;

  const currentSelected = step === 'grade' ? gradeId : step === 'term' ? termId
    : step === 'module' ? moduleId : step === 'subject' ? subjectId : lectureId;

  const handleSelect = (id: string) => {
    if (step === 'grade')   { setGradeId(id);   setTermId(''); setModuleId(''); setSubjectId(''); setLectureId(''); }
    if (step === 'term')    { setTermId(id);    setModuleId(''); setSubjectId(''); setLectureId(''); }
    if (step === 'module')  { setModuleId(id);  setSubjectId(''); setLectureId(''); }
    if (step === 'subject') { setSubjectId(id); setLectureId(''); }
    if (step === 'lecture') { setLectureId(id); }
  };

  const goNext = () => { if (stepIdx < STEPS.length - 1) setStep(STEPS[stepIdx + 1].key); };
  const goBack = () => { if (stepIdx > 0) setStep(STEPS[stepIdx - 1].key); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Assign to lecture</h2>
            <p className="text-sm text-slate-500">
              Assigning <b>{selectedCount}</b> question{selectedCount !== 1 ? 's' : ''} â€” choose a destination.
            </p>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100"><X size={16} /></button>
        </div>

        {/* Breadcrumb steps */}
        <div className="flex items-center gap-1 border-b px-6 py-3">
          {STEPS.map((s, i) => (
            <span key={s.key} className="flex items-center gap-1">
              <button
                onClick={() => { if (i < stepIdx) setStep(s.key); }}
                disabled={i >= stepIdx}
                className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                  i === stepIdx ? 'bg-teal-600 text-white'
                  : i < stepIdx ? 'text-teal-600 hover:bg-teal-50 cursor-pointer'
                  : 'text-slate-400 cursor-default'
                }`}
              >
                {s.label}
              </button>
              {i < STEPS.length - 1 && <ChevronRight size={12} className="text-slate-300" />}
            </span>
          ))}
        </div>

        {/* List */}
        <div className="px-6 py-4">
          <p className="mb-3 text-sm font-medium text-slate-600">
            Select a {STEPS[stepIdx].label.toLowerCase()}:
          </p>
          <StepList
            items={currentItems as Item[]}
            loading={currentLoading}
            selected={currentSelected}
            onSelect={handleSelect}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-between border-t px-6 py-4">
          <Button variant="outline" onClick={goBack} disabled={stepIdx === 0}>Back</Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            {step !== 'lecture' ? (
              <Button onClick={goNext} disabled={!currentSelected}>
                Next <ChevronRight size={14} className="ml-1" />
              </Button>
            ) : (
              <Button
                onClick={() => onConfirm(lectureId)}
                disabled={!lectureId || isPending}
              >
                <BookOpen size={14} className="mr-1" />
                {isPending ? 'Assigningâ€¦' : 'Confirm assign'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { toast } from '@/components/ui/sonner';

export function QuestionsPage() {
  const query = useGetAdminQuestions({ lectureId: 'null' });
  const rows = (query.data?.data ?? []) as QuestionRow[];
  const [selected, setSelected] = useState<string[]>([]);
  const all = rows.length > 0 && selected.length === rows.length;
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Auto-select questions that already have choices attached
  useEffect(() => {
    const withChoices = rows
      .filter((q) => (q.choices ?? []).length > 0)
      .map((q) => q.id ?? '')
      .filter(Boolean);
    setSelected(withChoices);
  }, [query.data]);

  const refresh = () => void query.refetch();
  const assign = usePatchAdminQuestionsBulkAssignLecture({
    mutation: {
      onSuccess: () => {
        refresh();
        toast.success('Questions assigned successfully');
        setAssignModalOpen(false);
        setSelected([]);
      },
    },
  });
  const remove = useDeleteAdminQuestionsId({
    mutation: {
      onSuccess: () => {
        refresh();
        toast.success('Question deleted');
      },
    },
  });

  const handleQuestionText = (question: any) => question.questionText || question.text || 'No text';

  return (
    <>
      <Heading
        eyebrow="Content review"
        title="Unclassified questions"
        description={query.isError ? 'Unable to load questions from the API.' : 'Live questions from the admin API.'}
        action={<Button onClick={() => toast.info('Use the API import endpoint to add questions')}><Upload size={16} />Import questions</Button>}
      />
      <Toolbar onFilter={() => toast.info('Advanced filters opened')} />

      <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
        <span><b className="text-slate-900">{selected.length}</b> selected</span>
        <Button size="sm" disabled={!selected.length || assign.isPending} onClick={() => setAssignModalOpen(true)}>
          Assign to lecture
        </Button>
      </div>
      <Card>
        {query.isLoading ? (
          <CardContent className="p-8 text-sm text-slate-500">Loading questions...</CardContent>
        ) : query.isError ? (
          <CardContent className="p-8 text-sm text-red-600">
            {(query.error as Error).message}
            <div className="mt-2 text-xs">Please ensure you are logged in as an admin user.</div>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <input type="checkbox" checked={all} onChange={() => setSelected(all ? [] : rows.map((q) => q.id || '').filter(Boolean))} />
                </TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Question text</TableHead>
                <TableHead>Correct Answer</TableHead>
                <TableHead>Choices</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((question) => (
                <TableRow key={question.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.includes(question.id || '')}
                      onChange={() => setSelected((curr) => curr.includes(question.id || '') ? curr.filter((id) => id !== question.id) : [...curr, question.id || ''])}
                    />
                  </TableCell>
                  <TableCell><code className="text-xs text-slate-500">{question.id}</code></TableCell>
                  <TableCell className="max-w-xs font-medium">{handleQuestionText(question)}</TableCell>
                  <TableCell className="max-w-xs font-medium text-emerald-700">
                    {(question.choices ?? []).find((c) => c.isCorrect)?.choiceText || <span className="text-slate-400 italic">None</span>}
                  </TableCell>
                  <TableCell className="min-w-[220px]">
                    {(question.choices ?? []).length === 0 ? (
                      <span className="text-xs italic text-slate-400">No choices</span>
                    ) : (
                      <ol className="space-y-1">
                        {(question.choices ?? []).map((choice, i) => (
                          <li
                            key={choice.id ?? i}
                            className={`flex items-start gap-1.5 rounded px-2 py-1 text-xs ${
                              choice.isCorrect
                                ? 'bg-emerald-50 text-emerald-800 font-semibold ring-1 ring-emerald-300'
                                : 'text-slate-600'
                            }`}
                          >
                            <span className="shrink-0 font-bold">{String.fromCharCode(65 + i)}.</span>
                            <span>{choice.choiceText ?? '—'}</span>
                            {choice.isCorrect && (
                              <span className="ml-auto shrink-0 text-emerald-600">✓</span>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                  </TableCell>
                  <TableCell><Badge variant={question.source === 'telegram_auto' ? 'secondary' : 'outline'}>{question.source || 'unknown'}</Badge></TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => toast.info('Question editor opened')}><Pencil size={15} /></Button>
                    <Button size="icon" variant="ghost" onClick={() => question.id && remove.mutate({ id: question.id })}><Trash2 size={15} /></Button>
                  </TableCell>
                </TableRow>

              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {assignModalOpen && (
        <AssignModal
          selectedCount={selected.length}
          onClose={() => setAssignModalOpen(false)}
          onConfirm={(lectureId) => assign.mutate({ data: { questionIds: selected, lectureId } })}
          isPending={assign.isPending}
        />
      )}
    </>
  );
}
