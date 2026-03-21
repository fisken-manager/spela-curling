# Card-Based Upgrade Menu Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the upgrade menu as a collectible card game-style interface with horizontal scrolling, tier progression, and smooth animations.

**Architecture:** Create a new `CardMenu` class that replaces `BuyMenu`. Canvas-based rendering with card fan layout, purchasable cards on top, owned cards on bottom, buy button in middle. Tiers unlock progressively with pop-in animations.

**Tech Stack:** Canvas 2D rendering, existing state management, Pollinations AI for card art URLs

---

## Task 1: Create CardMenu Foundation

**Files:**
- Create: `scripts/cardMenu.js`

**Step 1: Create CardMenu class skeleton**

```javascript
export class CardMenu {
    constructor(state) {
        this.state = state;
        this.cards = this.initializeCards();
        this.images = {};
        this.selectedCardId = null;
        this.animationState = {
            enteringCards: [],
            exitingCards: [],
            purchaseAnimation: null
        };
        this.scrollOffset = 0;
        this.collectionScrollOffset = 0;
    }

    initializeCards() {
        return [
            {
                id: 'maxVelocity',
                name: 'Maxhastighet',
                tiers: [
                    { level: 1, cost: 1, effect: '+15% hastighet', image: null },
                    { level: 2, cost: 5, effect: '+30% hastighet', image: null },
                    { level: 3, cost: 20, effect: '+45% hastighet', image: null },
                    { level: 4, cost: 40, effect: '+60% hastighet', image: null },
                    { level: 5, cost: 65, effect: '+75% hastighet', image: null },
                ]
            },
            {
                id: 'frictionReduction',
                name: 'Minska Friktion',
                tiers: [
                    { level: 1, cost: 1, effect: '-15% friktion', image: null },
                    { level: 2, cost: 5, effect: '-30% friktion', image: null },
                    { level: 3, cost: 20, effect: '-45% friktion', image: null },
                    { level: 4, cost: 40, effect: '-60% friktion', image: null },
                    { level: 5, cost: 65, effect: '-75% friktion', image: null },
                ]
            },
            {
                id: 'stoneSize',
                name: 'Stenstorlek',
                tiers: [
                    { level: 1, cost: 1, effect: '+25% storlek', image: null },
                    { level: 2, cost: 5, effect: '+50% storlek', image: null },
                    { level: 3, cost: 20, effect: '+75% storlek', image: null },
                    { level: 4, cost: 40, effect: '+100% storlek', image: null },
                    { level: 5, cost: 65, effect: '+125% storlek', image: null },
                ]
            },
            {
                id: 'randomCurl',
                name: 'Random Curl',
                tiers: [
                    { level: 1, cost: 10, effect: 'Random snurr/10s', image: null },
                    { level: 2, cost: 20, effect: 'Random snurr/5s', image: null },
                ]
            },
            {
                id: 'noNegativePickups',
                name: 'Inga Negativa',
                tiers: [
                    { level: 1, cost: 10, effect: 'Ta bort negativa pickups', image: null },
                ]
            }
        ];
    }

    getAvailableUpgrades() {
        const available = [];
        for (const card of this.cards) {
            const currentLevel = this.state.upgrades[card.id]?.level || 0;
            if (currentLevel < card.tiers.length) {
                available.push({
                    ...card,
                    currentTier: card.tiers[currentLevel]
                });
            }
        }
        return available;
    }

    getOwnedUpgrades() {
        const owned = [];
        for (const card of this.cards) {
            const currentLevel = this.state.upgrades[card.id]?.level || 0;
            for (let i = 0; i < currentLevel; i++) {
                owned.push({
                    ...card,
                    tier: card.tiers[i],
                    tierLevel: i + 1
                });
            }
        }
        return owned;
    }

    canAfford(cardId) {
        const currentLevel = this.state.upgrades[cardId]?.level || 0;
        const card = this.cards.find(c => c.id === cardId);
        if (!card || currentLevel >= card.tiers.length) return false;
        return this.state.money >= card.tiers[currentLevel].cost;
    }

    purchase(cardId) {
        if (!this.canAfford(cardId)) return false;
        const currentLevel = this.state.upgrades[cardId]?.level || 0;
        const card = this.cards.find(c => c.id === cardId);
        const cost = card.tiers[currentLevel].cost;
        
        this.state.money -= cost;
        this.state.upgrades[cardId] = { level: currentLevel + 1 };
        return true;
    }

    handleClick(x, y) {
        // To be implemented in next task
        return null;
    }

    render(ctx, screenWidth, screenHeight) {
        // To be implemented in next task
    }
}
```

