# 🥌 Spela Curling - Kanban Board

Ett enkelt Kanban-system direkt i repot.

---

## ✅ DONE

- [x] **Pickup-färger** - Negativa pickups måste ha egna färger (inte röd - röd är för liv)
  - ✅ Curl Chaos: Brun (var röd)
- [x] **Pickup-färger del 2** - Ändra färg på sweep eller big pickup så båda inte är gröna  
  - ✅ Sweep: Cyan (var grön), Growth förblir grön
  - ✅ Size Shrink: Grå (var lila)
- [x] **Shop-animering** - Shop vid loop-slut ska använda samma animate-in som power-up shops
- [x] **Shop-musik** - Stoppa spelmusik och spela shop-musik i alla shops (konsekvent beteende)
- [x] **Kvastens Vila (frozen_broom)** - Lade till grace period (0.5s) för att undvika att bonus förverkas av finger-rörelse vid upplockning
- [x] **Grytans Glip** - Ny uppgradering: Pac-Man style vägg-wrapping, $5 (åk genom väggen utan att trigga vägg-effekter), chibi waifu-bild med blått hår och blåvita kläder
- [x] **Sillens Sista Dans** - Ny uppgradering: 0 liv = +50% maxfart, 1+ liv = -50% maxfart, $5, chibi waifu dansar med sill
- [x] **Test-version: Gratis rerolls** - På test-versionen är rerolls gratis för enklare testning

---

## 🚧 IN PROGRESS

*(tomt just nu)*

---

## ✅ DONE

- [x] **GitHub Pages miljöer** - Main (prod) + test (staging). ✅ LIVE:
  - Prod: https://fisken-manager.github.io/spela-curling/
  - Test: https://fisken-manager.github.io/spela-curling/test/

---

## Hur man använder detta

1. **Lägg till uppgift:** Skriv under rätt kolumn
2. **Påbörja:** Flytta från TODO till IN PROGRESS
3. **Klart:** Flytta till DONE
4. **Commit:** `git add KANBAN.md && git commit -m "Uppdaterat kanban"`
