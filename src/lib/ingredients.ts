/**
 * Ingredient parsing, formatting and scaling.
 * Pure functions only (no React, no database) so they can be unit-tested.
 */

export type Ingredient = {
  /** Optional sub-heading, e.g. "Für die Sauce" */
  group?: string | null;
  /** Lower (or only) amount; null for "Salz und Pfeffer" style lines */
  quantity: number | null;
  /** Upper amount for ranges like "2–3 EL" */
  quantityMax?: number | null;
  /** Canonical unit ("g", "ml", "EL", "TL", "Prise", ...) or "" for pieces */
  unit: string;
  name: string;
  note?: string;
  /** Original text line, kept for reference */
  raw?: string;
};

const FRACTION_CHARS: Record<string, string> = {
  '½': '1/2',
  '¼': '1/4',
  '¾': '3/4',
  '⅓': '1/3',
  '⅔': '2/3',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8',
  '⅕': '1/5',
};

/** canonical unit → aliases (lower case) */
const UNIT_ALIASES: Array<[string, string[]]> = [
  ['g', ['g', 'gr', 'gr.', 'gramm', 'gram', 'grams']],
  ['kg', ['kg', 'kilo', 'kilogramm']],
  ['mg', ['mg']],
  ['ml', ['ml', 'milliliter']],
  ['cl', ['cl']],
  ['dl', ['dl']],
  ['l', ['l', 'liter', 'litre', 'litres', 'liters']],
  ['EL', ['el', 'el.', 'essl', 'essl.', 'esslöffel', 'tbsp', 'tbsp.', 'tbs', 'tablespoon', 'tablespoons']],
  ['TL', ['tl', 'tl.', 'teel', 'teel.', 'teelöffel', 'tsp', 'tsp.', 'teaspoon', 'teaspoons']],
  ['Msp.', ['msp', 'msp.', 'messerspitze', 'messerspitzen']],
  ['Prise', ['prise', 'prisen', 'pinch', 'pinches']],
  ['Pck.', ['pck', 'pck.', 'päckchen', 'packung', 'packungen', 'pkg', 'pkg.']],
  ['Dose', ['dose', 'dosen', 'can', 'cans']],
  ['Bund', ['bund', 'bunch']],
  ['Stück', ['stück', 'stk', 'stk.', 'st.']],
  ['Zehe', ['zehe', 'zehen', 'clove', 'cloves']],
  ['Scheibe', ['scheibe', 'scheiben', 'slice', 'slices']],
  ['Becher', ['becher']],
  ['Glas', ['glas', 'gläser']],
  ['Tasse', ['tasse', 'tassen', 'cup', 'cups']],
  ['Handvoll', ['handvoll', 'handful']],
  ['Zweig', ['zweig', 'zweige']],
  ['Spritzer', ['spritzer', 'schuss']],
  ['Würfel', ['würfel']],
  ['oz', ['oz', 'oz.']],
  ['lb', ['lb', 'lbs', 'lb.']],
];

const UNIT_LOOKUP = new Map<string, string>();
for (const [canonical, aliases] of UNIT_ALIASES) {
  for (const a of aliases) UNIT_LOOKUP.set(a, canonical);
}

export const KNOWN_UNITS = UNIT_ALIASES.map(([u]) => u);

/** Units offered in the recipe form's dropdown, most used first. */
export const UNIT_CHOICES = [
  'g', 'kg', 'ml', 'l', 'EL', 'TL', 'Prise', 'Msp.', 'Stück', 'Zehe', 'Dose', 'Pck.', 'Bund', 'Scheibe',
  'Becher', 'Glas', 'Tasse', 'Handvoll', 'Zweig', 'Spritzer', 'Würfel', 'cl', 'dl', 'mg', 'oz', 'lb',
];

/**
 * Polish units are recognised but kept exactly as written ("3 łyżki" stays "3 łyżki"),
 * because Polish plural forms can't be rebuilt from one canonical word.
 */
