import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Reads DATABASE_URL from .env (run `npx vercel env pull .env` or copy it from the Neon dashboard).
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
