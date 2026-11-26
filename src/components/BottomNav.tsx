import Link from 'next/link';
import { BookIcon, CalendarIcon, ListIcon } from './icons';

export function BottomNav({ active }: { active: 'recipes' | 'plan' | 'shopping' }) {
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
      <Link href="/plan/shopping" aria-current={active === 'shopping' ? 'page' : undefined}>
        <ListIcon size={24} />
        Shopping
      </Link>
    </nav>
  );
}
