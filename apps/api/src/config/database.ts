import path from 'node:path';
import dotenv from 'dotenv';
import { getDb } from '@manhaj/db';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
process.env.DATABASE_URL = process.env.DATABASE_URL!;

export const db = getDb();