**Step 2: Add preloadImages method**

```javascript
    async preloadImages() {
        const allImages = [];
        for (const card of this.cards) {
            for (const tier of card.tiers) {
                if (tier.image) {
                    allImages.push(tier.image);
                }
            }
        }
        const uniqueImages = [...new Set(allImages)];
        for (const imagePath of uniqueImages) {
            try {
                const response = await fetch(`assets/${imagePath}`);
                if (response.ok) {
                    const blob = await response.blob();
                    this.images[imagePath] = await createImageBitmap(blob);
                }
            } catch (e) {
                console.warn(`Failed to load image: ${imagePath}`, e);
            }
        }
    }
```

**Step 3: Commit**

```bash
git add scripts/cardMenu.js
git commit -m "feat: create CardMenu class foundation"
```

---

## Task 2: Implement Card Rendering

**Files:**
- Modify: `scripts/cardMenu.js` (add render methods)

**Step 1: Add card rendering method**

```javascript
    drawCard(ctx, x, y, width, height, card, tier, isOwned = false, isSelected = false) {
        const scale = isSelected ? 1.15 : 1;
        const offsetY = isSelected ? -30 : 0;
        
        const drawX = x;
        const drawY = y + offsetY;
        const drawWidth = width * scale;
        const drawHeight = height * scale;
        
        // Card shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.roundRect(drawX + 4, drawY + 4, drawWidth, drawHeight, 12);
        ctx.fill();
        
        // Card background
        const gradient = ctx.createLinearGradient(drawX, drawY, drawX + drawWidth, drawY + drawHeight);
        if (isOwned) {
            gradient.addColorStop(0, '#1a2a1a');
            gradient.addColorStop(1, '#0d1f0d');
        } else {
            gradient.addColorStop(0, '#1e1e2e');
            gradient.addColorStop(1, '#141422');
        }
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(drawX, drawY, drawWidth, drawHeight, 12);
        ctx.fill();
        
        // Card border
        ctx.strokeStyle = isSelected ? '#ffd700' : (isOwned ? '#48bb78' : '#3a3a5a');
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.stroke();
        
        // Inner glow for selected
        if (isSelected) {
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 15;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
        
        // Image area (top 60%)
        const imageHeight = drawHeight * 0.6;
        const imageMargin = 8;
        
        if (this.images[tier.image]) {
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(drawX + imageMargin, drawY + imageMargin, drawWidth - imageMargin * 2, imageHeight - imageMargin, 8);
            ctx.clip();
            ctx.drawImage(this.images[tier.image], drawX + imageMargin, drawY + imageMargin, drawWidth - imageMargin * 2, imageHeight - imageMargin);
            ctx.restore();
        } else {
            // Placeholder gradient
            const imgGradient = ctx.createLinearGradient(drawX, drawY, drawX + drawWidth, drawY + imageHeight);
            imgGradient.addColorStop(0, '#2a2a4a');
            imgGradient.addColorStop(1, '#1a1a3a');
            ctx.fillStyle = imgGradient;
            ctx.beginPath();
            ctx.roundRect(drawX + imageMargin, drawY + imageMargin, drawWidth - imageMargin * 2, imageHeight - imageMargin, 8);
            ctx.fill();
        }
        
        // Text area (bottom 40%)
        const textY = drawY + imageHeight;
        const textHeight = drawHeight - imageHeight;
        
        // Text background
        ctx.fillStyle = 'rgba(10, 10, 20, 0.9)';
        ctx.beginPath();
        ctx.roundRect(drawX + imageMargin, textY - 5, drawWidth - imageMargin * 2, textHeight + 5, [0, 8, 8, 0]);
        ctx.fill();
        
        // Card name with tier
        ctx.font = `bold ${14 * scale}px "Work Sans", sans-serif`;
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const tierRoman = ['I', 'II', 'III', 'IV', 'V'][tier.level - 1] || tier.level;
        ctx.fillText(`${card.name} ${tierRoman}`, drawX + 12, textY + 8);
        
        // Effect text
        ctx.font = `${11 * scale}px "Work Sans", sans-serif`;
        ctx.fillStyle = '#a0a0b0';
        ctx.fillText(tier.effect, drawX + 12, textY + 28);
        
        // Cost badge
        if (!isOwned) {
            const costText = `$${tier.cost}`;
            ctx.font = `bold ${12 * scale}px "Space Mono", monospace`;
            const costWidth = ctx.measureText(costText).width;
            
            ctx.fillStyle = this.canAfford(card.id) ? '#ffd700' : '#5a5a6a';
            ctx.textAlign = 'right';
            ctx.fillText(costText, drawX + drawWidth - 12, textY + 28);
        }
        
        return { x: drawX, y: drawY, width: drawWidth, height: drawHeight };
    }
```

