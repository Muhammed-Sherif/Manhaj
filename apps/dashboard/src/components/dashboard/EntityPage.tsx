import { Pencil, Plus, X, Trash2 } from 'lucide-react';
import { useGetContentSync } from '@manhaj/api-client/src/content/content';
import { usePostAdminGrades, usePostAdminTerms, usePostAdminModules, usePostAdminSubjects, usePatchAdminGradesId, usePatchAdminTermsId, usePatchAdminModulesId, usePatchAdminSubjectsId, useDeleteAdminQuestionsId, useDeleteAdminGradesId, useDeleteAdminTermsId, useDeleteAdminModulesId, useDeleteAdminSubjectsId, useDeleteAdminLecturesId } from '@manhaj/api-client/src/admin/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { Page } from './types';
import { Heading } from './Heading';
import { useState } from 'react';
import { toast } from '@/components/ui/sonner';

export function EntityPage({ type }: { type: Page }) {
  const title = type[0].toUpperCase() + type.slice(1);
  const query = useGetContentSync();
  const key = type === 'grades' ? 'grades' : type === 'terms' ? 'terms' : type === 'modules' ? 'modules' : type === 'subjects' ? 'subjects' : null;
  const rows = key ? ((query.data?.data as Record<string, unknown[]> | undefined)?.[key] || []) : [];
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  // Mutation hooks
  const gradesMutation = usePostAdminGrades();
  const termsMutation = usePostAdminTerms();
  const modulesMutation = usePostAdminModules();
  const subjectsMutation = usePostAdminSubjects();
  
  const updateGradesMutation = usePatchAdminGradesId();
  const updateTermsMutation = usePatchAdminTermsId();
  const updateModulesMutation = usePatchAdminModulesId();
  const updateSubjectsMutation = usePatchAdminSubjectsId();
  
  const deleteQuestionsMutation = useDeleteAdminQuestionsId();
  const deleteGradesMutation = useDeleteAdminGradesId();
  const deleteTermsMutation = useDeleteAdminTermsId();
  const deleteModulesMutation = useDeleteAdminModulesId();
  const deleteSubjectsMutation = useDeleteAdminSubjectsId();
  const deleteLecturesMutation = useDeleteAdminLecturesId();

  const getMutation = () => {
    switch (type) {
      case 'grades': return gradesMutation;
      case 'terms': return termsMutation;
      case 'modules': return modulesMutation;
      case 'subjects': return subjectsMutation;
      default: return null;
    }
  };

  const getUpdateMutation = () => {
    switch (type) {
      case 'grades': return updateGradesMutation;
      case 'terms': return updateTermsMutation;
      case 'modules': return updateModulesMutation;
      case 'subjects': return updateSubjectsMutation;
      default: return null;
    }
  };

  const getDeleteMutation = () => {
    switch (type) {
      case 'grades': return deleteGradesMutation;
      case 'terms': return deleteTermsMutation;
      case 'modules': return deleteModulesMutation;
      case 'subjects': return deleteSubjectsMutation;
      case 'lectures': return deleteLecturesMutation;
      case 'questions': return deleteQuestionsMutation;
      default: return null;
    }
  };

  const mutation = getMutation();
  const updateMutation = getUpdateMutation();

  const handleAddClick = () => {
    if (!key) {
      toast.info('User management requires an admin API endpoint');
      return;
    }
    setFormData({});
    setIsEditMode(false);
    setEditingItemId(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (item: { id?: string; name?: string; description?: string; gradeId?: string; termId?: string; moduleId?: string }) => {
    if (!item.id) return;
    setFormData({
      name: item.name || '',
      description: item.description || '',
      gradeId: item.gradeId || '',
      termId: item.termId || '',
      moduleId: item.moduleId || '',
    });
    setIsEditMode(true);
    setEditingItemId(item.id);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = async (item: { id?: string; name?: string }) => {
    if (!item.id) return;
    if (!confirm(`Are you sure you want to delete "${item.name || item.id}"?`)) return;
    
    try {
      const deleteMutation = getDeleteMutation();
      if (!deleteMutation) {
        toast.info('Delete functionality not yet implemented for this entity type');
        return;
      }
      
      await deleteMutation.mutateAsync({ id: item.id });
      toast.success(`${title.slice(0, -1)} deleted successfully`);
      query.refetch();
    } catch (error) {
      toast.error(`Failed to delete ${title.slice(0, -1)}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditMode && editingItemId) {
        // Update existing item
        switch (type) {
          case 'grades':
            await updateGradesMutation.mutateAsync({ id: editingItemId, data: { name: formData.name, description: formData.description } });
            break;
          case 'terms':
            await updateTermsMutation.mutateAsync({ id: editingItemId, data: { gradeId: formData.gradeId, name: formData.name, description: formData.description } });
            break;
          case 'modules':
            await updateModulesMutation.mutateAsync({ id: editingItemId, data: { termId: formData.termId, name: formData.name, description: formData.description } });
            break;
          case 'subjects':
            await updateSubjectsMutation.mutateAsync({ id: editingItemId, data: { moduleId: formData.moduleId, name: formData.name } });
            break;
        }
        toast.success(`${title.slice(0, -1)} updated successfully`);
      } else {
        // Create new item
        switch (type) {
          case 'grades':
            await gradesMutation.mutateAsync({ data: { name: formData.name, description: formData.description } });
            break;
          case 'terms':
            await termsMutation.mutateAsync({ data: { gradeId: formData.gradeId, name: formData.name, description: formData.description } });
            break;
          case 'modules':
            await modulesMutation.mutateAsync({ data: { termId: formData.termId, name: formData.name, description: formData.description } });
            break;
          case 'subjects':
            await subjectsMutation.mutateAsync({ data: { moduleId: formData.moduleId, name: formData.name } });
            break;
        }
        toast.success(`${title.slice(0, -1)} created successfully`);
      }
      setIsDialogOpen(false);
      setIsEditMode(false);
      setEditingItemId(null);
      query.refetch();
    } catch (error) {
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} ${title.slice(0, -1)}`);
    }
  };


  const renderFormFields = () => {
    switch (type) {
      case 'grades':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Grade name" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Grade description" required />
            </div>
          </>
        );
      case 'terms':
        return (
          <>
            {!isEditMode && (
              <div>
                <label className="block text-sm font-medium mb-1">Grade</label>
                <select 
                  value={formData.gradeId || ''} 
                  onChange={(e) => setFormData({ ...formData, gradeId: e.target.value })} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a grade</option>
                  {(query.data?.data as Record<string, unknown[]> | undefined)?.grades?.map((gradeItem: unknown) => {
                    const grade = gradeItem as { id?: string; name?: string };
                    return (
                      <option key={grade.id || ''} value={grade.id || ''}>
                        {grade.name}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Term name" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Term description" required />
            </div>
          </>
        );
      case 'modules':
        return (
          <>
            {!isEditMode && (
              <div>
                <label className="block text-sm font-medium mb-1">Term</label>
                <select 
                  value={formData.termId || ''} 
                  onChange={(e) => setFormData({ ...formData, termId: e.target.value })} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a term</option>
                  {(query.data?.data as Record<string, unknown[]> | undefined)?.terms?.map((termItem: unknown) => {
                    const term = termItem as { id?: string; name?: string };
                    return (
                      <option key={term.id || ''} value={term.id || ''}>
                        {term.name}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Module name" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Module description" required />
            </div>
          </>
        );
      case 'subjects':
        return (
          <>
            {!isEditMode && (
              <div>
                <label className="block text-sm font-medium mb-1">Module</label>
                <select 
                  value={formData.moduleId || ''} 
                  onChange={(e) => setFormData({ ...formData, moduleId: e.target.value })} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a module</option>
                  {(query.data?.data as Record<string, unknown[]> | undefined)?.modules?.map((moduleItem: unknown) => {
                    const mod = moduleItem as { id?: string; name?: string };
                    return (
                      <option key={mod.id || ''} value={mod.id || ''}>
                        {mod.name}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Subject name" required />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Heading 
        eyebrow="Content structure" 
        title={title} 
        description={key ? `Live ${title.toLowerCase()} from the content API.` : 'No admin users endpoint is available yet.'} 
        action={<Button onClick={handleAddClick}><Plus size={16} />Add {type.slice(0, -1)}</Button>} 
      />
      <Card>
        {query.isLoading ? (
          <CardContent className="p-8 text-sm text-slate-500">Loading live data...</CardContent>
        ) : query.isError ? (
          <CardContent className="p-8 text-sm text-red-600">Unable to load {title.toLowerCase()}.</CardContent>
        ) : rows.length === 0 ? (
          <CardContent className="p-8 text-sm text-slate-500">No {title.toLowerCase()} records returned by the API.</CardContent>
        ) : (
          <CardContent className="p-0">
            {rows.map((row, index) => {
              const item = row as { id?: string; name?: string; description?: string; gradeId?: string; termId?: string; moduleId?: string };
              return (
                <div key={item.id || index} className="flex items-center gap-4 border-b p-5 last:border-0">
                  <span className="text-xs font-bold text-slate-400">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <p className="font-semibold">{item.name || item.id}</p>
                    <p className="text-xs text-slate-500">{item.description || item.id}</p>
                  </div>
                  <span className="flex-1" />
                  <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)}>
                    <Pencil size={15} />
                  </Button>
                  {(type === 'grades' || type === 'terms' || type === 'modules' || type === 'subjects' || type === 'lectures' || type === 'questions') && (
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(item)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Trash2 size={15} />
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        )}
      </Card>

      {isDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{isEditMode ? `Edit ${title.slice(0, -1)}` : `Add ${title.slice(0, -1)}`}</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsDialogOpen(false)}>
                <X size={16} />
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {renderFormFields()}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={mutation?.isPending || updateMutation?.isPending}>
                  {mutation?.isPending || updateMutation?.isPending ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update' : 'Create')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
