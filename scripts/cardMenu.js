export class CardMenu {
    constructor(state) {
        this.state = state;
        this.cards = this.initializeCards();
        this.images = {};
        this.selectedCardId = null;
        this.clickAreas = [];
        this.cardBounds = [];
        this.buyButtonBounds = null;
        this.continueButtonBounds = null;
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
                    { level: 1, cost: 1, effect: '+15% hastighet', image: 'waifu-speed.jpg' },
                    { level: 2, cost: 5, effect: '+30% hastighet', image: 'waifu-speed.jpg' },
                    { level: 3, cost: 20, effect: '+45% hastighet', image: 'waifu-speed.jpg' },
                    { level: 4, cost: 40, effect: '+60% hastighet', image: 'waifu-speed.jpg' },
                    { level: 5, cost: 65, effect: '+75% hastighet', image: 'waifu-speed.jpg' },
                ]
            },
            {
                id: 'frictionReduction',
                name: 'Minska Friktion',
                tiers: [
                    { level: 1, cost: 1, effect: '-15% friktion', image: 'waifu-friction.jpg' },
                    { level: 2, cost: 5, effect: '-30% friktion', image: 'waifu-friction.jpg' },
                    { level: 3, cost: 20, effect: '-45% friktion', image: 'waifu-friction.jpg' },
                    { level: 4, cost: 40, effect: '-60% friktion', image: 'waifu-friction.jpg' },
                    { level: 5, cost: 65, effect: '-75% friktion', image: 'waifu-friction.jpg' },
                ]
            },
            {
                id: 'stoneSize',
                name: 'Stenstorlek',
                tiers: [
                    { level: 1, cost: 1, effect: '+25% storlek', image: 'waifu-size.jpg' },
                    { level: 2, cost: 5, effect: '+50% storlek', image: 'waifu-size.jpg' },
                    { level: 3, cost: 20, effect: '+75% storlek', image: 'waifu-size.jpg' },
                    { level: 4, cost: 40, effect: '+100% storlek', image: 'waifu-size.jpg' },
                    { level: 5, cost: 65, effect: '+125% storlek', image: 'waifu-size.jpg' },
                ]
            },
            {
                id: 'randomCurl',
                name: 'Random Curl',
                tiers: [
                    { level: 1, cost: 10, effect: 'Random snurr/10s', image: 'waifu-curl.jpg' },
                    { level: 2, cost: 20, effect: 'Random snurr/5s', image: 'waifu-curl.jpg' },
                ]
            },
            {
                id: 'noNegativePickups',
                name: 'Inga Negativa',
                tiers: [
                    { level: 1, cost: 10, effect: 'Ta bort negativa pickups', image: 'waifu-shield.jpg' },
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

        this.animationState.enteringCards.push({
            cardId,
            tierLevel: currentLevel + 1,
            progress: 0
        });

        return true;
    }

    handleClick(x, y) {
        if (this.continueButtonBounds) {
            const cb = this.continueButtonBounds;
            if (x >= cb.x && x <= cb.x + cb.width &&
                y >= cb.y && y <= cb.y + cb.height) {
                return { action: 'continue' };
            }
        }

        if (this.buyButtonBounds) {
            const bb = this.buyButtonBounds;
            if (x >= bb.x && x <= bb.x + bb.width &&
                y >= bb.y && y <= bb.y + bb.height) {
                if (this.selectedCardId && this.canAfford(this.selectedCardId)) {
                    this.purchase(this.selectedCardId);
                    return { action: 'purchase', upgradeId: this.selectedCardId };
                }
            }
        }

        for (const bounds of this.cardBounds) {
            if (x >= bounds.x && x <= bounds.x + bounds.width &&
                y >= bounds.y && y <= bounds.y + bounds.height) {
                if (this.selectedCardId === bounds.cardId) {
                    this.selectedCardId = null;
                } else {
                    this.selectedCardId = bounds.cardId;
                }
                return null;
            }
        }

        this.selectedCardId = null;
        return null;
    }

    update(deltaTime) {
        if (this.animationState.purchaseAnimation) {
            this.animationState.purchaseAnimation.progress += deltaTime * 3;
            if (this.animationState.purchaseAnimation.progress >= 1) {
                this.animationState.purchaseAnimation = null;
            }
        }

        this.animationState.enteringCards = this.animationState.enteringCards.filter(anim => {
            anim.progress += deltaTime * 2;
            return anim.progress < 1;
        });
    }

    drawCard(ctx, x, y, width, height, card, tier, isOwned = false, isSelected = false, showText = false) {
        const cornerRadius = 14;
        const shadowOffset = 4;

        ctx.beginPath();
        ctx.roundRect(x + shadowOffset, y + shadowOffset, width, height, cornerRadius);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fill();

        const bgGradient = ctx.createLinearGradient(x, y, x + width, y + height);
        bgGradient.addColorStop(0, '#2a2a3a');
        bgGradient.addColorStop(1, '#1a1a28');

        ctx.beginPath();
        ctx.roundRect(x, y, width, height, cornerRadius);
        ctx.fillStyle = bgGradient;
        ctx.fill();

        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeStyle = isSelected ? '#ffd700' : 'rgba(255, 255, 255, 0.2)';
        ctx.stroke();

        if (isSelected) {
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(x, y, width, height, cornerRadius);
            ctx.clip();
            
            const innerGlow = ctx.createRadialGradient(
                x + width / 2, y + height / 2, 0,
                x + width / 2, y + height / 2, Math.max(width, height) * 0.7
            );
            innerGlow.addColorStop(0, 'rgba(255, 215, 0, 0.15)');
            innerGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
            ctx.fillStyle = innerGlow;
            ctx.fillRect(x, y, width, height);
            ctx.restore();
        }

        const imagePadding = 6;
        const imageX = x + imagePadding;
        const imageY = y + imagePadding;
        const imageWidth = width - imagePadding * 2;
        const imageHeight = height - imagePadding * 2;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(imageX, imageY, imageWidth, imageHeight, cornerRadius - 2);
        ctx.clip();

        const tierKey = card.tiers[tier.level - 1]?.image;
        const hasImage = tierKey && this.images[tierKey];

        if (hasImage) {
            ctx.drawImage(this.images[tierKey], imageX, imageY, imageWidth, imageHeight);
        } else {
            const placeholderGradient = ctx.createLinearGradient(imageX, imageY, imageX + imageWidth, imageY + imageHeight);
            placeholderGradient.addColorStop(0, '#3a3a5a');
            placeholderGradient.addColorStop(1, '#202038');
            ctx.fillStyle = placeholderGradient;
            ctx.fillRect(imageX, imageY, imageWidth, imageHeight);
        }
        ctx.restore();

        if (isSelected) {
            const badgeWidth = 36;
            const badgeHeight = 20;
            const badgeX = x + width - badgeWidth - 6;
            const badgeY = y + height - badgeHeight - 6;

            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 4);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fill();

            ctx.font = 'bold 11px "Space Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffd700';
            ctx.fillText(`$${tier.cost}`, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
        }

        if (isOwned) {
            const checkSize = 20;
            const checkX = x + width - checkSize - 8;
            const checkY = y + 8;

            ctx.beginPath();
            ctx.arc(checkX + checkSize / 2, checkY + checkSize / 2, checkSize / 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(72, 187, 120, 0.9)';
            ctx.fill();

            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(checkX + checkSize * 0.25, checkY + checkSize * 0.5);
            ctx.lineTo(checkX + checkSize * 0.45, checkY + checkSize * 0.7);
            ctx.lineTo(checkX + checkSize * 0.75, checkY + checkSize * 0.3);
            ctx.stroke();
        }

        return { x, y, width, height };
    }

    drawCardWithAnimation(ctx, x, y, width, height, card, tier, isOwned, isSelected, animation) {
        if (animation && animation.progress < 1) {
            const t = animation.progress;
            const spring = 1 + Math.sin(t * Math.PI * 0.5) * 0.2;
            const scale = spring * t;
            const alpha = t;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(x + width / 2, y + height / 2);
            ctx.scale(scale, scale);
            this.drawCard(ctx, -width / 2, -height / 2, width, height, card, tier, isOwned, isSelected);
            ctx.restore();
            return { x: x, y: y, width, height };
        } else {
            return this.drawCard(ctx, x, y, width, height, card, tier, isOwned, isSelected);
        }
    }

    render(ctx, screenWidth, screenHeight) {
        this.clickAreas = [];
        this.buyButtonBounds = null;
        this.continueButtonBounds = null;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        const padding = 16;
        const purchasableHeight = screenHeight * 0.60;
        const buyZoneHeight = screenHeight * 0.25;
        const collectionHeight = screenHeight * 0.15;

        const available = this.getAvailableUpgrades();
        const owned = this.getOwnedUpgrades();

        this.renderPurchasableZone(ctx, screenWidth, purchasableHeight, available, padding);

        const buyZoneY = purchasableHeight;
        this.renderBuyZone(ctx, screenWidth, buyZoneY, buyZoneHeight);

        const collectionY = purchasableHeight + buyZoneHeight;
        this.renderCollectionZone(ctx, screenWidth, collectionY, collectionHeight, owned, padding);
    }

    renderPurchasableZone(ctx, screenWidth, height, available, padding) {
        const titleY = padding + 10;
        ctx.font = 'bold 24px "Space Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#ffd700';
        ctx.fillText('UPPGRADERINGAR', screenWidth / 2, titleY);

        ctx.font = 'bold 20px "Space Mono", monospace';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`$${Math.floor(this.state.money)}`, screenWidth / 2, titleY + 35);

        if (available.length === 0) {
            ctx.font = '18px "Work Sans", sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('Alla uppgraderingar köpta!', screenWidth / 2, height / 2 + 50);
            return;
        }

        const cardHeight = height - 180;
        const cardWidth = Math.min(140, (screenWidth - padding * 2) / available.length + 40);
        const overlap = cardWidth * 0.3;
        const totalWidth = available.length > 1 
            ? cardWidth + (available.length - 1) * (cardWidth - overlap)
            : cardWidth;
        const startX = (screenWidth - totalWidth) / 2;
        const baseY = padding + 70;

        this.cardBounds = [];

        const selectedIndex = available.findIndex(c => c.id === this.selectedCardId);

        for (let i = 0; i < available.length; i++) {
            if (i === selectedIndex) continue;

            const card = available[i];
            const isSelected = false;
            const canBuy = this.canAfford(card.id);
            const x = startX + i * (cardWidth - overlap);
            const y = baseY;

            const bounds = this.drawCard(ctx, x, y, cardWidth, cardHeight, card, card.currentTier, false, false);

            this.cardBounds.push({
                ...bounds,
                cardId: card.id,
                canBuy
            });
        }

        if (selectedIndex >= 0) {
            const card = available[selectedIndex];
            const canBuy = this.canAfford(card.id);
            const x = startX + selectedIndex * (cardWidth - overlap);
            const y = baseY - 20;
            const scale = 1.05;

            const drawX = x - (cardWidth * scale - cardWidth) / 2;
            const drawY = y;
            const drawWidth = cardWidth * scale;
            const drawHeight = cardHeight * scale;

            const bounds = this.drawCard(ctx, drawX, drawY, drawWidth, drawHeight, card, card.currentTier, false, true);

            this.cardBounds.push({
                ...bounds,
                cardId: card.id,
                canBuy
            });
        }
    }

    renderBuyZone(ctx, screenWidth, y, height) {
        const centerX = screenWidth / 2;

        if (!this.selectedCardId) {
            ctx.font = '16px "Work Sans", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#718096';
            ctx.fillText('Välj ett kort för att köpa', centerX, y + height / 2);
            
            const buttonY = y + height - 50;
            this.continueButtonBounds = {
                x: centerX - 100,
                y: buttonY,
                width: 200,
                height: 40
            };
            this.drawContinueButton(ctx, centerX - 100, buttonY, 200, 40);
            return;
        }

        const selectedCard = this.cards.find(c => c.id === this.selectedCardId);
        if (!selectedCard) return;

        const currentLevel = this.state.upgrades[this.selectedCardId]?.level || 0;
        const tier = selectedCard.tiers[currentLevel];
        if (!tier) return;

        const canBuy = this.canAfford(this.selectedCardId);

        const romanNumerals = ['I', 'II', 'III', 'IV', 'V'];
        const tierNumeral = romanNumerals[tier.level - 1] || 'I';

        ctx.font = 'bold 18px "Work Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`${selectedCard.name} ${tierNumeral}`, centerX, y + 30);

        ctx.font = '14px "Work Sans", sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`${tier.effect}  •  $${tier.cost}`, centerX, y + 55);

        const buyY = y + 80;
        this.buyButtonBounds = {
            x: centerX - 100,
            y: buyY,
            width: 200,
            height: 50
        };

        this.drawBuyButton(ctx, centerX - 100, buyY, 200, 50, canBuy);

        const continueY = y + height - 50;
        this.continueButtonBounds = {
            x: centerX - 100,
            y: continueY,
            width: 200,
            height: 40
        };
        this.drawContinueButton(ctx, centerX - 100, continueY, 200, 40);
    }

    drawBuyButton(ctx, x, y, width, height, canBuy) {
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 10);
        ctx.fillStyle = canBuy ? 'rgba(255, 215, 0, 0.15)' : 'rgba(100, 100, 100, 0.2)';
        ctx.fill();

        ctx.strokeStyle = canBuy ? '#ffd700' : 'rgba(100, 100, 100, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = 'bold 24px "Space Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = canBuy ? '#ffd700' : '#718096';
        ctx.fillText('KÖP', x + width / 2, y + height / 2);
    }

    drawContinueButton(ctx, x, y, width, height) {
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 10);
        ctx.fillStyle = 'rgba(100, 100, 100, 0.2)';
        ctx.fill();

        ctx.strokeStyle = 'rgba(150, 150, 150, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = 'bold 16px "Work Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#a0a0a0';
        ctx.fillText('FORTSÄTT', x + width / 2, y + height / 2);
    }

    renderCollectionZone(ctx, screenWidth, y, height, owned, padding) {
        if (owned.length === 0) return;

        const cardWidth = 80;
        const cardHeight = height - 30;
        const cardY = y + 15;
        const totalWidth = owned.length * cardWidth + (owned.length - 1) * 10;
        const startX = (screenWidth - totalWidth) / 2;

        for (let i = 0; i < owned.length; i++) {
            const card = owned[i];
            const x = startX + i * (cardWidth + 10);

            const anim = this.animationState.enteringCards.find(
                a => a.cardId === card.id && a.tierLevel === card.tierLevel
            );

            this.drawCardWithAnimation(ctx, x, cardY, cardWidth, cardHeight, card, card.tier, true, false, anim);
        }
    }

    async preloadImages() {
        for (const card of this.cards) {
            for (const tier of card.tiers) {
                if (!tier.image) continue;
                
                const url = tier.image.startsWith('http') 
                    ? tier.image 
                    : `assets/${tier.image}`;
                
                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        const blob = await response.blob();
                        this.images[tier.image] = await createImageBitmap(blob);
                    }
                } catch (e) {
                    console.warn(`Failed to load image: ${url}`, e);
                }
            }
        }
    }
}