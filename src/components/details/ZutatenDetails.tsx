import type { Zutaten, ZutatenJeGericht, Einkaufspositionen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';
import { displayNameOf } from '@/lib/journey/rules';

export interface ZutatenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Zutaten;
  /** 1:N „Zutaten je Gericht" (zutat): VOLLE Liste — der Block filtert auf diesen Record. */
  zutatenJeGerichtList: ZutatenJeGericht[];
  /** Zeilen-Klick → overlay.push auf das ZutatenJeGericht-Detail (nie der Edit-Dialog). */
  onOpenZutatenJeGericht: (record: ZutatenJeGericht) => void;
  /** Kontextuelles „+": öffnet den ZutatenJeGericht-Dialog mit diesem Record vorgesetzt. */
  onAddZutatenJeGericht?: () => void;
  /** 1:N „Einkaufspositionen" (zutat): VOLLE Liste — der Block filtert auf diesen Record. */
  einkaufspositionenList: Einkaufspositionen[];
  /** Zeilen-Klick → overlay.push auf das Einkaufspositionen-Detail (nie der Edit-Dialog). */
  onOpenEinkaufspositionen: (record: Einkaufspositionen) => void;
  /** Kontextuelles „+": öffnet den Einkaufspositionen-Dialog mit diesem Record vorgesetzt. */
  onAddEinkaufspositionen?: () => void;
}

export function ZutatenDetails({
  record,
  zutatenJeGerichtList,
  onOpenZutatenJeGericht,
  onAddZutatenJeGericht,
  einkaufspositionenList,
  onOpenEinkaufspositionen,
  onAddEinkaufspositionen,
}: ZutatenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('zutaten', 'name')} value={record.fields.name} format="text" />
        <RecordField label={fieldLabel('zutaten', 'einheit')} value={record.fields.einheit} format="pill" />
        <RecordField label={fieldLabel('zutaten', 'abteilung')} value={record.fields.abteilung} format="pill" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('zutaten_je_gericht')}
        items={zutatenJeGerichtList.filter(r => extractRecordId(r.fields.zutat) === record.record_id)}
        map={r => ({ name: displayNameOf('zutaten_je_gericht', r.fields as Record<string, unknown>) || appLabel('zutaten_je_gericht'), meta: undefined })}
        onOpen={onOpenZutatenJeGericht}
        onAdd={onAddZutatenJeGericht}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('einkaufspositionen')}
        items={einkaufspositionenList.filter(r => extractRecordId(r.fields.zutat) === record.record_id)}
        map={r => ({ name: displayNameOf('einkaufspositionen', r.fields as Record<string, unknown>) || appLabel('einkaufspositionen'), meta: undefined })}
        onOpen={onOpenEinkaufspositionen}
        onAdd={onAddEinkaufspositionen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.ZUTATEN} recordId={record.record_id} readOnly={!perms.canWrite('zutaten')} />
    </>
  );
}