const POLISH_UNITS: Record<string, UnitKind> = {};
const addPolish = (kind: UnitKind, words: string) => words.split(' ').forEach((w) => (POLISH_UNITS[w] = kind));
addPolish('spoon', 'łyżka łyżki łyżek łyżkę łyżce łyżeczka łyżeczki łyżeczek łyżeczkę');
addPolish('pinch', 'szczypta szczypty szczyptę szczypt');
addPolish('other', 'szklanka szklanki szklanek szklankę ząbek ząbki ząbków sztuka sztuki sztuk szt szt. opakowanie opakowania opakowań puszka puszki puszek puszkę pęczek pęczki pęczków kostka kostki kostek kostkę plaster plastry plasterek plasterki garść garści gałązka gałązki słoik słoiki słoika torebka torebki');

export type UnitKind = 'mass' | 'volume' | 'spoon' | 'pinch' | 'count' | 'other';

/** What kind of unit this is, for scaling and the shopping list. */
export function unitKind(unit: string): UnitKind {
  if (['g', 'kg', 'mg', 'oz', 'lb'].includes(unit)) return unit === 'oz' || unit === 'lb' ? 'other' : 'mass';
  if (['ml', 'cl', 'dl', 'l'].includes(unit)) return 'volume';
  if (unit === 'EL' || unit === 'TL') return 'spoon';
  if (unit === 'Prise' || unit === 'Msp.') return 'pinch';
  if (unit === '' || unit === 'Stück') return 'count';
  return POLISH_UNITS[unit.toLowerCase()] ?? 'other';
}

/** Turns "1½" into "1 1/2" and "½" into "1/2" so the number reader sees plain fractions. */
function normalizeFractions(s: string): string {
  return s.replace(/[½¼¾⅓⅔⅛⅜⅝⅞⅕]/g, (ch) => ` ${FRACTION_CHARS[ch]}`).replace(/⁄/g, '/');
}

const NUMBER_RE = /^\s*(?:(\d+)\s+(\d+)\s*\/\s*(\d+)|(\d+)\s*\/\s*(\d+)|(\d+(?:[.,]\d+)?))/;
const RANGE_SEP_RE = /^\s*(?:-|–|—|bis|to)\s*/i;

function readNumber(s: string): { value: number; rest: string } | null {
  const m = NUMBER_RE.exec(s);
  if (!m) return null;
  let value: number;
  if (m[1] !== undefined) value = Number(m[1]) + Number(m[2]) / Number(m[3]);
  else if (m[4] !== undefined) value = Number(m[4]) / Number(m[5]);
  else value = Number(m[6].replace(',', '.'));
  if (!Number.isFinite(value)) return null;
  return { value, rest: s.slice(m[0].length) };
}

/** Parses "2", "1,5", "1/2", "1 ½", "2-3", "2 bis 3". Returns null when no number is found. */
export function parseQuantity(text: string): { quantity: number; quantityMax: number | null; rest: string } | null {
  const s = normalizeFractions(text);
  const first = readNumber(s);
  if (!first) return null;
  let rest = first.rest;
  let quantityMax: number | null = null;
  const sep = RANGE_SEP_RE.exec(rest);
  if (sep) {
    const second = readNumber(rest.slice(sep[0].length));
    if (second && second.value > first.value) {
      quantityMax = second.value;
      rest = second.rest;
    }
  }
  return { quantity: first.value, quantityMax, rest };
}

/** Parses a number typed by the user ("1,5", "1 1/2", "½"); null if invalid. */
export function parseNumber(text: string): number | null {
  const q = parseQuantity(text);
  if (!q || q.rest.trim() !== '') return null;
  return q.quantity;
}

export function normalizeUnit(unit: string): string {
  const u = unit.trim();
  if (!u) return '';
  return UNIT_LOOKUP.get(u.toLowerCase()) ?? u;
}

