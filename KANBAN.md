# 🥌 Spela Curling - Kanban Board

> *"Man ska inte måla om båten medan den ligger på isen."*

Ett enkelt Kanban-system direkt i repot. Flytta saker mellan kolumner genom att klippa och klistra.

---

## 📋 TODO

- [ ] **Ljudsystem** - Lägg till ljudeffekter för stenkollisioner, söpande, och poäng
- [ ] **Highscore-sparande** - LocalStorage för highscores och statistik
- [ ] **Fler banor/nivåer** - Olika isbanor med unika fysikegenskaper
- [ ] **Tutorial/första start** - Introsekvens för nya spelare
- [ ] **Mobil-optimering** - Touch-kontroller och responsiv layout
- [ ] **Prestanda-optimering** - Culling och particle pooling
- [ ] **Accessibility** - ARIA-labels, kontrast, tangentbordsnavigering
- [ ] **CI/CD** - GitHub Actions för deploy till Pages

---

## 🚧 IN PROGRESS

- [ ] **Balansering av ekonomi** - Justera priser och inkomster från upgrades

---

## ✅ DONE

- [x] Grundläggande fysikmotor (stenrörelse, kollisioner)
- [x] Fisheye-effekter (barrel, perspective)
- [x] Upgrades-system med shop
- [x] Dev-tools för debugging
- [x] GitHub Pages publicering

---

## 🐛 BUGS

- [ ] Stenar kan ibland fastna i väggen vid hög hastighet
- [ ] Fisheye-effekten flackar på vissa skärmar
- [ ] Shop-knappen syns inte alltid på mobila enheter

---

## 💡 IDEAS / BACKLOG

- Multiplayer-läge (lokal eller online)
- AI-motståndare
- Custom skins för stenar
- Säsongsbetonade event
- Integration med curling.db för riktiga lag
- Export av replay-GIF
- Lägg till musik från Suno/ElevenLabs

---

## Hur man använder detta

1. **Lägg till uppgift:** Skriv under rätt kolumn
2. **Påbörja:** Flytta från TODO till IN PROGRESS
3. **Klart:** Flytta till DONE
4. **Commit:** `git add KANBAN.md && git commit -m "Uppdaterat kanban"`

*"Även en stannad klocka kan sopa rätt två gånger om dagen."*
