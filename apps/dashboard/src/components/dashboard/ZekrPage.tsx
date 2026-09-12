import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Heading } from './Heading';
import { Toolbar } from './Toolbar';
import { toast } from '@/components/ui/sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const fetchZekrList = async () => {
  const token = localStorage.getItem('token') || '';
  const res = await axios.get('/api/admin/zekr-catalog', { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

const createZekr = async (data: any) => {
  const token = localStorage.getItem('token') || '';
  const res = await axios.post('/api/admin/zekr-catalog', data, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

const updateZekr = async ({ id, data }: { id: string; data: any }) => {
  const token = localStorage.getItem('token') || '';
  const res = await axios.patch(`/api/admin/zekr-catalog/${id}`, data, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

const deleteZekr = async (id: string) => {
  const token = localStorage.getItem('token') || '';
  const res = await axios.delete(`/api/admin/zekr-catalog/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

export function ZekrPage() {
  const queryClient = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({ queryKey: ['zekrCatalog'], queryFn: fetchZekrList });

  const createMutation = useMutation({
    mutationFn: createZekr,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zekrCatalog'] });
      toast.success('Zekr added successfully');
      setEditingItemId(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateZekr,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zekrCatalog'] });
      toast.success('Zekr updated successfully');
      setEditingItemId(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteZekr,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zekrCatalog'] });
      toast.success('Zekr deleted successfully');
    }
  });

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ text: '', defaultCount: 1, meaning: '', source: '', transliteration: '' });

  const handleEdit = (item: any) => {
    setEditingItemId(item.id);
    setFormData({
      text: item.text,
      defaultCount: item.defaultCount,
      meaning: item.meaning || '',
      source: item.source || '',
      transliteration: item.transliteration || ''
    });
  };

  const handleSave = () => {
    if (!formData.text) return toast.error('Text is required');
    if (editingItemId === 'new') {
      createMutation.mutate(formData);
    } else if (editingItemId) {
      updateMutation.mutate({ id: editingItemId, data: formData });
    }
  };

  return (
    <div className="space-y-6">
      <Toolbar>
        <div className="flex w-full items-center justify-between">
          <Heading title="Zekr Catalog" description="Manage dhikr items and targets." />
          <Button onClick={() => {
            setEditingItemId('new');
            setFormData({ text: '', defaultCount: 1, meaning: '', source: '', transliteration: '' });
          }}>
            <Plus className="mr-2 h-4 w-4" /> Add Zekr
          </Button>
        </div>
      </Toolbar>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Text</TableHead>
                <TableHead>Target Count</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              )}
              {editingItemId === 'new' && (
                <TableRow>
                  <TableCell>
                    <Input value={formData.text} onChange={e => setFormData({ ...formData, text: e.target.value })} placeholder="Subhanallah" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" value={formData.defaultCount} onChange={e => setFormData({ ...formData, defaultCount: parseInt(e.target.value) || 1 })} />
                  </TableCell>
                  <TableCell>
                    <Input value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })} placeholder="Hisn Almuslim" />
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={handleSave} disabled={createMutation.isPending}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditingItemId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((row: any) => (
                <TableRow key={row.id}>
                  {editingItemId === row.id ? (
                    <>
                      <TableCell>
                        <Input value={formData.text} onChange={e => setFormData({ ...formData, text: e.target.value })} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={formData.defaultCount} onChange={e => setFormData({ ...formData, defaultCount: parseInt(e.target.value) || 1 })} />
                      </TableCell>
                      <TableCell>
                        <Input value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })} />
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={handleSave} disabled={updateMutation.isPending}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditingItemId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-medium">{row.text}</TableCell>
                      <TableCell>{row.defaultCount}</TableCell>
                      <TableCell className="text-muted-foreground">{row.source || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => deleteMutation.mutate(row.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
