import { useState } from 'react';
import { Pencil, Trash2, Upload } from 'lucide-react';
import { useDeleteAdminQuestionsId, useGetAdminLectures, useGetAdminQuestions, usePatchAdminQuestionsBulkAssignLecture } from '@manhaj/api-client/src/admin/admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Heading } from './Heading';
import { Toolbar } from './Toolbar';

export function QuestionsPage({ notify }: { notify: (message: string) => void }) {
  const query = useGetAdminQuestions({ lectureId: 'null' }); 
  const lectures = useGetAdminLectures(); 
  const rows = query.data?.data ?? []; 
  const [selected, setSelected] = useState<string[]>([]); 
  const all = rows.length > 0 && selected.length === rows.length;
  
  const refresh = () => void query.refetch();
  const assign = usePatchAdminQuestionsBulkAssignLecture({ mutation: { onSuccess: () => { refresh(); notify('Questions assigned successfully'); } } });
  const remove = useDeleteAdminQuestionsId({ mutation: { onSuccess: () => { refresh(); notify('Question deleted'); } } });
  
  const assignSelected = () => { 
    const lectureId = lectures.data?.data?.[0]?.id; 
    if (!lectureId) return notify('Create a lecture before assigning questions'); 
    assign.mutate({ data: { questionIds: selected, lectureId } }); 
  };

  const handleQuestionText = (question: any) => {
    return question.questionText || question.text || 'No text';
  };

  return (
    <>
      <Heading 
        eyebrow="Content review" 
        title="Unclassified questions" 
        description={query.isError ? 'Unable to load questions from the API.' : 'Live questions from the admin API.'} 
        action={<Button onClick={() => notify('Use the API import endpoint to add questions')}><Upload size={16} />Import questions</Button>} 
      />
      <Toolbar onFilter={() => notify('Advanced filters opened')} />
      <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
        <span><b className="text-slate-900">{selected.length}</b> selected</span>
        <Button size="sm" disabled={!selected.length || assign.isPending} onClick={assignSelected}>Assign to lecture</Button>
      </div>
      <Card>
        {query.isLoading ? (
          <CardContent className="p-8 text-sm text-slate-500">Loading questions...</CardContent>
        ) : query.isError ? (
          <CardContent className="p-8 text-sm text-red-600">
            {(query.error as Error).message}
            <div className="mt-2 text-xs">
              Please ensure you are logged in as an admin user.
            </div>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <input 
                    type="checkbox" 
                    checked={all} 
                    onChange={() => setSelected(all ? [] : rows.map((q) => q.id || '').filter(Boolean))} 
                  />
                </TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Question text</TableHead>
                <TableHead>Explanation</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((question) => (
                <TableRow key={question.id}>
                  <TableCell>
                    <input 
                      type="checkbox" 
                      checked={selected.includes(question.id || '')} 
                      onChange={() => setSelected((current) => current.includes(question.id || '') ? current.filter((id) => id !== question.id) : [...current, question.id || ''])} 
                    />
                  </TableCell>
                  <TableCell><code className="text-xs text-slate-500">{question.id}</code></TableCell>
                  <TableCell className="max-w-md font-medium">{handleQuestionText(question)}</TableCell>
                  <TableCell className="max-w-xs text-xs text-slate-500">{question.explanation}</TableCell>
                  <TableCell><Badge variant={question.source === 'telegram_auto' ? 'secondary' : 'outline'}>{question.source || 'unknown'}</Badge></TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => notify('Question editor opened')}>
                      <Pencil size={15} />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => question.id && remove.mutate({ id: question.id })}>
                      <Trash2 size={15} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}