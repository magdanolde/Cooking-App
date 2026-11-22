/** Checks and cleans recipe data coming from the form before it is saved. */
import type { Ingredient } from './ingredients';

export type RecipeInput = {
  title: string;
  sourceUrl: string | null;
  servings: number | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  totalMinutes: number | null;
  tags: string[];
  notes: string;
  ingredients: Ingredient[];
  steps: string[];
};

type Result = { ok: true; value: RecipeInput } | { ok: false; error: string };

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function intOrNull(v: unknown, min: number, max: number): number | null | 'invalid' {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  if (!Number.isFinite(n)) return 'invalid';
  const r = Math.round(n);
  return r < min || r > max ? 'invalid' : r;
}

function numOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 1e6 ? v : null;
}

export function validateRecipe(input: unknown): Result {
  if (typeof input !== 'object' || input === null) return { ok: false, error: 'Nothing to save.' };
  const o = input as Record<string, unknown>;

  const title = str(o.title, 200);
  if (!title) return { ok: false, error: 'Please give the recipe a title.' };

  let sourceUrl: string | null = str(o.sourceUrl, 2000) || null;
  if (sourceUrl) {
    try {
      const u = new URL(sourceUrl);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error();
    } catch {
      return { ok: false, error: 'The source link is not a valid web address.' };
    }
  }

  const servings = intOrNull(o.servings, 1, 100);
  if (servings === 'invalid') return { ok: false, error: 'Servings must be a number between 1 and 100.' };
  const prep = intOrNull(o.prepMinutes, 0, 10000);
  const cook = intOrNull(o.cookMinutes, 0, 10000);
  const total = intOrNull(o.totalMinutes, 0, 10000);
  if (prep === 'invalid' || cook === 'invalid' || total === 'invalid') {
    return { ok: false, error: 'Times must be whole minutes.' };
  }

  const tags = Array.isArray(o.tags)
    ? [...new Set(o.tags.map((t) => str(t, 40)).filter(Boolean))].slice(0, 20)
    : [];

  const ingredients: Ingredient[] = [];
  if (Array.isArray(o.ingredients)) {
    for (const raw of o.ingredients.slice(0, 150)) {
      if (typeof raw !== 'object' || raw === null) continue;
      const r = raw as Record<string, unknown>;
      const name = str(r.name, 200);
      if (!name) continue;
      const quantity = numOrNull(r.quantity);
      const quantityMax = quantity != null ? numOrNull(r.quantityMax) : null;
      ingredients.push({
        group: str(r.group, 100) || null,
        quantity,
        quantityMax: quantityMax != null && quantityMax > quantity! ? quantityMax : null,
        unit: str(r.unit, 20),
        name,
        note: str(r.note, 300),
        raw: str(r.raw, 400) || undefined,
      });
    }
  }

  const steps = Array.isArray(o.steps) ? o.steps.map((s) => str(s, 4000)).filter(Boolean).slice(0, 100) : [];

  return {
    ok: true,
    value: {
      title,
      sourceUrl,
      servings,
      prepMinutes: prep,
      cookMinutes: cook,
      totalMinutes: total ?? (prep != null || cook != null ? (prep ?? 0) + (cook ?? 0) : null),
      tags,
      notes: str(o.notes, 5000),
      ingredients,
      steps,
    },
  };
}

/** Accepts only http(s) URLs; returns the normalised URL or null. */
export function safeHttpUrl(text: string): string | null {
  try {
    const u = new URL(text.trim());
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}
