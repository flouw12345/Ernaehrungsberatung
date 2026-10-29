# Ernährungsberater

Persönlicher Ernährungsberater als Offline-Web-App (PWA), optimiert für das iPhone.

## Funktionen

- **Profil:** BMI, Grundumsatz, Gesamtumsatz (Mifflin-St-Jeor), Kalorienziel, Eiweiß, Kohlenhydrate, Fett, Ballaststoffe und Wasserbedarf
- **Ernährungstagebuch:** ca. 90 Lebensmittel mit Nährwerten, eigene Lebensmittel anlegen, Mahlzeiten pro Tag
- **Wasser-Tracker** und **Gewichtsverlauf** mit Diagramm
- **Beratung:** tägliche Auswertung mit konkreten Tipps und Mahlzeitenideen (Mischkost, vegetarisch, vegan)
- **Offline:** nach dem ersten Öffnen läuft alles ohne Internet
- **Datenschutz:** alle Daten bleiben auf dem Gerät; Backup per Export/Import (JSON)

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
