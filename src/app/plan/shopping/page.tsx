import Link from 'next/link';
import { BottomNav } from '@/components/BottomNav';
import { BackIcon, ForwardIcon } from '@/components/icons';
import { ShoppingList } from '@/components/ShoppingList';
import { addDays, fromIsoDate, isIsoDate, todayIso, weekLabel, weekStart } from '@/lib/dates';
import { getCheckedKeys, getExtras, getWeekMealsWithIngredients, timeZone } from '@/lib/plan';
import { buildShoppingList } from '@/lib/shopping';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Shopping list' };

export default async function ShoppingPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { week: weekParam } = await searchParams;
  const thisWeek = weekStart(fromIsoDate(todayIso(timeZone())));
  const week = isIsoDate(weekParam) ? weekStart(fromIsoDate(weekParam)) : thisWeek;
  const [meals, checked, extras] = await Promise.all([getWeekMealsWithIngredients(week), getCheckedKeys(week), getExtras(week)]);

  const lines = buildShoppingList(
    meals.map((m) => ({
      recipeTitle: m.title,
      recipeServings: m.recipeServings,
      servings: m.servings,
      isLeftover: m.isLeftover,
      ingredients: m.ingredients,
    })),
  );
  const cooked = meals.filter((m) => !m.isLeftover).length;
  const leftovers = meals.length - cooked;

  return (
    <>
      <main className="screen stack">
        <div className="topbar">
          <Link href={`/plan?week=${week}`} className="back">
            <BackIcon />
            Week plan
          </Link>
        </div>
        <div className="stack" style={{ gap: 4 }}>
          <h1 className="h1 h1-sm">Shopping list</h1>
          <p className="small muted" style={{ margin: 0 }}>
            From {cooked} planned {cooked === 1 ? 'meal' : 'meals'}
            {leftovers > 0 ? `, ${leftovers} leftover ${leftovers === 1 ? 'meal' : 'meals'} not counted` : ''}
          </p>
        </div>
        <div className="week-switch card">
          <Link href={`/plan/shopping?week=${addDays(week, -7)}`} className="icon-btn" aria-label="Previous week">
            <BackIcon />
          </Link>
          <div className="week-switch-label">
            <span>{weekLabel(week)}</span>
            {week === thisWeek ? (
              <span className="tiny muted">This week</span>
            ) : (
              <Link href="/plan/shopping" className="tiny">
                Back to this week
              </Link>
            )}
          </div>
          <Link href={`/plan/shopping?week=${addDays(week, 7)}`} className="icon-btn" aria-label="Next week">
            <ForwardIcon />
          </Link>
        </div>
        <ShoppingList key={week} week={week} lines={lines} initialChecked={checked} initialExtras={extras} />
      </main>
      <BottomNav active="shopping" />
    </>
  );
}
