"use strict";

const APP_VERSION = "1.0.0";
const STORE_KEY = "ernaehrung-v1";
const MEALS = ["Frühstück", "Mittagessen", "Abendessen", "Snack"];
const GLASS_ML = 250;

// ---------- Speicher ----------

function emptyState() {
  return { profile: null, days: {}, custom: [], weights: [] };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return Object.assign(emptyState(), JSON.parse(raw));
  } catch (e) { /* defekte oder gesperrte Daten → leer starten */ }
  return emptyState();
}

let state = loadState();

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (e) {
    toast("Speichern fehlgeschlagen – Speicher voll oder gesperrt.");
  }
}

// ---------- Hilfsfunktionen ----------

const $ = (id) => document.getElementById(id);
const fmt = (n, d = 0) => Number(n).toLocaleString("de-DE", { maximumFractionDigits: d, minimumFractionDigits: d });

function isoDate(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDate(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  return isoDate(new Date(y, m - 1, d + days));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

let toastTimer;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

function getDay(iso) {
  if (!state.days[iso]) state.days[iso] = { entries: [], water: 0 };
  return state.days[iso];
}

function peekDay(iso) {
  return state.days[iso] || { entries: [], water: 0 };
}

// ---------- Bedarfsberechnung ----------

function computeTargets(p) {
  if (!p) return null;
  // Mifflin-St Jeor
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === "m" ? 5 : -161);
  const tdee = bmr * p.activity;
  const minKcal = p.sex === "m" ? 1500 : 1200;
  const kcal = Math.max(minKcal, Math.round((tdee + p.goal) / 10) * 10);
  const proteinPerKg = p.goal > 0 ? 1.8 : p.goal < 0 ? 1.6 : 1.2;
  const protein = Math.round(p.weight * proteinPerKg);
  const fat = Math.round((kcal * 0.3) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const fiber = Math.max(25, Math.round((kcal / 1000) * 14));
  const water = Math.round(p.weight * 0.035 * 10) / 10;
  const bmi = p.weight / Math.pow(p.height / 100, 2);
  return { bmr, tdee, kcal, protein, fat, carbs, fiber, water, bmi };
}

function bmiLabel(bmi) {
  if (bmi < 18.5) return "Untergewicht";
  if (bmi < 25) return "Normalgewicht";
  if (bmi < 30) return "Übergewicht";
  return "Adipositas";
}

function totals(entries) {
  const t = { kcal: 0, p: 0, c: 0, f: 0, fi: 0 };
  for (const e of entries) {
    const k = e.grams / 100;
    t.kcal += e.kcal * k; t.p += e.p * k; t.c += e.c * k; t.f += e.f * k; t.fi += (e.fi || 0) * k;
  }
  return t;
}

// ---------- Navigation ----------

function goto(view) {
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + view));
  document.querySelectorAll(".tabbar button").forEach((b) => b.classList.toggle("active", b.dataset.goto === view));
  if (view === "tipps") renderAdvice();
  if (view === "profil") renderWeights();
  window.scrollTo(0, 0);
}

document.querySelectorAll("[data-goto]").forEach((b) => b.addEventListener("click", () => goto(b.dataset.goto)));

// ---------- Heute ----------

let currentDay = isoDate(new Date());

