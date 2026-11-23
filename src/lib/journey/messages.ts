/**
 * Required-field messages — WRITTEN BY THE BUILD AGENT, never by a heuristic.
 *
 * The layer knows two things about an empty required field: that it is
 * required and what its label is. Out of that it can only say „„Anreise" ist
 * ein Pflichtfeld". What the person should do instead („Bitte einen Gast
 * auswählen.") is meaning, and meaning is the agent's: the Phase-2 orchestrator
 * writes one short instruction per required field — what is needed, not why — to
 * `.intents-staging/messages.json`, the integration step validates it against
 * the app metadata and renders it into the block below. Scaffold updates keep
 * the block. Do not edit outside the markers.
 *
 * Every door reads this and nothing else: `useStepForm` (flows and public
 * pages), the generated {Entity}Dialog and the public form's server-error line.
 * A field without a sentence falls back to the label sentence — never to a
 * bare „Dieses Feld ist erforderlich".
 *
 * Required fields per entity (from the base view):
 *   - zutaten: name (Name), einheit (Einheit), abteilung (Abteilung im Supermarkt)
 *   - gerichte: name (Name), zubereitungszeit (Zubereitungszeit in Minuten), eiweiss (Eiweiß pro Portion in Gramm)
 *   - zutaten_je_gericht: gericht (Gericht), zutat (Zutat), menge_pro_portion (Menge für eine Portion)
 *   - kochprotokoll: gericht (Gericht), datum (Datum)
 *   - einkaufslisten: titel (Titel der Liste), erstellt_am (Erstellt am), status (Status)
 *   - einkaufspositionen: einkaufsliste (Einkaufsliste), zutat (Zutat), menge (Gesamtmenge)
 */
import { t, tx } from '@/i18n';
import { labelOf, type EntityKey } from './rules';

/** The writable fields of each entity — the keys a message may address (generated). */
export interface MessageFields {
  "zutaten": "name" | "einheit" | "abteilung";
  "gerichte": "name" | "zubereitungszeit" | "eiweiss" | "kochen_noetig" | "schritte";
  "zutaten_je_gericht": "gericht" | "zutat" | "menge_pro_portion";
  "kochprotokoll": "gericht" | "datum" | "tatsaechliche_dauer" | "notiz" | "wieder_machen";
  "einkaufslisten": "titel" | "erstellt_am" | "status";
  "einkaufspositionen": "einkaufsliste" | "zutat" | "menge" | "abteilung" | "abgehakt";
}
export type MessageFieldKey<E extends EntityKey> = E extends keyof MessageFields ? MessageFields[E] : never;

export const REQUIRED_MESSAGES: { [E in EntityKey]?: Partial<Record<MessageFieldKey<E>, string>> } = {
  // <custom:messages>
  zutaten: { name: "Bitte den Namen der Zutat eingeben.", einheit: "Bitte eine Einheit wählen.", abteilung: "Bitte eine Abteilung wählen." },
  gerichte: { name: "Bitte den Namen des Gerichts eingeben.", zubereitungszeit: "Bitte die Zubereitungszeit in Minuten eingeben.", eiweiss: "Bitte das Eiweiß pro Portion in Gramm eingeben." },
  zutaten_je_gericht: { gericht: "Bitte ein Gericht auswählen.", zutat: "Bitte eine Zutat auswählen.", menge_pro_portion: "Bitte die Menge für eine Portion eingeben." },
  kochprotokoll: { gericht: "Bitte ein Gericht auswählen.", datum: "Bitte das Datum wählen." },
  einkaufslisten: { titel: "Bitte einen Titel für die Liste eingeben.", erstellt_am: "Bitte das Datum wählen.", status: "Bitte einen Status wählen." },
  einkaufspositionen: { einkaufsliste: "Bitte eine Einkaufsliste auswählen.", zutat: "Bitte eine Zutat auswählen.", menge: "Bitte die Gesamtmenge eingeben." },
  // </custom:messages>
};

/** The sentence shown when `key` of `entity` is required and empty — the
 *  agent's own text (translated at runtime like every page string), else the
 *  label sentence. Call it while rendering, not at module scope. */
export function requiredMessage(entity: EntityKey, key: string): string {
  const own = (REQUIRED_MESSAGES as Record<string, Record<string, string | undefined> | undefined>)[entity]?.[key];
  if (own && own.trim()) return tx(own);
  return t('v_required', { label: labelOf(entity, key) });
}

/** True when the agent wrote a sentence for the field. */
export function hasOwnMessage(entity: EntityKey, key: string): boolean {
  const own = (REQUIRED_MESSAGES as Record<string, Record<string, string | undefined> | undefined>)[entity]?.[key];
  return Boolean(own && own.trim());
}
