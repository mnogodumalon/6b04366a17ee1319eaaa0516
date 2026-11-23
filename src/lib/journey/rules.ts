/**
 * Field rules — GENERATED from the app metadata. Do not edit.
 *
 * The mechanical truth about every field: what kind it is, whether the
 * platform's base view marks it required, which lookup keys exist, where an
 * applookup points, what the label is. `useStepForm` validates against these
 * rules and phrases its messages with the real labels; `toWirePayload` uses
 * them to shape the create payload; `SHAPES` tells a page which input FORM
 * fits the data (a date pair wants a calendar, not two fields) — it is a
 * signal, not a gate.
 */
import { appLabel, fieldLabel, lookupLabel } from '@/i18n';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { policyLabel } from './policy';
import { LOOKUP_OPTIONS } from '@/types/app';

export type EntityKey = 'zutaten' | 'gerichte' | 'zutaten_je_gericht' | 'kochprotokoll' | 'einkaufslisten' | 'einkaufspositionen';

/** The text fields of each entity — what a search may run over (generated;
 *  `never` for an entity without text of its own, e.g. a link table). */
export interface StringFields {
  "zutaten": "name";
  "gerichte": "name" | "schritte";
  "zutaten_je_gericht": never;
  "kochprotokoll": "notiz";
  "einkaufslisten": "titel";
  "einkaufspositionen": never;
}
export type StringFieldKey<E extends EntityKey> = E extends keyof StringFields ? StringFields[E] : never;

/** The applookup fields of each entity (generated). A pick stored through
 *  `form.set` on one of these must carry its display name — at compile time
 *  (`StepForm.set`), because the review would otherwise show the id. */
export interface RecordFields {
  "zutaten": never;
  "gerichte": never;
  "zutaten_je_gericht": "gericht" | "zutat";
  "kochprotokoll": "gericht";
  "einkaufslisten": never;
  "einkaufspositionen": "einkaufsliste" | "zutat";
}
export type RecordFieldKey<E extends EntityKey> = E extends keyof RecordFields ? RecordFields[E] : never;

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'url'
  | 'number'
  | 'bool'
  | 'date'
  | 'datetime'
  | 'lookup'
  | 'multilookup'
  | 'record'
  | 'multirecord'
  | 'file'
  | 'geo';

export interface FieldRule {
  key: string;
  fulltype: string;
  kind: FieldKind;
  /** From the app's base view. A public page may override this per field. */
  required: boolean;
  /** Build-time label — `labelOf()` prefers the runtime i18n bundle. */
  label: string;
  /** Whether a journey may write it as a value. `file` is false: a file is UPLOADED
   *  (`form.file(key)` → FileField; the chosen file travels in the create as a data URL). */
  writable: boolean;
  maxLength?: number;
  /** lookup / multilookup: the ONLY valid write values. */
  options?: string[];
  /** record / multirecord: the target app (always) and its entity key (when inside this appgroup). */
  targetAppId?: string;
  targetEntity?: EntityKey;
  format?: 'currency';
  /** HTML autocomplete token derived from the field name (given-name, email, tel, …). */
  autoComplete?: string;
}

export interface EntityInfo {
  key: EntityKey;
  appId: string;
  label: string;
  /** PascalCase plural — `get<pascal>()` on the service. */
  pascal: string;
  /** The single-record suffix — `create<single>()` on the service. */
  single: string;
}

/** Input-form signals per entity: which data shape each field (pair) has.
 *  `range`  — two date fields that form a stay/period → AvailabilityRangePicker
 *  `choice` — a lookup with few options → ChoiceGroup pills instead of a select
 *  `record` — an applookup → EntitySelectStep with search, never a raw id field
 *  `stock`  — a quantity that has a stock/capacity counterpart → show it, warn on overshoot */
export type Shape =
  | { kind: 'range'; from: string; to: string }
  | { kind: 'choice'; field: string; count: number }
  | { kind: 'record'; field: string; targetEntity?: EntityKey }
  | { kind: 'stock'; field: string };

