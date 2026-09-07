import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export * from './schema';

let client: postgres.Sql | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!dbInstance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    client = postgres(connectionString, { prepare: false });
    dbInstance = drizzle(client, { schema });
  }
  
  return dbInstance;
}

// Don't initialize at module level - call getDb() when needed
export const db = getDb;