**Step 2: Commit**

```bash
git add scripts/cardMenu.js
git commit -m "feat: add card rendering method"
```

---

## Task 3: Implement Menu Layout

**Files:**
- Modify: `scripts/cardMenu.js` (add full render method)

**Step 1: Add main render method**

```javascript
    render(ctx, screenWidth, screenHeight) {
        // Dark background with noise texture
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, screenWidth, screenHeight);
        
        // Subtle noise overlay (using a pattern)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * screenWidth;
            const y = Math.random() * screenHeight;
            ctx.fillRect(x, y, 1, 1);
        }
        
        // Layout zones
        const padding = 20;
        const purchasableZoneHeight = screenHeight * 0.55;
        const middleZoneHeight = screenHeight * 0.15;
        const collectionZoneHeight = screenHeight * 0.30;
        
        // --- Purchasable Cards (Top) ---
        const available = this.getAvailableUpgrades();
        if (available.length > 0) {
            this.renderPurchasableZone(ctx, screenWidth, purchasableZoneHeight, available, padding);
        }
        
        // --- Buy Button Zone (Middle) ---
        const middleY = purchasableZoneHeight;
        this.renderBuyZone(ctx, screenWidth, middleY, middleZoneHeight);
        
        // --- Owned Collection (Bottom) ---
        const owned = this.getOwnedUpgrades();
        const collectionY = purchasableZoneHeight + middleZoneHeight;
        if (owned.length > 0) {
            this.renderCollectionZone(ctx, screenWidth, collectionY, collectionZoneHeight, owned, padding);
        }
    }
    
    renderPurchasableZone(ctx, screenWidth, height, available, padding) {
        // Zone title
        ctx.font = 'bold 18px "Work Sans", sans-serif';
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'center';
        ctx.fillText('UPPGRADERINGAR', screenWidth / 2, 40);
        
        // Money display
        ctx.font = 'bold 22px "Space Mono", monospace';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`$${Math.floor(this.state.money)}`, screenWidth / 2, 65);
        
        // Card dimensions
        const cardWidth = Math.min(180, (screenWidth - padding * 2 - 30) / Math.min(available.length, 4));
        const cardHeight = cardWidth * 1.4;
        const cardSpacing = cardWidth * 0.3;
        
        const totalWidth = available.length * cardWidth + (available.length - 1) * cardSpacing;
        const startX = (screenWidth - totalWidth) / 2;
        const cardY = height - cardHeight - 20;
        
        for (let i = 0; i < available.length; i++) {
            const card = available[i];
            const tier = card.currentTier;
            const x = startX + i * (cardWidth + cardSpacing);
            const isSelected = this.selectedCardId === card.id;
            
            this.drawCard(ctx, x, cardY, cardWidth, cardHeight, card, tier, false, isSelected);
        }
    }
    
    renderBuyZone(ctx, screenWidth, y, height) {
        if (!this.selectedCardId) {
            ctx.font = '14px "Work Sans", sans-serif';
            ctx.fillStyle = '#5a5a7a';
            ctx.textAlign = 'center';
            ctx.fillText('Välj ett kort för att köpa', screenWidth / 2, y + height / 2);
            return;
        }
        
        const card = this.cards.find(c => c.id === this.selectedCardId);
        if (!card) return;
        
        const currentLevel = this.state.upgrades[this.selectedCardId]?.level || 0;
        const tier = card.tiers[currentLevel];
        const canAfford = this.canAfford(this.selectedCardId);
        
        // Buy button
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonX = (screenWidth - buttonWidth) / 2;
        const buttonY = y + (height - buttonHeight) / 2;
        
        // Button background
        const gradient = ctx.createLinearGradient(buttonX, buttonY, buttonX + buttonWidth, buttonY + buttonHeight);
        if (canAfford) {
            gradient.addColorStop(0, '#2d4a2d');
            gradient.addColorStop(1, '#1a351a');
        } else {
            gradient.addColorStop(0, '#3a3a4a');
            gradient.addColorStop(1, '#2a2a3a');
        }
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
        ctx.fill();
        
        // Button border
        ctx.strokeStyle = canAfford ? '#48bb78' : '#4a4a5a';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Button text
        ctx.font = 'bold 18px "Work Sans", sans-serif';
        ctx.fillStyle = canAfford ? '#48bb78' : '#7a7a8a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(canAfford ? `KÖP - $${tier.cost}` : `BEHÖVER $${tier.cost}`, screenWidth / 2, buttonY + buttonHeight / 2);
        
        this.buyButtonBounds = { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight };
    }
    
    renderCollectionZone(ctx, screenWidth, y, height, owned, padding) {
        // Zone title
        ctx.font = 'bold 14px "Work Sans", sans-serif';
        ctx.fillStyle = '#48bb78';
        ctx.textAlign = 'center';
        ctx.fillText('DINA KORT', screenWidth / 2, y + 20);
        
        // Smaller cards for collection
        const cardWidth = Math.min(100, (screenWidth - padding * 2) / Math.max(owned.length, 1));
        const cardHeight = cardWidth * 1.4;
        const cardSpacing = cardWidth * 0.15;
        
        const totalWidth = owned.length * cardWidth + (owned.length - 1) * cardSpacing;
        const startX = (screenWidth - totalWidth) / 2;
        const cardY = y + height - cardHeight - 10;
        
        for (let i = 0; i < owned.length; i++) {
            const item = owned[i];
            const x = startX + i * (cardWidth + cardSpacing);
            
            this.drawCard(ctx, x, cardY, cardWidth, cardHeight, item, item.tier, true, false);
        }
    }
```