export const ENTITIES: Record<EntityKey, EntityInfo> = {
  "zutaten": {
    "key": "zutaten",
    "appId": "6b04364c4fde20b9c56fd8cf",
    "label": "Zutaten",
    "pascal": "Zutaten",
    "single": "ZutatenEntry"
  },
  "gerichte": {
    "key": "gerichte",
    "appId": "6b04365219899d11469a5488",
    "label": "Gerichte",
    "pascal": "Gerichte",
    "single": "GerichteEntry"
  },
  "zutaten_je_gericht": {
    "key": "zutaten_je_gericht",
    "appId": "6b043652dcb9b40b382ebe04",
    "label": "Zutaten je Gericht",
    "pascal": "ZutatenJeGericht",
    "single": "ZutatenJeGerichtEntry"
  },
  "kochprotokoll": {
    "key": "kochprotokoll",
    "appId": "6b043653a45687fadbef2848",
    "label": "Kochprotokoll",
    "pascal": "Kochprotokoll",
    "single": "KochprotokollEntry"
  },
  "einkaufslisten": {
    "key": "einkaufslisten",
    "appId": "6b04365480f85210e4498675",
    "label": "Einkaufslisten",
    "pascal": "Einkaufslisten",
    "single": "EinkaufslistenEntry"
  },
  "einkaufspositionen": {
    "key": "einkaufspositionen",
    "appId": "6b0436542536c978c68d28d8",
    "label": "Einkaufspositionen",
    "pascal": "Einkaufspositionen",
    "single": "EinkaufspositionenEntry"
  }
};

