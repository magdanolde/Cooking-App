-- Creates the app's tables. Paste this into the Neon SQL Editor and press Run.
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS recipes (
  id             serial PRIMARY KEY,
  title          text NOT NULL,
  source_url     text,
  servings       integer,
  prep_minutes   integer,
  cook_minutes   integer,
  total_minutes  integer,
  tags           text[] NOT NULL DEFAULT '{}'::text[],
  notes          text NOT NULL DEFAULT '',
  ingredients    jsonb NOT NULL DEFAULT '[]'::jsonb,
  steps          jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meal_plan_entries (
  id           serial PRIMARY KEY,
  date         date NOT NULL,
  meal         text NOT NULL,
  recipe_id    integer NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  servings     real NOT NULL,
  is_leftover  boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS meal_plan_entries_date_idx ON meal_plan_entries (date);

CREATE TABLE IF NOT EXISTS shopping_checks (
  week_start  date NOT NULL,
  item_key    text NOT NULL,
  PRIMARY KEY (week_start, item_key)
);

CREATE TABLE IF NOT EXISTS shopping_extras (
  id          serial PRIMARY KEY,
  week_start  date NOT NULL,
  text        text NOT NULL,
  checked     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
