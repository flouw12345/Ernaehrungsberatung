# Makro-Coach

Persönlicher Makro-Coach mit Ernährungstagebuch als Offline-Web-App (PWA), optimiert für das iPhone.

## Funktionen

- **Fragebogen:** Körperdaten, Schritte, Krafttraining, Abnehmtempo, Einkaufsregion (Deutschland/China), Ausschlüsse, Mahlzeiten pro Tag, Meal-Prep
- **Bedarf:** Grundumsatz als Mittelwert aus Mifflin-St Jeor, Harris-Benedict und (mit Körperfett) Katch-McArdle, PAL aus Schritten und Training, Kaloriendefizit mit Schutzgrenzen, Protein 2 g/kg, Fett, Kohlenhydrate, Ballaststoffe, Wasser
- **Ernährungsplan:** 7-Tage-Plan, Mengen automatisch auf deine Makros skaliert, mit Zubereitungshinweisen
- **Einkaufsliste:** Wochenbedarf auf Packungsgrößen gerundet, abhakbar, teilbar
- **Heute (Tagebuch):** Plan-Mahlzeiten mit einem Tipp als gegessen eintragen, ca. 120 Lebensmittel durchsuchen, eigene Lebensmittel anlegen, Wasser-Tracker, tägliche Auswertung mit Tipps
- **Gewicht & Check-in:** Wochendurchschnitte, Verlaufsdiagramm, automatische Kalorien-Empfehlung bei zu schnellem/zu langsamem Fortschritt
- **Einkaufsliste exportieren:** per Teilen/Kopieren nach Google Keep, Todoist, Microsoft To Do oder Apple Erinnerungen
- **iCloud-Abgleich:** Datei `makro-coach-sync.json` in iCloud Drive sichern und auf anderen Geräten laden; beim Laden wird zusammengeführt (neueste Änderung pro Tag/Messung gewinnt). Auch Backups aus dem Makro-Coach-Artefakt lassen sich laden
- **Offline & privat:** nach dem ersten Öffnen läuft alles ohne Internet, alle Daten bleiben auf dem Gerät; Gewicht als CSV

## Veröffentlichen (GitHub Pages)

1. Im Repository auf **Settings → Pages** gehen.
2. Unter *Build and deployment* bei **Source** „Deploy from a branch“ wählen, Branch **main**, Ordner **/ (root)**, speichern.
3. Nach ca. 1 Minute ist die App erreichbar unter
   `https://flouw12345.github.io/Ernaehrungsberatung/`

## Auf dem iPhone installieren

1. Die Adresse oben in **Safari** öffnen.
2. Auf **Teilen** tippen (Quadrat mit Pfeil nach oben).
3. **„Zum Home-Bildschirm“** wählen → **Hinzufügen**.
4. App einmal mit Internet öffnen – danach funktioniert sie komplett offline.

## Updates

Nach Änderungen an den Dateien in `sw.js` die Konstante `CACHE` hochzählen, damit die installierte App die neue Version lädt.

> Hinweis: Die berechneten Werte sind Richtwerte und ersetzen keine ärztliche oder professionelle Ernährungsberatung.