export const FIELD_RULES: Record<EntityKey, Record<string, FieldRule>> = {
  "zutaten": {
    "name": {
      "key": "name",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Name",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "name"
    },
    "einheit": {
      "key": "einheit",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": true,
      "label": "Einheit",
      "writable": true,
      "options": [
        "gramm",
        "milliliter",
        "stueck"
      ]
    },
    "abteilung": {
      "key": "abteilung",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Abteilung im Supermarkt",
      "writable": true,
      "options": [
        "obst_gemuese",
        "fleisch_fisch",
        "milch_eier",
        "backwaren",
        "trockenwaren",
        "gewuerze_oele",
        "tiefkuehl",
        "getraenke",
        "sonstiges"
      ]
    }
  },
  "gerichte": {
    "name": {
      "key": "name",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Name",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "name"
    },
    "zubereitungszeit": {
      "key": "zubereitungszeit",
      "fulltype": "number",
      "kind": "number",
      "required": true,
      "label": "Zubereitungszeit in Minuten",
      "writable": true
    },
    "eiweiss": {
      "key": "eiweiss",
      "fulltype": "number",
      "kind": "number",
      "required": true,
      "label": "Eiweiß pro Portion in Gramm",
      "writable": true
    },
    "kochen_noetig": {
      "key": "kochen_noetig",
      "fulltype": "bool",
      "kind": "bool",
      "required": false,
      "label": "Kochen nötig",
      "writable": true
    },
    "schritte": {
      "key": "schritte",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Kurze Schritte",
      "writable": true
    },
    "foto": {
      "key": "foto",
      "fulltype": "file",
      "kind": "file",
      "required": false,
      "label": "Foto",
      "writable": false
    }
  },
  "zutaten_je_gericht": {
    "gericht": {
      "key": "gericht",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Gericht",
      "writable": true,
      "targetAppId": "6b04365219899d11469a5488",
      "targetEntity": "gerichte"
    },
    "zutat": {
      "key": "zutat",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Zutat",
      "writable": true,
      "targetAppId": "6b04364c4fde20b9c56fd8cf",
      "targetEntity": "zutaten"
    },
    "menge_pro_portion": {
      "key": "menge_pro_portion",
      "fulltype": "number",
      "kind": "number",
      "required": true,
      "label": "Menge für eine Portion",
      "writable": true
    }
  },
  "kochprotokoll": {
    "gericht": {
      "key": "gericht",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Gericht",
      "writable": true,
      "targetAppId": "6b04365219899d11469a5488",
      "targetEntity": "gerichte"
    },
    "datum": {
      "key": "datum",
      "fulltype": "date/date",
      "kind": "date",
      "required": true,
      "label": "Datum",
      "writable": true
    },
    "tatsaechliche_dauer": {
      "key": "tatsaechliche_dauer",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Tatsächliche Dauer in Minuten",
      "writable": true
    },
    "notiz": {
      "key": "notiz",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Notiz für das nächste Mal",
      "writable": true
    },
    "wieder_machen": {
      "key": "wieder_machen",
      "fulltype": "bool",
      "kind": "bool",
      "required": false,
      "label": "Würde ich wieder machen",
      "writable": true
    }
  },
  "einkaufslisten": {
    "titel": {
      "key": "titel",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Titel der Liste",
      "writable": true,
      "maxLength": 4000
    },
    "erstellt_am": {
      "key": "erstellt_am",
      "fulltype": "date/date",
      "kind": "date",
      "required": true,
      "label": "Erstellt am",
      "writable": true
    },
    "status": {
      "key": "status",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": true,
      "label": "Status",
      "writable": true,
      "options": [
        "offen",
        "erledigt"
      ]
    }
  },
  "einkaufspositionen": {
    "einkaufsliste": {
      "key": "einkaufsliste",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Einkaufsliste",
      "writable": true,
      "targetAppId": "6b04365480f85210e4498675",
      "targetEntity": "einkaufslisten"
    },
    "zutat": {
      "key": "zutat",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Zutat",
      "writable": true,
      "targetAppId": "6b04364c4fde20b9c56fd8cf",
      "targetEntity": "zutaten"
    },
    "menge": {
      "key": "menge",
      "fulltype": "number",
      "kind": "number",
      "required": true,
      "label": "Gesamtmenge",
      "writable": true
    },
    "abteilung": {
      "key": "abteilung",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": false,
      "label": "Abteilung im Supermarkt",
      "writable": true,
      "options": [
        "obst_gemuese",
        "fleisch_fisch",
        "milch_eier",
        "backwaren",
        "trockenwaren",
        "gewuerze_oele",
        "tiefkuehl",
        "getraenke",
        "sonstiges"
      ]
    },
    "abgehakt": {
      "key": "abgehakt",
      "fulltype": "bool",
      "kind": "bool",
      "required": false,
      "label": "Abgehakt",
      "writable": true
    }
  }
};

export const SHAPES: Record<EntityKey, Shape[]> = {
  "zutaten": [
    {
      "kind": "choice",
      "field": "einheit",
      "count": 3
    }
  ],
  "gerichte": [],
  "zutaten_je_gericht": [
    {
      "kind": "record",
      "field": "gericht",
      "targetEntity": "gerichte"
    },
    {
      "kind": "record",
      "field": "zutat",
      "targetEntity": "zutaten"
    }
  ],
  "kochprotokoll": [
    {
      "kind": "record",
      "field": "gericht",
      "targetEntity": "gerichte"
    }
  ],
  "einkaufslisten": [
    {
      "kind": "choice",
      "field": "status",
      "count": 2
    }
  ],
  "einkaufspositionen": [
    {
      "kind": "record",
      "field": "einkaufsliste",
      "targetEntity": "einkaufslisten"
    },
    {
      "kind": "record",
      "field": "zutat",
      "targetEntity": "zutaten"
    }
  ]
};

/** The fields a record of this entity is recognised by (a person: first and
 *  last name; else its title-like text field) — the same choice the dashboard's
 *  enrichment makes for `<key>Name`. `useRecordSearch` resolves an applookup to
 *  this name (`ctx.ref('gast')` in `toItem`). */
