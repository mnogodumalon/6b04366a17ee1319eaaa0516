import type { Einkaufslisten, Einkaufspositionen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';
import { displayNameOf } from '@/lib/journey/rules';

export interface EinkaufslistenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Einkaufslisten;
  /** 1:N „Einkaufspositionen" (einkaufsliste): VOLLE Liste — der Block filtert auf diesen Record. */
  einkaufspositionenList: Einkaufspositionen[];
  /** Zeilen-Klick → overlay.push auf das Einkaufspositionen-Detail (nie der Edit-Dialog). */
  onOpenEinkaufspositionen: (record: Einkaufspositionen) => void;
  /** Kontextuelles „+": öffnet den Einkaufspositionen-Dialog mit diesem Record vorgesetzt. */
  onAddEinkaufspositionen?: () => void;
}

export function EinkaufslistenDetails({
  record,
  einkaufspositionenList,
  onOpenEinkaufspositionen,
  onAddEinkaufspositionen,
}: EinkaufslistenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('einkaufslisten', 'titel')} value={record.fields.titel} format="text" />
        <RecordField label={fieldLabel('einkaufslisten', 'erstellt_am')} value={record.fields.erstellt_am} format="date" />
        <RecordField label={fieldLabel('einkaufslisten', 'status')} value={record.fields.status} format="pill" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('einkaufspositionen')}
        items={einkaufspositionenList.filter(r => extractRecordId(r.fields.einkaufsliste) === record.record_id)}
        map={r => ({ name: displayNameOf('einkaufspositionen', r.fields as Record<string, unknown>) || appLabel('einkaufspositionen'), meta: undefined })}
        onOpen={onOpenEinkaufspositionen}
        onAdd={onAddEinkaufspositionen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.EINKAUFSLISTEN} recordId={record.record_id} readOnly={!perms.canWrite('einkaufslisten')} />
    </>
  );
}