function renderToday() {
  $("day").value = currentDay;
  const t = computeTargets(state.profile);
  $("no-profile").hidden = !!state.profile;
  const day = peekDay(currentDay);
  const sum = totals(day.entries);

  $("kcal-eaten").textContent = fmt(sum.kcal);
  $("kcal-target").textContent = t ? fmt(t.kcal) : "–";
  const ring = $("ring");
  const circ = 2 * Math.PI * 52;
  const ratio = t ? Math.min(sum.kcal / t.kcal, 1) : 0;
  ring.style.strokeDashoffset = String(circ * (1 - ratio));
  ring.classList.toggle("over", !!t && sum.kcal > t.kcal * 1.05);
  if (t) {
    const left = t.kcal - sum.kcal;
    $("kcal-left").textContent = left >= 0 ? `noch ${fmt(left)} kcal` : `${fmt(-left)} kcal darüber`;
  } else {
    $("kcal-left").textContent = "";
  }

  const macros = [
    ["Eiweiß", sum.p, t && t.protein, "protein"],
    ["Kohlenh.", sum.c, t && t.carbs, "carbs"],
    ["Fett", sum.f, t && t.fat, "fat"],
  ];
  $("macros").innerHTML = macros.map(([label, val, target, cls]) => `
    <div class="macro">
      <div class="label">${label}</div>
      <div class="bar"><div class="bar-fill ${cls}" style="width:${target ? Math.min(100, (val / target) * 100) : 0}%"></div></div>
      <div class="val">${fmt(val)}${target ? " / " + fmt(target) : ""} g</div>
    </div>`).join("");

  const waterL = day.water / 1000;
  $("water-amount").textContent = fmt(waterL, 2);
  $("water-target").textContent = t ? fmt(t.water, 1) : "–";
  $("water-bar").style.width = (t ? Math.min(100, (waterL / t.water) * 100) : 0) + "%";

  $("meals").innerHTML = MEALS.map((meal) => {
    const items = day.entries.map((e, i) => ({ e, i })).filter(({ e }) => e.meal === meal);
    if (!items.length) return "";
    const mealKcal = totals(items.map(({ e }) => e)).kcal;
    return `<div class="card meal">
      <h3>${meal}<span>${fmt(mealKcal)} kcal</span></h3>
      ${items.map(({ e, i }) => {
        const k = e.grams / 100;
        return `<div class="entry">
          <div class="entry-main">
            <div>${escapeHtml(e.name)}</div>
            <div>${fmt(e.grams)} g · ${fmt(e.kcal * k)} kcal · E ${fmt(e.p * k, 1)} · K ${fmt(e.c * k, 1)} · F ${fmt(e.f * k, 1)}</div>
          </div>
          <button class="del" data-del="${i}" aria-label="${escapeHtml(e.name)} entfernen">✕</button>
        </div>`;
      }).join("")}
    </div>`;
  }).join("");
}

$("meals").addEventListener("click", (ev) => {
  const btn = ev.target.closest("[data-del]");
  if (!btn) return;
  const day = getDay(currentDay);
  const [removed] = day.entries.splice(Number(btn.dataset.del), 1);
  save();
  renderToday();
  toast(`${removed.name} entfernt`);
});

$("prev-day").addEventListener("click", () => { currentDay = shiftDate(currentDay, -1); renderToday(); });
$("next-day").addEventListener("click", () => { currentDay = shiftDate(currentDay, 1); renderToday(); });
$("day").addEventListener("change", (e) => { if (e.target.value) { currentDay = e.target.value; renderToday(); } });

function changeWater(delta) {
  const day = getDay(currentDay);
  day.water = Math.max(0, day.water + delta);
  save();
  renderToday();
}
$("water-plus").addEventListener("click", () => changeWater(GLASS_ML));
$("water-minus").addEventListener("click", () => changeWater(-GLASS_ML));

// ---------- Suche & Hinzufügen ----------

function allFoods() {
  return state.custom.concat(FOODS);
}

function normalize(s) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss");
}

let selectedFood = null;

function suggestMeal() {
  const h = new Date().getHours();
  if (h < 11) return "Frühstück";
  if (h < 15) return "Mittagessen";
  if (h < 17) return "Snack";
  return "Abendessen";
}

$("food-search").addEventListener("input", (e) => {
  const q = normalize(e.target.value.trim());
  const list = $("food-results");
  if (!q) { list.innerHTML = ""; return; }
  const hits = allFoods().filter((f) => normalize(f.name).includes(q)).slice(0, 25);
  list.innerHTML = hits.length
    ? hits.map((f) => `<li><button data-food="${f.id}"><span>${escapeHtml(f.name)}</span><span>${fmt(f.kcal)} kcal/100 g</span></button></li>`).join("")
    : `<li class="muted small" style="padding:10px 4px">Nichts gefunden – lege unten ein eigenes Lebensmittel an.</li>`;
});

$("food-results").addEventListener("click", (ev) => {
  const btn = ev.target.closest("[data-food]");
  if (!btn) return;
  selectedFood = allFoods().find((f) => f.id === btn.dataset.food);
  if (!selectedFood) return;
  $("add-name").textContent = selectedFood.name;
  $("add-grams").value = 100;
  $("add-meal").value = suggestMeal();
  $("add-form").hidden = false;
  $("food-results").innerHTML = "";
  updatePreview();
  $("add-grams").focus();
});

function updatePreview() {
  if (!selectedFood) return;
  const g = parseFloat($("add-grams").value) || 0;
  const k = g / 100;
  $("add-preview").textContent =
    `${fmt(selectedFood.kcal * k)} kcal · Eiweiß ${fmt(selectedFood.p * k, 1)} g · KH ${fmt(selectedFood.c * k, 1)} g · Fett ${fmt(selectedFood.f * k, 1)} g`;
}
$("add-grams").addEventListener("input", updatePreview);

