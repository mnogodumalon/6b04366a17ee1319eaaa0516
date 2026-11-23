/**
 * Gekocht — 5-Schritt-Wizard: festhalten, dass ein Gericht gekocht wurde (Datum = heute).
 * Steps: 1) Gericht wählen → 2) Tatsächliche Dauer → 3) Notiz fürs nächste Mal → 4) Wieder machen? → 5) Prüfen & speichern.
 * Reads: gerichte. Writes: kochprotokoll (via useGekochtFlow).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldNumber } from '@/lib/journey';
import { useGekochtFlow } from '@/lib/journey/flows/Gekocht';
import { tx } from '@/i18n';

export default function GekochtPage() {
  const [step, setStep] = useState(1);
  const flow = useGekochtFlow({
    steps: { gericht: 1, tatsaechliche_dauer: 2, notiz: 3, wieder_machen: 4 },
    items: {
      gericht: g => {
        const min = fieldNumber(g, 'zubereitungszeit');
        return {
          id: g.id,
          title: fieldText(g, 'name'),
          subtitle: min != null ? tx`${min} Min. geplant` : undefined,
        };
      },
    },
  });

  const today = format(new Date(), 'dd.MM.yyyy');

  return (
    <IntentWizardShell
      title={tx('Gekocht')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Halte mit wenigen Tipps fest, dass du ein Gericht gekocht hast.'),
        needs: [tx('Das gekochte Gericht')],
      }}
    >
      <WizardStep label={tx('Gericht')} description={tx('Welches Gericht hast du gekocht?')}>
        <EntitySelectStep
          {...flow.picks.gericht.select}
          {...flow.pick('gericht')}
          searchPlaceholder={tx('Gericht suchen …')}
          avatar="none"
        />
      </WizardStep>

      <WizardStep label={tx('Dauer')} description={tx('Wie lange hat es wirklich gedauert? Du kannst das auch überspringen.')} needs={['gericht']}>
        <Bound form={flow.forms.kochprotokoll} name="tatsaechliche_dauer" hint={tx('In Minuten, z. B. 35')} />
        <StepNav onBack={() => setStep(1)} onNext={() => flow.validateStep(2)} nextStepLabel={tx('Notiz')} />
      </WizardStep>

      <WizardStep label={tx('Notiz')} description={tx('Was möchtest du dir fürs nächste Mal merken? Optional.')} needs={['gericht']}>
        <Bound form={flow.forms.kochprotokoll} name="notiz" rows={4} />
        <StepNav onBack={() => setStep(2)} onNext={() => flow.validateStep(3)} nextStepLabel={tx('Wieder machen?')} />
      </WizardStep>

      <WizardStep label={tx('Wieder machen?')} description={tx('Würdest du es wieder kochen?')} needs={['gericht']}>
        <Bound form={flow.forms.kochprotokoll} name="wieder_machen" />
        <StepNav onBack={() => setStep(3)} onNext={() => flow.validateStep(4)} nextStepLabel={tx('Prüfen')} />
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[{ key: 'datum', label: tx('Datum'), value: today }]}
            whatHappensNext={tx('Das Gericht wird mit dem heutigen Datum im Kochprotokoll gespeichert.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Einkauf planen'), href: '#/intents/einkauf-planen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
