import { db } from '../config/database';
import { users, refreshTokens } from '@manhaj/db';
import { eq } from 'drizzle-orm';

export class AuthRepository {
  async findUserByEmail(email: string) {
    return db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  async findUserById(id: string) {
    return db.query.users.findFirst({
      where: eq(users.id, id),
    });
  }

  async createUser(userData: any) {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async createRefreshToken(tokenData: any) {
    const [token] = await db.insert(refreshTokens).values(tokenData).returning();
    return token;
  }

  async findRefreshToken(token: string) {
    return db.query.refreshTokens.findFirst({
      where: eq(refreshTokens.token, token),
    });
  }

  async revokeRefreshToken(token: string) {
    await db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.token, token));
  }
}
