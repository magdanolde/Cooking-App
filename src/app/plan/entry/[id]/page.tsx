import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PlanEntryForm } from '@/components/PlanEntryForm';
import { dayOptions, fromIsoDate, weekStart } from '@/lib/dates';
import { getEntry, MEAL_LABEL, MEALS } from '@/lib/plan';
import { deleteEntryAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Change meal' };

export default async function EditEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const entry = await getEntry(Number((await params).id));
  if (!entry) notFound();
  const week = weekStart(fromIsoDate(entry.date));

  return (
    <main className="screen stack-lg">
      <div className="topbar">
        <Link href={`/plan?week=${week}`} className="back">
          Cancel
        </Link>
        <span style={{ fontWeight: 600 }}>Change meal</span>
        <span style={{ width: 60 }} />
      </div>
      <PlanEntryForm
        mode="edit"
        entryId={entry.id}
        recipeTitle={entry.title}
        dayOptions={dayOptions(week, 14)}
        mealOptions={MEALS.map((m) => ({ value: m, label: MEAL_LABEL[m] }))}
        initial={{ date: entry.date, meal: entry.meal, servings: entry.servings, isLeftover: entry.isLeftover }}
      />
      <Link href={`/recipes/${entry.recipeId}?servings=${entry.servings}`} className="btn btn-block">
        Open recipe
      </Link>
      <form action={deleteEntryAction}>
        <input type="hidden" name="id" value={entry.id} />
        <input type="hidden" name="week" value={week} />
        <button type="submit" className="btn btn-danger btn-block">
          Remove from plan
        </button>
      </form>
    </main>
  );
}
