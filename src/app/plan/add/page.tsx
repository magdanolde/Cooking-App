import Link from 'next/link';
import { PlanEntryForm } from '@/components/PlanEntryForm';
import { dayOptions, fromIsoDate, isIsoDate, todayIso, weekStart } from '@/lib/dates';
import { isMeal, listRecipeOptions, MEAL_LABEL, MEALS, timeZone } from '@/lib/plan';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Add to week plan' };

/** /plan/add?date=2026-11-23&meal=dinner  or  /plan/add?recipe=12 (from a recipe page) */
export default async function AddToPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; meal?: string; recipe?: string }>;
}) {
  const sp = await searchParams;
  const today = todayIso(timeZone());
  const date = isIsoDate(sp.date) ? sp.date : today;
  const meal = isMeal(sp.meal) ? sp.meal : 'dinner';
  const recipeId = Number(sp.recipe) || undefined;
  const recipes = await listRecipeOptions();
  // Offer the chosen week plus the next one
  const days = dayOptions(weekStart(fromIsoDate(date)), 14);
  const back = `/plan?week=${weekStart(fromIsoDate(date))}`;

  return (
    <main className="screen stack-lg">
      <div className="topbar">
        <Link href={recipeId ? `/recipes/${recipeId}` : back} className="back">
          Cancel
        </Link>
        <span style={{ fontWeight: 600 }}>Add to week plan</span>
        <span style={{ width: 60 }} />
      </div>
      <PlanEntryForm
        mode="add"
        recipes={recipes}
        dayOptions={days}
        mealOptions={MEALS.map((m) => ({ value: m, label: MEAL_LABEL[m] }))}
        initial={{ recipeId, date, meal }}
      />
    </main>
  );
}
