// Auto-generated. Per-entity form-enhancements config for "Gerichte".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["name", {"row": ["zubereitungszeit", "eiweiss"], "cols": "1fr 1fr"}, "kochen_noetig", "schritte"],
  defaults: {
    'kochen_noetig': { kind: 'literal', value: true },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