function closeAdd() {
  selectedFood = null;
  $("add-form").hidden = true;
  $("food-search").value = "";
}
$("add-cancel").addEventListener("click", closeAdd);

$("add-confirm").addEventListener("click", () => {
  const grams = parseFloat($("add-grams").value);
  if (!selectedFood || !(grams > 0)) { toast("Bitte eine gültige Menge eingeben."); return; }
  const { name, kcal, p, c, f, fi, type } = selectedFood;
  getDay(currentDay).entries.push({ name, kcal, p, c, f, fi, type, grams, meal: $("add-meal").value });
  save();
  toast(`${name} hinzugefügt`);
  closeAdd();
  renderToday();
});

$("custom-form").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const food = {
    id: "c" + Date.now(),
    name: $("c-name").value.trim(),
    kcal: parseFloat($("c-kcal").value) || 0,
    p: parseFloat($("c-p").value) || 0,
    c: parseFloat($("c-c").value) || 0,
    f: parseFloat($("c-f").value) || 0,
    fi: parseFloat($("c-fi").value) || 0,
    type: "custom",
  };
  if (!food.name) return;
  state.custom.unshift(food);
  save();
  ev.target.reset();
  ev.target.closest("details").open = false;
  toast(`${food.name} gespeichert`);
  $("food-search").value = food.name;
  $("food-search").dispatchEvent(new Event("input"));
});

// ---------- Profil ----------

function fillProfileForm() {
  const p = state.profile;
  if (!p) return;
  $("p-sex").value = p.sex;
  $("p-age").value = p.age;
  $("p-height").value = p.height;
  $("p-weight").value = p.weight;
  $("p-activity").value = String(p.activity);
  $("p-goal").value = String(p.goal);
  $("p-diet").value = p.diet || "alles";
}

function renderResults() {
  const t = computeTargets(state.profile);
  $("results").hidden = !t;
  if (!t) return;
  const items = [
    ["BMI", `${fmt(t.bmi, 1)} (${bmiLabel(t.bmi)})`],
    ["Grundumsatz", `${fmt(t.bmr)} kcal`],
    ["Gesamtumsatz", `${fmt(t.tdee)} kcal`],
    ["Tagesziel", `${fmt(t.kcal)} kcal`],
    ["Eiweiß", `${fmt(t.protein)} g`],
    ["Kohlenhydrate", `${fmt(t.carbs)} g`],
    ["Fett", `${fmt(t.fat)} g`],
    ["Ballaststoffe", `≥ ${fmt(t.fiber)} g`],
    ["Wasser", `${fmt(t.water, 1)} l`],
  ];
  $("stats").innerHTML = items.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
}

$("profile-form").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const weight = parseFloat($("p-weight").value);
  const isNew = !state.profile;
  state.profile = {
    sex: $("p-sex").value,
    age: parseInt($("p-age").value, 10),
    height: parseFloat($("p-height").value),
    weight,
    activity: parseFloat($("p-activity").value),
    goal: parseInt($("p-goal").value, 10),
    diet: $("p-diet").value,
  };
  const today = isoDate(new Date());
  const last = state.weights[state.weights.length - 1];
  if (!last || last.weight !== weight) recordWeight(today, weight);
  save();
  renderResults();
  renderWeights();
  renderToday();
  toast(isNew ? "Profil angelegt" : "Profil aktualisiert");
});

function recordWeight(date, weight) {
  state.weights = state.weights.filter((w) => w.date !== date);
  state.weights.push({ date, weight });
  state.weights.sort((a, b) => a.date.localeCompare(b.date));
}

$("weight-form").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const w = parseFloat($("w-value").value);
  if (!(w > 0)) return;
  recordWeight(isoDate(new Date()), w);
  if (state.profile) {
    state.profile.weight = w;
    $("p-weight").value = w;
  }
  save();
  ev.target.reset();
  renderWeights();
  renderResults();
  renderToday();
  toast("Gewicht eingetragen");
});

$("weight-list").addEventListener("click", (ev) => {
  const btn = ev.target.closest("[data-wdel]");
  if (!btn) return;
  state.weights = state.weights.filter((w) => w.date !== btn.dataset.wdel);
  save();
  renderWeights();
});

