import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export * from './schema.js';
export * from 'drizzle-orm';

let client: postgres.Sql | null = null;
type DbType = ReturnType<typeof drizzle<typeof schema>>;
let dbInstance: DbType | null = null;

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
