# Solaranlage Kleingarten

Dashboard zur PV-Anlage im Kleingarten (4 × 465 Wp = 1,86 kWp, Hoymiles HMS-1600-4T), ausgewertet seit dem Vollausbau am 31.07.2026.

**Live:** https://fbw159.github.io/solaranlage-kleingarten/

- `index.html` – Dashboard (Kennzahlen, Diagramme, Messwertprotokoll)
- `messwerte.js` – alle Ablesungen von Hauptzähler und PV-Zähler; neue Ablesung als neue Zeile unten anfügen

Berechnung:

- PV-Erzeugung = Summe der Zuwächse am PV-Zähler (Zählerreset am 05.08.2026 berücksichtigt)
- Bilanzierte Einspeisung = Rückgang des Hauptzählers seit 31.07.2026
- Gesamtverbrauch Garten = PV-Erzeugung + Änderung des Hauptzählers (= PV-Erzeugung − bilanzierte Einspeisung), also PV-Strom + Netzstrom
- Wert des PV-Stroms = PV-Erzeugung × 0,27 €/kWh
