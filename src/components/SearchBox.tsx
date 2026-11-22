'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { SearchIcon } from './icons';

/** Updates ?q= in the address bar while typing (after a short pause). */
export function SearchBox({ initial, tag }: { initial: string; tag?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (value.trim()) params.set('q', value.trim());
      if (tag) params.set('tag', tag);
      const qs = params.toString();
      router.replace(qs ? `/?${qs}` : '/', { scroll: false });
    }, 250);
    return () => clearTimeout(t);
  }, [value, tag, router]);

  return (
    <form className="search" role="search" action="/" onSubmit={(e) => e.preventDefault()}>
      <label htmlFor="q" className="sr-only">
        Search recipes or ingredients
      </label>
      <SearchIcon />
      <input
        id="q"
        name="q"
        type="search"
        className="input"
        placeholder="Search recipes or ingredients"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoComplete="off"
      />
    </form>
  );
}
