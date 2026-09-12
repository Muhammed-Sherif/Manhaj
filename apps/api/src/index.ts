import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth';
import { adminRoutes } from './routes/admin';
import { studentRoutes } from './routes/student';
import { contentRoutes } from './routes/content';
import { errorHandler } from './middleware/errorHandler';

import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// Security & CORS Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://10.0.2.2:3000',
  'http://127.0.0.1:5173',
  ...(process.env.DASHBOARD_URL ? [process.env.DASHBOARD_URL] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow mobile apps, curl/tools, or listed web origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-auth-token',
    'Cookie',
    'expo-origin',
    'x-upload-id',
    'x-chunk-index',
    'Range',
    'Content-Range',
  ],
  exposedHeaders: ['Set-Cookie', 'Content-Range', 'Accept-Ranges', 'Content-Length'],
}));

// Static uploads serving with HTTP 206 Partial Content range support
const uploadsDir = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsDir, {
  acceptRanges: true,
  setHeaders: (res) => {
    res.setHeader('Accept-Ranges', 'bytes');
  },
}));

// Better Auth route handler - handles /api/auth/*
app.all('/api/auth/*', toNodeHandler(auth));

app.use(express.json());

// Domain Routes
app.use('/admin', adminRoutes);
app.use('/student', studentRoutes);
app.use('/content', contentRoutes);

// Error handling
app.use(errorHandler);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
