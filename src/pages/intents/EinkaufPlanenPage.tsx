/**
 * Einkauf planen — 4-Schritt-Wizard.
 * Steps: 1) Titel der Liste → 2) Gerichte wählen, je Gericht Portionen → 3) Zutaten summiert, nach Abteilung sortiert → 4) Prüfen & speichern.
 * Reads: gerichte, zutaten_je_gericht, zutaten (über flow.port). Writes: einkaufslisten, einkaufspositionen (über useEinkaufPlanenFlow).
 * Composes: IntentWizardShell, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { ListEntries } from '@/components/blocks/ListEntries';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldNumber, fieldRef, fieldLookup, optionsOf, type JourneyRecord } from '@/lib/journey';
import { useEinkaufPlanenFlow } from '@/lib/journey/flows/EinkaufPlanen';
import { tx } from '@/i18n';

interface Line {
  zutatId: string;
  name: string;
  unit: string;
  abteilung: string;
  menge: number;
}

function fmt(n: number): string {
  return String(Math.round(n * 100) / 100);
}

export default function EinkaufPlanenPage() {
  const [step, setStep] = useState(1);
  const [gerichte, setGerichte] = useState<JourneyRecord[]>([]);
  const [rezepte, setRezepte] = useState<JourneyRecord[]>([]);
  const [zutaten, setZutaten] = useState<JourneyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [query, setQuery] = useState('');
  const [portionen, setPortionen] = useState<Record<string, number>>({});
  const [lines, setLines] = useState<Line[]>([]);
  const [pending, setPending] = useState<Line[]>([]);
  const linesRef = useRef<Line[]>([]);
  const cursorRef = useRef(0);

  const flow = useEinkaufPlanenFlow({
    steps: { titel: 1, zutat: 3 },
    compute: {
      // one call per list entry, in the order the entries were added (= order of `lines`)
      menge: () => {
        const line = linesRef.current[cursorRef.current];
        cursorRef.current += 1;
        // entries beyond the computed lines are ingredients added by hand: one unit
        return line ? line.menge : 1;
      },
    },
  });

  useEffect(() => {
    let on = true;
    Promise.all([
      flow.port.list('gerichte', { limit: 500 }),
      flow.port.list('zutaten_je_gericht', { limit: 2000 }),
      flow.port.list('zutaten', { limit: 1000 }),
    ])
      .then(([g, r, z]) => {
        if (!on) return;
        setGerichte(g);
        setRezepte(r);
        setZutaten(z);
        setLoading(false);
      })
      .catch(e => {
        if (!on) return;
        setLoadError(e instanceof Error ? e : new Error(String(e)));
        setLoading(false);
      });
    return () => { on = false; };
  }, [flow.port]);

  // Fills the list entries one by one: set the editor's Zutat, add it, next.
  const editor = flow.forms.einkaufspositionen;
  const editorZutat = editor.get('zutat');
  useEffect(() => {
    if (pending.length === 0) return;
    const head = pending[0];
    if (editorZutat !== head.zutatId) {
      (editor.set as (k: string, v: unknown, l?: string) => void)('zutat', head.zutatId, head.name);
      return;
    }
    if (flow.lists.einkaufspositionen.add()) setPending(p => p.slice(1));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- driven by the queue and the editor value
  }, [pending, editorZutat]);

  const zutatById = useMemo(() => new Map(zutaten.map(z => [z.id, z])), [zutaten]);
  const gewaehlt = gerichte.filter(g => (portionen[g.id] ?? 0) > 0);
  const gesamtPortionen = gewaehlt.reduce((s, g) => s + (portionen[g.id] ?? 0), 0);

  const shown = gerichte.filter(g => fieldText(g, 'name').toLowerCase().includes(query.trim().toLowerCase()));

  const setPortion = (id: string, n: number) =>
    setPortionen(p => ({ ...p, [id]: Math.max(0, Math.min(99, n)) }));

  const buildLines = (): Line[] => {
    const sums = new Map<string, number>();
    for (const r of rezepte) {
      const gid = fieldRef(r, 'gericht');
      const zid = fieldRef(r, 'zutat');
      const p = gid ? portionen[gid] ?? 0 : 0;
      if (!gid || !zid || p <= 0) continue;
      sums.set(zid, (sums.get(zid) ?? 0) + (fieldNumber(r, 'menge_pro_portion') ?? 0) * p);
    }
    const order = optionsOf('zutaten', 'abteilung').map(o => o.key);
    const out: Line[] = [];
    for (const [zid, menge] of sums) {
      const z = zutatById.get(zid);
      out.push({
        zutatId: zid,
        name: z ? fieldText(z, 'name') : zid,
        unit: z ? fieldLookup(z, 'einheit')?.label ?? '' : '',
        abteilung: z ? fieldLookup(z, 'abteilung')?.key ?? 'sonstiges' : 'sonstiges',
        menge,
      });
    }
    const rank = (k: string) => { const i = order.indexOf(k); return i < 0 ? order.length : i; };
    return out.sort((a, b) => rank(a.abteilung) - rank(b.abteilung) || a.name.localeCompare(b.name));
  };

  const applyGerichte = (): boolean | string => {
    if (gewaehlt.length === 0) return true;
    const next = buildLines();
    if (next.length === 0) return tx('Für diese Gerichte sind keine Zutaten hinterlegt.');
    flow.lists.einkaufspositionen.entries.forEach(e => flow.lists.einkaufspositionen.remove(e.id));
    editor.reset();
    linesRef.current = next;
    cursorRef.current = 0;
    setLines(next);
    setPending(next);
    return true;
  };

  const abteilungLabel = (key: string) =>
    optionsOf('zutaten', 'abteilung').find(o => o.key === key)?.label ?? key;
  const groups = optionsOf('zutaten', 'abteilung')
    .map(o => ({ key: o.key, label: o.label, items: lines.filter(l => l.abteilung === o.key) }))
    .filter(g => g.items.length > 0);

  return (
    <IntentWizardShell
      title={tx('Einkauf planen')}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={loadError}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Aus Gerichten und Portionen entsteht deine Einkaufsliste.'),
        needs: [tx('Titel der Liste'), tx('Gerichte mit Portionen')],
      }}
    >
      <WizardStep label={tx('Titel')} description={tx('Wie soll die Einkaufsliste heißen?')}>
        <div className="space-y-4">
          <Bound form={flow.forms.einkaufslisten} name="titel" />
          <StepNav onNext={() => flow.validateStep(1)} nextStepLabel={tx('Gerichte')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Gerichte')} description={tx('Wähle die Gerichte und gib je Gericht die Portionen an.')}>
        <div className="space-y-4">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={tx('Gericht suchen …')}
            aria-label={tx('Gericht suchen')}
          />
          {shown.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tx('Kein Gericht gefunden.')}</p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {shown.map(g => {
                const n = portionen[g.id] ?? 0;
                return (
                  <li
                    key={g.id}
                    className={`flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl border p-4 ${n > 0 ? 'border-primary bg-primary/5' : 'bg-card'}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{fieldText(g, 'name')}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {tx`${fieldNumber(g, 'zubereitungszeit') ?? '?'} Min. · ${fieldNumber(g, 'eiweiss') ?? '?'} g Eiweiß`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button type="button" variant="outline" size="icon" aria-label={tx('Eine Portion weniger')} disabled={n === 0} onClick={() => setPortion(g.id, n - 1)}>
                        <IconMinus size={16} />
                      </Button>
                      <span className="w-6 text-center tabular-nums" aria-live="polite">{n}</span>
                      <Button type="button" variant="outline" size="icon" aria-label={tx('Eine Portion mehr')} onClick={() => setPortion(g.id, n + 1)}>
                        <IconPlus size={16} />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-sm text-muted-foreground">
            {gewaehlt.length > 0
              ? tx`${gewaehlt.length} Gerichte, zusammen ${gesamtPortionen} Portionen`
              : tx('Noch kein Gericht gewählt.')}
          </p>
          <StepNav onBack={() => setStep(1)} onNext={applyGerichte} nextStepLabel={tx('Zutaten')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Zutaten')} description={tx('Gleiche Zutaten sind zusammengezählt und nach Abteilung sortiert.')}>
        {(
          <div className="space-y-4">
            {groups.map(g => (
              <section key={g.key} className="overflow-hidden rounded-2xl border bg-card">
                <h3 className="bg-secondary px-4 py-2 text-sm font-semibold">{g.label}</h3>
                <ul className="divide-y">
                  {g.items.map(l => (
                    <li key={l.zutatId} className="flex min-w-0 items-baseline justify-between gap-3 px-4 py-2">
                      <span className="min-w-0 truncate">{l.name}</span>
                      <span className="shrink-0 tabular-nums text-sm text-muted-foreground">{fmt(l.menge)} {l.unit}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <ListEntries list={flow.lists.einkaufspositionen} addLabel={tx('Zutat ergänzen')}>
              <EntitySelectStep {...flow.picks.zutat.select} {...flow.pick('zutat')} searchPlaceholder={tx('Zutat suchen …')} />
            </ListEntries>
            <StepNav
              onBack={() => setStep(2)}
              onNext={() => flow.validateStep(3)}
              nextDisabled={pending.length > 0}
              nextStepLabel={tx('Prüfen')}
            />
          </div>
        )}
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              { key: 'einkaufsliste', label: tx('Einkaufsliste'), value: String(flow.forms.einkaufslisten.get('titel') ?? '') || '—' },
              { key: 'gerichte', label: tx('Gerichte'), value: gewaehlt.map(g => `${fieldText(g, 'name')} (${portionen[g.id]})`).join(', ') || '—' },
              { key: 'positionen', label: tx('Zutaten'), value: String(flow.lists.einkaufspositionen.count) },
              { key: 'abteilungen', label: tx('Abteilungen'), value: groups.map(g => abteilungLabel(g.key)).join(', ') || '—' },
            ]}
            whatHappensNext={tx('Die Liste wird als offen gespeichert, im Laden kannst du die Positionen abhaken.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Gekocht eintragen'), href: '#/intents/gekocht' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
