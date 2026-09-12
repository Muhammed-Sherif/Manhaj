import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { GradeOption } from './types';

interface UserSearchFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (role: string) => void;
  gradeFilter: string;
  onGradeFilterChange: (gradeId: string) => void;
  grades: GradeOption[];
}

export function UserSearchFilter({
  searchTerm,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  gradeFilter,
  onGradeFilterChange,
  grades,
}: UserSearchFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-4">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Search users by name or email..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-white"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="grade-filter" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Grade:
          </label>
          <select
            id="grade-filter"
            value={gradeFilter}
            onChange={(e) => onGradeFilterChange(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All Grades</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="role-filter" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Role:
          </label>
          <select
            id="role-filter"
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrators</option>
            <option value="student">Students</option>
          </select>
        </div>
      </div>
    </div>
  );
}

