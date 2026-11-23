import type { Einkaufspositionen, Einkaufslisten, Zutaten } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { usePermissions } from '@/lib/permissions';
import { displayNameOf } from '@/lib/journey/rules';

export interface EinkaufspositionenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Einkaufspositionen;
  /** N:1-Ziel „Einkaufslisten": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  einkaufslistenList: Einkaufslisten[];
  /** Klick auf die Einkaufslisten-Relation → overlay.push auf dessen Detail. */
  onOpenEinkaufslisten?: (record: Einkaufslisten) => void;
  /** N:1-Ziel „Zutaten": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  zutatenList: Zutaten[];
  /** Klick auf die Zutaten-Relation → overlay.push auf dessen Detail. */
  onOpenZutaten?: (record: Zutaten) => void;
}

export function EinkaufspositionenDetails({
  record,
  einkaufslistenList,
  onOpenEinkaufslisten,
  zutatenList,
  onOpenZutaten,
}: EinkaufspositionenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const einkaufslisteTarget = einkaufslistenList.find(r => r.record_id === extractRecordId(record.fields.einkaufsliste));
  const zutatTarget = zutatenList.find(r => r.record_id === extractRecordId(record.fields.zutat));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('einkaufspositionen', 'menge')} value={record.fields.menge} format="text" />
        <RecordField label={fieldLabel('einkaufspositionen', 'abteilung')} value={record.fields.abteilung} format="pill" />
        <RecordField label={fieldLabel('einkaufspositionen', 'abgehakt')} value={record.fields.abgehakt} format="bool" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('einkaufspositionen', 'einkaufsliste')}
          name={einkaufslisteTarget ? (displayNameOf('einkaufslisten', einkaufslisteTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={undefined}
          onClick={einkaufslisteTarget && onOpenEinkaufslisten ? () => onOpenEinkaufslisten!(einkaufslisteTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('einkaufspositionen', 'zutat')}
          name={zutatTarget ? (displayNameOf('zutaten', zutatTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={undefined}
          onClick={zutatTarget && onOpenZutaten ? () => onOpenZutaten!(zutatTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.EINKAUFSPOSITIONEN} recordId={record.record_id} readOnly={!perms.canWrite('einkaufspositionen')} />
    </>
  );
}
