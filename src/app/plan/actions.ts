'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isIsoDate, weekStart, fromIsoDate } from '@/lib/dates';
import {
  addEntry,
  addExtra,
  deleteEntry,
  deleteExtra,
  isMeal,
  setChecked,
  setExtraChecked,
  updateEntry,
} from '@/lib/plan';

export type EntryFormState = { error?: string };

function readEntryForm(formData: FormData) {
  const date = String(formData.get('date') ?? '');
  const meal = String(formData.get('meal') ?? '');
  const servings = Number(String(formData.get('servings') ?? '').replace(',', '.'));
  const isLeftover = formData.get('isLeftover') === 'on';
  if (!isIsoDate(date)) return { error: 'Please choose a day.' } as const;
  if (!isMeal(meal)) return { error: 'Please choose a meal.' } as const;
  if (!Number.isFinite(servings) || servings < 0.5 || servings > 100) {
    return { error: 'Servings must be a number between 1 and 100.' } as const;
  }
  return { value: { date, meal, servings: Math.round(servings * 2) / 2, isLeftover } } as const;
}

function refresh() {
  revalidatePath('/plan');
  revalidatePath('/plan/shopping');
}

export async function addEntryAction(_prev: EntryFormState, formData: FormData): Promise<EntryFormState> {
  const recipeId = Number(formData.get('recipeId'));
  if (!Number.isInteger(recipeId) || recipeId <= 0) return { error: 'Please pick a recipe.' };
  const read = readEntryForm(formData);
  if ('error' in read) return { error: read.error };
  try {
    await addEntry({ ...read.value, recipeId });
  } catch (err) {
    console.error(err);
    return { error: 'Could not save. Please try again.' };
  }
  refresh();
  redirect(`/plan?week=${weekStart(fromIsoDate(read.value.date))}`);
}

export async function updateEntryAction(_prev: EntryFormState, formData: FormData): Promise<EntryFormState> {
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id) || id <= 0) return { error: 'This entry no longer exists.' };
  const read = readEntryForm(formData);
  if ('error' in read) return { error: read.error };
  try {
    await updateEntry(id, read.value);
  } catch (err) {
    console.error(err);
    return { error: 'Could not save. Please try again.' };
  }
  refresh();
  redirect(`/plan?week=${weekStart(fromIsoDate(read.value.date))}`);
}

export async function deleteEntryAction(formData: FormData): Promise<void> {
  const id = Number(formData.get('id'));
  const week = String(formData.get('week') ?? '');
  if (Number.isInteger(id) && id > 0) await deleteEntry(id);
  refresh();
  redirect(isIsoDate(week) ? `/plan?week=${week}` : '/plan');
}

// ---------- shopping list (called from the client, no page reload) ----------

export async function toggleItemAction(week: string, key: string, checked: boolean): Promise<void> {
  if (!isIsoDate(week) || typeof key !== 'string' || key.length > 300) return;
  await setChecked(week, key, checked);
  revalidatePath('/plan/shopping');
}

export async function addExtraAction(week: string, text: string): Promise<{ id: number } | { error: string }> {
  const t = String(text ?? '').trim().slice(0, 200);
  if (!isIsoDate(week) || !t) return { error: 'Type an item first.' };
  const id = await addExtra(week, t);
  revalidatePath('/plan/shopping');
  return { id };
}

export async function toggleExtraAction(id: number, checked: boolean): Promise<void> {
  if (!Number.isInteger(id) || id <= 0) return;
  await setExtraChecked(id, checked);
  revalidatePath('/plan/shopping');
}

export async function deleteExtraAction(id: number): Promise<void> {
  if (!Number.isInteger(id) || id <= 0) return;
  await deleteExtra(id);
  revalidatePath('/plan/shopping');
}
