import type { ZutatenJeGericht, Gerichte, Zutaten } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { usePermissions } from '@/lib/permissions';
import { displayNameOf } from '@/lib/journey/rules';

export interface ZutatenJeGerichtDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: ZutatenJeGericht;
  /** N:1-Ziel „Gerichte": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  gerichteList: Gerichte[];
  /** Klick auf die Gerichte-Relation → overlay.push auf dessen Detail. */
  onOpenGerichte?: (record: Gerichte) => void;
  /** N:1-Ziel „Zutaten": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  zutatenList: Zutaten[];
  /** Klick auf die Zutaten-Relation → overlay.push auf dessen Detail. */
  onOpenZutaten?: (record: Zutaten) => void;
}

export function ZutatenJeGerichtDetails({
  record,
  gerichteList,
  onOpenGerichte,
  zutatenList,
  onOpenZutaten,
}: ZutatenJeGerichtDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const gerichtTarget = gerichteList.find(r => r.record_id === extractRecordId(record.fields.gericht));
  const zutatTarget = zutatenList.find(r => r.record_id === extractRecordId(record.fields.zutat));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('zutaten_je_gericht', 'menge_pro_portion')} value={record.fields.menge_pro_portion} format="text" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('zutaten_je_gericht', 'gericht')}
          name={gerichtTarget ? (displayNameOf('gerichte', gerichtTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={undefined}
          onClick={gerichtTarget && onOpenGerichte ? () => onOpenGerichte!(gerichtTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('zutaten_je_gericht', 'zutat')}
          name={zutatTarget ? (displayNameOf('zutaten', zutatTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={undefined}
          onClick={zutatTarget && onOpenZutaten ? () => onOpenZutaten!(zutatTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.ZUTATEN_JE_GERICHT} recordId={record.record_id} readOnly={!perms.canWrite('zutaten_je_gericht')} />
    </>
  );
}
