import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGetAdminSubjects, useGetAdminTerms } from '@manhaj/api-client';

export function Toolbar({ onFilter }: { onFilter: () => void }) {
  const sources = ['telegram_auto', 'manual', 'unknown'];
  const subjectsQuery = useGetAdminSubjects();
  const termsQuery = useGetAdminTerms();
  const subjects = Array.isArray(subjectsQuery.data?.data) ? subjectsQuery.data.data : [];
  const terms = Array.isArray(termsQuery.data?.data) ? termsQuery.data.data : [];

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4">
      <label className="text-xs font-semibold text-slate-500">
        Source
        <select className="mt-1 block h-9 rounded-md border px-3 text-sm">
          <option value="">All sources</option>
          {sources.map(source => (
            <option key={source} value={source}>{source}</option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold text-slate-500">
        Subject
        <select className="mt-1 block h-9 rounded-md border px-3 text-sm" disabled={subjectsQuery.isLoading}>
          <option value="">All subjects</option>
          {subjects.map(subject => (
            <option key={subject.id} value={subject.id}>{subject.name}</option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold text-slate-500">
        Term
        <select className="mt-1 block h-9 rounded-md border px-3 text-sm" disabled={termsQuery.isLoading}>
          <option value="">All terms</option>
          {terms.map(term => (
            <option key={term.id} value={term.id}>{term.name}</option>
          ))}
        </select>
      </label>
      <Input className="w-56" placeholder="Search content..." />
      <Button variant="outline" onClick={onFilter}><Filter size={15} />Filters</Button>
    </div>
  );
}

