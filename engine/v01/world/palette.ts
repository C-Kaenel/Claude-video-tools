// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Farben der Welt. Der Motor kennt nur die Form; die Werte liefert der Stil (aus shared/design-tokens.json).

export type WorldPalette = {
  walls: { plaster: string[]; brick: string[] };  // Putzfarben, Backsteinfarben
  mortar: string;        // Fuge im Backstein
  trim: string;          // Fensterrahmen, Sprossen
  stone: string;         // Gesims, Fensterbank, Sturz, Türrahmen, Stufen
  plinth: string;        // Sockel
  glass: string;
  shutters: string[];
  doors: string[];
  roofs: string[];
  cobble: string; cobbleJoint: string;
  slab: string; slabJoint: string;
  curb: string;
  quay: string;          // Kaimauer
  wood: string;          // Bank, Deck, Kisten
  grass: string;
  leaves: string[];
  bark: string;
  flowers: string[];
  metal: string;         // Laterne, Ketten, Geländer
  lamp: string;          // Laternenglas (leuchtet)
  awning: [string, string];
  requisiten: RequisitenFarben;   // Requisiten je Epoche (props.ts)
};
/** Farben der Requisiten je Epoche (Karren, Brunnen, Körbe, Onggi, Hühner, Holzstapel). */
export type RequisitenFarben = {
  korb: string; obst: [string, string][]; saecke: string[]; gemuese: string[]; federn: string[]; kamm: string; schnabel: string;
  onggi: string[]; sockel: [string, string]; brunnenDach: string; schacht: string; seil: string; schnittholz: string;
};
