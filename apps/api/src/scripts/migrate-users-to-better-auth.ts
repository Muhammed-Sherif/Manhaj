import 'dotenv/config';
import { eq } from '@manhaj/db';
import {
  getDb,
  users,
  betterAuthUser,
  betterAuthAccount,
} from '@manhaj/db';

async function migrate() {
  const db = getDb();
  const existingUsers = await db.select().from(users);
  console.log(`Found ${existingUsers.length} existing users to migrate.`);

  for (const u of existingUsers) {
    // Check if user already in betterAuthUser
    const exists = await db
      .select()
      .from(betterAuthUser)
      .where(eq(betterAuthUser.email, u.email.toLowerCase()))
      .limit(1);

    if (exists.length === 0) {
      await db.insert(betterAuthUser).values({
        id: u.id,
        name: u.name,
        email: u.email.toLowerCase(),
        emailVerified: true,
        role: u.role || 'student',
        termId: u.termId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`Inserted user: ${u.email} (${u.role})`);
    } else {
      console.log(`User already exists in Better Auth: ${u.email}`);
    }

    // Check account
    if (u.passwordHash) {
      const accountExists = await db
        .select()
        .from(betterAuthAccount)
        .where(eq(betterAuthAccount.userId, u.id))
        .limit(1);

      if (accountExists.length === 0) {
        await db.insert(betterAuthAccount).values({
          id: `acc_${u.id}`,
          accountId: u.id,
          providerId: 'credential',
          userId: u.id,
          password: u.passwordHash,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`Linked password account for: ${u.email}`);
      }
    }
  }

  console.log('Migration to Better Auth completed!');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
