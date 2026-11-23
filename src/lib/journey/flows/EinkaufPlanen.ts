/**
 * useEinkaufPlanenFlow — the plumbing of the flow « Einkauf planen », generated from the plan.
 *
 * Writes `einkaufslisten`: asks `titel`; sets `erstellt_am`, `status` itself.
Writes `einkaufspositionen` SEVERAL times — one record per entry of `flow.lists.einkaufspositionen`; the form is the editor of one entry: asks `zutat`; sets `abteilung`, `abgehakt` itself; links `einkaufsliste` ← the created `einkaufslisten`.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 3)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *
 *   Lists (several records of one entity per run): `flow.lists.<key>` holds the
 *   entries — `add()` validates the editor form and takes its values as one more
 *   record, `remove(id)`, `edit(id)` (back into the editor), `entries`, `count`.
 *   Render the editor's fields INSIDE <ListEntries list={flow.lists.<key>}> (the
 *   block adds „Hinzufügen“ and the entry list); „Weiter“ on that step takes a
 *   filled editor as one more entry and needs at least one entry.
 *   compute   REQUIRED — the plan says these values are computed in the flow
 *             but leaves the rule to you: `menge` (derived:computed:Summe aus Menge für eine Portion mal Zahl der Portionen über alle gewählten Gerichte, je Zutat eine Zeile) *
 *   const flow = useEinkaufPlanenFlow({
 *     steps: { zutat: 1, titel: 2 },
 *     items: { zutat: r => ({ id: r.id, title: fieldText(r, 'name') }) },
 *     compute: { menge: forms => null },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.zutat.select} {...flow.pick('zutat')} />
 *     <Bound form={flow.forms.einkaufslisten} name="titel" />
 *     <ListEntries list={flow.lists.einkaufspositionen}></ListEntries>
 *     <StepNav onNext={() => flow.validateStep(n)} />
 *     {!flow.submit.done && <SummaryStep forms={flow.formList} submit={flow.submit} />}
 *     {flow.submit.result && <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit} />}
 *   </IntentWizardShell>
 */
import { useEffect, useRef, useState } from 'react';
import { readJourneyExtra, writeJourneyExtra } from '@/lib/journey/draft';
import { DOOR_PARENTS, nounOne } from '@/config/plan';
import { syncDoorsAfterWrite } from '@/lib/publicDoors';
import {
  useStepForm, useJourneySubmit, useRecordSearch,
  fieldText, fieldLookup, fieldLookups, fieldNumber, fieldDate, fieldRef,
  todayIso, nowIso, isEmptyValue, policyFixedValue, withPickPolicy, usePolicyVersion,  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep, type SummaryItem,} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { pickHint, whereSentence, type PickWhere } from '@/lib/journey/policy';
import { labelOf, optionsOf, type EntityKey } from '@/lib/journey/rules';
import { entityLabel } from '@/lib/journey/rules';

export type EinkaufPlanenFieldKey = 'titel' | 'zutat';

export interface EinkaufPlanenForms {
  einkaufslisten: StepForm<'einkaufslisten'>;
  einkaufspositionen: StepForm<'einkaufspositionen'>;
}

// Alias so the option generics stay readable.
type Key = EinkaufPlanenFieldKey;

export interface EinkaufPlanenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    zutat?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
  /** A page-side narrowing per pick, on top of the plan's filter (J-3): the
   *  questions of the picked event, the open ones — `r => fieldRef(r, 'veranstaltung') === eventId`. */
  where?: {
    zutat?: (record: JourneyRecord) => boolean;
  };
  /** The plan computes these in the flow but leaves the rule to the page. */
  compute: {
    menge: (forms: EinkaufPlanenForms) => unknown;   // derived:computed:Summe aus Menge für eine Portion mal Zahl der Portionen über alle gewählten Gerichte, je Zutat eine Zeile
  };
}

/** One entry of a list the flow creates several records from (`flow.lists.<key>`). */
export interface ListEntry { id: string; values: FormValues; labels: Record<string, string>; rows: SummaryItem[] }

const DEFAULT_STEPS: Record<string, number> = {"titel": 2, "zutat": 1};
export const EINKAUFPLANEN_REVIEW_STEP = 3;

function fromPick<T>(pick: { recordOf(id: string): JourneyRecord | undefined }, form: StepForm, field: string, read: (r: JourneyRecord) => T): T | undefined {
  const id = form.get(field);
  const rec = typeof id === 'string' && id ? pick.recordOf(id) : undefined;
  return rec ? read(rec) : undefined;
}
// local calendar day — the ISO-string of a Date is UTC and flips the date in the evening (J-7)
function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Returns T, not Partial<T>: a Record's index signature is already "maybe
// absent", and Partial<Record<string, string>> does not assign to the
// Record<string, string> useStepForm wants (tsc, live 23.09.2026 — eight
// errors, one per hook, caught only in the sandbox build).
function only<T extends Record<string, unknown>>(obj: T | undefined, keys: string[]): T | undefined {
  if (!obj) return undefined;
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out as T;
}

function hasValues(form: StepForm): boolean {
  return form.keys.some(k => !isEmptyValue(form.values[k]));
}