function splitNameAndNote(text: string): { name: string; note: string } {
  const notes: string[] = [];
  let s = text.replace(/\(([^)]*)\)/g, (_, inner: string) => {
    if (inner.trim()) notes.push(inner.trim());
    return ' ';
  });
  const dash = /\s+[-–—]\s+/.exec(s);
  if (dash) {
    notes.unshift(s.slice(dash.index + dash[0].length).trim());
    s = s.slice(0, dash.index);
  }
  const name = s.replace(/\s+/g, ' ').replace(/^[\s,;:]+|[\s,;:]+$/g, '');
  const note = notes.filter(Boolean).join('; ');
  return { name, note };
}

/**
 * Splits one ingredient line into amount, unit, name and note.
 * "600 g Rindergulasch - ca. 3x3 cm" → { quantity: 600, unit: "g", name: "Rindergulasch", note: "ca. 3x3 cm" }
 */
export function parseIngredientLine(line: string): Ingredient {
  const raw = line.replace(/\s+/g, ' ').trim();
  const s = raw.replace(/^[•*▢☐□✓✔·]+\s*/, '').replace(/^-\s+/, '');

  const q = parseQuantity(s);
  let quantity: number | null = null;
  let quantityMax: number | null = null;
  let rest = s;
  if (q) {
    quantity = q.quantity;
    quantityMax = q.quantityMax;
    rest = q.rest;
  }

  let unit = '';
  if (q) {
    const tok = /^\s*([A-Za-zÄÖÜäöüßąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+\.?)(?=\s|$|,)/.exec(rest);
    if (tok) {
      const candidate = tok[1].toLowerCase();
      const canonical = UNIT_LOOKUP.get(candidate) ?? UNIT_LOOKUP.get(candidate.replace(/\.$/, ''));
      if (canonical) {
        unit = canonical;
        rest = rest.slice(tok[0].length);
      } else if (POLISH_UNITS[candidate] || POLISH_UNITS[candidate.replace(/\.$/, '')]) {
        unit = candidate;
        rest = rest.slice(tok[0].length);
      }
    }
  }

  const { name, note } = splitNameAndNote(rest);
  return { quantity, quantityMax, unit, name: name || raw, note, raw };
}

/** Parses several lines (e.g. pasted text). Lines ending with ":" become group headings. */
export function parseIngredientBlock(text: string): Ingredient[] {
  const out: Ingredient[] = [];
  let group: string | null = null;
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    if (/:$/.test(t) && !/\d/.test(t)) {
      group = t.replace(/:$/, '').trim();
      continue;
    }
    out.push({ ...parseIngredientLine(t), group });
  }
  return out;
}

// ---------- formatting ----------

function decimal(v: number): string {
  const rounded = Math.round(v * 100) / 100;
  return String(rounded).replace('.', ',');
}

/**
 * Number for piece-like units: 1.5 → "1½", 0.75 → "¾", 0.333 → "⅓".
 * Rounded to quarters unless `exact` is set (then odd values stay decimals).
 */
export function formatFraction(v: number, exact = false): string {
  if (v <= 0) return '0';
  let whole = Math.floor(v);
  const rest = v - whole;
  const w = whole || '';
  if (Math.abs(rest - 1 / 3) < 0.02) return `${w}⅓`;
  if (Math.abs(rest - 2 / 3) < 0.02) return `${w}⅔`;
  if (exact) {
    const eighths = rest * 8;
    if (Math.abs(eighths - Math.round(eighths)) > 0.01) return decimal(v);
    const glyph = ['', '⅛', '¼', '⅜', '½', '⅝', '¾', '⅞', ''][Math.round(eighths)];
    return whole === 0 ? glyph || '0' : `${whole}${glyph}`;
  }
  if (v < 0.1875) return v < 0.09 ? decimal(v) : '⅛';
  let quarters = Math.round(rest * 4);
  if (quarters === 4) {
    whole += 1;
    quarters = 0;
  }
  const glyph = ['', '¼', '½', '¾'][quarters];
  if (whole === 0) return glyph || '0';
  return `${whole}${glyph}`;
}

