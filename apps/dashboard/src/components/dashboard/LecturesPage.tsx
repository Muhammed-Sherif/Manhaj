import {
  BookOpen,
  Pencil,
  Plus,
  X,
  Trash2,
  Video,
  Headphones,
  FileText,
  Link as LinkIcon,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import {
  useGetAdminLectures,
  usePostAdminLectures,
  usePatchAdminLecturesId,
  useDeleteAdminLecturesId,
  useGetAdminSubjects,
  postAdminLecturesIdVideos,
  postAdminLecturesIdFiles,
} from '@manhaj/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Heading } from './Heading';
import { Toolbar } from './Toolbar';
import React, { useState } from 'react';

interface MaterialLink {
  id?: string;
  url: string;
  sourceName: string;
}

import { toast } from '@/components/ui/sonner';
import {
  LectureVideoUpload,
  type PendingVideoFile,
} from './LectureVideoUpload';
import { uploadLectureVideo } from '@/lib/videoUploadClient';

export function LecturesPage() {
  const query = useGetAdminLectures();

  const subjectsQuery = useGetAdminSubjects();

  const rows = (Array.isArray(query.data?.data) ? query.data.data : []) as Array<any>;
  const subjects = (Array.isArray(subjectsQuery.data?.data) ? subjectsQuery.data.data : []) as Array<any>;

  const createLectureMutation = usePostAdminLectures();
  const updateLectureMutation = usePatchAdminLecturesId();
  const deleteLectureMutation = useDeleteAdminLecturesId();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    subjectId: '',
    name: '',
    description: '',
  });

  // Resource link arrays
  const [videos, setVideos] = useState<MaterialLink[]>([]);
  const [pendingVideoFiles, setPendingVideoFiles] = useState<PendingVideoFile[]>([]);
  const [audios, setAudios] = useState<MaterialLink[]>([]);
  const [files, setFiles] = useState<MaterialLink[]>([]);

  const handleAddClick = () => {
    setFormData({ subjectId: subjects[0]?.id || '', name: '', description: '' });
    setVideos([]);
    setPendingVideoFiles([]);
    setAudios([]);
    setFiles([]);
    setIsEditMode(false);
    setEditingItemId(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (lecture: any) => {
    if (!lecture.id) return;
    setFormData({
      subjectId: lecture.subjectId || '',
      name: lecture.name || '',
      description: lecture.description || '',
    });

    const existingVideos = (lecture.lectureVideos || []).map((v: any) => ({
      id: v.id,
      url: v.url || '',
      sourceName: v.sourceName || '',
    }));

    const allFiles = lecture.lectureFiles || [];
    const existingAudios = allFiles
      .filter((f: any) => f.fileType === 'audio')
      .map((f: any) => ({
        id: f.id,
        url: f.fileUrl || '',
        sourceName: f.sourceName || '',
      }));

    const existingOtherFiles = allFiles
      .filter((f: any) => f.fileType !== 'audio')
      .map((f: any) => ({
        id: f.id,
        url: f.fileUrl || '',
        sourceName: f.sourceName || '',
      }));

    setVideos(existingVideos);
    setPendingVideoFiles([]);
    setAudios(existingAudios);
    setFiles(existingOtherFiles);

    setIsEditMode(true);
    setEditingItemId(lecture.id);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = async (lecture: any) => {
    if (!lecture.id) return;
    if (!confirm(`Are you sure you want to delete "${lecture.name || lecture.id}"?`)) return;

    try {
      await deleteLectureMutation.mutateAsync({ id: lecture.id });
      toast.success('Lecture deleted successfully');
      query.refetch();
    } catch (error) {
      toast.error('Failed to delete lecture');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let lectureId = editingItemId;

      if (isEditMode && lectureId) {
        await updateLectureMutation.mutateAsync({
          id: lectureId,
          data: {
            subjectId: formData.subjectId,
            name: formData.name,
            description: formData.description,
          },
        });
      } else {
        const res = await createLectureMutation.mutateAsync({
          data: {
            subjectId: formData.subjectId,
            name: formData.name,
            description: formData.description,
          },
        });
        lectureId = (res.data as any)?.id;
      }

      if (lectureId) {
        // Upload any queued pending video files
        if (pendingVideoFiles.length > 0) {
          for (const item of pendingVideoFiles) {
            toast.info(`Streaming video "${item.sourceName}"...`);
            await uploadLectureVideo(lectureId, item.file);
          }
        }

        // Save new videos (links that do not have an existing id and are not already saved)
        for (const v of videos) {
          if (!v.id && v.url.trim() && !v.url.startsWith('/uploads/')) {
            await postAdminLecturesIdVideos(lectureId, {
              url: v.url.trim(),
              sourceName: v.sourceName.trim() || 'Video Resource',
              duration: 0,
            });
          }
        }

        // Save new audios
        for (const a of audios) {
          if (!a.id && a.url.trim()) {
            await postAdminLecturesIdFiles(lectureId, {
              fileUrl: a.url.trim(),
              sourceName: a.sourceName.trim() || 'Audio Resource',
              fileType: 'audio',
            });
          }
        }

        // Save new files
        for (const f of files) {
          if (!f.id && f.url.trim()) {
            await postAdminLecturesIdFiles(lectureId, {
              fileUrl: f.url.trim(),
              sourceName: f.sourceName.trim() || 'File Resource',
              fileType: 'pdf',
            });
          }
        }
      }

      toast.success(`Lecture ${isEditMode ? 'updated' : 'created'} successfully`);
      setIsDialogOpen(false);
      query.refetch();
    } catch (error) {
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} lecture`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Heading
        eyebrow="Content library"
        title="Lectures"
        description={
          query.isError
            ? 'Unable to load lectures from the API.'
            : 'Live lectures from the admin API.'
        }
        action={
          <Button onClick={handleAddClick}>
            <Plus size={16} />Add lecture
          </Button>
        }
      />

      <Toolbar onFilter={() => toast.info('Advanced filters opened')} />


      <Card>
        {query.isLoading ? (
          <CardContent className="p-8 text-sm text-slate-500">Loading lectures...</CardContent>
        ) : query.isError ? (
          <CardContent className="p-8 text-sm text-red-600">
            {(query.error as Error).message}
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Materials & Resources</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((lecture) => {
                const lectureVideos = lecture.lectureVideos || [];
                const lectureFiles = lecture.lectureFiles || [];
                const audioCount = lectureFiles.filter((f: any) => f.fileType === 'audio').length;
                const fileCount = lectureFiles.filter((f: any) => f.fileType !== 'audio').length;
                const videoCount = lectureVideos.length;
                const hasMaterials = videoCount > 0 || audioCount > 0 || fileCount > 0;

                return (
                  <TableRow key={lecture.id}>
                    <TableCell>
                      <span className="flex items-center gap-3 font-semibold text-slate-800">
                        <span className="grid size-9 place-items-center rounded-md bg-teal-50 text-teal-700">
                          <BookOpen size={17} />
                        </span>
                        {lecture.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-500 max-w-xs truncate">
                      {lecture.description || 'No description'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {videoCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 border border-purple-200">
                            <Video size={12} />
                            {videoCount} {videoCount === 1 ? 'Video' : 'Videos'}
                          </span>
                        )}
                        {audioCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                            <Headphones size={12} />
                            {audioCount} {audioCount === 1 ? 'Audio' : 'Audios'}
                          </span>
                        )}
                        {fileCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
                            <FileText size={12} />
                            {fileCount} {fileCount === 1 ? 'File' : 'Files'}
                          </span>
                        )}
                        {!hasMaterials && (
                          <span className="text-xs text-slate-400">No resources linked</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleEditClick(lecture)}>
                          <Pencil size={15} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteClick(lecture)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Add / Edit Modal */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {isEditMode ? 'Edit Lecture' : 'Add Lecture'}
                </h2>
                <p className="text-xs text-slate-500">
                  Provide lecture details and link multi-source video, audio, or document materials.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsDialogOpen(false)}>
                <X size={16} />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Subject */}
              {!isEditMode && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Subject
                  </label>
                  <select
                    value={formData.subjectId || ''}
                    onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    required
                  >
                    <option value="">Select a subject</option>
                    {subjects.map((subject: any) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Lecture Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Lecture Name
                </label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Cardiovascular Pathology - Part 1"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <Input
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional brief description of topics covered"
                />
              </div>

              {/* SECTION: Video Uploads & Links */}
              <LectureVideoUpload
                lectureId={editingItemId}
                videos={videos}
                onVideosChange={setVideos}
                pendingFiles={pendingVideoFiles}
                onPendingFilesChange={setPendingVideoFiles}
                isSaving={isSaving}
              />

              {/* SECTION: Audio Links */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded bg-amber-100 text-amber-700">
                      <Headphones size={14} />
                    </span>
                    <span className="text-sm font-semibold text-slate-800">Audio Links</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setAudios([...audios, { url: '', sourceName: '' }])}
                  >
                    <Plus size={13} className="mr-1" /> Add Audio
                  </Button>
                </div>

                {audios.length === 0 ? (
                  <p className="text-xs text-slate-400 py-1">No audio links added yet.</p>
                ) : (
                  <div className="space-y-2 mt-2">
                    {audios.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          placeholder="Source (e.g. Telegram Audio, Voice Note)"
                          value={item.sourceName}
                          disabled={!!item.id}
                          onChange={(e) => {
                            const updated = [...audios];
                            updated[idx].sourceName = e.target.value;
                            setAudios(updated);
                          }}
                          className="w-1/3 text-xs h-9 bg-white"
                        />
                        <Input
                          placeholder="Audio URL (https://...)"
                          value={item.url}
                          disabled={!!item.id}
                          onChange={(e) => {
                            const updated = [...audios];
                            updated[idx].url = e.target.value;
                            setAudios(updated);
                          }}
                          className="flex-1 text-xs h-9 bg-white"
                        />
                        {!item.id && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-slate-400 hover:text-red-600"
                            onClick={() => setAudios(audios.filter((_, i) => i !== idx))}
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION: File & Document Links */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded bg-blue-100 text-blue-700">
                      <FileText size={14} />
                    </span>
                    <span className="text-sm font-semibold text-slate-800">
                      File & Document Links
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setFiles([...files, { url: '', sourceName: '' }])}
                  >
                    <Plus size={13} className="mr-1" /> Add File Link
                  </Button>
                </div>

                {files.length === 0 ? (
                  <p className="text-xs text-slate-400 py-1">No file links added yet.</p>
                ) : (
                  <div className="space-y-2 mt-2">
                    {files.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          placeholder="Source / Title (e.g. Slides PDF, Summary)"
                          value={item.sourceName}
                          disabled={!!item.id}
                          onChange={(e) => {
                            const updated = [...files];
                            updated[idx].sourceName = e.target.value;
                            setFiles(updated);
                          }}
                          className="w-1/3 text-xs h-9 bg-white"
                        />
                        <Input
                          placeholder="File Link (e.g. Google Drive, PDF link)"
                          value={item.url}
                          disabled={!!item.id}
                          onChange={(e) => {
                            const updated = [...files];
                            updated[idx].url = e.target.value;
                            setFiles(updated);
                          }}
                          className="flex-1 text-xs h-9 bg-white"
                        />
                        {!item.id && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-slate-400 hover:text-red-600"
                            onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving || createLectureMutation.isPending || updateLectureMutation.isPending}
                  className="bg-teal-700 hover:bg-teal-800 text-white min-w-[100px]"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : isEditMode ? (
                    'Update'
                  ) : (
                    'Create'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

