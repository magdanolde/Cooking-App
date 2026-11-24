'use client';

import { useState, useTransition } from 'react';
import { addExtraAction, deleteExtraAction, toggleExtraAction, toggleItemAction } from '@/app/plan/actions';
import { shoppingListToText, type ShoppingLine } from '@/lib/shopping';
import { CopyIcon, XIcon } from './icons';

type Extra = { id: number; text: string; checked: boolean };

/** Shopping list with ticking, own items and copy-to-clipboard. Changes are saved right away. */
export function ShoppingList({
  week,
  lines,
  initialChecked,
  initialExtras,
}: {
  week: string;
  lines: ShoppingLine[];
  initialChecked: string[];
  initialExtras: Extra[];
}) {
  const [checked, setChecked] = useState(() => new Set(initialChecked));
  const [extras, setExtras] = useState<Extra[]>(initialExtras);
  const [draft, setDraft] = useState('');
  const [homeOpen, setHomeOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [, startTransition] = useTransition();

  const save = (fn: () => Promise<unknown>, undo: () => void) =>
    startTransition(async () => {
      try {
        await fn();
        setError('');
      } catch {
        undo();
        setError('Could not save that change. Check your connection.');
      }
    });

  const toggleLine = (key: string) => {
    const on = !checked.has(key);
    const flip = (value: boolean) =>
      setChecked((prev) => {
        const next = new Set(prev);
        if (value) next.add(key);
        else next.delete(key);
        return next;
      });
    flip(on);
    save(() => toggleItemAction(week, key, on), () => flip(!on));
  };

  const toggleExtra = (id: number) => {
    const item = extras.find((e) => e.id === id);
    if (!item) return;
    const on = !item.checked;
    const set = (value: boolean) => setExtras((xs) => xs.map((x) => (x.id === id ? { ...x, checked: value } : x)));
    set(on);
    save(() => toggleExtraAction(id, on), () => set(!on));
  };

  const removeExtra = (id: number) => {
    const before = extras;
    setExtras((xs) => xs.filter((x) => x.id !== id));
    save(() => deleteExtraAction(id), () => setExtras(before));
  };

  const addItem = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    startTransition(async () => {
      try {
        const res = await addExtraAction(week, text);
        if ('id' in res) setExtras((xs) => [...xs, { id: res.id, text, checked: false }]);
        else setError(res.error);
      } catch {
        setDraft(text);
        setError('Could not add that item. Check your connection.');
      }
    });
  };

  const copy = async () => {
    const text = shoppingListToText(
      lines.filter((l) => !checked.has(l.key)),
      extras.filter((e) => !e.checked).map((e) => e.text),
    );
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Copying is not allowed here – select and copy the list by hand.');
    }
  };

  const buy = lines.filter((l) => !l.pantry && !checked.has(l.key));
  const home = lines.filter((l) => l.pantry && !checked.has(l.key));
  const done = lines.filter((l) => checked.has(l.key));
  const openExtras = extras.filter((e) => !e.checked);
  const doneExtras = extras.filter((e) => e.checked);

  const renderLine = (l: ShoppingLine, isDone = false) => (
    <label key={l.key} className={`shop-row${isDone ? ' is-done' : ''}`}>
      <input type="checkbox" checked={isDone} onChange={() => toggleLine(l.key)} />
      <span className="shop-amount">{l.amount || (l.pantry ? 'to taste' : '')}</span>
      <span className="shop-name">
        <span>{l.name}</span>
        {!isDone && <span className="tiny muted">{l.detail || l.sources.join(', ')}</span>}
      </span>
    </label>
  );

  const renderExtra = (e: Extra) => (
    <div key={`x${e.id}`} className={`shop-row${e.checked ? ' is-done' : ''}`}>
      <input type="checkbox" checked={e.checked} onChange={() => toggleExtra(e.id)} aria-label={e.text} />
      <span className="shop-amount" />
      <span className="shop-name">
        <span>{e.text}</span>
        {!e.checked && <span className="tiny muted">Added by you</span>}
      </span>
      <button type="button" className="icon-btn" aria-label={`Remove ${e.text}`} onClick={() => removeExtra(e.id)}>
        <XIcon size={16} />
      </button>
    </div>
  );

  const nothingPlanned = lines.length === 0 && extras.length === 0;

  return (
    <div className="stack-lg">
      <div className="row">
        <form
          className="row"
          style={{ flex: '1 1 auto' }}
          onSubmit={(e) => {
            e.preventDefault();
            addItem();
          }}
        >
          <label htmlFor="add-item" className="sr-only">
            Add an item
          </label>
          <input
            id="add-item"
            className="input"
            placeholder="Add an item, e.g. Milch"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{ flex: '1 1 auto', minWidth: 0 }}
          />
          <button type="submit" className="btn btn-primary" style={{ minHeight: 48 }}>
            Add
          </button>
        </form>
        <button type="button" className="btn" onClick={copy} style={{ minHeight: 48 }} aria-label="Copy list">
          <CopyIcon />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {nothingPlanned && (
        <p className="card empty" style={{ margin: 0 }}>
          Nothing planned for this week yet. Add recipes to the week plan and their ingredients appear here.
        </p>
      )}

      {(buy.length > 0 || openExtras.length > 0) && (
        <section className="stack" aria-labelledby="buy-h" style={{ gap: 8 }}>
          <h2 id="buy-h" className="shop-heading">
            To buy · {buy.length + openExtras.length}
          </h2>
          <div className="card shop-list">
            {openExtras.map((e) => (
              renderExtra(e)
            ))}
            {buy.map((l) => (
              renderLine(l)
            ))}
          </div>
        </section>
      )}

      {home.length > 0 && (
        <section className="stack" aria-labelledby="home-h" style={{ gap: 8 }}>
          <div className="between">
            <h2 id="home-h" className="shop-heading">
              Check at home · {home.length}
            </h2>
            <button type="button" className="btn btn-ghost" onClick={() => setHomeOpen((o) => !o)} aria-expanded={homeOpen}>
              {homeOpen ? 'Hide' : 'Show'}
            </button>
          </div>
          {homeOpen && (
            <div className="card shop-list">
              {home.map((l) => (
                renderLine(l)
              ))}
            </div>
          )}
        </section>
      )}

      {(done.length > 0 || doneExtras.length > 0) && (
        <section className="stack" aria-labelledby="done-h" style={{ gap: 8 }}>
          <h2 id="done-h" className="shop-heading">
            In the cart · {done.length + doneExtras.length}
          </h2>
          <div className="card shop-list">
            {doneExtras.map((e) => (
              renderExtra(e)
            ))}
            {done.map((l) => (
              renderLine(l, true)
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