function roundMetric(v: number, exact: boolean): string {
  if (exact) return decimal(v);
  if (v < 10) return String(Math.max(1, Math.round(v)));
  if (v < 100) return String(Math.round(v / 5) * 5);
  return String(Math.round(v / 10) * 10);
}

function toBase(v: number, unit: string): { v: number; unit: string } {
  switch (unit) {
    case 'kg':
      return { v: v * 1000, unit: 'g' };
    case 'l':
      return { v: v * 1000, unit: 'ml' };
    case 'cl':
      return { v: v * 10, unit: 'ml' };
    case 'dl':
      return { v: v * 100, unit: 'ml' };
    default:
      return { v, unit };
  }
}

/**
 * Formats an amount (or range) with its unit: (900, null, "g") → "900 g"; (1500, null, "g") → "1,5 kg".
 * `exact` keeps the numbers as written (for unscaled recipes); otherwise they are rounded to tidy values.
 */
export function formatValueUnit(lo: number, hi: number | null, unit: string, exact = false): string {
  const a = toBase(lo, unit);
  const b = hi != null ? toBase(hi, unit) : null;
  let u = a.unit;
  let x = a.v;
  let y = b ? b.v : null;

  if (u === 'g' || u === 'ml') {
    const top = y ?? x;
    if (top >= 1000) {
      const big = u === 'g' ? 'kg' : 'l';
      const fmt = (n: number) => (exact ? decimal(n / 1000) : decimal(Math.round(n / 100) / 10));
      const xs = fmt(x);
      const ys = y != null ? fmt(y) : null;
      return ys != null && ys !== xs ? `${xs}–${ys} ${big}` : `${xs} ${big}`;
    }
    const xs = roundMetric(x, exact);
    const ys = y != null ? roundMetric(y, exact) : null;
    return ys != null && ys !== xs ? `${xs}–${ys} ${u}` : `${xs} ${u}`;
  }

  // When scaled, 6 TL or more reads better as EL (3 TL = 1 EL)
  if (!exact && u === 'TL' && (y ?? x) >= 6) {
    u = 'EL';
    x = x / 3;
    y = y != null ? y / 3 : null;
  }

  const xs = formatFraction(x, exact);
  const ys = y != null ? formatFraction(y, exact) : null;
  const amount = ys != null && ys !== xs ? `${xs}–${ys}` : xs;
  return u ? `${amount} ${u}` : amount;
}

export function isScalable(ing: Ingredient): boolean {
  return ing.quantity != null && unitKind(ing.unit) !== 'pinch';
}

/** The amount text for an ingredient at a given scale factor ("" when it has no amount). */
export function formatAmount(ing: Ingredient, factor = 1): string {
  if (ing.quantity == null) return '';
  const scaled = isScalable(ing) && Math.abs(factor - 1) > 1e-6;
  const f = scaled ? factor : 1;
  return formatValueUnit(ing.quantity * f, ing.quantityMax != null ? ing.quantityMax * f : null, ing.unit, !scaled);
}

/** Factor needed so that `ing` becomes `newAmount` (in the ingredient's own unit). */
export function factorFor(ing: Ingredient, newAmount: number): number | null {
  if (!isScalable(ing) || !ing.quantity || newAmount <= 0) return null;
  return newAmount / ing.quantity;
}

/** "4 servings" / "1 serving" / "4½ servings" */
export function formatServings(n: number): string {
  const rounded = Math.round(n * 2) / 2;
  return `${formatFraction(rounded)} ${rounded === 1 ? 'serving' : 'servings'}`;
}

export function formatFactor(f: number): string {
  return `×${String(Math.round(f * 100) / 100).replace('.', ',')}`;
}

/** Ingredient → editable text for the quantity field ("2–3", "1,5"). */
export function quantityToText(ing: Pick<Ingredient, 'quantity' | 'quantityMax'>): string {
  if (ing.quantity == null) return '';
  const one = (v: number) => (Number.isInteger(v) ? String(v) : decimal(v));
  return ing.quantityMax != null ? `${one(ing.quantity)}–${one(ing.quantityMax)}` : one(ing.quantity);
}
