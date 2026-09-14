import { db } from '../config/database.js';
import { deviceTokens, users } from '@manhaj/db/schema.js';
import { eq } from 'drizzle-orm';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export const notifyContentUpdated = async (termId: string) => {
    const tokens = await db
        .select({ pushToken: deviceTokens.pushToken })
        .from(deviceTokens)
        .innerJoin(users, eq(deviceTokens.userId, users.id))
        .where(eq(users.termId, termId));
    if (tokens.length === 0) return;

    for (let index = 0; index < tokens.length; index += 100) {
        const messages = tokens.slice(index, index + 100).map(({ pushToken }) => ({
            to: pushToken,
            title: 'Content Updated',
            body: 'Your course content has been updated.',
            data: { type: 'content-updated' },
        }));

        const response = await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messages),
        });

        if (!response.ok) {
            throw new Error(`Expo push request failed with status ${response.status}`);
        }
    }
};