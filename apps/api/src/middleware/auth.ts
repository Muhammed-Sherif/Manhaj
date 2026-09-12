import { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../lib/auth';

// Extend Express Request type to include user and session
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'student' | 'admin';
        name?: string;
        termId?: string | null;
      };
      session?: any;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized: No active session' });
    }

    const u = session.user as any;
    req.user = {
      id: u.id,
      email: u.email,
      role: (u.role as 'student' | 'admin') || 'student',
      name: u.name,
      termId: u.termId ?? null,
    };
    req.session = session.session;

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (session) {
      const u = session.user as any;
      req.user = {
        id: u.id,
        email: u.email,
        role: (u.role as 'student' | 'admin') || 'student',
        name: u.name,
        termId: u.termId ?? null,
      };
      req.session = session.session;
    }

    next();
  } catch {
    next();
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
