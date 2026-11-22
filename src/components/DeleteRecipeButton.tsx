'use client';

import { deleteRecipeAction } from '@/app/recipes/actions';

export function DeleteRecipeButton({ id, title }: { id: number; title: string }) {
  return (
    <form
      action={deleteRecipeAction}
      onSubmit={(e) => {
        if (!window.confirm(`Delete “${title}”? This can't be undone.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn btn-danger btn-block">
        Delete recipe
      </button>
    </form>
  );
}
