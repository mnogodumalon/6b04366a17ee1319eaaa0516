import type { EnrichedEinkaufspositionen, EnrichedKochprotokoll, EnrichedZutatenJeGericht } from '@/types/enriched';
import type { Einkaufslisten, Einkaufspositionen, Gerichte, Kochprotokoll, Zutaten, ZutatenJeGericht } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import { displayPart } from '@/lib/journey/rules';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => displayPart(r.fields[f])).filter(Boolean).join(' ').trim();
}

interface ZutatenJeGerichtMaps {
  gerichteMap: Map<string, Gerichte>;
  zutatenMap: Map<string, Zutaten>;
}

export function enrichZutatenJeGericht(
  zutatenJeGericht: ZutatenJeGericht[],
  maps: ZutatenJeGerichtMaps
): EnrichedZutatenJeGericht[] {
  return zutatenJeGericht.map(r => ({
    ...r,
    gerichtName: resolveDisplay(r.fields.gericht, maps.gerichteMap, 'name'),
    zutatName: resolveDisplay(r.fields.zutat, maps.zutatenMap, 'name'),
  }));
}

interface KochprotokollMaps {
  gerichteMap: Map<string, Gerichte>;
}

export function enrichKochprotokoll(
  kochprotokoll: Kochprotokoll[],
  maps: KochprotokollMaps
): EnrichedKochprotokoll[] {
  return kochprotokoll.map(r => ({
    ...r,
    gerichtName: resolveDisplay(r.fields.gericht, maps.gerichteMap, 'name'),
  }));
}

interface EinkaufspositionenMaps {
  einkaufslistenMap: Map<string, Einkaufslisten>;
  zutatenMap: Map<string, Zutaten>;
}

export function enrichEinkaufspositionen(
  einkaufspositionen: Einkaufspositionen[],
  maps: EinkaufspositionenMaps
): EnrichedEinkaufspositionen[] {
  return einkaufspositionen.map(r => ({
    ...r,
    einkaufslisteName: resolveDisplay(r.fields.einkaufsliste, maps.einkaufslistenMap, 'titel'),
    zutatName: resolveDisplay(r.fields.zutat, maps.zutatenMap, 'name'),
  }));
}
