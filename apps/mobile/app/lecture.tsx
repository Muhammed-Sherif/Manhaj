import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  BookOpenIcon,
  NotebookIcon,
  PlusIcon,
  Edit2Icon,
  FileTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PaperclipIcon,
  FileIcon,
  Trash2Icon,
} from 'lucide-react-native';
import {
  LoadingView,
  ErrorView,
  ScreenHeader,
  LectureVideoCard,
  LectureFileCard,
  LectureQuestionsCard,
} from '../components';
import { useGetLecture } from '../lib/useGetLecture';
import { db } from '../services/database';
import * as schema from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { attachLocalFile, openLocalFile, deleteLocalFile, getLocalFiles } from '../services/lectureLocalFilesService';
import { Alert } from 'react-native';

// ── Lecture Summary Section ──────────────────────────────────────────────────
function LectureSummarySection({ lectureId }: { lectureId: string }) {
  const router = useRouter();
  const [summary, setSummary] = useState<any>(null);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    const rows = await db
      .select()
      .from(schema.noteItems)
      .where(and(eq(schema.noteItems.lectureId, lectureId), eq(schema.noteItems.type, 'summary')));
    setSummary(rows[0] ?? null);
  }, [lectureId]);

  useEffect(() => {
    load();
  }, [load]);

  // Reload when navigating back to this screen
  useEffect(() => {
    const unsubscribe = router.navigate ? undefined : undefined; // placeholder
    // We refetch every time the component re-mounts (focus)
    return () => {};
  }, []);

  return (
    <View className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm mb-4 border border-slate-100 dark:border-slate-800">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <FileTextIcon size={18} color="#0d9488" />
          <Text className="text-base font-semibold text-slate-800 dark:text-slate-100">My Summary</Text>
        </View>
        {summary ? (
          <TouchableOpacity
            onPress={() => router.push(`/add-note?noteId=${summary.id}&type=summary` as any)}
            className="flex-row items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700"
          >
            <Edit2Icon size={14} color="#64748b" />
            <Text className="text-xs text-slate-600 dark:text-slate-300">Edit</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => router.push(`/add-note?lectureId=${lectureId}&type=summary` as any)}
            className="flex-row items-center gap-1 px-2 py-1 rounded-lg bg-teal-50 dark:bg-teal-900/30"
          >
            <PlusIcon size={14} color="#0d9488" />
            <Text className="text-xs text-teal-700 dark:text-teal-300 font-medium">Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {summary ? (
        <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
          <Text
            className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm"
            numberOfLines={expanded ? undefined : 4}
          >
            {summary.content}
          </Text>
          <View className="flex-row items-center justify-end mt-1">
            {expanded ? (
              <ChevronUpIcon size={16} color="#94a3b8" />
            ) : (
              <ChevronDownIcon size={16} color="#94a3b8" />
            )}
          </View>
        </TouchableOpacity>
      ) : (
        <Text className="text-slate-400 text-sm italic">No summary yet — tap Add to write one.</Text>
      )}
    </View>
  );
}

