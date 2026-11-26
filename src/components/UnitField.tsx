'use client';

import { useState } from 'react';
import { UNIT_CHOICES } from '@/lib/ingredients';

const OTHER = '__other__';

/**
 * Unit picker: a dropdown with the usual units (easy to change on a phone),
 * plus "Other…" to type any unit, e.g. "łyżki" or "Becher".
 */
export function UnitField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const known = value === '' || UNIT_CHOICES.includes(value);
  const [typing, setTyping] = useState(!known);

  if (typing) {
    return (
      <input
        className="input input-sm"
        aria-label={label}
        value={value}
        autoFocus={known}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          if (value.trim() === '' || UNIT_CHOICES.includes(value.trim())) setTyping(false);
        }}
        placeholder="unit"
      />
    );
  }

  return (
    <select
      className="input input-sm unit-select"
      aria-label={label}
      value={value}
      onChange={(e) => {
        if (e.target.value === OTHER) {
          onChange('');
          setTyping(true);
        } else {
          onChange(e.target.value);
        }
      }}
    >
      <option value="">–</option>
      {UNIT_CHOICES.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
      <option value={OTHER}>Other…</option>
    </select>
  );
}
