import { eq } from 'drizzle-orm';
import { db } from './database';
import * as schema from '../db/schema';

export const getTaskReminderMinutes = async (): Promise<number> => {
  const result = await db
    .select()
    .from(schema.syncState)
    .where(eq(schema.syncState.key, 'task_reminder_minutes'))
    .limit(1);
  return result[0]?.value ? parseInt(result[0].value, 10) : 5;
};

export const setTaskReminderMinutes = async (minutes: number): Promise<void> => {
  await db
    .insert(schema.syncState)
    .values({
      key: 'task_reminder_minutes',
      value: minutes.toString(),
    })
    .onConflictDoUpdate({
      target: schema.syncState.key,
      set: { value: minutes.toString() },
    });
};
