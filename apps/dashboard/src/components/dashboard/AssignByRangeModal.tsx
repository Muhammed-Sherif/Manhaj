import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useGetAdminGrades, useGetAdminTerms, useGetAdminModules, useGetAdminSubjects, useGetAdminStudyUnits } from '@manhaj/api-client';
import { Button } from '@/components/ui/button';

type Step = 'grade' | 'term' | 'module' | 'subject' | 'studyUnit';
interface Item { id?: string; name?: string; description?: string }

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

interface AssignByRangeModalProps {
  onClose: () => void;
  onConfirm: (startMessageId: number, endMessageId: number, lectureId: string, sourceTypes: string[]) => void;
  isPending: boolean;
}

export function AssignByRangeModal({
  onClose,
  onConfirm,
  isPending,
}: AssignByRangeModalProps) {
  const [startMessageId, setStartMessageId] = useState<string>('');
  const [endMessageId, setEndMessageId] = useState<string>('');
  
  const [step, setStep] = useState<Step>('grade');
  const [gradeId,   setGradeId]   = useState('');
  const [termId,    setTermId]    = useState('');
  const [moduleId,  setModuleId]  = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [lectureId, setLectureId] = useState('');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Assign Questions by Telegram Message Range</h2>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Start Message ID</label>
                <input
                  type="number"
                  placeholder="e.g. 100"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  value={startMessageId}
                  onChange={(e) => setStartMessageId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">End Message ID</label>
                <input
                  type="number"
                  placeholder="e.g. 150"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  value={endMessageId}
                  onChange={(e) => setEndMessageId(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Source Types</label>
              <div className="flex flex-wrap gap-4">
                {[
                  { id: 'previous_exam', label: 'Previous Exam' },
                  { id: 'doctor_confirmation', label: 'Doctor Examination' },
                  { id: 'team_expectation', label: 'Team Expectation' },
                  { id: 'owner', label: 'Owner' },
                  { id: 'data', label: 'Data' }
                ].map((src) => (
                  <label key={src.id} className={`flex items-center gap-2 cursor-pointer border rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    sourceTypes.includes(src.id) 
                      ? 'border-teal-500 bg-teal-50 text-teal-700' 
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}>
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
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-4 flex gap-2 overflow-x-auto pb-2 text-sm">
              <button
                className={`shrink-0 rounded-full px-3 py-1 font-medium transition-colors ${
                  step === 'grade' ? 'bg-slate-900 text-white' : gradeId ? 'bg-slate-100 text-slate-900' : 'bg-slate-50 text-slate-400'
                }`}
                onClick={() => setStep('grade')}
              >
                1. Grade
              </button>
              <button
                disabled={!gradeId}
                className={`shrink-0 rounded-full px-3 py-1 font-medium transition-colors ${
                  step === 'term' ? 'bg-slate-900 text-white' : termId ? 'bg-slate-100 text-slate-900' : 'bg-slate-50 text-slate-400'
                }`}
                onClick={() => setStep('term')}
              >
                2. Term
              </button>
              <button
                disabled={!termId}
                className={`shrink-0 rounded-full px-3 py-1 font-medium transition-colors ${
                  step === 'module' ? 'bg-slate-900 text-white' : moduleId ? 'bg-slate-100 text-slate-900' : 'bg-slate-50 text-slate-400'
                }`}
                onClick={() => setStep('module')}
              >
                3. Module
              </button>
              <button
                disabled={!moduleId}
                className={`shrink-0 rounded-full px-3 py-1 font-medium transition-colors ${
                  step === 'subject' ? 'bg-slate-900 text-white' : subjectId ? 'bg-slate-100 text-slate-900' : 'bg-slate-50 text-slate-400'
                }`}
                onClick={() => setStep('subject')}
              >
                4. Subject
              </button>
              <button
                disabled={!subjectId}
                className={`shrink-0 rounded-full px-3 py-1 font-medium transition-colors ${
                  step === 'studyUnit' ? 'bg-teal-600 text-white' : lectureId ? 'bg-teal-50 text-teal-700' : 'bg-slate-50 text-slate-400'
                }`}
                onClick={() => setStep('studyUnit')}
              >
                5. Study Unit
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-2">
              {step === 'grade' && (
                <StepList
                  items={grades.data?.data || []}
                  loading={grades.isLoading}
                  selected={gradeId}
                  onSelect={(id) => {
                    setGradeId(id);
                    setTermId(''); setModuleId(''); setSubjectId(''); setLectureId('');
                    setStep('term');
                  }}
                />
              )}
              {step === 'term' && (
                <StepList
                  items={terms.data?.data || []}
                  loading={terms.isLoading}
                  selected={termId}
                  onSelect={(id) => {
                    setTermId(id);
                    setModuleId(''); setSubjectId(''); setLectureId('');
                    setStep('module');
                  }}
                />
              )}
              {step === 'module' && (
                <StepList
                  items={modules.data?.data || []}
                  loading={modules.isLoading}
                  selected={moduleId}
                  onSelect={(id) => {
                    setModuleId(id);
                    setSubjectId(''); setLectureId('');
                    setStep('subject');
                  }}
                />
              )}
              {step === 'subject' && (
                <StepList
                  items={subjects.data?.data || []}
                  loading={subjects.isLoading}
                  selected={subjectId}
                  onSelect={(id) => {
                    setSubjectId(id);
                    setLectureId('');
                    setStep('studyUnit');
                  }}
                />
              )}
              {step === 'studyUnit' && (
                <StepList
                  items={studyUnits.data?.data || []}
                  loading={studyUnits.isLoading}
                  selected={lectureId}
                  onSelect={setLectureId}
                />
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-teal-600 hover:bg-teal-700"
              disabled={!lectureId || !startMessageId || !endMessageId || isPending}
              onClick={() => {
                const start = parseInt(startMessageId, 10);
                const end = parseInt(endMessageId, 10);
                if (isNaN(start) || isNaN(end)) return;
                onConfirm(start, end, lectureId, sourceTypes);
              }}
            >
              {isPending ? (
                'Assigning...'
              ) : (
                <>
                  <Check size={16} className="mr-2" />
                  Assign to Study Unit
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