**Step 2: Commit**

```bash
git add scripts/cardMenu.js
git commit -m "feat: implement menu layout rendering"
```

---

## Task 4: Implement Click Handling and Animations

**Files:**
- Modify: `scripts/cardMenu.js` (add click handling and animations)

**Step 1: Add click handling**

```javascript
    handleClick(x, y) {
        // Check buy button
        if (this.buyButtonBounds && this.selectedCardId) {
            const { x: bx, y: by, width: bw, height: bh } = this.buyButtonBounds;
            if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) {
                if (this.purchase(this.selectedCardId)) {
                    this.animationState.purchaseAnimation = { cardId: this.selectedCardId, progress: 0 };
                    this.selectedCardId = null;
                    return { action: 'purchased' };
                }
                if (this.state.upgrades[this.selectedCardId]?.level >= this.cards.find(c => c.id === this.selectedCardId).tiers.length) {
                    this.selectedCardId = null;
                }
            }
        }
        
        // Check purchasable cards
        const available = this.getAvailableUpgrades();
        const padding = 20;
        const cardWidth = Math.min(180, (window.innerWidth - padding * 2 - 30) / Math.min(available.length, 4));
        const cardHeight = cardWidth * 1.4;
        const cardSpacing = cardWidth * 0.3;
        const totalWidth = available.length * cardWidth + (available.length - 1) * cardSpacing;
        const startX = (window.innerWidth - totalWidth) / 2;
        const purchasableZoneHeight = window.innerHeight * 0.55;
        const cardY = purchasableZoneHeight - cardHeight - 20;
        
        for (let i = 0; i < available.length; i++) {
            const card = available[i];
            const cx = startX + i * (cardWidth + cardSpacing);
            const isSelected = this.selectedCardId === card.id;
            const scale = isSelected ? 1.15 : 1;
            const offsetY = isSelected ? -30 : 0;
            const actualWidth = cardWidth * scale;
            const actualHeight = cardHeight * scale;
            const actualX = cx;
            const actualY = cardY + offsetY;
            
            if (x >= actualX && x <= actualX + actualWidth && y >= actualY && y <= actualY + actualHeight) {
                this.selectedCardId = card.id;
                return null;
            }
        }
        
        // Click outside cards - deselect
        this.selectedCardId = null;
        return null;
    }
```