// ── Lecture Notes & Cases Section ────────────────────────────────────────────
function LectureNotesCasesSection({ lectureId }: { lectureId: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);

  const load = useCallback(async () => {
    const [noteRows, caseRows] = await Promise.all([
      db.select().from(schema.noteItems).where(
        and(eq(schema.noteItems.lectureId, lectureId), eq(schema.noteItems.type, 'note'))
      ),
      db.select().from(schema.caseItems).where(eq(schema.caseItems.lectureId, lectureId)),
    ]);
    setNotes(noteRows);
    setCases(caseRows);
  }, [lectureId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View className="mt-2 mb-8 gap-4">
      {/* Notes */}
      <View>
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <NotebookIcon size={18} color="#0d9488" />
            <Text className="text-base font-semibold text-slate-800 dark:text-slate-100">My Notes</Text>
            {notes.length > 0 && (
              <View className="bg-teal-100 dark:bg-teal-900/40 px-2 py-0.5 rounded-full">
                <Text className="text-xs text-teal-700 dark:text-teal-300 font-medium">{notes.length}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => router.push(`/add-note?lectureId=${lectureId}` as any)}
            className="flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-900/30"
          >
            <PlusIcon size={13} color="#0d9488" />
            <Text className="text-xs text-teal-700 dark:text-teal-300 font-medium">Add</Text>
          </TouchableOpacity>
        </View>

        {notes.length === 0 ? (
          <Text className="text-slate-400 text-sm italic px-1">No notes yet.</Text>
        ) : (
          notes.map((note) => (
            <TouchableOpacity
              key={note.id}
              onPress={() => router.push(`/add-note?noteId=${note.id}` as any)}
              className="bg-white dark:bg-slate-800 p-4 rounded-xl mb-2 border border-slate-100 dark:border-slate-700"
            >
              <Text className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed" numberOfLines={3}>
                {note.content}
              </Text>
              <View className="flex-row items-center justify-end mt-2">
                <Edit2Icon size={13} color="#94a3b8" />
                <Text className="text-xs text-slate-400 ml-1">Edit</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Cases */}
      <View>
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <BookOpenIcon size={18} color="#8b5cf6" />
            <Text className="text-base font-semibold text-slate-800 dark:text-slate-100">My Cases</Text>
            {cases.length > 0 && (
              <View className="bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 rounded-full">
                <Text className="text-xs text-violet-700 dark:text-violet-300 font-medium">{cases.length}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => router.push(`/add-case?lectureId=${lectureId}` as any)}
            className="flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-900/30"
          >
            <PlusIcon size={13} color="#8b5cf6" />
            <Text className="text-xs text-violet-700 dark:text-violet-300 font-medium">Add</Text>
          </TouchableOpacity>
        </View>

        {cases.length === 0 ? (
          <Text className="text-slate-400 text-sm italic px-1">No cases yet.</Text>
        ) : (
          cases.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => router.push(`/add-case?caseId=${c.id}` as any)}
              className="bg-white dark:bg-slate-800 p-4 rounded-xl mb-2 border border-slate-100 dark:border-slate-700"
            >
              <View className="flex-row items-start justify-between">
                <Text className="font-semibold text-slate-800 dark:text-slate-100 flex-1 mr-2" numberOfLines={1}>
                  {c.title}
                </Text>
                <View className="bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 rounded-full">
                  <Text className="text-xs text-violet-600 dark:text-violet-300 capitalize">{c.category}</Text>
                </View>
              </View>
              <Text className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 leading-relaxed" numberOfLines={2}>
                {c.content}
              </Text>
              <View className="flex-row items-center justify-end mt-2">
                <Edit2Icon size={13} color="#94a3b8" />
                <Text className="text-xs text-slate-400 ml-1">Edit</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </View>
  );
}

// ── Lecture Local Files Section ──────────────────────────────────────────────
function LectureLocalFilesSection({ lectureId }: { lectureId: string }) {
  const [files, setFiles] = useState<any[]>([]);

  const load = useCallback(async () => {
    const rows = await getLocalFiles(lectureId);
    setFiles(rows);
  }, [lectureId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAttach = async () => {
    try {
      const row = await attachLocalFile(lectureId);
      if (row) setFiles(prev => [...prev, row]);
    } catch (err) {
      console.error('Attach failed:', err);
      Alert.alert('Error', 'Could not attach the file. Please try again.');
    }
  };

  const handleOpen = async (localFilePath: string) => {
    try {
      await openLocalFile(localFilePath);
    } catch (err: any) {
      Alert.alert('Cannot open file', err.message ?? 'Unknown error.');
    }
  };

  const handleDelete = (fileId: string, fileName: string) => {
    Alert.alert('Remove attachment', `Remove "${fileName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          await deleteLocalFile(fileId);
          setFiles(prev => prev.filter(f => f.id !== fileId));
        }
      }
    ]);
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <View className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm mb-4 border border-slate-100 dark:border-slate-800">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <PaperclipIcon size={18} color="#f59e0b" />
          <Text className="text-base font-semibold text-slate-800 dark:text-slate-100">My Files</Text>
          {files.length > 0 && (
            <View className="bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
              <Text className="text-xs text-amber-700 dark:text-amber-300 font-medium">{files.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={handleAttach}
          className="flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/30"
        >
          <PlusIcon size={13} color="#f59e0b" />
          <Text className="text-xs text-amber-700 dark:text-amber-300 font-medium">Attach</Text>
        </TouchableOpacity>
      </View>

      {files.length === 0 ? (
        <Text className="text-slate-400 text-sm italic">No attachments yet — tap Attach to add a file.</Text>
      ) : (
        files.map(f => (
          <TouchableOpacity
            key={f.id}
            onPress={() => handleOpen(f.localFilePath)}
            className="flex-row items-center p-3 rounded-xl mb-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700"
          >
            <FileIcon size={18} color="#f59e0b" className="mr-3" />
            <View className="flex-1 ml-2">
              <Text className="text-sm font-medium text-slate-800 dark:text-slate-100" numberOfLines={1}>
                {f.fileName}
              </Text>
              {!!f.fileSize && (
                <Text className="text-xs text-slate-400 mt-0.5">{formatSize(f.fileSize)}</Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => handleDelete(f.id, f.fileName)}
              className="p-2 rounded-full active:bg-red-50 dark:active:bg-red-900/30 ml-1"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2Icon size={16} color="#ef4444" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function LectureScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { lecture, isLoading, error, refetch } = useGetLecture(id);

  if (isLoading && !lecture) {
    return <LoadingView message="Loading lecture..." />;
  }

  if (error && !lecture) {
    return (
      <ErrorView
        title="Failed to load lecture"
        message={error}
        onRetry={refetch}
      />
    );
  }

  if (!lecture) {
    return (
      <ErrorView
        title="Lecture not found"
        message="The requested lecture could not be found."
        onRetry={refetch}
      />
    );
  }

  const videos = lecture.lectureVideos ?? lecture.videos ?? [];
  const files = lecture.lectureFiles ?? lecture.files ?? [];

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <ScreenHeader
        title={lecture.subject?.name}
        subtitle={lecture.name}
        icon={
          <View className="bg-teal-100 dark:bg-teal-900/40 rounded-lg p-2">
            <BookOpenIcon size={18} color="#0d9488" />
          </View>
        }
      />

      <ScrollView className="flex-1 p-4">
        {/* Lecture Info */}
        <View className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm mb-4 border border-slate-100 dark:border-slate-800">
          <Text className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
            {lecture.name}
          </Text>
          {!!lecture.description && (
            <Text className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {lecture.description}
            </Text>
          )}
        </View>

        {/* Videos Section */}
        {videos.length > 0 && (
          <View className="mb-4">
            <Text className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">
              Videos
            </Text>
            {videos.map((video, index) => (
              <LectureVideoCard
                key={video.id ?? index}
                video={video}
                lecture={lecture}
                onVideoUpdated={refetch}
              />
            ))}
          </View>
        )}

        {/* Files Section */}
        {files.length > 0 && (
          <View className="mb-4">
            <Text className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">
              Files & Notes
            </Text>
            {files.map((file, index) => (
              <LectureFileCard
                key={file.id ?? index}
                file={file}
                lecture={lecture}
              />
            ))}
          </View>
        )}

        {/* Practice Questions */}
        <LectureQuestionsCard lecture={lecture} />

        {/* My Summary */}
        <View className="mt-6">
          <LectureSummarySection lectureId={lecture.id} />
        </View>

        {/* Local File Attachments */}
        <LectureLocalFilesSection lectureId={lecture.id} />

        {/* Notes & Cases */}
        <LectureNotesCasesSection lectureId={lecture.id} />
      </ScrollView>
    </View>
  );
}
