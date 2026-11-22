import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

type Db = NeonHttpDatabase<typeof schema>;
let instance: Db | null = null;

/** Database client, created on first use so builds work without DATABASE_URL. */
export function getDb(): Db {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set. Connect a Neon database in Vercel → Storage.');
    instance = drizzle(neon(url), { schema });
  }
  return instance;
}

export { schema };
