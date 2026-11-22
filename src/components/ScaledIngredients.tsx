'use client';

import { useState } from 'react';
import {
  factorFor,
  formatAmount,
  formatFactor,
  formatServings,
  formatValueUnit,
  isScalable,
  parseNumber,
  type Ingredient,
} from '@/lib/ingredients';
import { MinusIcon, PencilIcon, PlusIcon } from './icons';

/**
 * Ingredient list with scaling: change servings with +/-, or tap an ingredient
 * and enter the amount you have – everything else is recalculated.
 */
export function ScaledIngredients({ ingredients, servings }: { ingredients: Ingredient[]; servings: number | null }) {
  const [factor, setFactor] = useState(1);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState('');

  const scaled = Math.abs(factor - 1) > 1e-6;
  const current = servings ? servings * factor : null;
  const editing = editIdx != null ? ingredients[editIdx] : null;
  const typed = parseNumber(draft);
  const preview = editing && typed ? factorFor(editing, typed) : null;

  const setServings = (n: number) => {
    if (!servings) return;
    const next = Math.max(1, n);
    setFactor(next / servings);
    setAnchor(null);
  };

  const open = (idx: number) => {
    const ing = ingredients[idx];
    const now = (ing.quantity ?? 0) * factor;
    const metric = ['g', 'kg', 'ml', 'l', 'cl', 'dl', 'mg'].includes(ing.unit);
    const shown = metric ? Math.round(now * 100) / 100 : Math.round(now * 4) / 4;
    setDraft(String(shown).replace('.', ','));
    setEditIdx(idx);
  };

  const apply = () => {
    if (!editing || !preview || !typed) return;
    const amountText = formatValueUnit(typed, null, editing.unit, true);
    setFactor(preview);
    setAnchor(`${amountText} ${editing.name}`);
    setEditIdx(null);
  };

  return (
    <section className="stack" aria-labelledby="ing-h">
      <div className="between">
        <h2 id="ing-h" className="h2">
          Ingredients
        </h2>
        {servings ? (
          <div className="stepper" role="group" aria-label="Servings">
            <button type="button" className="icon-btn" aria-label="Fewer servings" onClick={() => setServings(Math.round(current!) - 1)}>
              <MinusIcon />
            </button>
            <span className="stepper-value" aria-live="polite">
              {formatServings(current!)}
            </span>
            <button type="button" className="icon-btn" aria-label="More servings" onClick={() => setServings(Math.round(current!) + 1)}>
              <PlusIcon size={18} />
            </button>
          </div>
        ) : null}
      </div>

      {scaled ? (
        <div className="scaled-banner">
          <span>
            <strong>Scaled {formatFactor(factor)}</strong> · {anchor ? `based on ${anchor}` : `for ${formatServings(current ?? factor)}`}
          </span>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setFactor(1);
              setAnchor(null);
            }}
          >
            Reset
          </button>
        </div>
      ) : (
        ingredients.some(isScalable) && (
          <p className="small muted" style={{ margin: 0 }}>
            Tap an amount to cook with what you have – everything else recalculates.
          </p>
        )
      )}

      <div className="card ing-list">
        {ingredients.map((ing, idx) => {
          const showGroup = ing.group && ing.group !== ingredients[idx - 1]?.group;
          const amount = formatAmount(ing, factor);
          const changed = scaled && isScalable(ing);
          // Ranges can't be the reference amount; everything with a single number can.
          const tappable = isScalable(ing) && ing.quantityMax == null;
          const content = (
            <>
              <span className={`ing-amount${changed ? ' is-scaled' : ''}`}>{amount}</span>
              <span className="ing-name">
                <span>{ing.name}</span>
                {ing.note ? <span className="ing-note">{ing.note}</span> : null}
              </span>
              {tappable ? <PencilIcon /> : <span />}
            </>
          );
          return (
            <div key={idx}>
              {showGroup && <div className="ing-group">{ing.group}</div>}
              {tappable ? (
                <button type="button" className="ing-item" onClick={() => open(idx)} aria-label={`Change amount: ${amount} ${ing.name}`}>
                  {content}
                </button>
              ) : (
                <div className="ing-item">{content}</div>
              )}
            </div>
          );
        })}
        {ingredients.length === 0 && <p className="empty">No ingredients yet.</p>}
      </div>

      {editing && (
        <>
          <button type="button" className="sheet-backdrop" aria-label="Close" onClick={() => setEditIdx(null)} />
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sheet-h"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setEditIdx(null);
            }}
          >
            <div className="sheet-handle" />
            <h2 id="sheet-h" className="h2">
              How much {editing.name} do you have?
            </h2>
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                apply();
              }}
            >
              <div className="field">
                <label htmlFor="amount" className="label">
                  Amount
                </label>
                <div className="row" style={{ gap: 10 }}>
                  <input
                    id="amount"
                    className="big-input"
                    inputMode="decimal"
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onFocus={(e) => e.target.select()}
                  />
                  <span style={{ fontSize: 18, fontWeight: 600, minWidth: 40 }}>{editing.unit || 'pcs'}</span>
                </div>
                <span className="tiny muted">
                  The recipe uses {formatAmount(editing)}
                  {editing.unit ? '' : ` ${editing.quantity === 1 ? 'piece' : 'pieces'}`}
                </span>
              </div>
              <div className="preview">
                <span>
                  Factor <strong>{preview ? formatFactor(preview) : '–'}</strong>
                </span>
                {servings ? <strong>{preview ? formatServings(servings * preview) : '–'}</strong> : null}
              </div>
              <div className="grid-2">
                <button type="button" className="btn btn-block" onClick={() => setEditIdx(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-block" disabled={!preview}>
                  Recalculate
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {factor > 1.001 && <p className="tiny muted" style={{ margin: 0 }}>Bigger batch – cooking may take a little longer.</p>}
    </section>
  );
}

