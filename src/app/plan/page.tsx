import Link from 'next/link';
import { BottomNav } from '@/components/BottomNav';
import { BackIcon, ForwardIcon, ListIcon, PencilIcon } from '@/components/icons';
import { addDays, dayLabel, isIsoDate, todayIso, weekDays, weekLabel, weekStart, fromIsoDate } from '@/lib/dates';
import { formatFactor } from '@/lib/ingredients';
import { getWeekEntries, MEAL_LABEL, timeZone, VISIBLE_MEALS, type PlanEntry } from '@/lib/plan';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Week plan' };

function servingsText(e: PlanEntry): string {
  const n = String(e.servings).replace('.', ',');
  if (e.isLeftover) return `${n} · leftovers`;
  if (e.recipeServings && Math.abs(e.servings - e.recipeServings) > 0.01) {
    return `${n} ${formatFactor(e.servings / e.recipeServings)}`;
  }
  return n;
}

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { week: weekParam } = await searchParams;
  const today = todayIso(timeZone());
  const thisWeek = weekStart(fromIsoDate(today));
  const week = isIsoDate(weekParam) ? weekStart(fromIsoDate(weekParam)) : thisWeek;
  const entries = await getWeekEntries(week);
  const days = weekDays(week);

  return (
    <>
      <main className="screen stack">
        <h1 className="h1">Week plan</h1>
        <div className="week-switch card">
          <Link href={`/plan?week=${addDays(week, -7)}`} className="icon-btn" aria-label="Previous week">
            <BackIcon />
          </Link>
          <div className="week-switch-label">
            <span>{weekLabel(week)}</span>
            {week !== thisWeek ? (
              <Link href="/plan" className="tiny">
                Back to this week
              </Link>
            ) : (
              <span className="tiny muted">This week</span>
            )}
          </div>
          <Link href={`/plan?week=${addDays(week, 7)}`} className="icon-btn" aria-label="Next week">
            <ForwardIcon />
          </Link>
        </div>

        <div className="stack" style={{ gap: 10 }}>
          {days.map((date) => {
            const label = dayLabel(date);
            const isToday = date === today;
            return (
              <section key={date} className={`card day${isToday ? ' is-today' : ''}`} aria-label={`${label.day} ${label.date}`}>
                <h2 className="day-title">
                  <span>{label.day}</span>
                  <span className="muted">{label.date}</span>
                  {isToday && <span className="today-badge">Today</span>}
                </h2>
                {VISIBLE_MEALS.map((meal) => {
                  const slot = entries.filter((e) => e.date === date && e.meal === meal);
                  return (
                    <div key={meal} className="slot">
                      <span className="slot-label">{MEAL_LABEL[meal]}</span>
                      <div className="slot-items">
                        {slot.map((e) => (
                          <div key={e.id} className={`plan-item${e.isLeftover ? ' is-leftover' : ''}`}>
                            <Link href={`/recipes/${e.recipeId}?servings=${e.servings}`} className="plan-item-title">
                              {e.title}
                            </Link>
                            <span className={`pill${e.recipeServings && e.servings !== e.recipeServings && !e.isLeftover ? ' pill-scaled' : ''}`}>
                              {servingsText(e)}
                            </span>
                            <Link href={`/plan/entry/${e.id}`} className="icon-btn" aria-label={`Change ${e.title}`}>
                              <PencilIcon />
                            </Link>
                          </div>
                        ))}
                        {slot.length === 0 && (
                          <Link href={`/plan/add?date=${date}&meal=${meal}`} className="slot-add">
                            + Add a recipe
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>

        <Link href={`/plan/shopping?week=${week}`} className="btn btn-block btn-outline">
          <ListIcon />
          Shopping list for this week
        </Link>
      </main>
      <BottomNav active="plan" />
    </>
  );
}