**Step 2: Add animation state update**

```javascript
    update(deltaTime) {
        // Update any ongoing animations
        if (this.animationState.purchaseAnimation) {
            this.animationState.purchaseAnimation.progress += deltaTime * 3;
            if (this.animationState.purchaseAnimation.progress >= 1) {
                this.animationState.purchaseAnimation = null;
            }
        }
    }
```

**Step 3: Commit**

```bash
git add scripts/cardMenu.js
git commit -m "feat: add click handling and animation state"
```

---

## Task 5: Integrate CardMenu into Game

**Files:**
- Modify: `scripts/game.js:8,17,163-165,197-199`
- Modify: `scripts/input.js:61-71`

**Step 1: Update game.js imports and initialization**

```javascript
// Line 8: Change import
import { CardMenu } from './cardMenu.js';

// Line 17: Change variable name
let cardMenu = null;

// Lines 163-165: Update initialization
cardMenu = new CardMenu(state);
input = new InputHandler(canvas, state, physics, audio);
input.setCardMenu(cardMenu);

// Lines 197-199: Update render call
if (state.showBuyMenu) {
    const ctx = renderer.ctx;
    cardMenu.render(ctx, state.screenWidth, state.screenHeight);
}
```

**Step 2: Update input.js to use CardMenu**

```javascript
// Line 7: Change property name
this.cardMenu = null;

// Lines 15-16: Change setter
setCardMenu(cardMenu) {
    this.cardMenu = cardMenu;
}

// Lines 61-71: Update click handling
if (this.state.showBuyMenu && this.cardMenu) {
    const result = this.cardMenu.handleClick(pointerX, pointerY);
    if (result && result.action === 'purchased') {
        // Purchase handled in cardMenu
    }
    return;
}
```

**Step 3: Commit**

```bash
git add scripts/game.js scripts/input.js
git commit -m "feat: integrate CardMenu into game"
```

---

## Task 6: Add Card Images via Pollinations

**Files:**
- Modify: `scripts/cardMenu.js` (initializeCards method)

**Step 1: Add Pollinations image URLs to cards**

