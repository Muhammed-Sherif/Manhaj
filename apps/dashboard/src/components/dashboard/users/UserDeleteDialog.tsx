import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UserRecord } from './types';

interface UserDeleteDialogProps {
  user: UserRecord | null;
  isOpen: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function UserDeleteDialog({
  user,
  isOpen,
  isDeleting,
  onClose,
  onConfirm,
}: UserDeleteDialogProps) {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 text-red-600 mb-3">
          <div className="rounded-full bg-red-100 p-2.5">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Delete User</h3>
            <p className="text-xs text-slate-500">This action cannot be undone.</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 mt-2">
          Are you sure you want to permanently delete the account for{' '}
          <strong className="text-slate-900">{user.name}</strong> ({user.email})?
        </p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? 'Deleting...' : 'Confirm Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
}
