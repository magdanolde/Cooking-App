'use client';

import { useActionState, useState } from 'react';
import { RecipeForm } from '@/components/RecipeForm';
import { CheckCircleIcon } from '@/components/icons';
import type { RecipeDraft } from '@/lib/import';
import { recipeFromText } from '@/lib/textRecipe';
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

  // "Type it in": optional pasted text that pre-fills the form
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [manualDraft, setManualDraft] = useState<RecipeDraft>(EMPTY);
  const [manualKey, setManualKey] = useState(0);
  const [pasteInfo, setPasteInfo] = useState('');

  const fillFromPaste = () => {
    const parsed = recipeFromText(pasteText);
    if (!parsed) return;
    setManualDraft({ ...parsed, sourceUrl: state.url && state.error ? state.url : null });
    setManualKey((k) => k + 1);
    setPasteOpen(false);
    setPasteInfo(`Filled in ${parsed.ingredients.length} ingredients and ${parsed.steps.length} steps. Please check them before saving.`);
  };

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
            <div className="notice notice-error stack" role="alert" style={{ alignItems: 'flex-start', gap: 8 }}>
              <span>{state.error}</span>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setMode('manual');
                  setPasteOpen(true);
                }}
              >
                Paste a whole recipe
              </button>
            </div>
          )}

          {draft && (
            <>
              {state.guessed ? (
                <p className="notice notice-warn" role="status">
                  <span>
                    <strong>Recipe guessed</strong> · this site doesn&apos;t include recipe data, so the app read the page text and found{' '}
                    {draft.ingredients.length} ingredients and {draft.steps.length} steps. Please check them – and add anything that&apos;s
                    missing – before saving.
                  </span>
                </p>
              ) : (
                <p className="notice notice-ok" role="status">
                  <CheckCircleIcon />
                  <span>
                    <strong>Recipe found</strong> · {draft.ingredients.length} ingredients, {draft.steps.length} steps. Check it, then
                    save.
                  </span>
                </p>
              )}
              {/* key: a new import replaces the whole form */}
              <RecipeForm key={`${draft.sourceUrl}-${draft.title}-${draft.ingredients.length}`} initial={draft} />
            </>
          )}
        </>
      )}

      {mode === 'manual' && (
        <>
          <div className="card stack" style={{ padding: 14 }}>
            <div className="between">
              <span style={{ fontWeight: 600 }}>Paste a whole recipe</span>
              <button type="button" className="btn btn-ghost" onClick={() => setPasteOpen((o) => !o)} aria-expanded={pasteOpen}>
                {pasteOpen ? 'Close' : 'Open'}
              </button>
            </div>
            {pasteOpen ? (
              <>
                <label className="field">
                  <span className="small muted">
                    Copy the recipe from a website, a message or a document and paste it here – title, ingredients and steps are
                    sorted into the form for you.
                  </span>
                  <textarea
                    className="textarea"
                    rows={10}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder={'Pieczone tofu\n\n2 kostki tofu\n3 łyżki mąki ziemniaczanej\n…\n\n1. Tofu pokrój w kostkę.\n2. …'}
                  />
                </label>
                <button type="button" className="btn btn-primary" onClick={fillFromPaste} disabled={!pasteText.trim()}>
                  Fill in the form
                </button>
              </>
            ) : (
              <span className="small muted">Or fill in the form below.</span>
            )}
          </div>
          {pasteInfo && (
            <p className="notice notice-ok" role="status">
              <CheckCircleIcon />
              <span>{pasteInfo}</span>
            </p>
          )}
          <RecipeForm key={manualKey} initial={manualDraft} />
        </>
      )}
    </div>
  );
}
