/**
 * Fallback for pages without recipe data, and for pasted recipe text:
 * guesses which lines are ingredients and which are steps.
 * Works for German, Polish and English recipes. Pure functions only.
 */
import { cleanText, decodeEntities, type RecipeDraft } from './import';
import { parseIngredientLine, parseQuantity, type Ingredient } from './ingredients';

export type Line = { text: string; ordered: boolean };

const INGREDIENT_HEADINGS = /^(składniki|skladniki|zutaten|ingredients|ingredienser)\b/i;
const STEP_HEADINGS =
  /^(przygotowanie|sposób przygotowania|sposob przygotowania|wykonanie|zubereitung|anleitung|so geht'?s|instructions|directions|method|preparation|steps|kroki)\b/i;
const STOP_WORDS =
  /^(komentarz|komentarze|skomentuj|odpowiedz|kommentar|kommentare|comments?|leave a (reply|comment)|rady|porady|tipps?|tips|notes?|notatki|smacznego|guten appetit|enjoy|udostępnij|teilen|share|podobne|ähnliche|related|newsletter)\b/i;
const NUMBERED = /^(?:(?:krok|schritt|step)\s*)?(\d{1,2})\s*[.):]\s+/i;

function stripNumbering(t: string): string {
  return t.replace(NUMBERED, '').trim();
}

function hasLeadingQuantity(t: string): boolean {
  if (NUMBERED.test(t) && t.length > 40) return false; // "1. Tofu pokrój w kostkę…" is a step
  return parseQuantity(t) !== null;
}

function isIngredientLine(t: string): boolean {
  return hasLeadingQuantity(t) && t.length <= 140;
}

/** Short line without digits or a full stop, like "Tofu", "Sos", "Für die Sauce:" */
function isLabel(t: string): boolean {
  const s = t.replace(/:$/, '');
  return s.length > 0 && s.length <= 40 && !/\d/.test(s) && !/[.!?]$/.test(s) && s.split(/\s+/).length <= 5;
}

/** Turns a page into text lines; list items of numbered lists are marked as `ordered`. */
export function htmlToLines(html: string): { title: string; lines: Line[] } {
  const ogTitle = /<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']+)["']/i.exec(html)?.[1];
  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1];
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  let title = cleanText(decodeEntities(h1 ?? ogTitle ?? titleTag ?? ''));
  if (!h1) title = title.replace(/\s+[|–—-]\s+[^|–—-]{2,40}$/, '').trim();

  let body = html;
  const article = /<article\b[\s\S]*?<\/article>/i.exec(html)?.[0];
  const main = /<main\b[\s\S]*?<\/main>/i.exec(html)?.[0];
  if (article && article.length > 500) body = article;
  else if (main && main.length > 500) body = main;
  else body = /<body\b[\s\S]*<\/body>/i.exec(html)?.[0] ?? html;

  body = body
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|svg|nav|header|footer|aside|form|iframe|button|select)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (_, inner: string) => '\n' + inner.replace(/<li\b[^>]*>/gi, '\n\u0001') + '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|h[1-6]|ul|ol|tr|td|th|section|table|figure|figcaption|blockquote|dd|dt|dl)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  const lines: Line[] = [];
  for (const raw of decodeEntities(body).split('\n')) {
    const ordered = raw.includes('\u0001');
    const text = raw.replace(/\u0001/g, '').replace(/[ \t ]+/g, ' ').trim();
    if (text) lines.push({ text, ordered });
  }
  return { title, lines };
}

type Cluster = { start: number; end: number; score: number };

/** Finds the block of lines that looks most like an ingredient list. */
function findIngredientBlock(lines: Line[]): Cluster | null {
  let best: Cluster | null = null;
  let i = 0;
  while (i < lines.length) {
    const t = lines[i].text;
    const startsHere = isIngredientLine(t) || (isLabel(t) && i + 1 < lines.length && isIngredientLine(lines[i + 1].text));
    if (!startsHere || STEP_HEADINGS.test(t) || STOP_WORDS.test(t)) {
      i++;
      continue;
    }
    let j = i;
    let score = 0;
    let gap = 0;
    let lastQty = i;
    while (j < lines.length) {
      const u = lines[j].text;
      if (STEP_HEADINGS.test(u) || STOP_WORDS.test(u) || lines[j].ordered) break;
      if (isIngredientLine(u)) {
        score++;
        gap = 0;
        lastQty = j;
      } else if (u.length <= 70 && !/[.!?]$/.test(u)) {
        gap++;
        if (gap > 2) break;
      } else {
        break;
      }
      j++;
    }
    // keep a short trailing line like "sól i pieprz do smaku", but not section labels
    let end = lastQty;
    if (end + 1 < j && !isLabel(lines[end + 1].text.replace(/:$/, '')) ) end = end + 1;
    else if (end + 1 < j && /\b(do smaku|nach geschmack|to taste|optional|opcjonalnie)\b/i.test(lines[end + 1].text)) end = end + 1;
    if (score >= 2 && (!best || score > best.score)) best = { start: i, end, score };
    i = Math.max(j, i + 1);
  }
  return best;
}

