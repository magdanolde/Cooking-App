import Link from 'next/link';
import { BookIcon, CalendarIcon } from './icons';

export function BottomNav({ active }: { active: 'recipes' | 'plan' }) {
  return (
    <nav className="bottom-nav" aria-label="Main">
      <Link href="/" aria-current={active === 'recipes' ? 'page' : undefined}>
        <BookIcon />
        Recipes
      </Link>
      <Link href="/plan" aria-current={active === 'plan' ? 'page' : undefined}>
        <CalendarIcon />
        Week plan
      </Link>
    </nav>
  );
}
