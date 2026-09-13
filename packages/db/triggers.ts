import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../apps/api/.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const sql = postgres(connectionString);
const db = drizzle(sql);

async function createTriggers() {
  try {
    console.log('Creating updatedAt triggers...');

    // Helper function to create trigger for a table
    const createTrigger = async (tableName: string) => {
      const triggerName = `update_${tableName}_updated_at`;
      const functionName = `update_${tableName}_updated_at_func`;
      
      // Drop existing function and trigger if they exist
      await sql.unsafe(`DROP TRIGGER IF EXISTS ${triggerName} ON ${tableName}`);
      await sql.unsafe(`DROP FUNCTION IF EXISTS ${functionName}`);
      
      // Create the function using a simpler approach
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION ${functionName}()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `;
      await sql.unsafe(createFunctionSQL);
      
      // Create the trigger
      const createTriggerSQL = `
        CREATE TRIGGER ${triggerName}
        BEFORE UPDATE ON ${tableName}
        FOR EACH ROW
        EXECUTE FUNCTION ${functionName}();
      `;
      await sql.unsafe(createTriggerSQL);
      
      console.log(`✓ Created trigger for ${tableName}`);
    };

    // Create triggers for all tables with updatedAt
    await createTrigger('lectures');
    await createTrigger('lecture_videos');
    await createTrigger('lecture_files');
    await createTrigger('questions');
    await createTrigger('review_items');
    await createTrigger('case_items');
    await createTrigger('note_items');
    await createTrigger('drug_items');
    await createTrigger('fact_items');
    await createTrigger('tasks');

    console.log('All triggers created successfully!');
  } catch (error) {
    console.error('Failed to create triggers:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

createTriggers();