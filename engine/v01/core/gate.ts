// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Lade-Sperre: Remotion nimmt ein Bild erst auf, wenn alles geladen ist (Schriften, Texturen …).
// So entsteht nie ein Bild mit Ersatzschrift oder leerer Textur.
import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";

/** Wartet auf alle Versprechen. Gibt true zurück, sobald alles bereit ist; bis dahin ist das Rendern angehalten. */
export const useGate = (label: string, load: () => Promise<unknown>[]) => {
  const [handle] = useState(() => delayRender(label, { timeoutInMilliseconds: 120000 }));
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let alive = true;
    Promise.all(load())
      .then(() => { if (alive) { setOk(true); continueRender(handle); } })
      .catch((err) => { console.error(`[gate ${label}]`, err); continueRender(handle); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle]);
  return ok;
};
