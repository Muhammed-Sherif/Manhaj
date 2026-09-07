import { BookOpen, Pencil, Plus, X } from 'lucide-react';
import { useGetAdminLectures, usePostAdminLectures, usePatchAdminLecturesId } from '@manhaj/api-client/src/admin/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Heading } from './Heading';
import { Toolbar } from './Toolbar';
import { useState } from 'react';

export function LecturesPage({ notify }: { notify: (message: string) => void }) {
  const query = useGetAdminLectures();
  const rows = query.data?.data ?? [];
  const createLectureMutation = usePostAdminLectures();
  const updateLectureMutation = usePatchAdminLecturesId();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const handleAddClick = () => {
    setFormData({});
    setIsEditMode(false);
    setEditingItemId(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (lecture: { id?: string; subjectId?: string; name?: string; description?: string }) => {
    if (!lecture.id) return;
    setFormData({
      subjectId: lecture.subjectId || '',
      name: lecture.name || '',
      description: lecture.description || '',
    });
    setIsEditMode(true);
    setEditingItemId(lecture.id);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditMode && editingItemId) {
        // Update existing lecture
        await updateLectureMutation.mutateAsync({ 
          id: editingItemId,
          data: { 
            subjectId: formData.subjectId, 
            name: formData.name, 
            description: formData.description 
          } 
        });
        notify('Lecture updated successfully');
      } else {
        // Create new lecture
        await createLectureMutation.mutateAsync({ 
          data: { 
            subjectId: formData.subjectId, 
            name: formData.name, 
            description: formData.description 
          } 
        });
        notify('Lecture created successfully');
      }
      setIsDialogOpen(false);
      setIsEditMode(false);
      setEditingItemId(null);
      query.refetch();
    } catch (error) {
      notify(`Failed to ${isEditMode ? 'update' : 'create'} lecture`);
    }
  };

  return (
    <>
      <Heading 
        eyebrow="Content library" 
        title="Lectures" 
        description={query.isError ? 'Unable to load lectures from the API.' : 'Live lectures from the admin API.'} 
        action={<Button onClick={handleAddClick}><Plus size={16} />Add lecture</Button>} 
      />
      <Toolbar onFilter={() => notify('Advanced filters opened')} />
      <Card>
        {query.isLoading ? (
          <CardContent className="p-8 text-sm text-slate-500">Loading lectures...</CardContent>
        ) : query.isError ? (
          <CardContent className="p-8 text-sm text-red-600">{(query.error as Error).message}</CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((lecture) => (
                <TableRow key={lecture.id}>
                  <TableCell>
                    <span className="flex items-center gap-3 font-semibold">
                      <span className="grid size-9 place-items-center rounded-md bg-teal-50 text-teal-700">
                        <BookOpen size={17} />
                      </span>
                      {lecture.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-500">{lecture.description || 'No description'}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => handleEditClick(lecture)}>
                      <Pencil size={15} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {isDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{isEditMode ? 'Edit Lecture' : 'Add Lecture'}</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsDialogOpen(false)}>
                <X size={16} />
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isEditMode && (
                <div>
                  <label className="block text-sm font-medium mb-1">Subject ID</label>
                  <Input 
                    value={formData.subjectId || ''} 
                    onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })} 
                    placeholder="Subject ID" 
                    required 
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input 
                  value={formData.name || ''} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  placeholder="Lecture name" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Input 
                  value={formData.description || ''} 
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                  placeholder="Lecture description" 
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createLectureMutation.isPending || updateLectureMutation.isPending}>
                  {createLectureMutation.isPending || updateLectureMutation.isPending ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update' : 'Create')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
