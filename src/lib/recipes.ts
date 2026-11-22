import 'server-only';
import { and, arrayContains, asc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import type { RecipeInput } from './validate';

const { recipes } = schema;

export type RecipeListItem = {
  id: number;
  title: string;
  servings: number | null;
  totalMinutes: number | null;
  tags: string[];
  sourceUrl: string | null;
};

function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/** Searches title, tags and ingredient text; optional tag filter. */
export async function listRecipes(opts: { q?: string; tag?: string } = {}): Promise<RecipeListItem[]> {
  const filters: SQL[] = [];
  const q = opts.q?.trim();
  if (q) {
    const p = likePattern(q);
    filters.push(
      or(
        ilike(recipes.title, p),
        sql`array_to_string(${recipes.tags}, ' ') ILIKE ${p}`,
        sql`${recipes.ingredients}::text ILIKE ${p}`,
      )!,
    );
  }
  if (opts.tag) filters.push(arrayContains(recipes.tags, [opts.tag]));

  return getDb()
    .select({
      id: recipes.id,
      title: recipes.title,
      servings: recipes.servings,
      totalMinutes: recipes.totalMinutes,
      tags: recipes.tags,
      sourceUrl: recipes.sourceUrl,
    })
    .from(recipes)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(asc(sql`lower(${recipes.title})`));
}

/** All tags in use, sorted, with how often they appear. */
export async function listTags(): Promise<Array<{ tag: string; count: number }>> {
  const rows = await getDb().select({ tags: recipes.tags }).from(recipes);
  const counts = new Map<string, number>();
  for (const r of rows) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'de'));
}

export async function getRecipe(id: number) {
  if (!Number.isInteger(id) || id <= 0) return null;
  const rows = await getDb().select().from(recipes).where(eq(recipes.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createRecipe(input: RecipeInput): Promise<number> {
  const rows = await getDb().insert(recipes).values(input).returning({ id: recipes.id });
  return rows[0].id;
}

export async function updateRecipe(id: number, input: RecipeInput): Promise<void> {
  await getDb()
    .update(recipes)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(recipes.id, id));
}

export async function deleteRecipe(id: number): Promise<void> {
  await getDb().delete(recipes).where(eq(recipes.id, id));
}

export function formatMinutes(min: number | null): string {
  if (!min) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