```javascript
    initializeCards() {
        return [
            {
                id: 'maxVelocity',
                name: 'Maxhastighet',
                tiers: [
                    { level: 1, cost: 1, effect: '+15% hastighet', image: 'https://image.pollinations.ai/prompt/anime%20girl%20speed%20lightning%20dramatic%20colorful?width=400&height=600' },
                    { level: 2, cost: 5, effect: '+30% hastighet', image: 'https://image.pollinations.ai/prompt/anime%20girl%20speed%20wind%20blue%20streaks?width=400&height=600' },
                    { level: 3, cost: 20, effect: '+45% hastighet', image: 'https://image.pollinations.ai/prompt/anime%20girl%20speed%20thunder%20yellow%20electric?width=400&height=600' },
                    { level: 4, cost: 40, effect: '+60% hastighet', image: 'https://image.pollinations.ai/prompt/anime%20girl%20speed%20cosmic%20purple%20warp?width=400&height=600' },
                    { level: 5, cost: 65, effect: '+75% hastighet', image: 'https://image.pollinations.ai/prompt/anime%20girl%20speed%20ultimate%20golden%20aura?width=400&height=600' },
                ]
            },
            {
                id: 'frictionReduction',
                name: 'Minska Friktion',
                tiers: [
                    { level: 1, cost: 1, effect: '-15% friktion', image: 'https://image.pollinations.ai/prompt/anime%20girl%20ice%20crystal%20blue%20cold?width=400&height=600' },
                    { level: 2, cost: 5, effect: '-30% friktion', image: 'https://image.pollinations.ai/prompt/anime%20girl%20ice%20frost%20silver%20flowing?width=400&height=600' },
                    { level: 3, cost: 20, effect: '-45% friktion', image: 'https://image.pollinations.ai/prompt/anime%20girl%20ice%20glacier%20white%20mist?width=400&height=600' },
                    { level: 4, cost: 40, effect: '-60% friktion', image: 'https://image.pollinations.ai/prompt/anime%20girl%20ice%20frozen%20diamond%20shine?width=400&height=600' },
                    { level: 5, cost: 65, effect: '-75% friktion', image: 'https://image.pollinations.ai/prompt/anime%20girl%20ice%20absolute%20zero%20transcendent?width=400&height=600' },
                ]
            },
            {
                id: 'stoneSize',
                name: 'Stenstorlek',
                tiers: [
                    { level: 1, cost: 1, effect: '+25% storlek', image: 'https://image.pollinations.ai/prompt/anime%20girl%20strong%20muscular%20red%20power?width=400&height=600' },
                    { level: 2, cost: 5, effect: '+50% storlek', image: 'https://image.pollinations.ai/prompt/anime%20girl%20strong%20boulder%20orange%20lift?width=400&height=600' },
                    { level: 3, cost: 20, effect: '+75% storlek', image: 'https://image.pollinations.ai/prompt/anime%20girl%20strong%20mountain%20brown%20earth?width=400&height=600' },
                    { level: 4, cost: 40, effect: '+100% storlek', image: 'https://image.pollinations.ai/prompt/anime%20girl%20strong%20titan%20gold%20massive?width=400&height=600' },
                    { level: 5, cost: 65, effect: '+125% storlek', image: 'https://image.pollinations.ai/prompt/anime%20girl%20strong%20colossus%20divine%20giant?width=400&height=600' },
                ]
            },
            {
                id: 'randomCurl',
                name: 'Random Curl',
                tiers: [
                    { level: 1, cost: 10, effect: 'Random snurr/10s', image: 'https://image.pollinations.ai/prompt/anime%20girl%20spin%20vortex%20purple%20spiral?width=400&height=600' },
                    { level: 2, cost: 20, effect: 'Random snurr/5s', image: 'https://image.pollinations.ai/prompt/anime%20girl%20spin%20chaos%20pink%20swirl?width=400&height=600' },
                ]
            },
            {
                id: 'noNegativePickups',
                name: 'Inga Negativa',
                tiers: [
                    { level: 1, cost: 10, effect: 'Ta bort negativa pickups', image: 'https://image.pollinations.ai/prompt/anime%20girl%20shield%20guardian%20white%20protect?width=400&height=600' },
                ]
            }
        ];
    }
```

