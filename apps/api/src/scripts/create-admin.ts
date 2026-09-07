import bcrypt from 'bcryptjs';
import { db } from '../config/database';
import { users } from '@manhaj/db';
import { eq } from 'drizzle-orm';

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'Admin';
  if (!email || !password) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in the terminal before running this script');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });

  if (existing) {
    await db.update(users).set({ name, passwordHash, authProvider: 'credentials', role: 'admin' }).where(eq(users.id, existing.id));
    console.log(`Updated admin user: ${email}`);
  } else {
    await db.insert(users).values({ name, email, passwordHash, authProvider: 'credentials', role: 'admin' });
    console.log(`Created admin user: ${email}`);
  }
}

void main();