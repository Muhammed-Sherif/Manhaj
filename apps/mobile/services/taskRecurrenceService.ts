import * as Crypto from 'expo-crypto';
import { db } from './database';
import * as schema from '../db/schema';
import { eq, inArray } from 'drizzle-orm';

/**
 * Helper to get the start of the day for a given date
 */
const getStartOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Recreate missed recurring tasks based on the v2 specification.
 * 
 * Logic:
 * 1. Find all distinct groups of (taskType, recurrence).
 * 2. Find the *latest* existing date (startOfDay) for each group.
 * 3. Fetch all tasks matching that latest date.
 * 4. For each missed interval (day or week), clone those tasks to the new dates.
 */
export const processRecurringTasks = async (): Promise<void> => {
  try {
    const now = new Date();
    const today = getStartOfDay(now);

    // Get all recurring tasks that are not 'once'
    const recurringTasks = await db.select().from(schema.tasks).where(
      inArray(schema.tasks.recurrence, ['daily', 'weekly'])
    );

    if (recurringTasks.length === 0) return;

    // Group tasks by (taskType, recurrence)
    const groups = new Map<string, typeof recurringTasks>();
    
    for (const task of recurringTasks) {
      if (!task.startTime) continue;
      const key = `${task.taskType}-${task.recurrence}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(task);
    }

    for (const [key, tasksInGroup] of groups.entries()) {
      const [taskType, recurrence] = key.split('-');
      
      // Find the latest task instance date and its recurrenceStatus among this group
      let latestDate = new Date(0);
      let isStopped = false;
      for (const task of tasksInGroup) {
        if (!task.startTime) continue;
        const taskDate = getStartOfDay(new Date(task.startTime));
        if (taskDate > latestDate) {
          latestDate = taskDate;
          isStopped = task.recurrenceStatus === 'stopped';
        } else if (taskDate.getTime() === latestDate.getTime()) {
          if (task.recurrenceStatus === 'stopped') {
            isStopped = true;
          }
        }
      }

      // If the series has been explicitly stopped on the latest instance, do not recreate.
      if (isStopped) {
        continue;
      }

      // Fetch all tasks in this group that fall on the exact latest date
      const latestTasks = tasksInGroup.filter(task => {
        if (!task.startTime) return false;
        return getStartOfDay(new Date(task.startTime)).getTime() === latestDate.getTime();
      });

      // Calculate how many periods missed
      const msPerDay = 24 * 60 * 60 * 1000;
      const daysDiff = Math.floor((today.getTime() - latestDate.getTime()) / msPerDay);

      if (daysDiff <= 0) {
        continue; // Already up to date for today
      }

      const missingPeriods = recurrence === 'weekly' ? Math.floor(daysDiff / 7) : daysDiff;

      if (missingPeriods > 0) {
        await db.transaction(async (tx) => {
          for (let i = 1; i <= missingPeriods; i++) {
            const shiftDays = recurrence === 'weekly' ? i * 7 : i;
            
            for (const baseTask of latestTasks) {
              if (!baseTask.startTime || !baseTask.endTime) continue;

              const baseStart = new Date(baseTask.startTime);
              const baseEnd = new Date(baseTask.endTime);

              const newStart = new Date(baseStart);
              newStart.setDate(newStart.getDate() + shiftDays);
              
              const newEnd = new Date(baseEnd);
              newEnd.setDate(newEnd.getDate() + shiftDays);

              const newTaskId = Crypto.randomUUID();

              // 1. Insert superclass Task
              try {
                await tx.insert(schema.tasks).values({
                  id: newTaskId,
                  taskType: baseTask.taskType,
                  recurrence: baseTask.recurrence,
                  startTime: newStart.toISOString(),
                  endTime: newEnd.toISOString(),
                  estimatedTime: baseTask.estimatedTime,
                  status: 'pending',
                  createdAt: now.toISOString(),
                  updatedAt: now.toISOString(),
                });
              } catch (e: any) {
                // If it fails due to the UNIQUE(taskType, startTime, endTime, createdAt) constraint, safely ignore
                console.log('Task duplication skipped due to constraint', e?.message);
                continue;
              }

              // 2. Clone Subclass Task
              if (taskType === 'zekr') {
                const [zekr] = await tx.select().from(schema.zekrTasks).where(eq(schema.zekrTasks.taskId, baseTask.id));
                if (zekr) {
                  await tx.insert(schema.zekrTasks).values({
                    taskId: newTaskId,
                    categoryId: zekr.categoryId,
                    zekrId: zekr.zekrId,
                  });
                }
              } else if (taskType === 'wird') {
                const [wird] = await tx.select().from(schema.wirdTasks).where(eq(schema.wirdTasks.taskId, baseTask.id));
                if (wird) {
                  await tx.insert(schema.wirdTasks).values({
                    taskId: newTaskId,
                    wirdMode: wird.wirdMode,
                    startVerseId: wird.startVerseId,
                    endVerseId: wird.endVerseId,
                    startPage: wird.startPage,
                    endPage: wird.endPage,
                    lastAchievedPage: wird.startPage ? wird.startPage - 1 : null,
                  });
                }
              } else if (taskType === 'work') {
                const [work] = await tx.select().from(schema.workTasks).where(eq(schema.workTasks.taskId, baseTask.id));
                if (work) {
                  await tx.insert(schema.workTasks).values({
                    taskId: newTaskId,
                    category: work.category,
                    projectName: work.projectName,
                    description: work.description,
                    link: work.link,
                    cost: work.cost,
                  });
                }
              } else if (taskType === 'study') {
                const [study] = await tx.select().from(schema.studyTasks).where(eq(schema.studyTasks.taskId, baseTask.id));
                if (study) {
                  await tx.insert(schema.studyTasks).values({
                    taskId: newTaskId,
                    lectureId: study.lectureId,
                    activityType: study.activityType,
                  });
                }
              }
            }
          }
        });
      }
    }
  } catch (error) {
    console.error('Error processing recurring tasks:', error);
  }
};
