import type { Kochprotokoll, Gerichte } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { usePermissions } from '@/lib/permissions';
import { displayNameOf } from '@/lib/journey/rules';

export interface KochprotokollDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Kochprotokoll;
  /** N:1-Ziel „Gerichte": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  gerichteList: Gerichte[];
  /** Klick auf die Gerichte-Relation → overlay.push auf dessen Detail. */
  onOpenGerichte?: (record: Gerichte) => void;
}

export function KochprotokollDetails({
  record,
  gerichteList,
  onOpenGerichte,
}: KochprotokollDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const gerichtTarget = gerichteList.find(r => r.record_id === extractRecordId(record.fields.gericht));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('kochprotokoll', 'datum')} value={record.fields.datum} format="date" />
        <RecordField label={fieldLabel('kochprotokoll', 'tatsaechliche_dauer')} value={record.fields.tatsaechliche_dauer} format="text" />
        <RecordField label={fieldLabel('kochprotokoll', 'notiz')} value={record.fields.notiz} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('kochprotokoll', 'wieder_machen')} value={record.fields.wieder_machen} format="bool" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('kochprotokoll', 'gericht')}
          name={gerichtTarget ? (displayNameOf('gerichte', gerichtTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={undefined}
          onClick={gerichtTarget && onOpenGerichte ? () => onOpenGerichte!(gerichtTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.KOCHPROTOKOLL} recordId={record.record_id} readOnly={!perms.canWrite('kochprotokoll')} />
    </>
  );
}
