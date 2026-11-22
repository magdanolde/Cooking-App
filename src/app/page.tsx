import Link from 'next/link';
import { BottomNav } from '@/components/BottomNav';
import { ClockIcon, PeopleIcon, PlusIcon } from '@/components/icons';
import { SearchBox } from '@/components/SearchBox';
import { formatMinutes, listRecipes, listTags } from '@/lib/recipes';

export const dynamic = 'force-dynamic';

function hostOf(url: string | null): string {
  if (!url) return 'Added manually';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q = '', tag } = await searchParams;
  const [recipes, tags] = await Promise.all([listRecipes({ q, tag }), listTags()]);
  const chipHref = (t?: string) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (t) p.set('tag', t);
    const s = p.toString();
    return s ? `/?${s}` : '/';
  };
  const filtering = Boolean(q || tag);

  return (
    <>
      <main className="screen stack">
        <h1 className="h1">Recipes</h1>
        <SearchBox initial={q} tag={tag} />
        {tags.length > 0 && (
          <nav className="chips" aria-label="Filter by tag">
            <Link className="chip" href={chipHref()} aria-current={!tag ? 'true' : undefined}>
              All
            </Link>
            {tags.slice(0, 15).map(({ tag: t }) => (
              <Link key={t} className="chip" href={chipHref(t)} aria-current={tag === t ? 'true' : undefined}>
                {t}
              </Link>
            ))}
          </nav>
        )}

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
                {r.tags.length > 0 && <span>{r.tags.slice(0, 3).join(' · ')}</span>}
              </span>
              <span className="tiny muted">{hostOf(r.sourceUrl)}</span>
            </Link>
          ))}
          {recipes.length === 0 && (
            <p className="empty">
              {filtering ? 'No recipes match your search.' : 'No recipes yet. Add your first one with the button below.'}
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
