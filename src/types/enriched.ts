import type { Einkaufspositionen, Kochprotokoll, ZutatenJeGericht } from './app';

export type EnrichedZutatenJeGericht = ZutatenJeGericht & {
  gerichtName: string;
  zutatName: string;
};

export type EnrichedKochprotokoll = Kochprotokoll & {
  gerichtName: string;
};

export type EnrichedEinkaufspositionen = Einkaufspositionen & {
  einkaufslisteName: string;
  zutatName: string;
};