function findSteps(lines: Line[], after: number): string[] {
  // Prefer a numbered list after the ingredients
  let k = after + 1;
  while (k < lines.length && !lines[k].ordered) {
    if (STOP_WORDS.test(lines[k].text)) break;
    k++;
  }
  if (k < lines.length && lines[k].ordered) {
    const steps: string[] = [];
    while (k < lines.length && lines[k].ordered) {
      const s = stripNumbering(lines[k].text);
      if (s) steps.push(s);
      k++;
    }
    if (steps.length) return steps;
  }

  // Otherwise: following sentences, or lines numbered "1." "2." …
  const steps: string[] = [];
  for (let m = after + 1; m < lines.length && steps.length < 30; m++) {
    const t = lines[m].text;
    if (STOP_WORDS.test(t)) break;
    if (STEP_HEADINGS.test(t) || INGREDIENT_HEADINGS.test(t)) continue;
    if (NUMBERED.test(t) || t.length >= 35) steps.push(stripNumbering(t));
    else if (steps.length > 0 && isLabel(t)) break; // a new section starts
  }
  return steps;
}

function findServings(lines: Line[]): number | null {
  for (const { text } of lines) {
    const m =
      /(\d+)\s*(?:[-–]\s*\d+\s*)?(porcj|osob|portion|personen|servings?|people)/i.exec(text) ??
      /(?:porcje|portionen|servings|für)\s*:?\s*(\d+)/i.exec(text);
    if (m) {
      const n = Number(m[1]);
      if (n > 0 && n <= 50) return n;
    }
  }
  return null;
}

export function recipeFromLines(lines: Line[], title: string, sourceUrl: string | null): RecipeDraft | null {
  const block = findIngredientBlock(lines);
  if (!block) return null;

  const ingredients: Ingredient[] = [];
  let group: string | null = null;
  for (let i = block.start; i <= block.end; i++) {
    const t = lines[i].text;
    if (INGREDIENT_HEADINGS.test(t)) continue;
    const next = lines[i + 1]?.text ?? '';
    if (!hasLeadingQuantity(t) && isLabel(t) && i < block.end && isIngredientLine(next)) {
      group = t.replace(/:$/, '').trim();
      continue;
    }
    ingredients.push({ ...parseIngredientLine(t), group });
  }

  return {
    title: title || 'Untitled recipe',
    sourceUrl,
    servings: findServings(lines),
    prepMinutes: null,
    cookMinutes: null,
    totalMinutes: null,
    tags: [],
    notes: '',
    ingredients,
    steps: findSteps(lines, block.end),
  };
}

/** Guesses a recipe from a web page that has no recipe data. */
export function guessRecipeFromHtml(html: string, sourceUrl: string | null): RecipeDraft | null {
  const { title, lines } = htmlToLines(html);
  return recipeFromLines(lines, title, sourceUrl);
}

/** Turns pasted recipe text into a draft. The first line becomes the title if it looks like one. */
export function recipeFromText(text: string): RecipeDraft | null {
  const lines: Line[] = text
    .split(/\r?\n/)
    .map((t) => t.replace(/[ \t ]+/g, ' ').trim())
    .filter(Boolean)
    .map((t) => ({ text: t, ordered: false }));
  let title = '';
  if (lines.length && !hasLeadingQuantity(lines[0].text) && lines[0].text.length <= 100 && !INGREDIENT_HEADINGS.test(lines[0].text)) {
    title = lines.shift()!.text;
  }
  const draft = recipeFromLines(lines, title, null);
  if (draft) return draft;
  // No ingredient list found: keep everything as steps so nothing is lost
  if (!lines.length) return null;
  return {
    title: title || 'Untitled recipe',
    sourceUrl: null,
    servings: null,
    prepMinutes: null,
    cookMinutes: null,
    totalMinutes: null,
    tags: [],
    notes: '',
    ingredients: [],
    steps: lines.map((l) => stripNumbering(l.text)),
  };
}
