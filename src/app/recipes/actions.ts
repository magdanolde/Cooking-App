'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { recipeFromHtml, type RecipeDraft } from '@/lib/import';
import { createRecipe, deleteRecipe, updateRecipe } from '@/lib/recipes';
import { guessRecipeFromHtml } from '@/lib/textRecipe';
import { safeHttpUrl, validateRecipe } from '@/lib/validate';

export type SaveState = { error?: string };
export type ImportState = { error?: string; draft?: RecipeDraft; url?: string; guessed?: boolean };

export async function saveRecipeAction(_prev: SaveState, formData: FormData): Promise<SaveState> {
  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get('payload') ?? ''));
  } catch {
    return { error: 'Something went wrong reading the form. Please try again.' };
  }
  const result = validateRecipe(payload);
  if (!result.ok) return { error: result.error };

  const idText = String(formData.get('id') ?? '');
  let id = Number(idText);
  try {
    if (idText && Number.isInteger(id) && id > 0) {
      await updateRecipe(id, result.value);
    } else {
      id = await createRecipe(result.value);
    }
  } catch (err) {
    console.error(err);
    return { error: 'Could not save to the database. Check your connection and try again.' };
  }

  revalidatePath('/');
  revalidatePath(`/recipes/${id}`);
  redirect(`/recipes/${id}?saved=1`);
}

export async function deleteRecipeAction(formData: FormData): Promise<void> {
  const id = Number(formData.get('id'));
  if (Number.isInteger(id) && id > 0) await deleteRecipe(id);
  revalidatePath('/');
  redirect('/');
}

const MAX_HTML = 5_000_000;

export async function importRecipeAction(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const input = String(formData.get('url') ?? '');
  const url = safeHttpUrl(input);
  if (!url) return { error: 'Please paste a full web address starting with https://', url: input };

  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        // Some recipe sites refuse requests that don't look like a browser.
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'de-DE,de;q=0.9,pl;q=0.8,en;q=0.7',
      },
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    });
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      return { error: PASTE_HINT_BLOCKED, url };
    }
    if (!res.ok) return { error: `The website answered with an error (${res.status}).`, url };
    html = (await res.text()).slice(0, MAX_HTML);
  } catch {
    return { error: 'Could not reach that website. Check the link and try again.', url };
  }

  // 1) Recipe data in the page (most recipe sites)
  const draft = recipeFromHtml(html, url);
  if (draft && (draft.ingredients.length > 0 || draft.steps.length > 0)) return { draft, url };

  // 2) No recipe data: guess ingredients and steps from the page text
  const guess = guessRecipeFromHtml(html, url);
  if (guess) return { draft: guess, url, guessed: true };

  return { error: PASTE_HINT_NOTHING, url };
}

const PASTE_HINT_BLOCKED =
  'This website blocks the app from reading it. Copy the recipe text from the page instead and use \u201cType it in\u201d \u2192 \u201cPaste a whole recipe\u201d.';
const PASTE_HINT_NOTHING =
  'No recipe found on this page. Copy the recipe text from the website and use \u201cType it in\u201d \u2192 \u201cPaste a whole recipe\u201d.';
