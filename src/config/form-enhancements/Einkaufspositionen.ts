// Auto-generated. Per-entity form-enhancements config for "Einkaufspositionen".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [{"row": ["einkaufsliste", "zutat"], "cols": "1fr 1fr"}, {"row": ["menge", "abteilung"], "cols": "1fr 2fr"}, "abgehakt"],
  defaults: {},
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
