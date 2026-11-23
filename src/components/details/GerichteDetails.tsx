import type { Gerichte, ZutatenJeGericht, Kochprotokoll } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';
import { displayNameOf, displayPart } from '@/lib/journey/rules';

export interface GerichteDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Gerichte;
  /** 1:N „Zutaten je Gericht" (gericht): VOLLE Liste — der Block filtert auf diesen Record. */
  zutatenJeGerichtList: ZutatenJeGericht[];
  /** Zeilen-Klick → overlay.push auf das ZutatenJeGericht-Detail (nie der Edit-Dialog). */
  onOpenZutatenJeGericht: (record: ZutatenJeGericht) => void;
  /** Kontextuelles „+": öffnet den ZutatenJeGericht-Dialog mit diesem Record vorgesetzt. */
  onAddZutatenJeGericht?: () => void;
  /** 1:N „Kochprotokoll" (gericht): VOLLE Liste — der Block filtert auf diesen Record. */
  kochprotokollList: Kochprotokoll[];
  /** Zeilen-Klick → overlay.push auf das Kochprotokoll-Detail (nie der Edit-Dialog). */
  onOpenKochprotokoll: (record: Kochprotokoll) => void;
  /** Kontextuelles „+": öffnet den Kochprotokoll-Dialog mit diesem Record vorgesetzt. */
  onAddKochprotokoll?: () => void;
}

export function GerichteDetails({
  record,
  zutatenJeGerichtList,
  onOpenZutatenJeGericht,
  onAddZutatenJeGericht,
  kochprotokollList,
  onOpenKochprotokoll,
  onAddKochprotokoll,
}: GerichteDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('gerichte', 'name')} value={record.fields.name} format="text" />
        <RecordField label={fieldLabel('gerichte', 'zubereitungszeit')} value={record.fields.zubereitungszeit} format="text" />
        <RecordField label={fieldLabel('gerichte', 'eiweiss')} value={record.fields.eiweiss} format="text" />
        <RecordField label={fieldLabel('gerichte', 'kochen_noetig')} value={record.fields.kochen_noetig} format="bool" />
        <RecordField label={fieldLabel('gerichte', 'schritte')} value={record.fields.schritte} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('gerichte', 'foto')} className="md:col-span-2">
          {record.fields.foto ? (
            <MediaThumbnail src={record.fields.foto as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
      </RecordSection>

      <SatelliteSection
        title={appLabel('zutaten_je_gericht')}
        items={zutatenJeGerichtList.filter(r => extractRecordId(r.fields.gericht) === record.record_id)}
        map={r => ({ name: displayNameOf('zutaten_je_gericht', r.fields as Record<string, unknown>) || appLabel('zutaten_je_gericht'), meta: undefined })}
        onOpen={onOpenZutatenJeGericht}
        onAdd={onAddZutatenJeGericht}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('kochprotokoll')}
        items={kochprotokollList.filter(r => extractRecordId(r.fields.gericht) === record.record_id)}
        map={r => ({ name: displayNameOf('kochprotokoll', r.fields as Record<string, unknown>) || appLabel('kochprotokoll'), meta: displayPart(r.fields.datum) })}
        onOpen={onOpenKochprotokoll}
        onAdd={onAddKochprotokoll}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.GERICHTE} recordId={record.record_id} readOnly={!perms.canWrite('gerichte')} />
    </>
  );
}
