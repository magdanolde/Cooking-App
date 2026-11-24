import 'server-only';
import { and, asc, eq, gte, lte, sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { addDays } from './dates';
import type { Ingredient } from './ingredients';

const { recipes, mealPlanEntries: entries, shoppingChecks, shoppingExtras } = schema;

export const MEALS = ['breakfast', 'lunch', 'dinner'] as const;
export type Meal = (typeof MEALS)[number];
/** Meal slots shown on the week plan (breakfast is supported but hidden to keep the page short). */
export const VISIBLE_MEALS: Meal[] = ['lunch', 'dinner'];
export const MEAL_LABEL: Record<Meal, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

export function isMeal(v: unknown): v is Meal {
  return typeof v === 'string' && (MEALS as readonly string[]).includes(v);
}

export type PlanEntry = {
  id: number;
  date: string;
  meal: Meal;
  servings: number;
  isLeftover: boolean;
  recipeId: number;
  title: string;
  recipeServings: number | null;
};

export async function getWeekEntries(start: string): Promise<PlanEntry[]> {
  const rows = await getDb()
    .select({
      id: entries.id,
      date: entries.date,
      meal: entries.meal,
      servings: entries.servings,
      isLeftover: entries.isLeftover,
      recipeId: entries.recipeId,
      title: recipes.title,
      recipeServings: recipes.servings,
    })
    .from(entries)
    .innerJoin(recipes, eq(entries.recipeId, recipes.id))
    .where(and(gte(entries.date, start), lte(entries.date, addDays(start, 6))))
    .orderBy(asc(entries.date), asc(entries.createdAt));
  return rows.map((r) => ({ ...r, meal: isMeal(r.meal) ? r.meal : 'dinner' }));
}

/** Entries of a week together with the recipes' ingredients, for the shopping list. */
export async function getWeekMealsWithIngredients(start: string): Promise<
  Array<{ id: number; servings: number; isLeftover: boolean; title: string; recipeServings: number | null; ingredients: Ingredient[] }>
> {
  const rows = await getDb()
    .select({
      id: entries.id,
      servings: entries.servings,
      isLeftover: entries.isLeftover,
      title: recipes.title,
      recipeServings: recipes.servings,
      ingredients: recipes.ingredients,
    })
    .from(entries)
    .innerJoin(recipes, eq(entries.recipeId, recipes.id))
    .where(and(gte(entries.date, start), lte(entries.date, addDays(start, 6))))
    .orderBy(asc(entries.date), asc(entries.createdAt));
  return rows;
}

export async function getEntry(id: number): Promise<PlanEntry | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  const rows = await getDb()
    .select({
      id: entries.id,
      date: entries.date,
      meal: entries.meal,
      servings: entries.servings,
      isLeftover: entries.isLeftover,
      recipeId: entries.recipeId,
      title: recipes.title,
      recipeServings: recipes.servings,
    })
    .from(entries)
    .innerJoin(recipes, eq(entries.recipeId, recipes.id))
    .where(eq(entries.id, id))
    .limit(1);
  const r = rows[0];
  return r ? { ...r, meal: isMeal(r.meal) ? r.meal : 'dinner' } : null;
}

export async function listRecipeOptions(): Promise<Array<{ id: number; title: string; servings: number | null }>> {
  return getDb()
    .select({ id: recipes.id, title: recipes.title, servings: recipes.servings })
    .from(recipes)
    .orderBy(asc(sql`lower(${recipes.title})`));
}

export type EntryInput = { date: string; meal: Meal; recipeId: number; servings: number; isLeftover: boolean };

export async function addEntry(input: EntryInput): Promise<void> {
  await getDb().insert(entries).values(input);
}

export async function updateEntry(id: number, input: Omit<EntryInput, 'recipeId'>): Promise<void> {
  await getDb().update(entries).set(input).where(eq(entries.id, id));
}

export async function deleteEntry(id: number): Promise<void> {
  await getDb().delete(entries).where(eq(entries.id, id));
}

// ---------- shopping list state ----------

export async function getCheckedKeys(week: string): Promise<string[]> {
  const rows = await getDb()
    .select({ key: shoppingChecks.itemKey })
    .from(shoppingChecks)
    .where(eq(shoppingChecks.weekStart, week));
  return rows.map((r) => r.key);
}

export async function setChecked(week: string, key: string, checked: boolean): Promise<void> {
  if (checked) {
    await getDb().insert(shoppingChecks).values({ weekStart: week, itemKey: key }).onConflictDoNothing();
  } else {
    await getDb()
      .delete(shoppingChecks)
      .where(and(eq(shoppingChecks.weekStart, week), eq(shoppingChecks.itemKey, key)));
  }
}

export async function getExtras(week: string) {
  return getDb()
    .select({ id: shoppingExtras.id, text: shoppingExtras.text, checked: shoppingExtras.checked })
    .from(shoppingExtras)
    .where(eq(shoppingExtras.weekStart, week))
    .orderBy(asc(shoppingExtras.createdAt));
}

export async function addExtra(week: string, text: string): Promise<number> {
  const rows = await getDb().insert(shoppingExtras).values({ weekStart: week, text }).returning({ id: shoppingExtras.id });
  return rows[0].id;
}

export async function setExtraChecked(id: number, checked: boolean): Promise<void> {
  await getDb().update(shoppingExtras).set({ checked }).where(eq(shoppingExtras.id, id));
}

export async function deleteExtra(id: number): Promise<void> {
  await getDb().delete(shoppingExtras).where(eq(shoppingExtras.id, id));
}

export function timeZone(): string {
  return process.env.APP_TIMEZONE || 'Europe/Berlin';
}