function renderWeights() {
  const ws = state.weights;
  const chart = $("weight-chart");
  if (ws.length < 2) {
    chart.innerHTML = `<text x="160" y="70" text-anchor="middle">Mindestens zwei Einträge für den Verlauf</text>`;
  } else {
    const pts = ws.slice(-30);
    const vals = pts.map((w) => w.weight);
    let min = Math.min(...vals), max = Math.max(...vals);
    if (max - min < 2) { min -= 1; max += 1; }
    const L = 34, R = 312, T = 10, B = 120;
    const x = (i) => L + (i / (pts.length - 1)) * (R - L);
    const y = (v) => B - ((v - min) / (max - min)) * (B - T);
    const path = pts.map((w, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(w.weight).toFixed(1)}`).join(" ");
    chart.innerHTML = `
      <line class="axis" x1="${L}" y1="${B}" x2="${R}" y2="${B}"/>
      <line class="axis" x1="${L}" y1="${T}" x2="${L}" y2="${B}"/>
      <text x="${L - 4}" y="${T + 4}" text-anchor="end">${fmt(max, 1)}</text>
      <text x="${L - 4}" y="${B}" text-anchor="end">${fmt(min, 1)}</text>
      <text x="${L}" y="${B + 14}">${pts[0].date.slice(5).split("-").reverse().join(".")}</text>
      <text x="${R}" y="${B + 14}" text-anchor="end">${pts[pts.length - 1].date.slice(5).split("-").reverse().join(".")}</text>
      <path class="line" d="${path}"/>
      ${pts.map((w, i) => `<circle class="dot" cx="${x(i).toFixed(1)}" cy="${y(w.weight).toFixed(1)}" r="2.5"/>`).join("")}`;
  }
  $("weight-list").innerHTML = ws.slice(-7).reverse().map((w) =>
    `<li><span>${w.date.split("-").reverse().join(".")}</span><span>${fmt(w.weight, 1)} kg
      <button class="del icon-btn" style="width:32px;height:32px;font-size:1rem;margin-left:8px" data-wdel="${w.date}" aria-label="Eintrag vom ${w.date} löschen">✕</button></span></li>`
  ).join("");
}

// ---------- Beratung ----------

const IDEAS = {
  alles: [
    ["Frühstück", "Haferflocken mit Skyr, Beeren und Walnüssen"],
    ["Mittag", "Vollkornnudeln mit Lachs, Spinat und Tomaten"],
    ["Abend", "Hähnchenbrust mit Ofengemüse und Kartoffeln"],
    ["Snack", "Apfel mit einer Handvoll Mandeln"],
  ],
  vegetarisch: [
    ["Frühstück", "Vollkornbrot mit Hüttenkäse, Gurke und Ei"],
    ["Mittag", "Linsen-Bolognese mit Vollkornnudeln und Parmesan"],
    ["Abend", "Gemüse-Omelett mit Feta und Blattsalat"],
    ["Snack", "Magerquark mit Banane und Leinsamen"],
  ],
  vegan: [
    ["Frühstück", "Overnight Oats mit Sojadrink, Chiasamen und Beeren"],
    ["Mittag", "Kichererbsen-Curry mit Vollkornreis und Brokkoli"],
    ["Abend", "Tofu-Pfanne mit Paprika, Zucchini und Quinoa"],
    ["Snack", "Hummus mit Karotten- und Paprikasticks"],
  ],
};

function renderAdvice() {
  const t = computeTargets(state.profile);
  const day = peekDay(currentDay);
  const s = totals(day.entries);
  const out = [];
  if (!t) {
    out.push(["warn", "Lege dein Profil an, um eine persönliche Auswertung zu erhalten."]);
  } else if (!day.entries.length) {
    out.push(["", "Für diesen Tag ist noch nichts eingetragen. Trage deine Mahlzeiten unter „Heute“ ein."]);
  } else {
    const r = s.kcal / t.kcal;
    if (r > 1.1) out.push(["warn", `Du liegst ${fmt(s.kcal - t.kcal)} kcal über deinem Ziel. Achte morgen auf kleinere Portionen oder mehr Gemüse.`]);
    else if (r >= 0.9) out.push(["good", "Deine Kalorienzufuhr passt gut zu deinem Ziel."]);
    else if (new Date().getHours() >= 19 || currentDay !== isoDate(new Date()))
      out.push(["warn", `Dir fehlen noch ${fmt(t.kcal - s.kcal)} kcal. Zu wenig Energie bremst Stoffwechsel und Leistungsfähigkeit.`]);
    else out.push(["", `Noch ${fmt(t.kcal - s.kcal)} kcal verfügbar für heute.`]);

    if (s.p < t.protein * 0.8) {
      const src = state.profile.diet === "vegan" ? "Tofu, Linsen, Tempeh oder Sojadrink" :
        state.profile.diet === "vegetarisch" ? "Skyr, Magerquark, Eier oder Hülsenfrüchte" : "Hähnchen, Fisch, Skyr oder Hülsenfrüchte";
      out.push(["warn", `Eiweiß: ${fmt(s.p)} von ${fmt(t.protein)} g. Gute Quellen: ${src}.`]);
    } else out.push(["good", `Eiweiß: ${fmt(s.p)} g – gut versorgt.`]);

    if (s.fi < t.fiber * 0.7) out.push(["warn", `Ballaststoffe: nur ${fmt(s.fi)} g (Ziel ≥ ${fmt(t.fiber)} g). Mehr Vollkorn, Gemüse, Hülsenfrüchte oder Leinsamen.`]);
    else out.push(["good", `Ballaststoffe: ${fmt(s.fi)} g – sehr gut.`]);

    if (s.f > t.fat * 1.2) out.push(["warn", "Recht viel Fett heute. Auf versteckte Fette in Käse, Wurst, Snacks und Fertiggerichten achten."]);

    const veg = day.entries.filter((e) => e.type === "og").reduce((a, e) => a + e.grams, 0);
    if (veg < 400) out.push(["warn", `Obst & Gemüse: ${fmt(veg)} g. Empfohlen sind rund 650 g pro Tag („5 am Tag“).`]);
    else out.push(["good", `Obst & Gemüse: ${fmt(veg)} g – prima!`]);
  }
  if (t) {
    const w = day.water / 1000;
    if (w < t.water * 0.75) out.push(["warn", `Trinken: ${fmt(w, 2)} von ${fmt(t.water, 1)} l. Stell dir ein Glas Wasser in Sichtweite.`]);
    else out.push(["good", `Trinken: ${fmt(w, 2)} l – gut hydriert.`]);
    if (t.bmi >= 25 && state.profile.goal >= 0) out.push(["", "Dein BMI liegt über 25. Ein moderates Kaloriendefizit (Ziel „Abnehmen“) könnte sinnvoll sein – im Zweifel ärztlich abklären."]);
    if (t.bmi < 18.5 && state.profile.goal < 0) out.push(["warn", "Bei Untergewicht ist Abnehmen nicht empfehlenswert. Bitte Ziel anpassen und ggf. ärztlich beraten lassen."]);
  }
  $("advice").innerHTML = out.map(([cls, txt]) => `<li class="${cls}">${escapeHtml(txt)}</li>`).join("");

  const diet = (state.profile && state.profile.diet) || "alles";
  $("ideas").innerHTML = IDEAS[diet].map(([m, d]) => `<div class="idea"><strong>${m}</strong><span>${d}</span></div>`).join("");
}

// ---------- Daten ----------

$("export").addEventListener("click", async () => {
  const json = JSON.stringify(state, null, 2);
  const name = `ernaehrung-backup-${isoDate(new Date())}.json`;
  const file = new File([json], name, { type: "application/json" });
  // iOS: Teilen-Dialog (Speichern in Dateien, AirDrop …), sonst Download
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "Ernährungs-Backup" }); return; }
    catch (e) { if (e.name === "AbortError") return; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$("import").addEventListener("change", async (ev) => {
  const file = ev.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (typeof data !== "object" || !data.days) throw new Error("format");
    if (!confirm("Aktuelle Daten durch das Backup ersetzen?")) return;
    state = Object.assign(emptyState(), data);
    save();
    renderAll();
    toast("Backup importiert");
  } catch (e) {
    toast("Datei ist kein gültiges Backup.");
  } finally {
    ev.target.value = "";
  }
});

$("reset").addEventListener("click", () => {
  if (!confirm("Wirklich alle Daten unwiderruflich löschen?")) return;
  state = emptyState();
  save();
  $("profile-form").reset();
  renderAll();
  toast("Alle Daten gelöscht");
});

// ---------- Start ----------

function renderAll() {
  fillProfileForm();
  renderResults();
  renderWeights();
  renderToday();
  renderAdvice();
}

function updateOnline() { $("offline-badge").hidden = navigator.onLine; }
window.addEventListener("online", updateOnline);
window.addEventListener("offline", updateOnline);

$("version").textContent = APP_VERSION;
updateOnline();
renderAll();
if (!state.profile) goto("profil");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
