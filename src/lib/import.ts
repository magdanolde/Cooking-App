/**
 * Reads the schema.org "Recipe" data (JSON-LD) that most recipe websites embed,
 * e.g. sites using WP Recipe Maker, Tasty Recipes, Chefkoch, BBC Good Food.
 * Pure functions: fetching happens in the server action.
 */
import { parseIngredientLine, type Ingredient } from './ingredients';

export type RecipeDraft = {
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

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type JsonObject = { [key: string]: Json };

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
  auml: 'ä',
  ouml: 'ö',
  uuml: 'ü',
  Auml: 'Ä',
  Ouml: 'Ö',
  Uuml: 'Ü',
  szlig: 'ß',
  deg: '°',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return NAMED_ENTITIES[code] ?? m;
  });
}

/** Removes HTML tags and entities and tidies whitespace. */
export function cleanText(s: string): string {
  return decodeEntities(s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
    .replace(/[ \t ]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

export function extractJsonLd(html: string): Json[] {
  const out: Json[] = [];
  const re = /<script[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const body = m[1].trim().replace(/^<!--|-->$/g, '');
    try {
      out.push(JSON.parse(body) as Json);
    } catch {
      // Some sites put invalid JSON here; skip that block.
    }
  }
  return out;
}

function isObject(v: Json | undefined): v is JsonObject {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function hasType(node: JsonObject, type: string): boolean {
  const t = node['@type'];
  if (typeof t === 'string') return t === type;
  if (Array.isArray(t)) return t.some((x) => x === type);
  return false;
}

/** Depth-first search for the first object with @type "Recipe" (handles @graph and arrays). */
export function findRecipeNode(data: Json, depth = 0): JsonObject | null {
  if (depth > 8 || data === null) return null;
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeNode(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (!isObject(data)) return null;
  if (hasType(data, 'Recipe')) return data;
  for (const key of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement']) {
    const v = data[key];
    if (v !== undefined) {
      const found = findRecipeNode(v, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

/** "PT1H30M" → 90, "P0DT0H45M" → 45 */
export function parseDuration(v: Json | undefined): number | null {
  if (typeof v !== 'string') return null;
  const m = /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i.exec(v.trim());
  if (!m) return null;
  const minutes =
    Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) + Math.round(Number(m[4] ?? 0) / 60);
  return minutes > 0 ? Math.round(minutes) : null;
}

/** "4", 4, ["4", "4 Portionen"], "4 Personen" → 4 */
export function parseYield(v: Json | undefined): number | null {
  if (typeof v === 'number') return v > 0 ? Math.round(v) : null;
  if (typeof v === 'string') {
    const m = /(\d+)/.exec(v);
    return m ? Number(m[1]) || null : null;
  }
  if (Array.isArray(v)) {
    for (const item of v) {
      const n = parseYield(item);
      if (n) return n;
    }
  }
  return null;
}

function textOf(v: Json | undefined): string {
  if (typeof v === 'string') return cleanText(v);
  if (isObject(v)) {
    if (typeof v.text === 'string') return cleanText(v.text);
    if (typeof v.name === 'string') return cleanText(v.name);
  }
  return '';
}

/** Flattens string / HowToStep / HowToSection instructions into a list of steps. */
export function instructionsToSteps(v: Json | undefined): string[] {
  if (v == null) return [];
  if (typeof v === 'string') {
    return cleanText(v)
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (Array.isArray(v)) return v.flatMap((item) => instructionsToSteps(item));
  if (isObject(v)) {
    if (hasType(v, 'HowToSection') || Array.isArray(v.itemListElement)) {
      return instructionsToSteps(v.itemListElement);
    }
    const t = textOf(v);
    return t ? [t] : [];
  }
  return [];
}

function listOf(v: Json | undefined): string[] {
  if (typeof v === 'string') return v.split(',').map((s) => cleanText(s)).filter(Boolean);
  if (Array.isArray(v)) return v.flatMap((x) => listOf(x));
  return [];
}

export function recipeFromNode(node: JsonObject, sourceUrl: string | null): RecipeDraft {
  const rawIngredients = Array.isArray(node.recipeIngredient)
    ? node.recipeIngredient
    : Array.isArray(node.ingredients)
      ? node.ingredients
      : [];
  const ingredients = rawIngredients
    .map((x) => (typeof x === 'string' ? cleanText(x) : ''))
    .filter(Boolean)
    .map((line) => parseIngredientLine(line));

  const prep = parseDuration(node.prepTime);
  const cook = parseDuration(node.cookTime);
  const total = parseDuration(node.totalTime) ?? (prep || cook ? (prep ?? 0) + (cook ?? 0) : null);

  const seen = new Set<string>();
  const tags = [...listOf(node.recipeCategory), ...listOf(node.recipeCuisine), ...listOf(node.keywords)]
    .filter((t) => {
      const k = t.toLowerCase();
      if (seen.has(k) || t.length > 30) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 8);

  return {
    title: textOf(node.name) || 'Untitled recipe',
    sourceUrl,
    servings: parseYield(node.recipeYield),
    prepMinutes: prep,
    cookMinutes: cook,
    totalMinutes: total,
    tags,
    notes: '',
    ingredients,
    steps: instructionsToSteps(node.recipeInstructions),
  };
}

/** Finds the recipe in a page's HTML; null when the page has no Recipe data. */
export function recipeFromHtml(html: string, sourceUrl: string | null): RecipeDraft | null {
  for (const block of extractJsonLd(html)) {
    const node = findRecipeNode(block);
    if (node) return recipeFromNode(node, sourceUrl);
  }
  return null;
}
