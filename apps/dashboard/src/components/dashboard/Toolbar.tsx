import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function Toolbar({ onFilter }: { onFilter: () => void }) {
  return <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4"><label className="text-xs font-semibold text-slate-500">Source<select className="mt-1 block h-9 rounded-md border px-3 text-sm"><option>All sources</option></select></label><label className="text-xs font-semibold text-slate-500">Subject<select className="mt-1 block h-9 rounded-md border px-3 text-sm"><option>All subjects</option></select></label><label className="text-xs font-semibold text-slate-500">Term<select className="mt-1 block h-9 rounded-md border px-3 text-sm"><option>All terms</option></select></label><Input className="w-56" placeholder="Search content..." /><Button variant="outline" onClick={onFilter}><Filter size={15} />Filters</Button></div>;
}
