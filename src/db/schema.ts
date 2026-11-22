import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import type { Ingredient } from '@/lib/ingredients';

export const recipes = pgTable('recipes', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  sourceUrl: text('source_url'),
  servings: integer('servings'),
  prepMinutes: integer('prep_minutes'),
  cookMinutes: integer('cook_minutes'),
  totalMinutes: integer('total_minutes'),
  tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
  notes: text('notes').notNull().default(''),
  ingredients: jsonb('ingredients').$type<Ingredient[]>().notNull().default(sql`'[]'::jsonb`),
  steps: jsonb('steps').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Used by the week plan and shopping list (next step).
export const mealPlanEntries = pgTable(
  'meal_plan_entries',
  {
    id: serial('id').primaryKey(),
    date: date('date', { mode: 'string' }).notNull(),
    meal: text('meal').notNull(), // 'breakfast' | 'lunch' | 'dinner'
    recipeId: integer('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    servings: real('servings').notNull(),
    isLeftover: boolean('is_leftover').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('meal_plan_entries_date_idx').on(t.date)],
);

export const shoppingChecks = pgTable(
  'shopping_checks',
  {
    weekStart: date('week_start', { mode: 'string' }).notNull(),
    itemKey: text('item_key').notNull(),
  },
  (t) => [primaryKey({ columns: [t.weekStart, t.itemKey] })],
);

export const shoppingExtras = pgTable('shopping_extras', {
  id: serial('id').primaryKey(),
  weekStart: date('week_start', { mode: 'string' }).notNull(),
  text: text('text').notNull(),
  checked: boolean('checked').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type RecipeRow = typeof recipes.$inferSelect;