export const DISPLAY_FIELDS: Record<EntityKey, string[]> = {
  "zutaten": [
    "name"
  ],
  "gerichte": [
    "name"
  ],
  "zutaten_je_gericht": [
    "menge_pro_portion"
  ],
  "kochprotokoll": [
    "notiz"
  ],
  "einkaufslisten": [
    "titel"
  ],
  "einkaufspositionen": [
    "abteilung"
  ]
};

/** The display name of a record: its display fields joined, else the first
 *  non-empty text value, else ''. */
/** A display-field value as text: strings as they are, a lookup `{ key, label }`
 *  (either door hydrates lookups to objects) by its label — an entity whose
 *  only title-like field is a lookup/select otherwise had no name at all. */
/** A date reads as a date (a target whose only readable fields are `beginn`/`ende` — Doodle KB 6),
 *  a number as a number; a record URL or a bare id is never a name (0.0.389). */
export function displayPart(v: unknown): string {
  if (typeof v === 'string') {
    const s = v.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return formatDate(s);
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return formatDateTime(s);
    if (/^https?:\/\//.test(s) || /^[0-9a-f]{24}$/i.test(s)) return '';
    return s;
  }
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  if (v && typeof v === 'object' && 'label' in v) {
    const l = (v as { label?: unknown }).label;
    return l === null || l === undefined ? '' : String(l).trim();
  }
  return '';
}

export function displayNameOf(entity: EntityKey, fields: Record<string, unknown>): string {
  const parts = (DISPLAY_FIELDS[entity] ?? [])
    .map(k => displayPart(fields[k]))
    .filter(v => v !== '');
  if (parts.length > 0) return parts.join(' ');
  for (const [k, rule] of Object.entries(FIELD_RULES[entity] ?? {})) {
    if (rule.kind !== 'text' && rule.kind !== 'email') continue;
    const v = fields[k];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return '';
}

export function ruleOf(entity: EntityKey, key: string): FieldRule | undefined {
  return FIELD_RULES[entity]?.[key];
}

/** The field label as the user sees it — the owner's policy label first (a
 *  public page's "Felder anpassen"), runtime bundle second, generated label last. */
export function labelOf(entity: EntityKey, key: string): string {
  const own = policyLabel(entity, key);
  if (own) return own;
  const fromBundle = fieldLabel(entity, key);
  if (fromBundle !== key) return fromBundle;
  return ruleOf(entity, key)?.label ?? key;
}

export function entityLabel(entity: EntityKey): string {
  const fromBundle = appLabel(entity);
  if (fromBundle !== entity) return fromBundle;
  return ENTITIES[entity]?.label ?? entity;
}

/** Lookup options with runtime labels — the only legitimate source of `{key,label}` pairs. */
export function optionsOf(entity: EntityKey, key: string): Array<{ key: string; label: string }> {
  const generated = (LOOKUP_OPTIONS as Record<string, Record<string, Array<{ key: string; label: string }>>>)[entity]?.[key];
  if (generated && generated.length) return generated.map(o => ({ key: o.key, label: o.label }));
  const keys = ruleOf(entity, key)?.options ?? [];
  return keys.map(k => ({ key: k, label: lookupLabel(entity, key, k) ?? k }));
}

/** „Nicht ausgefüllt“ for a required field, by its kind: a checkbox that is
 *  `false` is NOT filled — the person did not consent (live 03.11.2026: a
 *  consent page validated with the box unticked and the grant took it). Every
 *  other kind is isEmptyValue. */
export function isUnfilled(entity: EntityKey, key: string, v: unknown): boolean {
  if (ruleOf(entity, key)?.kind === 'bool') return v !== true;
  return isEmptyValue(v);
}

export function isEmptyValue(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object' && 'from' in (v as object) && 'to' in (v as object)) {
    const r = v as { from: unknown; to: unknown };
    return isEmptyValue(r.from) && isEmptyValue(r.to);
  }
  return false;
}
