import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="screen stack">
      <h1 className="h1">Not found</h1>
      <p className="muted">This recipe doesn&apos;t exist (any more).</p>
      <Link href="/" className="btn btn-primary">
        Back to recipes
      </Link>
    </main>
  );
}
