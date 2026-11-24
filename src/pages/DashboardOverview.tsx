import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import {
  IconToolsKitchen2, IconChefHat, IconShoppingCart, IconPlus, IconSquare, IconSquareCheck,
  IconThumbUp, IconThumbDown, IconClock,
} from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { DashboardGrid } from '@/components/DashboardGrid';
import { WorkList } from '@/components/WorkList';
import { Button } from '@/components/ui/button';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import { formatDate, lookupKey } from '@/lib/formatters';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { countOf } from '@/config/plan';
import { tx, appLabel } from '@/i18n';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    gerichte, zutatenJeGericht, kochprotokoll, einkaufslisten, einkaufspositionen, zutatenMap,
    setEinkaufspositionen, fetchAll,
  } = data;
  const [maxTime, setMaxTime] = useState('');
  const [minProtein, setMinProtein] = useState('');
  const [ingredient, setIngredient] = useState('');
  const [noCookOnly, setNoCookOnly] = useState(false);
  const clock = useClock();
  const today = format(clock, 'yyyy-MM-dd');
  const crud = useEntityCrud(data, {
    footer: (top) => top.type === 'gerichte'
      ? { label: tx('Gekocht festhalten'), onClick: () => { window.location.hash = '/intents/gekocht'; } }
      : undefined,
  });
  const enrichedKochprotokoll = crud.enriched.kochprotokoll;
  const enrichedEinkaufspositionen = crud.enriched.einkaufspositionen;

  const relDays = (n: number) => {
    if (n <= 0) return tx('heute');
    if (n === 1) return tx('gestern');
    if (n < 14) return tx`vor ${n} Tagen`;
    const w = Math.floor(n / 7);
    return tx`vor ${w} Wochen`;
  };

  // Kochprotokoll newest first
  const recent = useMemo(() => [...enrichedKochprotokoll]
    .sort((a, b) => (b.fields.datum ?? '').localeCompare(a.fields.datum ?? '') || b.createdat.localeCompare(a.createdat)),
  [enrichedKochprotokoll]);

  // Gerichte ohne Kocheintrag zählen als lange nicht gegessen
  const stale = useMemo(() => {
    const last = new Map<string, string>();
    for (const k of kochprotokoll) {
      const id = extractRecordId(k.fields.gericht);
      const d = k.fields.datum?.slice(0, 10);
      if (!id || !d) continue;
      if (!last.has(id) || d > (last.get(id) as string)) last.set(id, d);
    }
    return gerichte
      .map(g => {
        const d = last.get(g.record_id);
        const days = d ? differenceInCalendarDays(clock, parseISO(d)) : null;
        return { g, date: d ?? null, days };
      })
      .filter(x => x.days === null || x.days >= 14)
      .sort((a, b) => (a.days === null ? 1 : 0) === (b.days === null ? 1 : 0)
        ? (b.days ?? 0) - (a.days ?? 0)
        : a.days === null ? -1 : 1);
  }, [gerichte, kochprotokoll, clock]);

  const openLists = useMemo(() => einkaufslisten
    .filter(l => lookupKey(l.fields.status) !== 'erledigt')
    .sort((a, b) => (b.fields.erstellt_am ?? '').localeCompare(a.fields.erstellt_am ?? '')),
  [einkaufslisten]);

  const toggleItem = (id: string) => {
    const pos = enrichedEinkaufspositionen.find(p => p.record_id === id);
    if (!pos) return;
    const before = !!pos.fields.abgehakt;
    const apply = (value: boolean) => setEinkaufspositionen(prev =>
      prev.map(p => p.record_id === id ? { ...p, fields: { ...p.fields, abgehakt: value } } : p));
    apply(!before);
    LivingAppsService.updateEinkaufspositionenEntry(id, { abgehakt: !before }).catch(() => fetchAll());
    const name = pos.zutatName;
    undoToast(
      before ? tx`${name} — wieder offen` : tx`${name} — abgehakt`,
      () => {
        apply(before);
        LivingAppsService.updateEinkaufspositionenEntry(id, { abgehakt: before }).catch(() => fetchAll());
      },
    );
  };

  const lastCooked = recent[0];
  const staleNames = stale.map(s => s.g.fields.name ?? '').filter(Boolean);
  let context: string;
  if (gerichte.length === 0) {
    context = tx('Richte deinen Essensplaner ein — lege dein erstes Gericht an.');
  } else if (lastCooked && lastCooked.gerichtName) {
    const name = lastCooked.gerichtName;
    const rel = relDays(differenceInCalendarDays(clock, parseISO((lastCooked.fields.datum ?? today).slice(0, 10))));
    context = staleNames.length > 0
      ? tx`Zuletzt gab es ${name} (${rel}). Mal wieder dran: ${namen(staleNames, 2)}.`
      : tx`Zuletzt gab es ${name} (${rel}).`;
  } else {
    const names = namen(gerichte.map(g => g.fields.name ?? '').filter(Boolean), 3);
    context = tx`Noch nichts gekocht — wie wäre es mit ${names}?`;
  }

  const ingredientsOf = useMemo(() => {
    const m = new Map<string, { name: string; menge?: number; einheit?: string }[]>();
    for (const z of zutatenJeGericht) {
      const gid = extractRecordId(z.fields.gericht);
      const zid = extractRecordId(z.fields.zutat);
      if (!gid || !zid) continue;
      const zt = zutatenMap.get(zid);
      const arr = m.get(gid) ?? [];
      arr.push({ name: zt?.fields.name ?? '', menge: z.fields.menge_pro_portion, einheit: zt?.fields.einheit?.label });
      m.set(gid, arr);
    }
    return m;
  }, [zutatenJeGericht, zutatenMap]);

  // Je Gericht: neueste Notiz und neueste Zeit (fehlt sie im neuesten Eintrag, die letzte vorhandene; recent ist neueste zuerst)
  const lastEntryOf = useMemo(() => {
    const m = new Map<string, { notiz?: string; dauer?: number }>();
    for (const k of recent) {
      const id = extractRecordId(k.fields.gericht);
      if (!id) continue;
      const cur = m.get(id) ?? {};
      const notiz = cur.notiz || k.fields.notiz?.trim() || undefined;
      const dauer = cur.dauer ?? k.fields.tatsaechliche_dauer ?? undefined;
      m.set(id, { notiz, dauer });
    }
    return m;
  }, [recent]);

  const matches = useMemo(() => {
    const maxMin = parseFloat(maxTime.replace(',', '.'));
    const minProt = parseFloat(minProtein.replace(',', '.'));
    const q = ingredient.trim().toLowerCase();
    return gerichte
      .filter(g => {
        if (noCookOnly && g.fields.kochen_noetig !== false) return false;
        if (!isNaN(maxMin) && (g.fields.zubereitungszeit == null || g.fields.zubereitungszeit > maxMin)) return false;
        if (!isNaN(minProt) && (g.fields.eiweiss == null || g.fields.eiweiss < minProt)) return false;
        if (q && !(ingredientsOf.get(g.record_id) ?? []).some(i => i.name.toLowerCase().includes(q))) return false;
        return true;
      })
      .sort((a, b) => (a.fields.zubereitungszeit ?? 9999) - (b.fields.zubereitungszeit ?? 9999));
  }, [gerichte, ingredientsOf, maxTime, minProtein, ingredient, noCookOnly]);
  const filtering = maxTime !== '' || minProtein !== '' || ingredient !== '' || noCookOnly;

  const tiles = [
    { href: '#/intents/gekocht', icon: <IconChefHat size={28} />, title: tx('Gekocht'), sub: tx('Mit wenigen Tipps festhalten'), cls: 'bg-card text-foreground border' },
    { href: '#/intents/einkauf-planen', icon: <IconShoppingCart size={28} />, title: tx('Einkauf planen'), sub: tx('Liste aus mehreren Gerichten'), cls: 'bg-card text-foreground border' },
  ];

  const itemsOf = (listId: string) => enrichedEinkaufspositionen
    .filter(p => extractRecordId(p.fields.einkaufsliste) === listId)
    .sort((a, b) => Number(!!a.fields.abgehakt) - Number(!!b.fields.abgehakt));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground mt-1">{context}</p>
        </div>
        {crud.gerichte.canWrite && (
          <Button variant="outline" onClick={() => crud.gerichte.openCreate({ kochen_noetig: true })}>
            <IconPlus size={16} className="shrink-0" />
            <span>{tx('Neues Gericht')}</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tiles.map(t => (
          <a
            key={t.href}
            href={t.href}
            className={`flex items-center gap-4 rounded-2xl p-5 min-h-[88px] shadow-sm active:scale-[0.99] transition ${t.cls}`}
          >
            <span className="shrink-0">{t.icon}</span>
            <span className="min-w-0">
              <span className="block text-lg font-semibold leading-tight">{t.title}</span>
              <span className="block text-sm opacity-80">{t.sub}</span>
            </span>
          </a>
        ))}
      </div>

      <section className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <IconToolsKitchen2 size={20} className="shrink-0 text-primary" />
          <h2 className="text-base font-semibold">{tx('Was esse ich jetzt?')}</h2>
        </div>
        <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="space-y-1 min-w-0">
            <span className="text-xs text-muted-foreground">{tx('Zeit (Minuten, maximal)')}</span>
            <Input inputMode="numeric" value={maxTime} onChange={e => setMaxTime(e.target.value)} placeholder="30" />
          </label>
          <label className="space-y-1 min-w-0">
            <span className="text-xs text-muted-foreground">{tx('Eiweiß-Ziel (mindestens)')}</span>
            <Input inputMode="numeric" value={minProtein} onChange={e => setMinProtein(e.target.value)} placeholder="30" />
          </label>
          <label className="space-y-1 min-w-0">
            <span className="text-xs text-muted-foreground">{tx('Zutat')}</span>
            <Input value={ingredient} onChange={e => setIngredient(e.target.value)} placeholder={tx('z. B. Reis')} />
          </label>
        </div>
        <label className="mx-4 mb-3 flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 min-h-[48px] cursor-pointer">
          <span className="text-sm font-medium">{tx('Nur Gerichte ohne Kochen')}</span>
          <Switch checked={noCookOnly} onCheckedChange={setNoCookOnly} />
        </label>
        <div className="px-4 pb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{countOf('gerichte', matches.length, appLabel('gerichte'))}</span>
          {filtering && (
            <button type="button" className="font-medium text-primary min-h-[44px] px-2" onClick={() => { setMaxTime(''); setMinProtein(''); setIngredient(''); setNoCookOnly(false); }}>
              {tx('Filter zurücksetzen')}
            </button>
          )}
        </div>
        {matches.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">{tx('Kein Gericht passt — lockere einen Filter.')}</p>
        ) : (
          <div className="divide-y border-t max-h-[420px] overflow-y-auto">
            {matches.map(g => {
              const ings = ingredientsOf.get(g.record_id) ?? [];
              const last = lastEntryOf.get(g.record_id);
              return (
                <button
                  key={g.record_id}
                  type="button"
                  onClick={() => crud.gerichte.openDetail(g)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/40 min-h-[56px]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{g.fields.name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                      {g.fields.zubereitungszeit != null && <span>{g.fields.zubereitungszeit} {tx('Min.')}</span>}
                      {g.fields.eiweiss != null && <span>{g.fields.eiweiss} {tx('g Eiweiß')}</span>}
                    </div>
                    {ings.length > 0 && (
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {ings.map(i => `${i.name}${i.menge != null ? ` ${i.menge}${i.einheit ? ' ' + i.einheit : ''}` : ''}`).join(' · ')}
                      </div>
                    )}
                    {last && (last.dauer != null || last.notiz) && (
                      <div className="mt-1 space-y-0.5 text-xs">
                        {last.dauer != null && (
                          <div className="inline-flex items-center gap-1 text-foreground">
                            <IconClock size={12} className="shrink-0" />
                            <span>{tx('Letztes Mal')}: {last.dauer} {tx('Min.')}</span>
                          </div>
                        )}
                        {last.notiz && <div className="text-muted-foreground line-clamp-2 break-words">„{last.notiz}“</div>}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <DashboardGrid
        variant="split"
        aside={
          <>
            <WorkList
              title={tx('Lange nicht gekocht')}
              max={5}
              items={stale.map(({ g, days }) => ({
                id: g.record_id,
                title: g.fields.name ?? '—',
                secondLine: days === null
                  ? <span className="font-medium text-amber-600">{tx('Noch nie gekocht')}</span>
                  : <><span className="font-medium text-amber-600">{relDays(days)}</span>
                    {g.fields.zubereitungszeit != null && <span className="text-muted-foreground"> · {g.fields.zubereitungszeit} {tx('Min.')}</span>}</>,
                action: crud.kochprotokoll.canWrite
                  ? { label: tx('Gekocht'), onClick: () => crud.kochprotokoll.openCreate({ gericht: g.record_id, datum: today }) }
                  : undefined,
              }))}
              onItemClick={id => { const g = gerichte.find(x => x.record_id === id); if (g) crud.gerichte.openDetail(g); }}
              empty={{
                text: gerichte.length === 0 ? tx('Noch keine Gerichte angelegt.') : tx('Alle Gerichte waren zuletzt dran.'),
                action: gerichte.length === 0 && crud.gerichte.canWrite
                  ? { label: tx('Erstes Gericht anlegen'), onClick: () => crud.gerichte.openCreate({ kochen_noetig: true }) }
                  : undefined,
              }}
            />

            <section className="rounded-2xl border bg-card overflow-hidden">
              <h2 className="px-4 pt-4 pb-2 text-sm font-semibold">{tx('Offene Einkaufslisten')}</h2>
              {openLists.length === 0 ? (
                <div className="px-4 pb-4 text-sm text-muted-foreground">
                  {tx('Keine offene Liste.')}{' '}
                  <a href="#/intents/einkauf-planen" className="font-medium text-primary hover:underline">{tx('Einkauf planen')}</a>
                </div>
              ) : (
                <div className="divide-y">
                  {openLists.map(l => {
                    const items = itemsOf(l.record_id);
                    const open = items.filter(i => !i.fields.abgehakt);
                    const shown = open.slice(0, 6);
                    return (
                      <div key={l.record_id} className="px-4 py-3 space-y-2">
                        <button type="button" className="w-full text-left min-w-0" onClick={() => crud.einkaufslisten.openDetail(l)}>
                          <span className="block font-medium truncate">{l.fields.titel ?? appLabel('einkaufslisten')}</span>
                          <span className="block text-xs text-muted-foreground">
                            {tx`${items.length - open.length} von ${items.length} abgehakt`}
                            {l.fields.erstellt_am ? ` · ${formatDate(l.fields.erstellt_am)}` : ''}
                          </span>
                        </button>
                        {shown.map(i => {
                          const zid = extractRecordId(i.fields.zutat);
                          const unit = zid ? zutatenMap.get(zid)?.fields.einheit?.label : undefined;
                          return (
                            <button
                              key={i.record_id}
                              type="button"
                              onClick={() => toggleItem(i.record_id)}
                              className="flex w-full items-center gap-3 rounded-xl bg-muted/40 px-3 min-h-[44px] text-left"
                            >
                              {i.fields.abgehakt
                                ? <IconSquareCheck size={22} className="shrink-0 text-emerald-600" />
                                : <IconSquare size={22} className="shrink-0 text-muted-foreground" />}
                              <span className="min-w-0 flex-1 truncate">{i.zutatName}</span>
                              <span className="shrink-0 text-sm text-muted-foreground">{i.fields.menge ?? ''} {unit ?? ''}</span>
                            </button>
                          );
                        })}
                        {open.length > shown.length && (
                          <button type="button" className="text-xs font-medium text-primary" onClick={() => crud.einkaufslisten.openDetail(l)}>
                            {tx`+${open.length - shown.length} weitere`}
                          </button>
                        )}
                        {open.length === 0 && items.length > 0 && (
                          <p className="text-sm text-emerald-700">{tx('Alles abgehakt — Liste kann erledigt werden.')}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        }
        primary={
          <section className="rounded-2xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
              <h2 className="text-sm font-semibold">{tx('Zuletzt gekocht')}</h2>
              <span className="text-xs text-muted-foreground">{countOf('kochprotokoll', recent.length, appLabel('kochprotokoll'))}</span>
            </div>
            {recent.length === 0 ? (
              <div className="px-4 pb-5 text-sm text-muted-foreground space-y-2">
                <p>{tx('Noch kein Kocheintrag — halte dein erstes gekochtes Gericht fest.')}</p>
                <a href="#/intents/gekocht" className="inline-block font-medium text-primary hover:underline">{tx('Gekocht')}</a>
              </div>
            ) : (
              <div className="divide-y">
                {recent.slice(0, 8).map(k => (
                  <button
                    key={k.record_id}
                    type="button"
                    onClick={() => crud.kochprotokoll.openDetail(k)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/40 min-h-[56px]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{k.gerichtName || '—'}</div>
                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2">
                        <span>{formatDate(k.fields.datum)}</span>
                        {k.fields.tatsaechliche_dauer != null && (
                          <span className="inline-flex items-center gap-1"><IconClock size={12} className="shrink-0" />{k.fields.tatsaechliche_dauer} {tx('Min.')}</span>
                        )}
                      </div>
                      {k.fields.notiz && <div className="text-sm text-muted-foreground line-clamp-2 mt-1">{k.fields.notiz}</div>}
                    </div>
                    {k.fields.wieder_machen === true && <IconThumbUp size={20} className="shrink-0 text-emerald-600" />}
                    {k.fields.wieder_machen === false && <IconThumbDown size={20} className="shrink-0 text-amber-600" />}
                  </button>
                ))}
              </div>
            )}
          </section>
        }
      />
      {crud.surfaces}
    </div>
  );
}
