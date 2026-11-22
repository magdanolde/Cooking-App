import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RecipeForm } from '@/components/RecipeForm';
import { getRecipe } from '@/lib/recipes';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit recipe' };

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const recipe = await getRecipe(Number((await params).id));
  if (!recipe) notFound();

  return (
    <main className="screen stack-lg">
      <div className="topbar">
        <Link href={`/recipes/${recipe.id}`} className="back">
          Cancel
        </Link>
        <span style={{ fontWeight: 600 }}>Edit recipe</span>
        <span style={{ width: 60 }} />
      </div>
      <RecipeForm
        id={recipe.id}
        submitLabel="Save changes"
        initial={{
          title: recipe.title,
          sourceUrl: recipe.sourceUrl,
          servings: recipe.servings,
          prepMinutes: recipe.prepMinutes,
          cookMinutes: recipe.cookMinutes,
          totalMinutes: recipe.totalMinutes,
          tags: recipe.tags,
          notes: recipe.notes,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
        }}
      />
    </main>
  );
}
