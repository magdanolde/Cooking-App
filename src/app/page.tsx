import Link from 'next/link';
import { BottomNav } from '@/components/BottomNav';
import { ClockIcon, PeopleIcon, PlusIcon } from '@/components/icons';
import { SearchBox } from '@/components/SearchBox';
import { formatMinutes, listRecipes } from '@/lib/recipes';

export const dynamic = 'force-dynamic';

function hostOf(url: string | null): string {
  if (!url) return 'Added manually';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default async function RecipesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const recipes = await listRecipes({ q });

  return (
    <>
      <main className="screen stack">
        <h1 className="h1">Recipes</h1>
        <SearchBox initial={q} />

        <div className="stack" style={{ gap: 10 }}>
          {recipes.map((r) => (
            <Link key={r.id} href={`/recipes/${r.id}`} className="card recipe-card">
              <span className="recipe-card-title">{r.title}</span>
              <span className="meta">
                {r.totalMinutes ? (
                  <span>
                    <ClockIcon />
                    {formatMinutes(r.totalMinutes)}
                  </span>
                ) : null}
                {r.servings ? (
                  <span>
                    <PeopleIcon />
                    {r.servings}
                  </span>
                ) : null}
              </span>
              <span className="tiny muted">{hostOf(r.sourceUrl)}</span>
            </Link>
          ))}
          {recipes.length === 0 && (
            <p className="empty">
              {q ? 'No recipes match your search.' : 'No recipes yet. Add your first one with the button below.'}
            </p>
          )}
        </div>
      </main>

      <Link href="/recipes/new" className="fab">
        <PlusIcon />
        Add recipe
      </Link>
      <BottomNav active="recipes" />
    </>
  );
}
