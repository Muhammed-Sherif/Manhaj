import { useState, useEffect } from 'react';
import { Pencil, Trash2, Upload, X, BookOpen, ChevronRight, Plus, Check } from 'lucide-react';
import {
  useGetAdminQuestions,
  usePatchAdminQuestionsBulkAssignStudyUnit,
  usePatchAdminQuestionsBulkAssignTelegramRange,
  usePatchAdminQuestionsId,
  usePostAdminQuestionsBulkDelete,
  useGetAdminGrades,
  useGetAdminTerms,
  useGetAdminModules,
  useGetAdminSubjects,
  useGetAdminStudyUnits,
} from '@manhaj/api-client';
import type { Choice, Question } from '@manhaj/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Heading } from './Heading';
import { Toolbar } from './Toolbar';
import { UploadQuestionsModal } from './UploadQuestionsModal';
import { AssignByRangeModal } from './AssignByRangeModal';

type Step = 'grade' | 'term' | 'module' | 'subject' | 'studyUnit';
interface Item { id?: string; name?: string; description?: string }

// `getQuestions` in the API fetches questions `with: { choices: true }`, but the generated
// `Question` model predates that embed and does not declare it.
type QuestionRow = Question & {
  choices?: Choice[];
  writtenQuestion?: { questionId: string; writtenAnswer: string } | null;
};

