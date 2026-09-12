import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '../../services/database';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';
import { ScreenHeader } from '../../components';
import { CheckSquareIcon, PlusIcon, CircleIcon, CheckCircle2Icon } from 'lucide-react-native';

export default function TasksScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const allTasks = await db.select().from(schema.tasks);

      const hydrated = await Promise.all(allTasks.map(async (task) => {
        if (task.taskType === 'zekr') {
          const zekrData = await db.select().from(schema.zekrTasks).where(eq(schema.zekrTasks.taskId, task.id));
          return { ...task, zekrTasks: zekrData };
        } else if (task.taskType === 'wird') {
          const [wirdData] = await db.select().from(schema.wirdTasks).where(eq(schema.wirdTasks.taskId, task.id));
          return { ...task, wirdTask: wirdData };
        } else if (task.taskType === 'work') {
          const [workData] = await db.select().from(schema.workTasks).where(eq(schema.workTasks.taskId, task.id));
          return { ...task, workTask: workData };
        } else if (task.taskType === 'study') {
          const [studyData] = await db.select().from(schema.studyTasks).where(eq(schema.studyTasks.taskId, task.id));
          return { ...task, studyTask: studyData };
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
    try {
      await db.update(schema.tasks).set({ status: newStatus }).where(eq(schema.tasks.id, task.id));
      if (task.taskType === 'zekr' && task.zekrTasks && task.zekrTasks.length > 0) {
        for (const z of task.zekrTasks) {
          await db.update(schema.zekrTasks).set({
            zekrAchievedCount: newStatus === 'done' ? z.zekrCount : 0
          }).where(eq(schema.zekrTasks.id, z.id));
        }
      }
      loadTasks(); // refresh
    } catch (err) {
      console.error('Failed to update task:', err);
    }
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

        <Text className="text-2xl font-bold text-black dark:text-white mb-4">My Tasks</Text>
        {tasks.map((task) => {
          const isDone = task.status === 'done';
          return (
            <TouchableOpacity
              key={task.id}
              onPress={() => {
                if (task.taskType === 'zekr' && !isDone) {
                  router.push(`/task/zekr/${task.id}`);
                } else {
                  toggleTaskStatus(task);
                }
              }}
              className={`flex-row items-center p-4 mb-3 rounded-xl border ${isDone
                  ? 'bg-slate-100 dark:bg-slate-800/50 border-transparent'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
            >
              <View className="mr-4">
                {isDone ? (
                  <CheckCircle2Icon size={24} color="#10b981" />
                ) : task.taskType === 'zekr' ? (
                  <View className="bg-teal-100 dark:bg-teal-900/40 p-1.5 rounded-full">
                    <CircleIcon size={18} color="#0d9488" />
                  </View>
                ) : (
                  <CircleIcon size={24} color="#94a3b8" />
                )}
              </View>
              <View className="flex-1">
                <Text className={`font-semibold text-lg ${isDone ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
                  {task.taskType === 'zekr' && 'Adhkar Session'}
                  {task.taskType === 'wird' && 'Quran Wird'}
                  {task.taskType === 'work' && (task.workTask?.projectName || 'Work Task')}
                  {task.taskType === 'study' && 'Study Session'}
                </Text>

                {task.taskType === 'zekr' && task.zekrTasks && task.zekrTasks.length > 0 && (
                  <Text className={`text-sm ${isDone ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                    {task.zekrTasks.length} {task.zekrTasks.length === 1 ? 'Dua' : 'Duas'} to complete
                  </Text>
                )}

                {task.taskType === 'wird' && task.wirdTask && (
                  <Text className={`text-sm ${isDone ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                    Ayas: {task.wirdTask.startAya} to {task.wirdTask.endAya} ({task.wirdTask.wirdMode})
                  </Text>
                )}

                {task.taskType === 'work' && task.workTask && (
                  <Text className={`text-sm ${isDone ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                    Category: {task.workTask.category} • Cost: ${task.workTask.cost}
                  </Text>
                )}

                {task.taskType === 'study' && task.studyTask && (
                  <Text className={`text-sm ${isDone ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                    Activity: {task.studyTask.activityType}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        <View className="flex-row self-start">
          <TouchableOpacity
            className="bg-teal-100 dark:bg-teal-900/40 p-2 rounded-full mt-4"
            onPress={() => router.push('/add-task' as any)}
          >
            <Text className="text-black dark:text-white ">Create new Task</Text>
          </TouchableOpacity>
        </View>
        <View className="h-10" />
      </ScrollView>
    </View>
  );
}
