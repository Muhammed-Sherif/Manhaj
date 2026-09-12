import { useState, useEffect } from 'react';
import { X, Lock, Mail, User as UserIcon, Shield, GraduationCap, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { UserRecord, CreateUserPayload, UpdateUserPayload, TermOption, GradeOption } from './types';

interface UserModalProps {
  isOpen: boolean;
  user: UserRecord | null;
  grades: GradeOption[];
  terms: TermOption[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserPayload | UpdateUserPayload) => Promise<void>;
}

export function UserModal({
  isOpen,
  user,
  grades,
  terms,
  isSubmitting,
  onClose,
  onSubmit,
}: UserModalProps) {
  const isEdit = !!user;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'student'>('student');
  const [gradeId, setGradeId] = useState<string>('');
  const [termId, setTermId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPassword('');
      setRole((user.role === 'admin' ? 'admin' : 'student'));
      const existingTermId = user.termId || '';
      setTermId(existingTermId);

      // Find grade for this term
      const matchedTerm = terms.find((t) => t.id === existingTermId);
      setGradeId(matchedTerm?.gradeId || '');
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setRole('student');
      setGradeId('');
      setTermId('');
    }
    setError(null);
  }, [user, isOpen, terms]);

  // Filter terms by selected grade
  const availableTerms = gradeId
    ? terms.filter((t) => t.gradeId === gradeId)
    : terms;

  const handleGradeChange = (newGradeId: string) => {
    setGradeId(newGradeId);
    // If current term does not belong to new grade, reset term
    if (newGradeId && termId) {
      const termMatches = terms.some((t) => t.id === termId && t.gradeId === newGradeId);
      if (!termMatches) {
        setTermId('');
      }
    }
  };

  const handleTermChange = (newTermId: string) => {
    setTermId(newTermId);
    if (newTermId && !gradeId) {
      const matched = terms.find((t) => t.id === newTermId);
      if (matched?.gradeId) {
        setGradeId(matched.gradeId);
      }
    }
  };


  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address');
      return;
    }
    if (!isEdit && (!password || password.length < 6)) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      if (isEdit) {
        const payload: UpdateUserPayload = {
          name: name.trim(),
          email: email.trim(),
          role,
          termId: termId || null,
        };
        if (password.trim()) {
          payload.password = password.trim();
        }
        await onSubmit(payload);
      } else {
        const payload: CreateUserPayload = {
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          role,
          termId: termId || null,
        };
        await onSubmit(payload);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to save user');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {isEdit ? 'Edit User Account' : 'Create New User'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit
                ? 'Update user details, credentials, or assigned academic term.'
                : 'Add a new administrator or student to the platform.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. John Doe"
                className="pl-9"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@manhaj.edu"
                className="pl-9"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password {isEdit && <span className="text-slate-400 font-normal normal-case">(Leave blank to keep current)</span>}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEdit ? '••••••••' : 'Minimum 6 characters'}
                className="pl-9"
                required={!isEdit}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Role
              </label>
              <div className="relative">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'student')}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="student">Student</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Grade
              </label>
              <div className="relative">
                <select
                  value={gradeId}
                  onChange={(e) => handleGradeChange(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="">All Grades</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Academic Term
              </label>
              <div className="relative">
                <select
                  value={termId}
                  onChange={(e) => handleTermChange(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="">None / Unassigned</option>
                  {availableTerms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>


          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-teal-700 hover:bg-teal-800 text-white"
            >
              {isSubmitting
                ? 'Saving...'
                : isEdit
                ? 'Save Changes'
                : 'Create User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
