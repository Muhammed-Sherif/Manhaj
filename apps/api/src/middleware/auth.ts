import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { users } from '@manhaj/db';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'student' | 'admin';
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for Auth.js session token (dashboard/admin)
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    
    // Check for custom JWT (mobile)
    const jwtToken = req.headers['x-auth-token'] as string;

    if (!sessionToken && !jwtToken) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    let decoded: any;

    if (jwtToken) {
      // Mobile JWT verification
      decoded = jwt.verify(jwtToken, JWT_SECRET);
    } else {
      // Auth.js session verification (simplified - in production, verify with session store)
      // For now, we'll assume sessionToken is a JWT as well
      decoded = jwt.verify(sessionToken!, JWT_SECRET);
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
