'use client';

import { useActionState, useState } from 'react';
import { RecipeForm } from '@/components/RecipeForm';
import { CheckCircleIcon } from '@/components/icons';
import type { RecipeDraft } from '@/lib/import';
import { importRecipeAction, type ImportState } from '../actions';

const EMPTY: RecipeDraft = {
  title: '',
  sourceUrl: null,
  servings: null,
  prepMinutes: null,
  cookMinutes: null,
  totalMinutes: null,
  tags: [],
  notes: '',
  ingredients: [],
  steps: [],
};

export function NewRecipe({ initialUrl }: { initialUrl?: string }) {
  const [mode, setMode] = useState<'link' | 'manual'>('link');
  const [state, importAction, pending] = useActionState<ImportState, FormData>(importRecipeAction, {});
  const draft = state.draft;

  return (
    <div className="stack-lg">
      <div className="segmented" role="group" aria-label="How to add">
        <button type="button" aria-pressed={mode === 'link'} onClick={() => setMode('link')}>
          From a link
        </button>
        <button type="button" aria-pressed={mode === 'manual'} onClick={() => setMode('manual')}>
          Type it in
        </button>
      </div>

      {mode === 'link' && (
        <>
          <form action={importAction} className="field">
            <label className="label" htmlFor="url">
              Recipe link
            </label>
            <div className="row">
              <input
                id="url"
                name="url"
                type="url"
                className="input"
                placeholder="https://…"
                defaultValue={state.url ?? initialUrl ?? ''}
                required
                style={{ flex: '1 1 auto', minWidth: 0 }}
              />
              <button type="submit" className="btn btn-dark" disabled={pending} style={{ minHeight: 48 }}>
                {pending ? 'Fetching…' : 'Fetch'}
              </button>
            </div>
          </form>

          {state.error && (
            <p className="notice notice-error" role="alert">
              {state.error}
            </p>
          )}

          {draft && (
            <>
              <p className="notice notice-ok" role="status">
                <CheckCircleIcon />
                <span>
                  <strong>Recipe found</strong> · {draft.ingredients.length} ingredients, {draft.steps.length} steps. Check it, then
                  save.
                </span>
              </p>
              {/* key: a new import replaces the whole form */}
              <RecipeForm key={`${draft.sourceUrl}-${draft.title}`} initial={draft} />
            </>
          )}
        </>
      )}

      {mode === 'manual' && <RecipeForm initial={EMPTY} />}
    </div>
  );
}
