import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '../../services/database';
import * as schema from '../../db/schema';
import { eq, inArray, isNull, and } from 'drizzle-orm';
import * as Haptics from 'expo-haptics';
import { ScreenHeader } from '../../components';
import Modal from '../../components/Modal';
import { CheckSquareIcon, PlusIcon, CircleIcon, CheckCircle2Icon, ClockIcon, LinkIcon, MoreHorizontalIcon, Edit2Icon, Trash2Icon } from 'lucide-react-native';
import { formatTime } from '../../utils/format';

// ── Animated task row with completion animation ─────────────────────────────
function TaskRow({ task, onPress, onToggleStatus, onOpenMenu }: { task: any; onPress: () => void; onToggleStatus: () => void; onOpenMenu: () => void; }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const checkAnim = useRef(new Animated.Value(task.status === 'done' ? 1 : 0)).current;
  const [isExpanded, setIsExpanded] = useState(false);
  const isDone = task.status === 'done';

  useEffect(() => {
    if (isDone) {
      // Pop the check icon in, then settle the row
      Animated.parallel([
        Animated.spring(checkAnim, {
          toValue: 1,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.04,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            tension: 80,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      Animated.timing(checkAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [isDone]);

  const handlePress = () => {
    // If it has actionable detail screens
    if (task.taskType === 'zekr' && !isDone) {
      onPress();
    } else if (task.taskType === 'wird' && !isDone && task.wirdTask) {
      onPress();
    } else {
      // For study/work or if already done, just toggle status optimistically
      onToggleStatus();
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={() => setIsExpanded(!isExpanded)}
        delayLongPress={300}
        className={`p-4 mb-3 rounded-xl border ${isDone
          ? 'bg-slate-100 dark:bg-slate-800/50 border-transparent'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
          }`}
      >
        <View className="flex-row items-center">
          <View className="mr-4">
            {isDone ? (
              <Animated.View style={{ transform: [{ scale: checkAnim }] }}>
                <CheckCircle2Icon size={24} color="#10b981" />
              </Animated.View>
            ) : task.taskType === 'zekr' ? (
              <View className="bg-teal-100 dark:bg-teal-900/40 p-1.5 rounded-full">
                <CircleIcon size={18} color="#0d9488" />
              </View>
            ) : (
              <CircleIcon size={24} color="#94a3b8" />
            )}
          </View>
          <View className="flex-1">
            <View className="flex-row justify-between items-start">
              <Text className={`font-semibold text-lg flex-1 mr-2 ${isDone ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
                {task.taskType === 'zekr' && 'Adhkar Session'}
                {task.taskType === 'wird' && 'Quran Wird'}
                {task.taskType === 'work' && (task.workTask?.projectName || 'Work Task')}
                {task.taskType === 'study' && (task.studyUnit?.name || 'Study Session')}
              </Text>
              <TouchableOpacity onPress={onOpenMenu} className="p-1 -mt-1 -mr-1 rounded-full active:bg-slate-200 dark:active:bg-slate-700">
                <MoreHorizontalIcon size={20} color={isDone ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>

            {(task.startTime || task.endTime) && (
              <View className="flex-row items-center mt-1 gap-1">
                <ClockIcon size={12} color={isDone ? '#94a3b8' : '#0d9488'} />
                <Text className={`text-xs font-medium ${isDone ? 'text-slate-400' : 'text-teal-600 dark:text-teal-400'}`}>
                  {task.startTime ? formatTime(task.startTime) : ''}
                  {task.startTime && task.endTime ? ' - ' : ''}
                  {task.endTime ? formatTime(task.endTime) : ''}
                </Text>
              </View>
            )}

            <Text className={`text-xs mt-1 ${isDone ? 'text-slate-400' : 'text-slate-400 dark:text-slate-500'}`}>
              {task.recurrence === 'daily' && 'Repeats daily'}
              {task.recurrence === 'weekly' && 'Repeats weekly'}
              {task.recurrence === 'once' && 'One-time'}
            </Text>
          </View>
        </View>

        {/* DETAILS SECTION */}
        <View className="mt-3 pl-10">
          {task.taskType === 'zekr' && task.zekrTask && (
            <View>
              <Text className={`text-sm mb-1 ${isDone ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                {task.zekrTask.zekrId
                  ? 'Single dua:'
                  : `${task.zekrTask.category?.nameEn || 'Category'} — all duas`}
              </Text>
              {task.zekrTask.zekrId && (
                <Text
                  className={`text-xs mt-0.5 ${isDone ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}
                  numberOfLines={isExpanded ? undefined : 2}
                >
                  {task.zekrTask.dua?.textAr || task.zekrTask.dua?.textEn || 'Selected dua'}
                </Text>
              )}
            </View>
          )}

          {task.taskType === 'wird' && task.wirdTask && (
            <View>
              <Text className={`text-sm ${isDone ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                {task.wirdTask.wirdMode === 'by_pages'
                  ? `Pages: ${task.wirdTask.startPage} to ${task.wirdTask.endPage}`
                  : task.startVerse && task.endVerse
                    ? `${task.startVerse.chapter?.nameEn} (${task.startVerse.ayaNumber}) → ${task.endVerse.chapter?.nameEn} (${task.endVerse.ayaNumber})`
                    : 'Custom Ayah Range'}
              </Text>
              {task.wirdTask.wirdMode === 'by_pages' && task.wirdTask.lastAchievedPage != null && (
                <Text className={`text-xs mt-0.5 ${isDone ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  Last achieved page: {task.wirdTask.lastAchievedPage}
                </Text>
              )}
            </View>
          )}

          {task.taskType === 'work' && task.workTask && (
            <View>
              <Text className={`text-sm font-medium ${isDone ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                Category: {task.workTask.category} • Cost: ${task.workTask.cost}
              </Text>
              {task.workTask.description && (
                <Text className={`text-xs mt-1 ${isDone ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`} numberOfLines={isExpanded ? undefined : 2}>
                  {task.workTask.description}
                </Text>
              )}
              {task.workTask.link && (
                <View className="flex-row items-center mt-1">
                  <LinkIcon size={12} color={isDone ? '#94a3b8' : '#0d9488'} className="mr-1" />
                  <Text className={`text-xs ${isDone ? 'text-slate-400' : 'text-teal-600 dark:text-teal-400'}`}>
                    {task.workTask.link}
                  </Text>
                </View>
              )}
              {!isExpanded && task.workTask.description && task.workTask.description.length > 80 && (
                <Text className={`text-xs mt-0.5 italic ${isDone ? 'text-slate-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  Long press to expand
                </Text>
              )}
            </View>
          )}

          {task.taskType === 'study' && task.studyTask && (
            <View>
              <Text className={`text-sm font-medium ${isDone ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                Activity: {task.studyTask.activityType}
              </Text>
              {task.studyUnit?.description && (
                <Text className={`text-xs mt-1 ${isDone ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`} numberOfLines={isExpanded ? undefined : 2}>
                  {task.studyUnit.description}
                </Text>
              )}
              {!isExpanded && task.studyUnit?.description && task.studyUnit.description.length > 80 && (
                <Text className={`text-xs mt-0.5 italic ${isDone ? 'text-slate-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  Long press to expand
                </Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function TasksScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const allTasks = await db.select().from(schema.tasks).where(and(isNull(schema.tasks.deletedAt), eq(schema.tasks.recurrenceStatus, 'active')));

      const hydrated = await Promise.all(allTasks.map(async (task) => {
        if (task.taskType === 'zekr') {
          const [zekrData] = await db.select().from(schema.zekrTasks).where(eq(schema.zekrTasks.taskId, task.id));
          let zekrTask: any = zekrData;
          if (zekrData) {
            if (zekrData.categoryId) {
              const [cat] = await db.select().from(schema.zekrCategories).where(eq(schema.zekrCategories.id, zekrData.categoryId));
              zekrTask = { ...zekrTask, category: cat };
            }
            if (zekrData.zekrId) {
              const [dua] = await db.select().from(schema.zekrCatalog).where(eq(schema.zekrCatalog.id, zekrData.zekrId));
              zekrTask = { ...zekrTask, dua };
            }
          }
          return { ...task, zekrTask };
        } else if (task.taskType === 'wird') {
          const [wirdData] = await db.select().from(schema.wirdTasks).where(eq(schema.wirdTasks.taskId, task.id));
          // Hydrate start/end verses with chapter info
          let startVerse, endVerse;
          if (wirdData?.startVerseId) {
            [startVerse] = await db.select().from(schema.quranVerses).where(eq(schema.quranVerses.id, wirdData.startVerseId));
          }
          if (wirdData?.endVerseId) {
            [endVerse] = await db.select().from(schema.quranVerses).where(eq(schema.quranVerses.id, wirdData.endVerseId));
          }
          const chapterIds = [startVerse?.chapterId, endVerse?.chapterId].filter(Boolean) as number[];
          const chapters = chapterIds.length > 0
            ? await db.select().from(schema.quranChapters).where(inArray(schema.quranChapters.id, chapterIds))
            : [];
          const chapterMap = new Map(chapters.map((c) => [c.id, c]));
          return {
            ...task,
            wirdTask: wirdData,
            startVerse: startVerse ? { ...startVerse, chapter: chapterMap.get(startVerse.chapterId) } : undefined,
            endVerse: endVerse ? { ...endVerse, chapter: chapterMap.get(endVerse.chapterId) } : undefined,
          };
        } else if (task.taskType === 'work') {
          const [workData] = await db.select().from(schema.workTasks).where(eq(schema.workTasks.taskId, task.id));
          return { ...task, workTask: workData };
        } else if (task.taskType === 'study') {
          const [studyData] = await db.select().from(schema.studyTasks).where(eq(schema.studyTasks.taskId, task.id));
          const [studyUnit] = studyData?.studyUnitId
            ? await db.select().from(schema.studyUnits).where(eq(schema.studyUnits.id, studyData.studyUnitId))
            : [undefined];
          return { ...task, studyTask: studyData, studyUnit };
        }
        return task;
      }));

      setTasks(hydrated);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskStatus = async (task: any) => {
    const newStatus = task.status === 'done' ? 'pending' : 'done';
    
    // Optimistic UI Update for instant animation
    setTasks(prevTasks => prevTasks.map(t => 
      t.id === task.id ? { ...t, status: newStatus } : t
    ));

    // Haptic feedback immediately
    if (newStatus === 'done') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      await db.update(schema.tasks).set({ status: newStatus }).where(eq(schema.tasks.id, task.id));
      // No need to loadTasks() immediately since we updated optimistic state,
      // but we can call it silently without showing loading indicator if needed.
    } catch (err) {
      console.error('Failed to update task:', err);
      // Revert on failure
      setTasks(prevTasks => prevTasks.map(t => 
        t.id === task.id ? { ...t, status: task.status } : t
      ));
    }
  };

  const handleDeleteTask = async (task: any) => {
    try {
      if (task.recurrence === 'once') {
        await db.update(schema.tasks).set({ deletedAt: new Date().toISOString() }).where(eq(schema.tasks.id, task.id));
      } else {
        await db.update(schema.tasks).set({ deletedAt: new Date().toISOString(), recurrenceStatus: 'stopped' }).where(eq(schema.tasks.id, task.id));
      }
      setTasks(prev => prev.filter(t => t.id !== task.id));
      setSelectedTask(null);
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };

  const handleEditTask = (task: any) => {
    setSelectedTask(null);
    router.push(`/add-task?id=${task.id}` as any);
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScreenHeader title="My Tasks" icon={<CheckSquareIcon size={20} color="#0d9488" />} />

      <ScrollView
        className="flex-1 p-4"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadTasks} />}
      >
        {tasks.length === 0 && !loading && (
          <View className="items-center justify-center py-10">
            <Text className="text-slate-500 mb-4">No tasks found.</Text>
            <TouchableOpacity
              className="bg-teal-600 px-6 py-3 rounded-full"
              onPress={() => router.push('/add-task' as any)}
            >
              <Text className="text-white font-bold">Create your first task</Text>
            </TouchableOpacity>
          </View>
        )}
        {tasks.map((task) => {
          const isDone = task.status === 'done';
          return (
            <TaskRow
              key={task.id}
              task={task}
              onPress={() => {
                if (task.taskType === 'zekr' && !isDone) {
                  router.push(`/task/zekr/${task.id}`);
                } else if (task.taskType === 'wird' && !isDone && task.wirdTask) {
                  if (task.wirdTask.wirdMode === 'by_pages') {
                    router.push(`/mushaf/range?mode=by_pages&startPage=${task.wirdTask.startPage}&endPage=${task.wirdTask.endPage}&taskId=${task.id}`);
                  } else {
                    router.push(`/mushaf/range?mode=by_ayat&start=${task.wirdTask.startVerseId}&end=${task.wirdTask.endVerseId}&taskId=${task.id}`);
                  }
                } else {
                  toggleTaskStatus(task);
                }
              }}
              onToggleStatus={() => toggleTaskStatus(task)}
              onOpenMenu={() => setSelectedTask(task)}
            />
          );
        })}
        
        {tasks.length > 0 && (
          <View className="flex-row self-start">
            <TouchableOpacity
              className="bg-teal-100 dark:bg-teal-900/40 px-4 py-2 rounded-full mt-4 flex-row items-center"
              onPress={() => router.push('/add-task' as any)}
            >
              <PlusIcon size={18} color="#0d9488" className="mr-2" />
              <Text className="text-teal-800 dark:text-teal-300 font-medium">Create new Task</Text>
            </TouchableOpacity>
          </View>
        )}
        <View className="h-10" />
      </ScrollView>

      <Modal
        visible={!!selectedTask}
        title="Task Options"
        onClose={() => setSelectedTask(null)}
      >
        <TouchableOpacity
          className="flex-row items-center gap-1 py-4 border-b border-slate-100 dark:border-slate-800"
          onPress={() => handleEditTask(selectedTask)}
        >
          <Edit2Icon size={20} color="#3b82f6" className="mr-3" />
          <Text className="text-base text-slate-800 dark:text-slate-200">Edit Task</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-row items-center py-4 gap-1"
          onPress={() => handleDeleteTask(selectedTask)}
        >
          <Trash2Icon size={20} color="#ef4444" className="mr-3" />
          <Text className="text-base text-red-500">Delete Task</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