**Step 2: Update preloadImages to handle URLs**

```javascript
    async preloadImages() {
        const allUrls = [];
        for (const card of this.cards) {
            for (const tier of card.tiers) {
                if (tier.image && !tier.image.startsWith('http')) {
                    // Local asset
                    allUrls.push({ type: 'local', path: tier.image });
                } else if (tier.image) {
                    // Pollinations URL
                    allUrls.push({ type: 'url', url: tier.image });
                }
            }
        }
        
        for (const item of allUrls) {
            try {
                let bitmap;
                if (item.type === 'local') {
                    const response = await fetch(`assets/${item.path}`);
                    if (response.ok) {
                        const blob = await response.blob();
                        bitmap = await createImageBitmap(blob);
                        this.images[item.path] = bitmap;
                    }
                } else {
                    // For Pollinations, load via ImageBitmap
                    const response = await fetch(item.url);
                    if (response.ok) {
                        const blob = await response.blob();
                        bitmap = await createImageBitmap(blob);
                        this.images[item.url] = bitmap;
                    }
                }
            } catch (e) {
                console.warn(`Failed to load image:`, e);
            }
        }
    }
```

**Step 3: Commit**

```bash
git add scripts/cardMenu.js
git commit -m "feat: add Pollinations AI image URLs for cards"
```

---

## Task 7: Add Pop-in Animation for New Cards

**Files:**
- Modify: `scripts/cardMenu.js` (render method)

**Step 1: Add pop-in animation rendering**

```javascript
    drawCardWithAnimation(ctx, x, y, width, height, card, tier, isOwned, isSelected, animation) {
        if (animation && animation.progress < 1) {
            // Pop-in animation: scale from 0 to 1 with spring easing
            const t = animation.progress;
            const spring = 1 + Math.sin(t * Math.PI * 0.5) * 0.2; // Overshoot
            const scale = spring * t;
            
            ctx.save();
            ctx.translate(x + width / 2, y + height / 2);
            ctx.scale(scale, scale);
            ctx.translate(-width / 2, -height / 2);
            ctx.globalAlpha = t;
            
            this.drawCard(ctx, -width/2, -height/2, width, height, card, tier, isOwned, isSelected);
            
            ctx.restore();
        } else {
            this.drawCard(ctx, x, y, width, height, card, tier, isOwned, isSelected);
        }
    }
```

**Step 2: Update collection zone to use animations**

Add animation tracking for newly purchased cards in the purchase method and render them with the animation.

**Step 3: Commit**

```bash
git add scripts/cardMenu.js
git commit -m "feat: add pop-in animation for newly purchased cards"
```

---

## Task 8: Test and Verify

**Step 1: Start local server and test**

```bash
cd /home/ivo/projects/spela-curling && python -m http.server 8080
```

Open browser to `http://localhost:8080`, trigger buy menu, verify:
- Cards render in two zones
- Clicking cards selects them
- Buy button appears when card selected
- Purchase works and moves card to collection
- New cards pop in with animation

**Step 2: Fix any issues found during testing**

**Step 3: Commit remaining fixes**

```bash
git add -A
git commit -m "fix: resolve card menu integration issues"
```

---

## Task 9: Remove Old BuyMenu

**Files:**
- Modify: `scripts/game.js` (remove old import)
- Modify: `scripts/input.js` (remove old references)
- Delete: `scripts/buyMenu.js`

**Step 1: Remove old references**

```bash
git rm scripts/buyMenu.js
git add scripts/game.js scripts/input.js
git commit -m "refactor: remove old BuyMenu in favor of CardMenu"
```