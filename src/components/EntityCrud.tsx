/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'zutaten'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.zutaten.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.zutaten.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.zutaten.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.zutaten              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled; list-field back-references additionally get a
 * "choose existing" picker that links an EXISTING record — built in, do not
 * re-roll). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   zutaten: name, einheit, abteilung  ·  ← zutaten_je_gericht (list + contextual +) · ← einkaufspositionen (list + contextual +)
 *   gerichte: name, zubereitungszeit, eiweiss, kochen_noetig, schritte, foto  ·  ← zutaten_je_gericht (list + contextual +) · ← kochprotokoll (list + contextual +)
 *   zutaten_je_gericht: gericht, zutat, menge_pro_portion  ·  → gerichte · → zutaten
 *   kochprotokoll: gericht, datum, tatsaechliche_dauer, notiz, wieder_machen  ·  → gerichte
 *   einkaufslisten: titel, erstellt_am, status  ·  ← einkaufspositionen (list + contextual +)
 *   einkaufspositionen: einkaufsliste, zutat, menge, abteilung, abgehakt  ·  → einkaufslisten · → zutaten
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Zutaten, Gerichte, ZutatenJeGericht, Kochprotokoll, Einkaufslisten, Einkaufspositionen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichZutatenJeGericht, enrichKochprotokoll, enrichEinkaufspositionen } from '@/lib/enrich';
import type { EnrichedZutatenJeGericht, EnrichedKochprotokoll, EnrichedEinkaufspositionen } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { ZutatenDialog, type ZutatenDialogDefaults } from '@/components/dialogs/ZutatenDialog';
import { ZutatenDetails } from '@/components/details/ZutatenDetails';
import { GerichteDialog, type GerichteDialogDefaults } from '@/components/dialogs/GerichteDialog';
import { GerichteDetails } from '@/components/details/GerichteDetails';
import { ZutatenJeGerichtDialog, type ZutatenJeGerichtDialogDefaults } from '@/components/dialogs/ZutatenJeGerichtDialog';
import { ZutatenJeGerichtDetails } from '@/components/details/ZutatenJeGerichtDetails';
import { KochprotokollDialog, type KochprotokollDialogDefaults } from '@/components/dialogs/KochprotokollDialog';
import { KochprotokollDetails } from '@/components/details/KochprotokollDetails';
import { EinkaufslistenDialog, type EinkaufslistenDialogDefaults } from '@/components/dialogs/EinkaufslistenDialog';
import { EinkaufslistenDetails } from '@/components/details/EinkaufslistenDetails';
import { EinkaufspositionenDialog, type EinkaufspositionenDialogDefaults } from '@/components/dialogs/EinkaufspositionenDialog';
import { EinkaufspositionenDetails } from '@/components/details/EinkaufspositionenDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { usePermissions } from '@/lib/permissions';
import { toast } from 'sonner';
import { syncDoorsAfterWrite } from '@/lib/publicDoors';
import { displayNameOf, displayPart } from '@/lib/journey/rules';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'zutaten'; record: Zutaten }
  | { type: 'gerichte'; record: Gerichte }
  | { type: 'zutatenJeGericht'; record: EnrichedZutatenJeGericht }
  | { type: 'kochprotokoll'; record: EnrichedKochprotokoll }
  | { type: 'einkaufslisten'; record: Einkaufslisten }
  | { type: 'einkaufspositionen'; record: EnrichedEinkaufspositionen };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  /** The action may return a sentence — the reason the step was NOT taken; the overlay shows it under the button. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void | string | Promise<void | string> } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
  /** May the signed-in user create/change records of this list? (the
   *  platform's rights — show a „+ Neu“ only when true; openCreate/openEdit
   *  refuse with a notice otherwise). */
  canWrite: boolean;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  zutaten: EntityCrudApi<Zutaten, ZutatenDialogDefaults>;
  gerichte: EntityCrudApi<Gerichte, GerichteDialogDefaults>;
  zutatenJeGericht: EntityCrudApi<ZutatenJeGericht, ZutatenJeGerichtDialogDefaults>;
  kochprotokoll: EntityCrudApi<Kochprotokoll, KochprotokollDialogDefaults>;
  einkaufslisten: EntityCrudApi<Einkaufslisten, EinkaufslistenDialogDefaults>;
  einkaufspositionen: EntityCrudApi<Einkaufspositionen, EinkaufspositionenDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { zutaten: Zutaten[]; gerichte: Gerichte[]; zutatenJeGericht: EnrichedZutatenJeGericht[]; kochprotokoll: EnrichedKochprotokoll[]; einkaufslisten: Einkaufslisten[]; einkaufspositionen: EnrichedEinkaufspositionen[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  // the platform's rights of the signed-in user (lib/permissions.ts) — unknown = allowed
  const perms = usePermissions();
  const refuse = () => { toast.error(t('perm_denied_title'), { description: t('perm_denied_desc') }); };
  const [zutatenDialog, setZutatenDialog] = useState<{ defaults?: ZutatenDialogDefaults; editing?: Zutaten } | null>(null);
  const [gerichteDialog, setGerichteDialog] = useState<{ defaults?: GerichteDialogDefaults; editing?: Gerichte } | null>(null);
  const [zutatenJeGerichtDialog, setZutatenJeGerichtDialog] = useState<{ defaults?: ZutatenJeGerichtDialogDefaults; editing?: ZutatenJeGericht } | null>(null);
  const [kochprotokollDialog, setKochprotokollDialog] = useState<{ defaults?: KochprotokollDialogDefaults; editing?: Kochprotokoll } | null>(null);
  const [einkaufslistenDialog, setEinkaufslistenDialog] = useState<{ defaults?: EinkaufslistenDialogDefaults; editing?: Einkaufslisten } | null>(null);
  const [einkaufspositionenDialog, setEinkaufspositionenDialog] = useState<{ defaults?: EinkaufspositionenDialogDefaults; editing?: Einkaufspositionen } | null>(null);
  const enrichedZutatenJeGericht = useMemo(() => enrichZutatenJeGericht(data.zutatenJeGericht, { gerichteMap: data.gerichteMap, zutatenMap: data.zutatenMap }), [data.zutatenJeGericht, data.gerichteMap, data.zutatenMap]);
  const enrichedKochprotokoll = useMemo(() => enrichKochprotokoll(data.kochprotokoll, { gerichteMap: data.gerichteMap }), [data.kochprotokoll, data.gerichteMap]);
  const enrichedEinkaufspositionen = useMemo(() => enrichEinkaufspositionen(data.einkaufspositionen, { einkaufslistenMap: data.einkaufslistenMap, zutatenMap: data.zutatenMap }), [data.einkaufspositionen, data.einkaufslistenMap, data.zutatenMap]);

  function detailZutaten(record: Zutaten, push = false) {
    const item: OverlayItem = { type: 'zutaten', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitZutaten(fields: Zutaten['fields']) {
    const editing = zutatenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setZutaten(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateZutatenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('zutaten')} — ${t('crud_updated')}`, async () => {
        data.setZutaten(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateZutatenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
      void syncDoorsAfterWrite('zutaten', editing.record_id, fields as Record<string, unknown>);
    } else {
      const made = await LivingAppsService.createZutatenEntry(fields);
      undoToast(`${appLabel('zutaten')} — ${t('crud_created')}`);
      // EF-51: a new parent record gets its pair of doors right away (the record's own link)
      const madeId = (made as { id?: string; record_id?: string } | undefined)?.id ?? (made as { record_id?: string } | undefined)?.record_id;
      if (madeId) void syncDoorsAfterWrite('zutaten', madeId, fields as Record<string, unknown>).then(r => { if (!r.ok) toast.error(r.message ? `${t('door_failed')}: ${r.message}` : t('door_failed_later')); });
      data.fetchAll();
    }
  }

  function detailGerichte(record: Gerichte, push = false) {
    const item: OverlayItem = { type: 'gerichte', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitGerichte(fields: Gerichte['fields']) {
    const editing = gerichteDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setGerichte(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateGerichteEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('gerichte')} — ${t('crud_updated')}`, async () => {
        data.setGerichte(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateGerichteEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
      void syncDoorsAfterWrite('gerichte', editing.record_id, fields as Record<string, unknown>);
    } else {
      const made = await LivingAppsService.createGerichteEntry(fields);
      undoToast(`${appLabel('gerichte')} — ${t('crud_created')}`);
      // EF-51: a new parent record gets its pair of doors right away (the record's own link)
      const madeId = (made as { id?: string; record_id?: string } | undefined)?.id ?? (made as { record_id?: string } | undefined)?.record_id;
      if (madeId) void syncDoorsAfterWrite('gerichte', madeId, fields as Record<string, unknown>).then(r => { if (!r.ok) toast.error(r.message ? `${t('door_failed')}: ${r.message}` : t('door_failed_later')); });
      data.fetchAll();
    }
  }

  function detailZutatenJeGericht(record: ZutatenJeGericht, push = false) {
    const rec = enrichedZutatenJeGericht.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'zutatenJeGericht', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitZutatenJeGericht(fields: ZutatenJeGericht['fields']) {
    const editing = zutatenJeGerichtDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setZutatenJeGericht(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateZutatenJeGerichtEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('zutaten_je_gericht')} — ${t('crud_updated')}`, async () => {
        data.setZutatenJeGericht(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateZutatenJeGerichtEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
      void syncDoorsAfterWrite('zutaten_je_gericht', editing.record_id, fields as Record<string, unknown>);
    } else {
      const made = await LivingAppsService.createZutatenJeGerichtEntry(fields);
      undoToast(`${appLabel('zutaten_je_gericht')} — ${t('crud_created')}`);
      // EF-51: a new parent record gets its pair of doors right away (the record's own link)
      const madeId = (made as { id?: string; record_id?: string } | undefined)?.id ?? (made as { record_id?: string } | undefined)?.record_id;
      if (madeId) void syncDoorsAfterWrite('zutaten_je_gericht', madeId, fields as Record<string, unknown>).then(r => { if (!r.ok) toast.error(r.message ? `${t('door_failed')}: ${r.message}` : t('door_failed_later')); });
      data.fetchAll();
    }
  }

  function detailKochprotokoll(record: Kochprotokoll, push = false) {
    const rec = enrichedKochprotokoll.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'kochprotokoll', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitKochprotokoll(fields: Kochprotokoll['fields']) {
    const editing = kochprotokollDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setKochprotokoll(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateKochprotokollEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('kochprotokoll')} — ${t('crud_updated')}`, async () => {
        data.setKochprotokoll(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateKochprotokollEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
      void syncDoorsAfterWrite('kochprotokoll', editing.record_id, fields as Record<string, unknown>);
    } else {
      const made = await LivingAppsService.createKochprotokollEntry(fields);
      undoToast(`${appLabel('kochprotokoll')} — ${t('crud_created')}`);
      // EF-51: a new parent record gets its pair of doors right away (the record's own link)
      const madeId = (made as { id?: string; record_id?: string } | undefined)?.id ?? (made as { record_id?: string } | undefined)?.record_id;
      if (madeId) void syncDoorsAfterWrite('kochprotokoll', madeId, fields as Record<string, unknown>).then(r => { if (!r.ok) toast.error(r.message ? `${t('door_failed')}: ${r.message}` : t('door_failed_later')); });
      data.fetchAll();
    }
  }

  function detailEinkaufslisten(record: Einkaufslisten, push = false) {
    const item: OverlayItem = { type: 'einkaufslisten', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitEinkaufslisten(fields: Einkaufslisten['fields']) {
    const editing = einkaufslistenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setEinkaufslisten(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateEinkaufslistenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('einkaufslisten')} — ${t('crud_updated')}`, async () => {
        data.setEinkaufslisten(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateEinkaufslistenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
      void syncDoorsAfterWrite('einkaufslisten', editing.record_id, fields as Record<string, unknown>);
    } else {
      const made = await LivingAppsService.createEinkaufslistenEntry(fields);
      undoToast(`${appLabel('einkaufslisten')} — ${t('crud_created')}`);
      // EF-51: a new parent record gets its pair of doors right away (the record's own link)
      const madeId = (made as { id?: string; record_id?: string } | undefined)?.id ?? (made as { record_id?: string } | undefined)?.record_id;
      if (madeId) void syncDoorsAfterWrite('einkaufslisten', madeId, fields as Record<string, unknown>).then(r => { if (!r.ok) toast.error(r.message ? `${t('door_failed')}: ${r.message}` : t('door_failed_later')); });
      data.fetchAll();
    }
  }

  function detailEinkaufspositionen(record: Einkaufspositionen, push = false) {
    const rec = enrichedEinkaufspositionen.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'einkaufspositionen', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitEinkaufspositionen(fields: Einkaufspositionen['fields']) {
    const editing = einkaufspositionenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setEinkaufspositionen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateEinkaufspositionenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('einkaufspositionen')} — ${t('crud_updated')}`, async () => {
        data.setEinkaufspositionen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateEinkaufspositionenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
      void syncDoorsAfterWrite('einkaufspositionen', editing.record_id, fields as Record<string, unknown>);
    } else {
      const made = await LivingAppsService.createEinkaufspositionenEntry(fields);
      undoToast(`${appLabel('einkaufspositionen')} — ${t('crud_created')}`);
      // EF-51: a new parent record gets its pair of doors right away (the record's own link)
      const madeId = (made as { id?: string; record_id?: string } | undefined)?.id ?? (made as { record_id?: string } | undefined)?.record_id;
      if (madeId) void syncDoorsAfterWrite('einkaufspositionen', madeId, fields as Record<string, unknown>).then(r => { if (!r.ok) toast.error(r.message ? `${t('door_failed')}: ${r.message}` : t('door_failed_later')); });
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <ZutatenDialog
        open={zutatenDialog !== null}
        onClose={() => setZutatenDialog(null)}
        onSubmit={submitZutaten}
        defaultValues={zutatenDialog?.defaults}
        recordId={zutatenDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Zutaten']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Zutaten']}
      />
      <GerichteDialog
        open={gerichteDialog !== null}
        onClose={() => setGerichteDialog(null)}
        onSubmit={submitGerichte}
        defaultValues={gerichteDialog?.defaults}
        recordId={gerichteDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Gerichte']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Gerichte']}
      />
      <ZutatenJeGerichtDialog
        open={zutatenJeGerichtDialog !== null}
        onClose={() => setZutatenJeGerichtDialog(null)}
        onSubmit={submitZutatenJeGericht}
        defaultValues={zutatenJeGerichtDialog?.defaults}
        recordId={zutatenJeGerichtDialog?.editing?.record_id}
        gerichteList={data.gerichte}
        zutatenList={data.zutaten}
        enablePhotoScan={AI_PHOTO_SCAN['ZutatenJeGericht']}
        enablePhotoLocation={AI_PHOTO_LOCATION['ZutatenJeGericht']}
      />
      <KochprotokollDialog
        open={kochprotokollDialog !== null}
        onClose={() => setKochprotokollDialog(null)}
        onSubmit={submitKochprotokoll}
        defaultValues={kochprotokollDialog?.defaults}
        recordId={kochprotokollDialog?.editing?.record_id}
        gerichteList={data.gerichte}
        enablePhotoScan={AI_PHOTO_SCAN['Kochprotokoll']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kochprotokoll']}
      />
      <EinkaufslistenDialog
        open={einkaufslistenDialog !== null}
        onClose={() => setEinkaufslistenDialog(null)}
        onSubmit={submitEinkaufslisten}
        defaultValues={einkaufslistenDialog?.defaults}
        recordId={einkaufslistenDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Einkaufslisten']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Einkaufslisten']}
      />
      <EinkaufspositionenDialog
        open={einkaufspositionenDialog !== null}
        onClose={() => setEinkaufspositionenDialog(null)}
        onSubmit={submitEinkaufspositionen}
        defaultValues={einkaufspositionenDialog?.defaults}
        recordId={einkaufspositionenDialog?.editing?.record_id}
        einkaufslistenList={data.einkaufslisten}
        zutatenList={data.zutaten}
        enablePhotoScan={AI_PHOTO_SCAN['Einkaufspositionen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Einkaufspositionen']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'zutaten') {
            return (
              <>
                <RecordHeader title={displayNameOf('zutaten', top.record.fields as Record<string, unknown>) || appLabel('zutaten')} subtitle={undefined} />
                <ZutatenDetails
                  record={top.record}
                  zutatenJeGerichtList={data.zutatenJeGericht}
                  onOpenZutatenJeGericht={(r) => detailZutatenJeGericht(r, true)}
                  onAddZutatenJeGericht={perms.canWrite('zutaten_je_gericht') ? () => setZutatenJeGerichtDialog({ defaults: { zutat: createRecordUrl(APP_IDS.ZUTATEN, top.record.record_id) } }) : undefined}
                  einkaufspositionenList={data.einkaufspositionen}
                  onOpenEinkaufspositionen={(r) => detailEinkaufspositionen(r, true)}
                  onAddEinkaufspositionen={perms.canWrite('einkaufspositionen') ? () => setEinkaufspositionenDialog({ defaults: { zutat: createRecordUrl(APP_IDS.ZUTATEN, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'gerichte') {
            return (
              <>
                <RecordHeader title={displayNameOf('gerichte', top.record.fields as Record<string, unknown>) || appLabel('gerichte')} subtitle={undefined} />
                <GerichteDetails
                  record={top.record}
                  zutatenJeGerichtList={data.zutatenJeGericht}
                  onOpenZutatenJeGericht={(r) => detailZutatenJeGericht(r, true)}
                  onAddZutatenJeGericht={perms.canWrite('zutaten_je_gericht') ? () => setZutatenJeGerichtDialog({ defaults: { gericht: createRecordUrl(APP_IDS.GERICHTE, top.record.record_id) } }) : undefined}
                  kochprotokollList={data.kochprotokoll}
                  onOpenKochprotokoll={(r) => detailKochprotokoll(r, true)}
                  onAddKochprotokoll={perms.canWrite('kochprotokoll') ? () => setKochprotokollDialog({ defaults: { gericht: createRecordUrl(APP_IDS.GERICHTE, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'zutatenJeGericht') {
            return (
              <>
                <RecordHeader title={displayNameOf('zutaten_je_gericht', top.record.fields as Record<string, unknown>) || appLabel('zutaten_je_gericht')} subtitle={undefined} />
                <ZutatenJeGerichtDetails
                  record={top.record}
                  gerichteList={data.gerichte}
                  onOpenGerichte={(r) => detailGerichte(r, true)}
                  zutatenList={data.zutaten}
                  onOpenZutaten={(r) => detailZutaten(r, true)}
                />
              </>
            );
          }
          if (top.type === 'kochprotokoll') {
            return (
              <>
                <RecordHeader title={displayNameOf('kochprotokoll', top.record.fields as Record<string, unknown>) || appLabel('kochprotokoll')} subtitle={top.record.fields.datum ? formatDate(top.record.fields.datum) : undefined} />
                <KochprotokollDetails
                  record={top.record}
                  gerichteList={data.gerichte}
                  onOpenGerichte={(r) => detailGerichte(r, true)}
                />
              </>
            );
          }
          if (top.type === 'einkaufslisten') {
            return (
              <>
                <RecordHeader title={displayNameOf('einkaufslisten', top.record.fields as Record<string, unknown>) || appLabel('einkaufslisten')} subtitle={top.record.fields.erstellt_am ? formatDate(top.record.fields.erstellt_am) : undefined} />
                <EinkaufslistenDetails
                  record={top.record}
                  einkaufspositionenList={data.einkaufspositionen}
                  onOpenEinkaufspositionen={(r) => detailEinkaufspositionen(r, true)}
                  onAddEinkaufspositionen={perms.canWrite('einkaufspositionen') ? () => setEinkaufspositionenDialog({ defaults: { einkaufsliste: createRecordUrl(APP_IDS.EINKAUFSLISTEN, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'einkaufspositionen') {
            return (
              <>
                <RecordHeader title={displayNameOf('einkaufspositionen', top.record.fields as Record<string, unknown>) || appLabel('einkaufspositionen')} subtitle={undefined} />
                <EinkaufspositionenDetails
                  record={top.record}
                  einkaufslistenList={data.einkaufslisten}
                  onOpenEinkaufslisten={(r) => detailEinkaufslisten(r, true)}
                  zutatenList={data.zutaten}
                  onOpenZutaten={(r) => detailZutaten(r, true)}
                />
              </>
            );
          }
          return null;
        }}
        canEdit={(top) => {
          if (top.type === 'zutaten') return perms.canWrite('zutaten');
          if (top.type === 'gerichte') return perms.canWrite('gerichte');
          if (top.type === 'zutatenJeGericht') return perms.canWrite('zutaten_je_gericht');
          if (top.type === 'kochprotokoll') return perms.canWrite('kochprotokoll');
          if (top.type === 'einkaufslisten') return perms.canWrite('einkaufslisten');
          if (top.type === 'einkaufspositionen') return perms.canWrite('einkaufspositionen');
          return true;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'zutaten') setZutatenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'gerichte') setGerichteDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'zutatenJeGericht') setZutatenJeGerichtDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'kochprotokoll') setKochprotokollDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'einkaufslisten') setEinkaufslistenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'einkaufspositionen') setEinkaufspositionenDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    zutaten: {
      openCreate: (defaults?: ZutatenDialogDefaults) => (perms.canWrite('zutaten') ? setZutatenDialog({ defaults }) : refuse()),
      openEdit: (record: Zutaten) => (perms.canWrite('zutaten') ? setZutatenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Zutaten) => detailZutaten(record, false),
      canWrite: perms.canWrite('zutaten'),
    },
    gerichte: {
      openCreate: (defaults?: GerichteDialogDefaults) => (perms.canWrite('gerichte') ? setGerichteDialog({ defaults }) : refuse()),
      openEdit: (record: Gerichte) => (perms.canWrite('gerichte') ? setGerichteDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Gerichte) => detailGerichte(record, false),
      canWrite: perms.canWrite('gerichte'),
    },
    zutatenJeGericht: {
      openCreate: (defaults?: ZutatenJeGerichtDialogDefaults) => (perms.canWrite('zutaten_je_gericht') ? setZutatenJeGerichtDialog({ defaults }) : refuse()),
      openEdit: (record: ZutatenJeGericht) => (perms.canWrite('zutaten_je_gericht') ? setZutatenJeGerichtDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: ZutatenJeGericht) => detailZutatenJeGericht(record, false),
      canWrite: perms.canWrite('zutaten_je_gericht'),
    },
    kochprotokoll: {
      openCreate: (defaults?: KochprotokollDialogDefaults) => (perms.canWrite('kochprotokoll') ? setKochprotokollDialog({ defaults }) : refuse()),
      openEdit: (record: Kochprotokoll) => (perms.canWrite('kochprotokoll') ? setKochprotokollDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Kochprotokoll) => detailKochprotokoll(record, false),
      canWrite: perms.canWrite('kochprotokoll'),
    },
    einkaufslisten: {
      openCreate: (defaults?: EinkaufslistenDialogDefaults) => (perms.canWrite('einkaufslisten') ? setEinkaufslistenDialog({ defaults }) : refuse()),
      openEdit: (record: Einkaufslisten) => (perms.canWrite('einkaufslisten') ? setEinkaufslistenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Einkaufslisten) => detailEinkaufslisten(record, false),
      canWrite: perms.canWrite('einkaufslisten'),
    },
    einkaufspositionen: {
      openCreate: (defaults?: EinkaufspositionenDialogDefaults) => (perms.canWrite('einkaufspositionen') ? setEinkaufspositionenDialog({ defaults }) : refuse()),
      openEdit: (record: Einkaufspositionen) => (perms.canWrite('einkaufspositionen') ? setEinkaufspositionenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Einkaufspositionen) => detailEinkaufspositionen(record, false),
      canWrite: perms.canWrite('einkaufspositionen'),
    },
    enriched: { zutaten: data.zutaten, gerichte: data.gerichte, zutatenJeGericht: enrichedZutatenJeGericht, kochprotokoll: enrichedKochprotokoll, einkaufslisten: data.einkaufslisten, einkaufspositionen: enrichedEinkaufspositionen },
  };
}
