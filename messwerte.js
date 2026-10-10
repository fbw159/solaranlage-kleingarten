/*
 * Messwerte Solaranlage Kleingarten
 * ---------------------------------
 * Neue Ablesung: einfach unten eine Zeile anfügen (Reihenfolge = zeitlich aufsteigend).
 *   datum : "JJJJ-MM-TT"
 *   hz    : Hauptzähler (Ferraris, läuft bei Einspeisung rückwärts) in kWh, null wenn nicht abgelesen
 *   pv    : PV-Zähler (Zwischenstecker am Wechselrichter) in kWh
 *   reset : true, wenn der PV-Zähler bei dieser Ablesung auf 0 gesetzt wurde
 *   notiz : optionale Bemerkung
 *   zeit  : nur bei den Altdaten vorhanden, wird nicht angezeigt
 */
window.PV_ANLAGE = {
  module: "4 × 465 Wp",
  leistungKWp: 1.86,
  wechselrichter: "Hoymiles HMS-1600-4T (1,60 kW AC, 4 MPPT)",
  strompreis: 0.27 // €/kWh, Wert des PV-Stroms
};

window.PV_MESSWERTE = [
  { datum: "2026-07-31", zeit: "21:17", hz: 11269.1, pv: 32.16, notiz: "Start Vollausbau" },
  { datum: "2026-08-02", zeit: "13:12", hz: 11260.9, pv: 44.26 },
  { datum: "2026-08-03", zeit: "14:46", hz: 11251.5, pv: 56.05 },
  { datum: "2026-08-03", zeit: "18:58", hz: 11249.4, pv: 59.41 },
  { datum: "2026-08-04", zeit: "13:47", hz: 11250.8, pv: 60.72 },
  { datum: "2026-08-05", zeit: "14:53", hz: 11242.3, pv: 70.70 },
  { datum: "2026-08-05", zeit: "15:52", hz: null,    pv: 0.00, reset: true, notiz: "Zählerreset PV-Zähler" },
  { datum: "2026-08-07", zeit: "14:38", hz: 11232.8, pv: 12.09 },
  { datum: "2026-08-11", zeit: "21:12", hz: 11208.1, pv: 44.05 },
  { datum: "2026-08-13", zeit: "13:49", hz: 11193.8, pv: 58.32 },
  { datum: "2026-08-23", zeit: "16:20", hz: 11140.8, pv: 124.60 },
  { datum: "2026-08-30", zeit: "16:48", hz: 11109.9, pv: 167.00 },
  { datum: "2026-09-01", zeit: "17:37", hz: 11104.8, pv: 177.90 },
  { datum: "2026-09-06", zeit: "19:54", hz: 11090.7, pv: 199.70 },
  { datum: "2026-09-09", zeit: "18:54", hz: 11078.1, pv: 215.80 },
  { datum: "2026-09-10", zeit: "16:02", hz: 11079.5, pv: 219.50 },
  { datum: "2026-09-15", zeit: "08:25", hz: 11053.2, pv: 260.60 },
  { datum: "2026-09-24", zeit: "13:41", hz: 11043.1, pv: 277.80 },
  { datum: "2026-10-09", hz: 11013.4, pv: 329.4 },
  { datum: "2026-10-10", hz: 11013.5, pv: 332.7 }
];
