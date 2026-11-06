# Solaranlage Kleingarten

Dashboard zur PV-Anlage im Kleingarten (4 × 465 Wp = 1,86 kWp, Hoymiles HMS-1600-4T), ausgewertet seit dem Vollausbau am 31.07.2026.

**Live:** https://fbw159.github.io/solaranlage-kleingarten/

- `index.html` – Dashboard (Eingabe, Kennzahlen, Diagramme, Messwertprotokoll)
- `messwerte.json` – alle Ablesungen von Hauptzähler und PV-Zähler (eine Ablesung pro Zeile)
- `relay/worker.js` – Cloudflare Worker `solaranlage-kleingarten`: liefert `messwerte.json` frisch aus GitHub (`/daten`) und speichert neue Ablesungen (`/eintrag`, `/loeschen`) als Commit. Schreiben nur mit Zugangscode aus dem Link.

Berechnung:

- PV-Erzeugung = Summe der Zuwächse am PV-Zähler (Zählerreset am 05.08.2026 berücksichtigt)
- Bilanzierte Einspeisung = Rückgang des Hauptzählers seit 31.07.2026
- Gesamtverbrauch Garten = PV-Erzeugung + Änderung des Hauptzählers (= PV-Erzeugung − bilanzierte Einspeisung), also PV-Strom + Netzstrom
- Wert des PV-Stroms = PV-Erzeugung × 0,27 €/kWh
