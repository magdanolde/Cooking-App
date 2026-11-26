/**
 * Builds a shopping list from the meals planned for a week.
 * Pure function: the planner page loads the data and passes it in.
 */
import { formatValueUnit, unitKind, type Ingredient } from './ingredients';

export type PlannedMeal = {
  recipeTitle: string;
  /** Servings the recipe is written for */
  recipeServings: number | null;
  /** Servings planned for this meal */
  servings: number;
  /** Leftover meals are cooked on another day, so they are not shopped for */
  isLeftover?: boolean;
  ingredients: Ingredient[];
};

export type ShoppingLine = {
  /** Stable key, used to remember ticked items */
  key: string;
  name: string;
  /** e.g. "900 g", "4", "3–4½ EL"; "" means "to taste" */
  amount: string;
  /** Recipes this item is for */
  sources: string[];
  /** e.g. "Rindergulasch 60 g + Chili sin Carne 40 g" (only when more than one recipe) */
  detail: string;
  /** Spices, salt, oil… → shown under "Check at home" */
  pantry: boolean;
};

const MASS: Record<string, number> = { mg: 0.001, g: 1, kg: 1000 };
const VOLUME: Record<string, number> = { ml: 1, cl: 10, dl: 100, l: 1000 };
const COUNT_LIKE = new Set(['', 'Stück']);
/** Spoons, pinches and dashes: small amounts you usually have at home */
const isSpoonLike = (unit: string) => ['spoon', 'pinch'].includes(unitKind(unit)) || unit === 'Spritzer';
const isToTaste = (unit: string) => unitKind(unit) === 'pinch';

const PANTRY_WORDS = [
  'salz',
  'pfeffer',
  'öl',
  'butterschmalz',
  'zucker',
  'mehl',
  'essig',
  'paprikapulver',
  'currypulver',
  'chilipulver',
  'chiliflocken',
  'cayenne',
  'oregano',
  'majoran',
  'thymian, getrocknet',
  'zimt',
  'muskat',
  'kreuzkümmel',
  'kümmel',
  'lorbeer',
  'gewürz',
  'brühe',
  'backpulver',
  'natron',
  'sól',
  'soli',
  'pieprz',
  'olej',
  'oliwa',
  'cukier',
  'mąka',
  'mąki',
  'ocet',
  'przyprawa',
  'salt',
  'pepper',
  'oil',
  'sugar',
  'flour',
];

function family(unit: string): { family: string; toBase: number; baseUnit: string } {
  if (unit in MASS) return { family: 'mass', toBase: MASS[unit], baseUnit: 'g' };
  if (unit in VOLUME) return { family: 'volume', toBase: VOLUME[unit], baseUnit: 'ml' };
  if (COUNT_LIKE.has(unit)) return { family: 'count', toBase: 1, baseUnit: '' };
  return { family: unit, toBase: 1, baseUnit: unit };
}

/** Lower case; "Knoblauchzehen" and "Knoblauchzehe", "Zwiebeln" and "Zwiebel" get the same key. */
export function nameKey(name: string): string {
  const s = name.toLowerCase().replace(/\s+/g, ' ').trim();
  const words = s.split(' ');
  const last = words[words.length - 1];
  if (last.length > 4 && /(en|ln|rn)$/.test(last)) words[words.length - 1] = last.slice(0, -1);
  return words.join(' ');
}

export function isPantry(ing: Ingredient): boolean {
  if (ing.quantity == null || isSpoonLike(ing.unit)) return true;
  const n = ing.name.toLowerCase();
  return PANTRY_WORDS.some((w) => n.includes(w));
}

type Acc = {
  key: string;
  name: string;
  baseUnit: string;
  family: string;
  lo: number;
  hi: number;
  hasAmount: boolean;
  toTaste: boolean;
  pantry: boolean;
  parts: Map<string, { lo: number; hi: number }>;
};

function formatAcc(fam: string, baseUnit: string, lo: number, hi: number): string {
  if (fam === 'count' || (!isSpoonLike(baseUnit) && fam !== 'mass' && fam !== 'volume')) {
    // Pieces, cans, packs, bunches: round up so there is enough
    const n = Math.ceil(hi - 1e-9);
    return baseUnit ? `${n} ${baseUnit}` : String(n);
  }
  return formatValueUnit(lo, hi > lo + 1e-9 ? hi : null, baseUnit);
}

export function buildShoppingList(meals: PlannedMeal[]): ShoppingLine[] {
  const acc = new Map<string, Acc>();

  for (const meal of meals) {
    if (meal.isLeftover) continue;
    const base = meal.recipeServings && meal.recipeServings > 0 ? meal.recipeServings : meal.servings;
    const factor = base > 0 ? meal.servings / base : 1;

    for (const ing of meal.ingredients) {
      if (!ing.name.trim()) continue;
      const fam = family(ing.unit);
      const key = `${nameKey(ing.name)}|${fam.family}`;
      let a = acc.get(key);
      if (!a) {
        a = {
          key,
          name: ing.name.trim(),
          baseUnit: fam.baseUnit,
          family: fam.family,
          lo: 0,
          hi: 0,
          hasAmount: false,
          toTaste: false,
          pantry: isPantry(ing),
          parts: new Map(),
        };
        acc.set(key, a);
      }
      const part = a.parts.get(meal.recipeTitle) ?? { lo: 0, hi: 0 };
      if (ing.quantity == null || isToTaste(ing.unit)) {
        a.toTaste = true;
      } else {
        const lo = ing.quantity * factor * fam.toBase;
        const hi = (ing.quantityMax ?? ing.quantity) * factor * fam.toBase;
        a.lo += lo;
        a.hi += hi;
        part.lo += lo;
        part.hi += hi;
        a.hasAmount = true;
      }
      a.parts.set(meal.recipeTitle, part);
    }
  }

  const lines: ShoppingLine[] = [];
  for (const a of acc.values()) {
    const amount = a.hasAmount ? formatAcc(a.family, a.baseUnit, a.lo, a.hi) : '';
    const sources = [...a.parts.keys()];
    let detail = '';
    if (sources.length > 1) {
      detail = [...a.parts.entries()]
        .map(([title, p]) => (p.hi > 0 ? `${title} ${formatAcc(a.family, a.baseUnit, p.lo, p.hi)}` : title))
        .join(' + ');
    }
    lines.push({ key: a.key, name: a.name, amount, sources, detail, pantry: a.pantry });
  }

  return lines.sort((x, y) => x.name.localeCompare(y.name, 'de'));
}

/** Plain text version for copying into a notes app or a message. */
export function shoppingListToText(lines: ShoppingLine[], extras: string[] = []): string {
  const fmt = (l: ShoppingLine) => `- ${l.amount ? `${l.amount} ` : ''}${l.name}`;
  const buy = lines.filter((l) => !l.pantry);
  const pantry = lines.filter((l) => l.pantry);
  const parts = [...extras.map((e) => `- ${e}`), ...buy.map(fmt)];
  if (pantry.length) parts.push('', 'Check at home:', ...pantry.map(fmt));
  return parts.join('\n');
}
