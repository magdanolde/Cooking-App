'use client';

import { useActionState, useMemo, useState } from 'react';
import { addEntryAction, updateEntryAction, type EntryFormState } from '@/app/plan/actions';
import { SearchIcon } from './icons';

type RecipeOption = { id: number; title: string; servings: number | null };
type Option = { value: string; label: string };

export function PlanEntryForm({
  mode,
  recipes = [],
  dayOptions,
  mealOptions,
  initial,
  entryId,
  recipeTitle,
}: {
  mode: 'add' | 'edit';
  recipes?: RecipeOption[];
  dayOptions: Option[];
  mealOptions: Option[];
  initial: { recipeId?: number; date: string; meal: string; servings?: number; isLeftover?: boolean };
  entryId?: number;
  recipeTitle?: string;
}) {
  const [state, formAction, pending] = useActionState<EntryFormState, FormData>(
    mode === 'add' ? addEntryAction : updateEntryAction,
    {},
  );
  const [query, setQuery] = useState('');
  const [recipeId, setRecipeId] = useState<number | undefined>(initial.recipeId);
  const startServings = initial.servings ?? recipes.find((r) => r.id === initial.recipeId)?.servings ?? 2;
  const [servings, setServings] = useState(String(startServings).replace('.', ','));
  const [servingsTouched, setServingsTouched] = useState(mode === 'edit');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? recipes.filter((r) => r.title.toLowerCase().includes(q)) : recipes;
  }, [query, recipes]);

  const pick = (r: RecipeOption) => {
    setRecipeId(r.id);
    if (!servingsTouched && r.servings) setServings(String(r.servings));
  };

  return (
    <form action={formAction} className="stack-lg">
      {entryId != null && <input type="hidden" name="id" value={entryId} />}

      {mode === 'add' ? (
        <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="h2" style={{ marginBottom: 12 }}>
            Recipe
          </legend>
          <div className="search">
            <label htmlFor="recipe-q" className="sr-only">
              Search recipes
            </label>
            <SearchIcon />
            <input
              id="recipe-q"
              type="search"
              className="input"
              placeholder="Search recipes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="card pick-list">
            {filtered.map((r) => (
              <label key={r.id} className={`pick-item${recipeId === r.id ? ' is-picked' : ''}`}>
                <input type="radio" name="recipeId" value={r.id} checked={recipeId === r.id} onChange={() => pick(r)} />
                <span>{r.title}</span>
                {r.servings ? <span className="tiny muted">{r.servings} servings</span> : <span />}
              </label>
            ))}
            {filtered.length === 0 && <p className="empty">{recipes.length ? 'No recipe matches.' : 'Add a recipe first.'}</p>}
          </div>
        </fieldset>
      ) : (
        <h2 className="h2">{recipeTitle}</h2>
      )}

      <div className="grid-2">
        <label className="field">
          <span className="label">Day</span>
          <select name="date" className="input" defaultValue={initial.date}>
            {dayOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Meal</span>
          <select name="meal" className="input" defaultValue={initial.meal}>
            {mealOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span className="label">Servings</span>
        <input
          name="servings"
          className="input"
          inputMode="decimal"
          value={servings}
          onChange={(e) => {
            setServings(e.target.value);
            setServingsTouched(true);
          }}
          required
        />
        <span className="tiny muted">The shopping list uses this amount.</span>
      </label>

      <label className="check-row">
        <input type="checkbox" name="isLeftover" defaultChecked={initial.isLeftover} />
        <span>
          Leftovers
          <span className="tiny muted" style={{ display: 'block' }}>
            Cooked on another day – not added to the shopping list
          </span>
        </span>
      </label>

      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-block" disabled={pending || (mode === 'add' && !recipeId)}>
        {pending ? 'Saving…' : mode === 'add' ? 'Add to plan' : 'Save changes'}
      </button>
    </form>
  );
}