export function useEinkaufPlanenFlow(options: EinkaufPlanenFlowOptions) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const einkaufslisten = useStepForm('einkaufslisten', {
    fields: ["titel"],
    steps: only(steps, ["titel"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["titel"]),
    messages: only(options.messages as Record<string, string> | undefined, ["titel"]),
  });
  const einkaufspositionen = useStepForm('einkaufspositionen', {
    fields: ["zutat"],
    steps: only(steps, ["zutat"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["zutat"]),
    messages: only(options.messages as Record<string, string> | undefined, ["zutat"]),
  });
  const [einkaufspositionenEntries, setEinkaufspositionenEntries] = useState<ListEntry[]>(() => readJourneyExtra<ListEntry[]>('einkauf-planen', 'list:einkaufspositionen') ?? []);
  useEffect(() => { writeJourneyExtra('einkauf-planen', 'list:einkaufspositionen', einkaufspositionenEntries.length ? einkaufspositionenEntries : null); }, [einkaufspositionenEntries]);
  const forms: EinkaufPlanenForms = { einkaufslisten, einkaufspositionen };
  // the editor of a list is not a record of its own: the review and the success
  // page read the entries (PlanStep.review), never the half-filled editor
  const formList: StepForm[] = [einkaufslisten];
  const allForms: StepForm[] = [einkaufslisten, einkaufspositionen];
  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
    zutat: useRecordSearch(servicePort, 'zutaten', withPickPolicy('zutat', {
      searchFields: ["name"] as never,
      where: options.where?.zutat,
      toItem: options.items?.zutat as never,
      claim: 'einkaufspositionen.zutat',
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:einkauf-planen:read:${entity}`);
  // a fixed value the flow sets itself, as a review row with the link that changes it
  const setting = (entity: EntityKey, field: string, value: unknown): SummaryItem => ({
    key: `setting:${entity}.${field}`, label: labelOf(entity, field),
    value: optionsOf(entity, field).find(o => o.key === String(value))?.label ?? String(value ?? ''),
    href: `#/verwaltung/anwendung?line=intent:einkauf-planen:write:${entity}.${field}`,
  });
  const picks = {
    zutat: { ...searches.zutat, select: { ...searches.zutat.select, create: false as boolean, hint: hintFor('zutat', 'zutaten', null as PickWhere | null) } },
  };

  // Lists — several records of one entity in one run („ein paar Termine“): the
  // editor form takes one entry at a time, `add()` validates it and puts it on
  // the list, the plan creates one record per entry (02.11.2026: the wish said
  // several, the flow made exactly one and nobody reported the difference)
  const lists = {
    einkaufspositionen: {
      entries: einkaufspositionenEntries,
      count: einkaufspositionenEntries.length,
      label: nounOne('einkaufspositionen', entityLabel('einkaufspositionen')),
      /** Validates the editor and takes its values as one more `einkaufspositionen`; false when a required field is empty. */
      add: (): boolean => {
        if (!einkaufspositionen.validate()) return false;
        const rows = einkaufspositionen.summary().filter(r => r.value !== '—');
        const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        // the snapshot is taken HERE, never inside the updater: React may run the updater in the
        // next render, after reset() below emptied the editor — and payload() reads the latest
        // values (EF-38), so every entry arrived without its dates (EF-41, Doodle KB 5)
        const values = einkaufspositionen.payload();
        const labels = { ...einkaufspositionen.labels };
        setEinkaufspositionenEntries(list => [...list, { id, values, labels, rows }]);
        einkaufspositionen.reset();
        return true;
      },
      remove: (id: string) => setEinkaufspositionenEntries(list => list.filter(e => e.id !== id)),
      /** Takes an entry back into the editor to change it. */
      edit: (id: string) => {
        const e = einkaufspositionenEntries.find(x => x.id === id);
        if (!e) return;
        setEinkaufspositionenEntries(list => list.filter(x => x.id !== id));
        einkaufspositionen.reset(e.values, e.labels);
      },
    },
  };
  const plan: PlanStep[] = [
    {
      key: 'einkaufslisten', entity: 'einkaufslisten', form: einkaufslisten, label: nounOne('einkaufslisten', entityLabel('einkaufslisten')), primary: true,
      values: (): FormValues => ({
        erstellt_am: policyFixedValue('einkaufslisten', 'erstellt_am') ?? todayIso(),
        status: policyFixedValue('einkaufslisten', 'status') ?? "offen",
      }),

      // the review shows what this step sets itself — changeable on „Deine Anwendung“, not here
      settings: () => [setting('einkaufslisten', 'status', policyFixedValue('einkaufslisten', 'status') ?? "offen")],

      // the planner's assumptions that first act here — shown once with „Passt“ / „ändern“
      notices: () => [{"assumed": "in der Einheit der Zutat", "id": "einkauf-einheiten", "question": "Wie werden unterschiedliche Einheiten derselben Zutat behandelt?"}],
    },
    ...einkaufspositionenEntries.map((entry, i) => ({
      key: `einkaufspositionen:${entry.id}`, entity: 'einkaufspositionen', label: `${nounOne('einkaufspositionen', entityLabel('einkaufspositionen'))} ${i + 1}`,
      needs: ['einkaufslisten'],
      link: { einkaufsliste: 'einkaufslisten' },
      values: (): FormValues => ({
        ...entry.values,
        abteilung: policyFixedValue('einkaufspositionen', 'abteilung') ?? fromPick(picks.zutat, forms.einkaufspositionen, "zutat", r => fieldText(r, "abteilung")),
        abgehakt: policyFixedValue('einkaufspositionen', 'abgehakt') ?? false,
        menge: options.compute.menge(forms),
      }),
      // the review lists every entry („1. Termin: …“); „Ändern“ leads back to the list's step
      review: () => entry.rows.map(r => ({ ...r, key: `einkaufspositionen:${entry.id}:${r.key}`, label: `${i + 1}. ${r.label}`, step: steps[r.key] })),
    } as PlanStep)),
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'einkauf-planen', onSuccess: (r) => {
    // EF-51: a created or changed parent record keeps its pair of doors in step (made, closed, reopened)
    for (const [k, rec] of Object.entries(r.records)) {
      const ent = plan.find(s => s.key === k)?.entity;
      if (ent && Object.values(DOOR_PARENTS).some(d => d.entity === ent)) void syncDoorsAfterWrite(ent, rec.id, rec.fields);
    }
  } });

  // A typed field the plan prefills from the picked record (`user:from_pick`),
  // still the person's to change: filled once, only while empty (PV-12)
  const prefillFrom = (pickKey: string, rec: JourneyRecord) => {
    void pickKey; void rec;
  };

  // Opened with `?<field>=<value>` for a field this flow asks — a dashboard
  // link that pre-picks the event, a form that hands the question on (J-2):
  // a typed field takes the value while it is empty (a draft wins), a pick
  // loads the record, takes it into the pick and selects it WITH its name.
  // `initial` with a bare record id gets its name the same way.
  const [linkedParams] = useState(() => new URLSearchParams(window.location.hash.split('?')[1] ?? ''));
  useEffect(() => {
    let on = true;
    const coerce = (form: StepForm, key: string, raw: string): unknown => {
      const kind = form.rules[key]?.kind;
      if (kind === 'number') { const n = Number(raw); return Number.isFinite(n) ? n : raw; }
      if (kind === 'bool') return raw === 'true' || raw === '1' || raw === 'ja';
      return raw;
    };
    { const v = linkedParams.get('titel'); if (v !== null && isEmptyValue(einkaufslisten.get('titel'))) (einkaufslisten.set as (k: string, v: unknown) => void)('titel', coerce(einkaufslisten, 'titel', v)); }
    {
      const cur = forms.einkaufspositionen.get('zutat');
      const fromLink = linkedParams.get('zutat');
      const unnamed = typeof cur === 'string' && cur !== '' && !forms.einkaufspositionen.labels[cur] ? cur : null;
      const id = fromLink && isEmptyValue(cur) ? fromLink : unnamed;
      if (id) void servicePort.get('zutaten', id).then(rec => {
        if (!on || !rec) return;
        picks.zutat.adopt(rec);
        const name = picks.zutat.labelOf(rec.id) ?? rec.id;
        (forms.einkaufspositionen.set as (k: string, v: unknown, l?: string) => void)('zutat', rec.id, name);
        prefillFrom('zutat', rec);
      }).catch(() => undefined);
    }
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per link
  }, []);

  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: EinkaufPlanenFieldKey) => {
    const owner = allForms.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined; recordOf?(id: string): JourneyRecord | undefined }>)[field];
    return {
      selectedId: (typeof owner.get(field) === 'string' ? (owner.get(field) as string) : null) || null,
      // `field as never` collapsed the conditional SetArgs<E, never> to never and
      // no argument was assignable any more (tsc, live 23.09.2026); widen `set`
      // itself instead — the label stays a required third argument.
      onSelect: (id: string) => {
        (owner.set as (k: string, v: unknown, l?: string) => void)(field, id, search?.labelOf(id));
        const rec = search?.recordOf?.(id);
        if (rec) prefillFrom(field, rec);
      },
    };
  };
  /** Props for a multi-record pick step: {...flow.picks.x.select} {...flow.pickMany('x')} */
  const pickMany = (field: EinkaufPlanenFieldKey) => {
    const owner = allForms.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)))    // the list's step: a filled editor is taken as one more entry; at least one entry is needed
    && (steps['zutat'] !== n || (hasValues(einkaufspositionen) ? lists.einkaufspositionen.add() : einkaufspositionenEntries.length > 0 || einkaufspositionen.validate()));
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); einkaufspositionen.reset(); setEinkaufspositionenEntries([]); };

  return {
    slug: 'einkauf-planen' as const,
    draftKey: 'einkauf-planen' as const,    entity: 'einkaufslisten' as const,
    form: einkaufslisten,
    forms, formList, picks, submit, steps, lists,    reviewStep: EINKAUFPLANEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type EinkaufPlanenFlow = ReturnType<typeof useEinkaufPlanenFlow>;
