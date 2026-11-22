import Link from 'next/link';
import { NewRecipe } from './NewRecipe';

export const metadata = { title: 'New recipe' };

/** ?url= lets you open the page with a link already filled in (e.g. from a bookmark). */
export default async function NewRecipePage({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const { url } = await searchParams;
  return (
    <main className="screen stack-lg">
      <div className="topbar">
        <Link href="/" className="back">
          Cancel
        </Link>
        <span style={{ fontWeight: 600 }}>New recipe</span>
        <span style={{ width: 60 }} />
      </div>
      <NewRecipe initialUrl={url} />
    </main>
  );
}
