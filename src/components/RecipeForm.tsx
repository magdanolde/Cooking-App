'use client';

import { useActionState, useMemo, useRef, useState } from 'react';
import { saveRecipeAction, type SaveState } from '@/app/recipes/actions';
import type { RecipeDraft } from '@/lib/import';
import { KNOWN_UNITS, parseIngredientBlock, parseQuantity, quantityToText, type Ingredient } from '@/lib/ingredients';
import { PlusIcon, XIcon } from './icons';

type Row = { key: string; quantityText: string; unit: string; name: string; note: string; group: string };
type StepRow = { key: string; text: string };

let counter = 0;
const newKey = () => `k${Date.now().toString(36)}${(counter++).toString(36)}`;

function toRow(i: Ingredient): Row {
  return {
    key: newKey(),
    quantityText: quantityToText(i),
    unit: i.unit ?? '',
    name: i.name ?? '',
    note: i.note ?? '',
    group: i.group ?? '',
  };
}

const emptyRow = (): Row => ({ key: newKey(), quantityText: '', unit: '', name: '', note: '', group: '' });
const numText = (n: number | null | undefined) => (n == null ? '' : String(n));

export function RecipeForm({ initial, id, submitLabel = 'Save recipe' }: { initial: RecipeDraft; id?: number; submitLabel?: string }) {
  const [state, formAction, pending] = useActionState<SaveState, FormData>(saveRecipeAction, {});
  const [title, setTitle] = useState(initial.title);
  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl ?? '');
  const [servings, setServings] = useState(numText(initial.servings));
  const [prep, setPrep] = useState(numText(initial.prepMinutes));
  const [cook, setCook] = useState(numText(initial.cookMinutes));
  const [notes, setNotes] = useState(initial.notes ?? '');
  const [rows, setRows] = useState<Row[]>(() =>
    initial.ingredients.length ? initial.ingredients.map(toRow) : [emptyRow(), emptyRow(), emptyRow()],
  );
  const [steps, setSteps] = useState<StepRow[]>(() =>
    (initial.steps.length ? initial.steps : ['']).map((text) => ({ key: newKey(), text })),
  );
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [localError, setLocalError] = useState('');
  const errorRef = useRef<HTMLParagraphElement>(null);

  const built = useMemo(() => {
    const ingredients: Ingredient[] = [];
    let problem = '';
    for (const r of rows) {
      const name = r.name.trim();
      if (!name) continue;
      const text = r.quantityText.trim();
      let quantity: number | null = null;
      let quantityMax: number | null = null;
      if (text) {
        const q = parseQuantity(text);
        if (!q || q.rest.trim() !== '') {
          problem ||= `Check the amount for “${name}” (e.g. 200, 1,5, 1/2 or 2-3).`;
        } else {
          quantity = q.quantity;
          quantityMax = q.quantityMax;
        }
      }
      ingredients.push({
        group: r.group.trim() || null,
        quantity,
        quantityMax,
        unit: r.unit.trim(),
        name,
        note: r.note.trim(),
      });
    }
    const payload = {
      title,
      sourceUrl: sourceUrl.trim() || null,
      servings: servings.trim() || null,
      prepMinutes: prep.trim() || null,
      cookMinutes: cook.trim() || null,
      // Imported recipes sometimes only have a total time; keep it unless prep/cook are filled in
      totalMinutes: !prep.trim() && !cook.trim() ? (initial.totalMinutes ?? null) : null,
      tags: [],
      notes,
      ingredients,
      steps: steps.map((s) => s.text.trim()).filter(Boolean),
    };
    return { payload: JSON.stringify(payload), problem };
  }, [rows, steps, title, sourceUrl, servings, prep, cook, notes, initial.totalMinutes]);

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const addPasted = () => {
    const parsed = parseIngredientBlock(pasteText).map(toRow);
    if (!parsed.length) return;
    setRows((rs) => [...rs.filter((r) => r.name.trim() || r.quantityText.trim()), ...parsed]);
    setPasteText('');
    setPasteOpen(false);
  };

  const error = localError || state.error;

  return (
    <form
      action={formAction}
      className="stack-lg"
      onSubmit={(e) => {
        if (built.problem) {
          e.preventDefault();
          setLocalError(built.problem);
          requestAnimationFrame(() => errorRef.current?.scrollIntoView({ block: 'center' }));
        } else {
          setLocalError('');
        }
      }}
    >
      {id != null && <input type="hidden" name="id" value={id} />}
      <input type="hidden" name="payload" value={built.payload} />

      <label className="field">
        <span className="label">Title</span>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required style={{ fontWeight: 600 }} />
      </label>

      <div className="grid-3">
        <label className="field">
          <span className="label">Servings</span>
          <input className="input" inputMode="numeric" value={servings} onChange={(e) => setServings(e.target.value)} />
        </label>
        <label className="field">
          <span className="label">Prep (min)</span>
          <input className="input" inputMode="numeric" value={prep} onChange={(e) => setPrep(e.target.value)} />
        </label>
        <label className="field">
          <span className="label">Cook (min)</span>
          <input className="input" inputMode="numeric" value={cook} onChange={(e) => setCook(e.target.value)} />
        </label>
      </div>

      <section className="stack" aria-labelledby="ing-h">
        <div className="between">
          <h2 id="ing-h" className="h2">
            Ingredients
          </h2>
          <button type="button" className="btn btn-ghost" onClick={() => setPasteOpen((o) => !o)} aria-expanded={pasteOpen}>
            {pasteOpen ? 'Close' : 'Paste a list'}
          </button>
        </div>

        {pasteOpen && (
          <div className="card stack" style={{ padding: 14 }}>
            <label className="field">
              <span className="label">One ingredient per line – amounts and units are split automatically</span>
              <textarea
                className="textarea"
                rows={6}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={'600 g Rindergulasch\n2-3 EL Butterschmalz\n1 Prise Salz'}
              />
            </label>
            <button type="button" className="btn btn-primary" onClick={addPasted}>
              Add to list
            </button>
          </div>
        )}

        <datalist id="units">
          {KNOWN_UNITS.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>

        <div className="card stack" style={{ padding: '10px 12px', gap: 8 }}>
          <div className="ing-head" aria-hidden="true">
            <span>Amount</span>
            <span>Unit</span>
            <span>Ingredient</span>
            <span />
          </div>
          {rows.map((r, idx) => {
            const showGroup = r.group && r.group !== rows[idx - 1]?.group;
            const label = r.name || `row ${idx + 1}`;
            return (
              <div key={r.key} className="ing-row">
                {showGroup && <div className="ing-group">{r.group}</div>}
                <div className="ing-row-main">
                  <input
                    className="input input-sm"
                    aria-label={`Amount, ${label}`}
                    inputMode="decimal"
                    value={r.quantityText}
                    onChange={(e) => updateRow(r.key, { quantityText: e.target.value })}
                    style={{ fontWeight: 600 }}
                  />
                  <input
                    className="input input-sm"
                    aria-label={`Unit, ${label}`}
                    list="units"
                    value={r.unit}
                    onChange={(e) => updateRow(r.key, { unit: e.target.value })}
                  />
                  <input
                    className="input input-sm"
                    aria-label="Ingredient"
                    value={r.name}
                    onChange={(e) => updateRow(r.key, { name: e.target.value })}
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Remove ${label}`}
                    onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                  >
                    <XIcon />
                  </button>
                </div>
                <input
                  className="input input-sm"
                  aria-label={`Note, ${label}`}
                  placeholder="Note (optional)"
                  value={r.note}
                  onChange={(e) => updateRow(r.key, { note: e.target.value })}
                />
              </div>
            );
          })}
          <button type="button" className="btn btn-ghost" onClick={() => setRows((rs) => [...rs, emptyRow()])}>
            <PlusIcon size={18} />
            Add ingredient
          </button>
        </div>
      </section>

      <section className="stack" aria-labelledby="steps-h">
        <h2 id="steps-h" className="h2">
          Steps
        </h2>
        <div className="stack" style={{ gap: 8 }}>
          {steps.map((s, idx) => (
            <div key={s.key} className="step-row">
              <span className="step-num" aria-hidden="true">
                {idx + 1}
              </span>
              <textarea
                className="textarea"
                aria-label={`Step ${idx + 1}`}
                rows={2}
                style={{ minHeight: 64 }}
                value={s.text}
                onChange={(e) => setSteps((ss) => ss.map((x) => (x.key === s.key ? { ...x, text: e.target.value } : x)))}
              />
              <button
                type="button"
                className="icon-btn"
                aria-label={`Remove step ${idx + 1}`}
                onClick={() => setSteps((ss) => (ss.length > 1 ? ss.filter((x) => x.key !== s.key) : [{ key: newKey(), text: '' }]))}
                style={{ marginTop: 2 }}
              >
                <XIcon />
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost" onClick={() => setSteps((ss) => [...ss, { key: newKey(), text: '' }])}>
            <PlusIcon size={18} />
            Add step
          </button>
        </div>
      </section>

      <label className="field">
        <span className="label">Source link</span>
        <input className="input" type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://" />
      </label>

      <label className="field">
        <span className="label">Notes</span>
        <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Your tips, changes, what to serve with it…" />
      </label>

      <div className="save-bar">
        <div className="save-bar-inner">
          {error && (
            <p className="error" role="alert" ref={errorRef}>
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
            {pending ? 'Saving…' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
