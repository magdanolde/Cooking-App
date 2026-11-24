import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DeleteRecipeButton } from '@/components/DeleteRecipeButton';
import { BackIcon, CalendarIcon, LinkIcon } from '@/components/icons';
import { ScaledIngredients } from '@/components/ScaledIngredients';
import { formatMinutes, getRecipe } from '@/lib/recipes';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const recipe = await getRecipe(Number((await params).id));
  return { title: recipe?.title ?? 'Recipe' };
}

export default async function RecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ servings?: string }>;
}) {
  const recipe = await getRecipe(Number((await params).id));
  const planned = Number((await searchParams).servings) || null;
  if (!recipe) notFound();

  let host = '';
  if (recipe.sourceUrl) {
    try {
      host = new URL(recipe.sourceUrl).hostname.replace(/^www\./, '');
    } catch {
      host = recipe.sourceUrl;
    }
  }
  const times = [
    ['Prep', recipe.prepMinutes],
    ['Cook', recipe.cookMinutes],
    ['Total', recipe.totalMinutes],
  ].filter(([, v]) => v) as Array<[string, number]>;

  return (
    <main className="screen stack-lg" style={{ paddingBottom: 48 }}>
      <div className="topbar">
        <Link href="/" className="back">
          <BackIcon />
          Recipes
        </Link>
        <Link href={`/recipes/${recipe.id}/edit`} className="btn">
          Edit
        </Link>
      </div>

      <section className="stack">
        <h1 className="h1 h1-sm">{recipe.title}</h1>
        {recipe.sourceUrl && (
          <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="row small" style={{ width: 'fit-content', gap: 6 }}>
            <LinkIcon />
            {host}
          </a>
        )}
        {times.length > 0 && (
          <div className="grid-3">
            {times.map(([label, v]) => (
              <div key={label} className="card stat">
                <div className="stat-label">{label}</div>
                <div className="stat-value">{formatMinutes(v)}</div>
              </div>
            ))}
          </div>
        )}
        {recipe.tags.length > 0 && (
          <div className="tags">
            {recipe.tags.map((t) => (
              <Link key={t} href={`/?tag=${encodeURIComponent(t)}`} className="tag" style={{ textDecoration: 'none' }}>
                {t}
              </Link>
            ))}
          </div>
        )}
        <Link href={`/plan/add?recipe=${recipe.id}`} className="btn btn-primary btn-block">
          <CalendarIcon size={20} />
          Add to week plan
        </Link>
      </section>

      <ScaledIngredients ingredients={recipe.ingredients} servings={recipe.servings} initialServings={planned} />

      {recipe.steps.length > 0 && (
        <section className="stack" aria-labelledby="steps-h">
          <h2 id="steps-h" className="h2">
            Steps
          </h2>
          <ol className="steps">
            {recipe.steps.map((s, i) => (
              <li key={i} className="card">
                <span className="step-num" aria-hidden="true">
                  {i + 1}
                </span>
                <p>{s}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {recipe.notes && (
        <section className="stack" aria-labelledby="notes-h">
          <h2 id="notes-h" className="h2">
            Notes
          </h2>
          <p className="card" style={{ margin: 0, padding: 14, whiteSpace: 'pre-line' }}>
            {recipe.notes}
          </p>
        </section>
      )}

      <DeleteRecipeButton id={recipe.id} title={recipe.title} />
    </main>
  );
}