const STEPS: { key: Step; label: string }[] = [
  { key: 'grade', label: 'Grade' },
  { key: 'term', label: 'Term' },
  { key: 'module', label: 'Module' },
  { key: 'subject', label: 'Subject' },
  { key: 'studyUnit', label: 'Study Unit' },
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
          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${selected === item.id ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:bg-slate-50'
            }`}
        >
          <input
            type="radio"
            name="step-item"
            value={item.id || ''}
            checked={selected === item.id}
            onChange={() => item.id && onSelect(item.id)}
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
  onConfirm: (studyUnitId: string, sourceTypes: string[]) => void;
  isPending: boolean;
}) {
  const [step, setStep] = useState<Step>('grade');
  const [gradeId, setGradeId] = useState('');
  const [termId, setTermId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [studyUnitId, setStudyUnitId] = useState('');
  const [sourceTypes, setSourceTypes] = useState<string[]>([]);

  const handleToggleSource = (source: string) => {
    setSourceTypes(prev =>
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  };

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
  const studyUnits = useGetAdminStudyUnits(
    subjectId ? { subjectId } : undefined,
    { query: { enabled: !!subjectId } }
  );

  const stepIdx = STEPS.findIndex(s => s.key === step);

  const currentItems = ((
    step === 'grade' ? (Array.isArray(grades.data?.data) ? grades.data.data : []) :
      step === 'term' ? (gradeId && Array.isArray(terms.data?.data) ? terms.data.data : []) :
        step === 'module' ? (termId && Array.isArray(modules.data?.data) ? modules.data.data : []) :
          step === 'subject' ? (moduleId && Array.isArray(subjects.data?.data) ? subjects.data.data : []) :
            (subjectId && Array.isArray(studyUnits.data?.data) ? studyUnits.data.data : [])
  ) || []) as Item[];

  const currentLoading =
    step === 'grade' ? grades.isLoading :
      step === 'term' ? terms.isLoading :
        step === 'module' ? modules.isLoading :
          step === 'subject' ? subjects.isLoading :
            studyUnits.isLoading;

  const currentSelected = step === 'grade' ? gradeId : step === 'term' ? termId
    : step === 'module' ? moduleId : step === 'subject' ? subjectId : studyUnitId;

  const handleSelect = (id: string) => {
    if (step === 'grade') { setGradeId(id); setTermId(''); setModuleId(''); setSubjectId(''); setStudyUnitId(''); }
    if (step === 'term') { setTermId(id); setModuleId(''); setSubjectId(''); setStudyUnitId(''); }
    if (step === 'module') { setModuleId(id); setSubjectId(''); setStudyUnitId(''); }
    if (step === 'subject') { setSubjectId(id); setStudyUnitId(''); }
    if (step === 'studyUnit') { setStudyUnitId(id); }
  };

  const goNext = () => { if (stepIdx < STEPS.length - 1) setStep(STEPS[stepIdx + 1].key); };
  const goBack = () => { if (stepIdx > 0) setStep(STEPS[stepIdx - 1].key); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Assign to study unit</h2>
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
                className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${i === stepIdx ? 'bg-teal-600 text-white'
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

        {/* Source Type Filter */}
        <div className="px-6 pb-3">
          <p className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Question Source (optional)</p>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'data', label: 'Data' },
              { id: 'doctor_confirmation', label: 'Doctor' },
              { id: 'previous_exam', label: 'Previous Exam' },
              { id: 'team_expectation', label: 'Team Expectation' },
              { id: 'owner', label: 'Owner' },
            ].map((src) => (
              <label
                key={src.id}
                className={`flex items-center gap-1.5 cursor-pointer border rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  sourceTypes.includes(src.id)
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={sourceTypes.includes(src.id)}
                  onChange={() => handleToggleSource(src.id)}
                />
                {src.label}
              </label>
            ))}
          </div>
          {sourceTypes.length > 0 && (
            <p className="mt-1.5 text-xs text-teal-600">
              Tags selected questions as: {sourceTypes.join(', ')}
            </p>
          )}
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
            {step !== 'studyUnit' ? (
              <Button onClick={goNext} disabled={!currentSelected}>
                Next <ChevronRight size={14} className="ml-1" />
              </Button>
            ) : (
              <Button
                onClick={() => onConfirm(studyUnitId, sourceTypes)}
                disabled={!studyUnitId || isPending}
              >
                <BookOpen size={14} className="mr-1" />
                {isPending ? 'Assigning…' : 'Confirm assign'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { toast } from '@/components/ui/sonner';

// ─── Edit Question Modal ───────────────────────────────────────────────────
type EditableChoice = {
  id?: string;
  choiceText: string;
  isCorrect: boolean;
};

function EditQuestionModal({
  question,
  onClose,
  onSaved,
}: {
  question: QuestionRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [questionText, setQuestionText] = useState(question.questionText ?? '');
  const [explanation, setExplanation] = useState(question.explanation ?? '');
  const [writtenAnswer, setWrittenAnswer] = useState(
    question.writtenQuestion?.writtenAnswer ?? ''
  );
  const [choices, setChoices] = useState<EditableChoice[]>(
    (question.choices ?? []).map((c) => ({
      id: c.id,
      choiceText: c.choiceText ?? '',
      isCorrect: c.isCorrect ?? false,
    }))
  );

  const updateMutation = usePatchAdminQuestionsId({
    mutation: {
      onSuccess: () => {
        toast.success('Question updated successfully');
        onSaved();
        onClose();
      },
      onError: () => toast.error('Failed to update question'),
    },
  });

  const handleChoiceChange = (index: number, field: 'choiceText' | 'isCorrect', value: string | boolean) => {
    setChoices((prev) =>
      prev.map((c, i) => {
        if (i !== index) {
          // when marking a new correct answer, clear others
          if (field === 'isCorrect' && value === true) return { ...c, isCorrect: false };
          return c;
        }
        return { ...c, [field]: value };
      })
    );
  };

  const addChoice = () =>
    setChoices((prev) => [...prev, { choiceText: '', isCorrect: false }]);

  const removeChoice = (index: number) =>
    setChoices((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = () => {
    if (!question.id) return;
    const isWritten = (question as any).questionType === 'written';
    updateMutation.mutate({
      id: question.id,
      data: {
        questionText,
        explanation,
        ...(isWritten ? { writtenAnswer } : {}),
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-xl bg-white shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b px-6 py-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">Edit Question</h2>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${(question as any).questionType === 'written'
                  ? 'bg-violet-100 text-violet-700'
                  : 'bg-sky-100 text-sky-700'
                }`}>
                {(question as any).questionType === 'written' ? 'Written' : 'MCQ'}
              </span>
            </div>
            <p className="text-sm text-slate-500 font-mono mt-0.5">{question.id}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">
          {/* Question text */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Question text</label>
            <textarea
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              rows={4}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Enter question text…"
            />
          </div>

          {/* Explanation */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Explanation <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Enter explanation…"
            />
          </div>

          {/* Written Answer / Choices */}
          {(question as any).questionType === 'written' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Model answer <span className="text-slate-400 font-normal">(spoiler text)</span>
              </label>
              <textarea
                className="w-full rounded-lg border border-slate-200 bg-violet-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                rows={5}
                value={writtenAnswer}
                onChange={(e) => setWrittenAnswer(e.target.value)}
                placeholder="Enter model answer…"
              />
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">Choices</label>
                <button
                  onClick={addChoice}
                  className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium"
                >
                  <Plus size={13} /> Add choice
                </button>
              </div>
              {choices.length === 0 && (
                <p className="text-xs text-slate-400 italic">No choices yet. Click "Add choice" to add one.</p>
              )}
              <div className="space-y-2">
                {choices.map((choice, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${choice.isCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'
                      }`}
                  >
                    <button
                      type="button"
                      title={choice.isCorrect ? 'Correct answer' : 'Mark as correct'}
                      onClick={() => handleChoiceChange(i, 'isCorrect', !choice.isCorrect)}
                      className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-full border-2 transition-colors ${choice.isCorrect
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-slate-300 hover:border-emerald-400'
                        }`}
                    >
                      {choice.isCorrect && <Check size={12} strokeWidth={3} />}
                    </button>
                    <input
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                      placeholder={`Choice ${String.fromCharCode(65 + i)}`}
                      value={choice.choiceText}
                      onChange={(e) => handleChoiceChange(i, 'choiceText', e.target.value)}
                    />
                    <button
                      onClick={() => removeChoice(i)}
                      className="shrink-0 text-slate-400 hover:text-red-500 transition-colors"
                      aria-label="Remove choice"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-400">Note: Choice edits are saved via the choices API separately. Only question text and explanation are updated here.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t px-6 py-4 shrink-0">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!questionText.trim() || updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function QuestionsPage() {
  const query = useGetAdminQuestions({ studyUnitId: 'null' });
  const refresh = () => query.refetch();

  const [selected, setSelected] = useState<string[]>([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignRangeModalOpen, setAssignRangeModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null);
  // Question currently being edited; null when the dialog is closed.
  const [editingQuestion, setEditingQuestion] = useState<QuestionRow | null>(null);

  const rows = (query.data?.data ?? []) as QuestionRow[];
  const all = rows.length > 0 && selected.length === rows.length;

  // Auto-select questions that already have choices attached
  useEffect(() => {
    const withChoices = rows
      .filter((q) => (q.choices ?? []).length > 0)
      .map((q) => q.id ?? '')
      .filter(Boolean);
    setSelected(withChoices);
  }, [query.data]);

  const assign = usePatchAdminQuestionsBulkAssignStudyUnit({
    mutation: {
      onSuccess: () => {
        refresh();
        toast.success('Questions assigned successfully');
        setAssignModalOpen(false);
        setSelected([]);
      },
    },
  });

  const assignRange = usePatchAdminQuestionsBulkAssignTelegramRange({
    mutation: {
      onSuccess: () => {
        refresh();
        toast.success('Questions assigned successfully');
        setAssignRangeModalOpen(false);
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error || 'Failed to assign questions by range');
      }
    },
  });

  const bulkDelete = usePostAdminQuestionsBulkDelete({
    mutation: {
      onSuccess: (response, variables) => {
        const count = response?.data?.deletedCount ?? variables.data.questionIds.length;
        refresh();
        toast.success(`${count} question${count === 1 ? '' : 's'} deleted`);
        setSelected([]);
        setPendingDelete(null);
      },
      onError: () => toast.error('Failed to delete questions'),
    },
  });

  const handleQuestionText = (question: any) => question.questionText || question.text || 'No text';

  // Used to name the question when only one is pending deletion.
  const pendingQuestion = pendingDelete && pendingDelete.length === 1
    ? rows.find((q) => q.id === pendingDelete[0])
    : undefined;

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
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setAssignRangeModalOpen(true)}>
            Assign by Telegram Range
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={!selected.length || bulkDelete.isPending}
            onClick={() => setPendingDelete(selected)}
          >
            <Trash2 size={15} />
            Delete selected
          </Button>
          <Button size="sm" disabled={!selected.length || assign.isPending} onClick={() => setAssignModalOpen(true)}>
            Assign to study unit
          </Button>
        </div>
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
                <TableHead>Type</TableHead>
                <TableHead>Question text</TableHead>
                <TableHead>Answer</TableHead>
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
                  <TableCell>
                    <code className="text-xs text-slate-500">
                      {question.telegramMessageId ? `#${question.telegramMessageId}` : (question.id || '').substring(0, 8)}
                    </code>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${(question as any).questionType === 'written'
                        ? 'bg-violet-100 text-violet-700'
                        : 'bg-sky-100 text-sky-700'
                      }`}>
                      {(question as any).questionType === 'written' ? 'Written' : 'MCQ'}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs font-medium">{handleQuestionText(question)}</TableCell>
                  <TableCell className="max-w-xs">
                    {(question as any).questionType === 'written' ? (
                      question.writtenQuestion?.writtenAnswer ? (
                        <span className="text-xs text-violet-700 bg-violet-50 rounded px-2 py-1 line-clamp-2 block max-w-[200px]">
                          {question.writtenQuestion.writtenAnswer}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">No answer</span>
                      )
                    ) : (
                      <span className="text-emerald-700 font-medium text-sm">
                        {(question.choices ?? []).find((c) => c.isCorrect)?.choiceText || <span className="text-slate-400 italic">None</span>}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="min-w-[220px]">
                    {(question.choices ?? []).length === 0 ? (
                      <span className="text-xs italic text-slate-400">No choices</span>
                    ) : (
                      <ol className="space-y-1">
                        {(question.choices ?? []).map((choice, i) => (
                          <li
                            key={choice.id ?? i}
                            className={`flex items-start gap-1.5 rounded px-2 py-1 text-xs ${choice.isCorrect
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
                    <Button size="icon" variant="ghost" onClick={() => setEditingQuestion(question)} aria-label="Edit question"><Pencil size={15} /></Button>
                    <Button size="icon" variant="ghost" onClick={() => question.id && setPendingDelete([question.id])}><Trash2 size={15} /></Button>
                  </TableCell>
                </TableRow>

              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSaved={refresh}
        />
      )}

      {assignModalOpen && (
        <AssignModal
          selectedCount={selected.length}
          onClose={() => setAssignModalOpen(false)}
          onConfirm={(studyUnitId, sourceTypes) =>
            assign.mutate({ data: { questionIds: selected, studyUnitId, sourceTypes } })
          }
          isPending={assign.isPending}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          isOpen
          title={pendingDelete.length === 1 ? 'Delete question' : `Delete ${pendingDelete.length} questions`}
          description={
            pendingDelete.length === 1 ? (
              <>
                Delete{' '}
                <strong className="text-slate-900">
                  {pendingQuestion ? handleQuestionText(pendingQuestion) : 'this question'}
                </strong>
                ?
              </>
            ) : (
              <>
                You are about to delete{' '}
                <strong className="text-slate-900">{pendingDelete.length}</strong> selected questions.
              </>
            )
          }
          confirmLabel="Delete"
          pendingLabel="Deleting…"
          isPending={bulkDelete.isPending}
          onClose={() => setPendingDelete(null)}
          onConfirm={() => bulkDelete.mutate({ data: { questionIds: pendingDelete } })}
        />
      )}

      {assignRangeModalOpen && (
        <AssignByRangeModal
          isPending={assignRange.isPending}
          onClose={() => setAssignRangeModalOpen(false)}
          onConfirm={(startMessageId, endMessageId, studyUnitId, sourceTypes) => {
            assignRange.mutate({
              data: {
                startMessageId,
                endMessageId,
                studyUnitId,
                sourceTypes: sourceTypes as any,
              },
            });
          }}
        />
      )}
    </>
  );
}
