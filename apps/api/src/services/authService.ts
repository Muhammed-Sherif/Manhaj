import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../config/database.js';
import { users, refreshTokens } from '@manhaj/db';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const REFRESH_TOKEN_EXPIRY = '7d';
const ACCESS_TOKEN_EXPIRY = '15m';

export class AuthService {
  async googleAuth(idToken: string) {
    // In production, verify the Google ID token with Google's verification endpoint
    // For now, we'll simulate this
    const googleUser = await this.verifyGoogleToken(idToken);
    
    let user = await db.query.users.findFirst({
      where: eq(users.email, googleUser.email),
    });

    if (!user) {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          name: googleUser.name,
          email: googleUser.email,
          authProvider: 'google',
          role: 'student', // Default to student for Google auth
        })
        .returning();
      user = newUser;
    }

    return this.generateTokens(user);
  }

  async register(name: string, email: string, password: string) {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [user] = await db
      .insert(users)
      .values({
        name,
        email,
          passwordHash: hashedPassword,
        authProvider: 'credentials',
        role: 'student', // Default to student for self-registration
      })
      .returning();

    return this.generateTokens(user);
  }

  async login(email: string, password: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user || user.authProvider !== 'credentials') {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = user.passwordHash
      ? await bcrypt.compare(password, user.passwordHash)
      : false;
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  async refresh(token: string) {
    const refreshToken = await db.query.refreshTokens.findFirst({
      where: eq(refreshTokens.token, token),
    });

    if (!refreshToken || refreshToken.revoked) {
      throw new Error('Invalid refresh token');
    }

    if (new Date(refreshToken.expiresAt) < new Date()) {
      throw new Error('Refresh token expired');
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, refreshToken.userId),
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Revoke old refresh token
    await db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.token, token));

    return this.generateTokens(user);
  }

  async logout(token: string) {
    await db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.token, token));
  }

  private async verifyGoogleToken(idToken: string) {
    // In production, verify with Google's OAuth2 API
    // For now, return mock data
    return {
      email: 'user@example.com',
      name: 'Test User',
    };
  }

  private async generateTokens(user: any) {
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    // Store refresh token in database
    await db.insert(refreshTokens).values({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      revoked: false,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
