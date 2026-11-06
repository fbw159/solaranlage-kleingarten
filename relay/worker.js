// Cloudflare Worker „solaranlage-kleingarten“ – Speicher für https://fbw159.github.io/solaranlage-kleingarten/
// Liest und schreibt messwerte.json in diesem Repo (fbw159/solaranlage-kleingarten).
// Jede neue Ablesung und jedes Löschen wird ein eigener Commit.
//
// Secret GITHUB_TOKEN: GitHub-Token mit Schreibrecht „Contents“ auf dieses Repo.
// Lesen (/daten) ist öffentlich – die Werte stehen ohnehin auf der Seite.
// Schreiben nur mit Zugangscode im Header X-Zugang. Hier steht nur sein SHA-256.

const REPO = "fbw159/solaranlage-kleingarten";
const DATEI = "messwerte.json";
const HERKUNFT = ["https://fbw159.github.io"];
const ZUGANG_SHA256 = "43e990665edac150f1f53e78d46702530b661d57b60f4120fe0cb271ffd73943";

class Fehler extends Error {
  constructor(status, text) { super(text); this.status = status; }
}

export default {
  async fetch(request, env) {
    const herkunft = request.headers.get("Origin");
    const cors = {
      "Access-Control-Allow-Origin": HERKUNFT.includes(herkunft) ? herkunft : HERKUNFT[0],
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Zugang",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };
    const antwort = (status, obj) => new Response(JSON.stringify(obj), {
      status,
      headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const pfad = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
    try {
      if (pfad === "/") return antwort(200, { ok: true, dienst: "solaranlage-kleingarten" });
      if (pfad === "/status") {
        // Zur Prüfung nach dem Einrichten: kommt der Worker an die Datei? Gibt keine Daten heraus.
        let github = null;
        if (env.GITHUB_TOKEN) github = (await gh(env, "GET")).status;
        return antwort(200, { ok: true, token_gesetzt: !!env.GITHUB_TOKEN, github_status: github });
      }
      if (!env.GITHUB_TOKEN) return antwort(500, { fehler: "Im Speicher fehlt der GitHub-Schlüssel." });

      if (request.method === "GET" && pfad === "/daten") return antwort(200, (await lesen(env)).daten);

      if (!(await zugangOk(request.headers.get("X-Zugang")))) return antwort(401, { fehler: "Zugangscode stimmt nicht." });
      if (request.method === "GET" && pfad === "/zugang") return antwort(200, { ok: true });

      if (request.method === "POST" && (pfad === "/eintrag" || pfad === "/loeschen")) {
        const text = await request.text();
        if (text.length > 2000) return antwort(413, { fehler: "Anfrage zu groß." });
        let body;
        try { body = JSON.parse(text); } catch (e) { return antwort(400, { fehler: "Ungültige Anfrage." }); }

        if (pfad === "/eintrag") {
          const e = neuerEintrag(body);
          return antwort(200, await aendern(env, d => {
            if (d.messwerte.length && e.datum < d.messwerte[0].datum) throw new Fehler(400, "Das Datum liegt vor Beginn der Aufzeichnung.");
            d.messwerte.push(e);
            sortieren(d.messwerte);
            pruefeReihenfolge(d.messwerte, e);
            return `Ablesung ${de(e.datum)}: Hauptzähler ${kwh(e.hz, 1)} kWh, PV-Zähler ${kwh(e.pv, 1)} kWh${e.reset ? " (PV-Zähler zurückgesetzt)" : ""} – über das Dashboard`;
          }));
        }
        const id = String((body && body.id) || "");
        return antwort(200, await aendern(env, d => {
          const i = d.messwerte.findIndex(x => x.id === id);
          if (i < 0) return null; // schon weg
          if (i !== d.messwerte.length - 1) throw new Fehler(409, "Nur die neueste Ablesung kann gelöscht werden.");
          if (d.messwerte.length < 2) throw new Fehler(409, "Die erste Ablesung bleibt stehen.");
          const [x] = d.messwerte.splice(i, 1);
          return `Ablesung vom ${de(x.datum)} gelöscht (Hauptzähler ${kwh(x.hz, 1)} kWh, PV-Zähler ${kwh(x.pv, 1)} kWh) – über das Dashboard`;
        }));
      }
      return antwort(404, { fehler: "Unbekannte Adresse." });
    } catch (err) {
      if (err instanceof Fehler) return antwort(err.status, { fehler: err.message });
      return antwort(500, { fehler: "Fehler im Speicher." });
    }
  },
};

// ---------- GitHub ----------
function gh(env, methode, body) {
  const url = `https://api.github.com/repos/${REPO}/contents/${DATEI}` + (methode === "GET" ? "?ref=main" : "");
  return fetch(url, {
    method: methode,
    headers: {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "solaranlage-kleingarten-worker",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function lesen(env) {
  const r = await gh(env, "GET");
  if (!r.ok) throw new Fehler(502, `GitHub antwortet nicht wie erwartet (Fehler ${r.status}).`);
  const j = await r.json();
  let daten;
  try { daten = JSON.parse(ausBase64(j.content || "")); } catch (e) { throw new Fehler(500, "messwerte.json ist beschädigt."); }
  return { daten: normal(daten), sha: j.sha };
}

// Liest frisch, ändert, schreibt. Hat gerade jemand anderes gespeichert, wird es erneut versucht.
async function aendern(env, aenderung) {
  for (let versuch = 0; versuch < 4; versuch++) {
    const { daten, sha } = await lesen(env);
    const nachricht = aenderung(daten);
    if (!nachricht) return daten;
    const r = await gh(env, "PUT", { message: nachricht, content: inBase64(alsText(daten)), sha, branch: "main" });
    if (r.ok) return daten;
    if (r.status === 409 || r.status === 422) continue;
    throw new Fehler(502, `GitHub hat nicht gespeichert (Fehler ${r.status}).`);
  }
  throw new Fehler(503, "Gerade speichert jemand anderes. Bitte gleich nochmal versuchen.");
}

// ---------- Daten ----------
function neuerEintrag(b) {
  const datum = String((b && b.datum) || "");
  const d = new Date(datum + "T00:00:00Z");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum) || isNaN(d) || d.toISOString().slice(0, 10) !== datum) throw new Fehler(400, "Das Datum ist ungültig.");
  if (datum > new Date(Date.now() + 36 * 3600e3).toISOString().slice(0, 10)) throw new Fehler(400, "Das Datum liegt in der Zukunft.");
  const hz = Math.round(Number(b.hz) * 10) / 10;
  if (!Number.isFinite(hz) || hz < 0 || hz > 999999.9) throw new Fehler(400, "Der Hauptzählerstand ist ungültig.");
  const pv = Math.round(Number(b.pv) * 100) / 100;
  if (!Number.isFinite(pv) || pv < 0 || pv > 99999.99) throw new Fehler(400, "Der PV-Zählerstand ist ungültig.");
  const e = { id: crypto.randomUUID().slice(0, 8), datum, hz, pv };
  if (b.reset === true) { e.reset = true; e.notiz = "Zählerreset PV-Zähler"; }
  return e;
}

// Der PV-Zähler darf nur steigen – außer er wurde zurückgesetzt.
function pruefeReihenfolge(l, e) {
  const i = l.indexOf(e);
  const vor = l[i - 1], nach = l[i + 1];
  if (vor && !e.reset && e.pv < vor.pv) throw new Fehler(400, `Der PV-Zähler ist kleiner als am ${de(vor.datum)} (${kwh(vor.pv, 1)} kWh). Wurde er zurückgesetzt?`);
  if (nach && !nach.reset && nach.pv < e.pv) throw new Fehler(400, `Der PV-Zähler ist größer als am ${de(nach.datum)} (${kwh(nach.pv, 1)} kWh).`);
}

function normal(d) {
  if (!d || typeof d !== "object" || Array.isArray(d)) d = {};
  if (!d.anlage || typeof d.anlage !== "object") d.anlage = {};
  d.messwerte = (Array.isArray(d.messwerte) ? d.messwerte : [])
    .filter(e => e && /^\d{4}-\d{2}-\d{2}$/.test(e.datum) && Number.isFinite(Number(e.pv)))
    .map((e, i) => {
      const x = { id: String(e.id || `${e.datum}-${i}`), datum: e.datum };
      if (e.zeit) x.zeit = String(e.zeit);
      x.hz = e.hz == null ? null : Number(e.hz);
      x.pv = Number(e.pv);
      if (e.reset) x.reset = true;
      if (e.notiz) x.notiz = String(e.notiz);
      return x;
    });
  sortieren(d.messwerte);
  return d;
}

// Nach Datum; am selben Tag bleibt die Reihenfolge erhalten (sort ist stabil).
function sortieren(l) {
  return l.sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0));
}

// Eine Ablesung pro Zeile, damit die Commits auf GitHub gut lesbar sind.
function alsText(d) {
  const kopf = Object.entries(d).filter(([k]) => k !== "messwerte").map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
  const zeilen = d.messwerte.map(e => "    " + JSON.stringify(e));
  return "{\n" + [...kopf, `  "messwerte": [\n${zeilen.join(",\n")}\n  ]`].join(",\n") + "\n}\n";
}

// ---------- Hilfen ----------
async function zugangOk(code) {
  if (!code || code.length > 200) return false;
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code)));
  return [...h].map(b => b.toString(16).padStart(2, "0")).join("") === ZUGANG_SHA256;
}
function inBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function ausBase64(b64) {
  const bin = atob(b64.replace(/\s/g, ""));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}
// 11012.2 -> "11.012,2" (ohne Intl, mind. d Nachkommastellen, höchstens 2)
function kwh(n, d) {
  if (n == null || !Number.isFinite(Number(n))) return "–";
  let [g, k = ""] = String(Math.round(Number(n) * 100) / 100).split(".");
  while (k.length < d) k += "0";
  g = g.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return k ? `${g},${k}` : g;
}
const de = s => `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(0, 4)}`;
