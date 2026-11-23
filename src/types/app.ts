import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Zutaten {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    name?: string;
    einheit?: LookupValue;
    abteilung?: LookupValue;
  };
}

export interface Gerichte {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    name?: string;
    zubereitungszeit?: number;
    eiweiss?: number;
    kochen_noetig?: boolean;
    schritte?: string;
    foto?: string;
  };
}

export interface ZutatenJeGericht {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    gericht?: RecordUrl; // applookup -> URL zu 'Gerichte' Record
    zutat?: RecordUrl; // applookup -> URL zu 'Zutaten' Record
    menge_pro_portion?: number;
  };
}

export interface Kochprotokoll {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    gericht?: RecordUrl; // applookup -> URL zu 'Gerichte' Record
    datum?: string; // Format: YYYY-MM-DD oder ISO String
    tatsaechliche_dauer?: number;
    notiz?: string;
    wieder_machen?: boolean;
  };
}

export interface Einkaufslisten {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    titel?: string;
    erstellt_am?: string; // Format: YYYY-MM-DD oder ISO String
    status?: LookupValue;
  };
}

export interface Einkaufspositionen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    einkaufsliste?: RecordUrl; // applookup -> URL zu 'Einkaufslisten' Record
    zutat?: RecordUrl; // applookup -> URL zu 'Zutaten' Record
    menge?: number;
    abteilung?: LookupValue;
    abgehakt?: boolean;
  };
}

export const APP_IDS = {
  ZUTATEN: '6b04364c4fde20b9c56fd8cf',
  GERICHTE: '6b04365219899d11469a5488',
  ZUTATEN_JE_GERICHT: '6b043652dcb9b40b382ebe04',
  KOCHPROTOKOLL: '6b043653a45687fadbef2848',
  EINKAUFSLISTEN: '6b04365480f85210e4498675',
  EINKAUFSPOSITIONEN: '6b0436542536c978c68d28d8',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'zutaten': {
    einheit: [{ key: "gramm", get label() { return lookupLabel('zutaten', 'einheit', "gramm") ?? "Gramm"; } }, { key: "milliliter", get label() { return lookupLabel('zutaten', 'einheit', "milliliter") ?? "Milliliter"; } }, { key: "stueck", get label() { return lookupLabel('zutaten', 'einheit', "stueck") ?? "Stück"; } }],
    abteilung: [{ key: "obst_gemuese", get label() { return lookupLabel('zutaten', 'abteilung', "obst_gemuese") ?? "Obst und Gemüse"; } }, { key: "fleisch_fisch", get label() { return lookupLabel('zutaten', 'abteilung', "fleisch_fisch") ?? "Fleisch und Fisch"; } }, { key: "milch_eier", get label() { return lookupLabel('zutaten', 'abteilung', "milch_eier") ?? "Milchprodukte und Eier"; } }, { key: "backwaren", get label() { return lookupLabel('zutaten', 'abteilung', "backwaren") ?? "Backwaren"; } }, { key: "trockenwaren", get label() { return lookupLabel('zutaten', 'abteilung', "trockenwaren") ?? "Nudeln, Reis und Konserven"; } }, { key: "gewuerze_oele", get label() { return lookupLabel('zutaten', 'abteilung', "gewuerze_oele") ?? "Gewürze und Öle"; } }, { key: "tiefkuehl", get label() { return lookupLabel('zutaten', 'abteilung', "tiefkuehl") ?? "Tiefkühl"; } }, { key: "getraenke", get label() { return lookupLabel('zutaten', 'abteilung', "getraenke") ?? "Getränke"; } }, { key: "sonstiges", get label() { return lookupLabel('zutaten', 'abteilung', "sonstiges") ?? "Sonstiges"; } }],
  },
  'einkaufslisten': {
    status: [{ key: "offen", get label() { return lookupLabel('einkaufslisten', 'status', "offen") ?? "Offen"; } }, { key: "erledigt", get label() { return lookupLabel('einkaufslisten', 'status', "erledigt") ?? "Erledigt"; } }],
  },
  'einkaufspositionen': {
    abteilung: [{ key: "obst_gemuese", get label() { return lookupLabel('einkaufspositionen', 'abteilung', "obst_gemuese") ?? "Obst und Gemüse"; } }, { key: "fleisch_fisch", get label() { return lookupLabel('einkaufspositionen', 'abteilung', "fleisch_fisch") ?? "Fleisch und Fisch"; } }, { key: "milch_eier", get label() { return lookupLabel('einkaufspositionen', 'abteilung', "milch_eier") ?? "Milchprodukte und Eier"; } }, { key: "backwaren", get label() { return lookupLabel('einkaufspositionen', 'abteilung', "backwaren") ?? "Backwaren"; } }, { key: "trockenwaren", get label() { return lookupLabel('einkaufspositionen', 'abteilung', "trockenwaren") ?? "Nudeln, Reis und Konserven"; } }, { key: "gewuerze_oele", get label() { return lookupLabel('einkaufspositionen', 'abteilung', "gewuerze_oele") ?? "Gewürze und Öle"; } }, { key: "tiefkuehl", get label() { return lookupLabel('einkaufspositionen', 'abteilung', "tiefkuehl") ?? "Tiefkühl"; } }, { key: "getraenke", get label() { return lookupLabel('einkaufspositionen', 'abteilung', "getraenke") ?? "Getränke"; } }, { key: "sonstiges", get label() { return lookupLabel('einkaufspositionen', 'abteilung', "sonstiges") ?? "Sonstiges"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'zutaten': {
    'name': 'string/text',
    'einheit': 'lookup/radio',
    'abteilung': 'lookup/select',
  },
  'gerichte': {
    'name': 'string/text',
    'zubereitungszeit': 'number',
    'eiweiss': 'number',
    'kochen_noetig': 'bool',
    'schritte': 'string/textarea',
    'foto': 'file',
  },
  'zutaten_je_gericht': {
    'gericht': 'applookup/select',
    'zutat': 'applookup/select',
    'menge_pro_portion': 'number',
  },
  'kochprotokoll': {
    'gericht': 'applookup/select',
    'datum': 'date/date',
    'tatsaechliche_dauer': 'number',
    'notiz': 'string/textarea',
    'wieder_machen': 'bool',
  },
  'einkaufslisten': {
    'titel': 'string/text',
    'erstellt_am': 'date/date',
    'status': 'lookup/radio',
  },
  'einkaufspositionen': {
    'einkaufsliste': 'applookup/select',
    'zutat': 'applookup/select',
    'menge': 'number',
    'abteilung': 'lookup/select',
    'abgehakt': 'bool',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateZutaten = StripLookup<Zutaten['fields']>;
export type CreateGerichte = StripLookup<Gerichte['fields']>;
export type CreateZutatenJeGericht = StripLookup<ZutatenJeGericht['fields']>;
export type CreateKochprotokoll = StripLookup<Kochprotokoll['fields']>;
export type CreateEinkaufslisten = StripLookup<Einkaufslisten['fields']>;
export type CreateEinkaufspositionen = StripLookup<Einkaufspositionen['fields']>;