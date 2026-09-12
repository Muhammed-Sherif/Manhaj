import { Edit2, Trash2, Shield, GraduationCap, Calendar, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { UserRecord } from './types';

interface UserTableProps {
  users: UserRecord[];
  onEdit: (user: UserRecord) => void;
  onDelete: (user: UserRecord) => void;
}

export function UserTable({ users, onEdit, onDelete }: UserTableProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-base font-semibold text-slate-700">No users found</p>
        <p className="mt-1 text-sm text-slate-500">
          Try adjusting your search or filter, or create a new user account.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="w-[280px]">User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead>Assigned Term</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} className="hover:bg-slate-50/80">
              <TableCell>
                <div className="flex items-center gap-3">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-200"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 font-semibold text-teal-800 ring-1 ring-teal-200 text-xs">
                      {getInitials(user.name)}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-slate-900">{user.name}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                  </div>
                </div>
              </TableCell>

              <TableCell>
                {user.role === 'admin' ? (
                  <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700 font-medium">
                    <Shield className="mr-1 h-3 w-3 inline" /> Admin
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 font-medium">
                    <GraduationCap className="mr-1 h-3 w-3 inline" /> Student
                  </Badge>
                )}
              </TableCell>

              <TableCell>
                {user.gradeName ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-teal-800 bg-teal-50 border border-teal-200/60 px-2.5 py-1 rounded-md font-medium">
                    <BookOpen className="h-3 w-3 text-teal-600" />
                    {user.gradeName}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 italic">—</span>
                )}
              </TableCell>

              <TableCell>
                {user.termName ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md font-medium">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    {user.termName}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 italic">None</span>
                )}
              </TableCell>

              <TableCell className="text-xs text-slate-500">
                {formatDate(user.createdAt)}
              </TableCell>

              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(user)}
                    className="h-8 w-8 p-0 text-slate-600 hover:text-teal-700 hover:border-teal-300"
                    title="Edit User"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(user)}
                    className="h-8 w-8 p-0 text-slate-600 hover:text-red-700 hover:border-red-300"
                    title="Delete User"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
