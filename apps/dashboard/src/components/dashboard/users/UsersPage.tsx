import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { Heading } from '../Heading';
import type { UserRecord, CreateUserPayload, UpdateUserPayload, TermOption, GradeOption } from './types';
import { fetchUsersApi, createUserApi, updateUserApi, deleteUserApi, fetchTermsApi, fetchGradesApi } from './api';
import { UserStats } from './UserStats';
import { UserSearchFilter } from './UserSearchFilter';
import { UserTable } from './UserTable';
import { UserModal } from './UserModal';
import { UserDeleteDialog } from './UserDeleteDialog';

export function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');

  // Modal dialog states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

  // Delete dialog state
  const [deletingUser, setDeletingUser] = useState<UserRecord | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersData, gradesData, termsData] = await Promise.all([
        fetchUsersApi(),
        fetchGradesApi(),
        fetchTermsApi(),
      ]);
      setUsers(usersData);
      setGrades(gradesData);
      setTerms(termsData);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole =
        roleFilter === 'all' || user.role === roleFilter;

      const matchesGrade =
        gradeFilter === 'all' || user.gradeId === gradeFilter;

      return matchesSearch && matchesRole && matchesGrade;
    });
  }, [users, searchTerm, roleFilter, gradeFilter]);

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: UserRecord) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleOpenDeleteDialog = (user: UserRecord) => {
    setDeletingUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveUser = async (data: CreateUserPayload | UpdateUserPayload) => {
    setIsSubmitting(true);
    try {
      if (editingUser) {
        await updateUserApi(editingUser.id, data as UpdateUserPayload);
        toast.success('User updated successfully');
      } else {
        await createUserApi(data as CreateUserPayload);
        toast.success('User created successfully');
      }
      setIsModalOpen(false);
      setEditingUser(null);
      await loadData();
    } catch (error: any) {
      const message = error?.response?.data?.error || error.message || 'Failed to save user';
      toast.error(message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      await deleteUserApi(deletingUser.id);
      toast.success('User deleted successfully');
      setIsDeleteDialogOpen(false);
      setDeletingUser(null);
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error.message || 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Heading
        eyebrow="Content Structure"
        title="Users"
        description="Manage administrator accounts, instructors, and enrolled students."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="gap-1.5 text-slate-600"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={handleOpenCreateModal}
              className="gap-2 bg-teal-700 hover:bg-teal-800 text-white shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add user
            </Button>
          </div>
        }
      />

      <UserStats users={users} />

      <UserSearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        gradeFilter={gradeFilter}
        onGradeFilterChange={setGradeFilter}
        grades={grades}
      />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="h-8 w-8 animate-spin text-teal-600 mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading user directory...</p>
        </div>
      ) : (
        <UserTable
          users={filteredUsers}
          onEdit={handleOpenEditModal}
          onDelete={handleOpenDeleteDialog}
        />
      )}

      <UserModal
        isOpen={isModalOpen}
        user={editingUser}
        grades={grades}
        terms={terms}
        isSubmitting={isSubmitting}
        onClose={() => {
          setIsModalOpen(false);
          setEditingUser(null);
        }}
        onSubmit={handleSaveUser}
      />


      <UserDeleteDialog
        user={deletingUser}
        isOpen={isDeleteDialogOpen}
        isDeleting={isDeleting}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeletingUser(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
