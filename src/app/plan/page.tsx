import Link from 'next/link';
import { BottomNav } from '@/components/BottomNav';

export const metadata = { title: 'Week plan' };

// The week plan and shopping list come in the next step.
export default function PlanPage() {
  return (
    <>
      <main className="screen stack">
        <h1 className="h1">Week plan</h1>
        <p className="card" style={{ margin: 0, padding: 16 }}>
          The week plan and shopping list are coming in the next update. Until then, your recipes are all in{' '}
          <Link href="/">Recipes</Link>.
        </p>
      </main>
      <BottomNav active="plan" />
    </>
  );
}
