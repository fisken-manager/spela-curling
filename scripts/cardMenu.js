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

    drawCard(ctx, x, y, width, height, card, tier, isOwned = false, isSelected = false, angle = 0) {
        ctx.save();
        
        if (angle !== 0) {
            ctx.translate(x + width / 2, y + height / 2);
            ctx.rotate(angle);
            ctx.translate(-(x + width / 2), -(y + height / 2));
        }

        const cornerRadius = Math.max(4, width * 0.08);
        const shadowOffset = 2;

        ctx.beginPath();
        ctx.roundRect(x + shadowOffset, y + shadowOffset, width, height, cornerRadius);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fill();

        const bgGradient = ctx.createLinearGradient(x, y, x + width, y + height);
        bgGradient.addColorStop(0, '#2a2a3a');
        bgGradient.addColorStop(1, '#1a1a28');

        ctx.beginPath();
        ctx.roundRect(x, y, width, height, cornerRadius);
        ctx.fillStyle = bgGradient;
        ctx.fill();

        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeStyle = isSelected ? '#ffd700' : 'rgba(255, 255, 255, 0.15)';
        ctx.stroke();

        const imagePadding = Math.max(2, width * 0.04);
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

        if (isOwned) {
            const checkSize = Math.max(12, width * 0.15);
            const checkX = x + width - checkSize - 4;
            const checkY = y + 4;

            ctx.beginPath();
            ctx.arc(checkX + checkSize / 2, checkY + checkSize / 2, checkSize / 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(72, 187, 120, 0.9)';
            ctx.fill();

            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(checkX + checkSize * 0.25, checkY + checkSize * 0.5);
            ctx.lineTo(checkX + checkSize * 0.45, checkY + checkSize * 0.7);
            ctx.lineTo(checkX + checkSize * 0.75, checkY + checkSize * 0.3);
            ctx.stroke();
        } else {
            const romanNumerals = ['I', 'II', 'III', 'IV', 'V'];
            const tierNumeral = romanNumerals[tier.level - 1] || 'I';
            const maxTier = card.tiers.length;
            
            if (maxTier > 1) {
                const badgeW = Math.max(16, width * 0.22);
                const badgeH = Math.max(12, width * 0.16);
                const badgeX = x + width - badgeW - 3;
                const badgeY = y + 3;

                ctx.beginPath();
                ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 3);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fill();

                ctx.font = `bold ${Math.max(8, width * 0.14)}px "Space Mono", monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#ffd700';
                ctx.fillText(tierNumeral, badgeX + badgeW / 2, badgeY + badgeH / 2);
            }
        }

        ctx.restore();
        return { x, y, width, height };
    }

    drawCardWithAnimation(ctx, x, y, width, height, card, tier, isOwned, isSelected, animation, angle = 0) {
        if (animation && animation.progress < 1) {
            const t = animation.progress;
            const spring = 1 + Math.sin(t * Math.PI * 0.5) * 0.2;
            const scale = spring * t;
            const alpha = t;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(x + width / 2, y + height / 2);
            ctx.scale(scale, scale);
            this.drawCard(ctx, -width / 2, -height / 2, width, height, card, tier, isOwned, isSelected, angle);
            ctx.restore();
            return { x: x, y: y, width, height };
        } else {
            return this.drawCard(ctx, x, y, width, height, card, tier, isOwned, isSelected, angle);
        }
    }

    render(ctx, screenWidth, screenHeight) {
        this.clickAreas = [];
        this.buyButtonBounds = null;
        this.continueButtonBounds = null;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        const padding = 20;
        const available = this.getAvailableUpgrades();
        const owned = this.getOwnedUpgrades();

        const selectedCard = this.selectedCardId 
            ? available.find(c => c.id === this.selectedCardId) 
            : null;

        const largeCardHeight = screenHeight * 0.40;
        const largeCardWidth = largeCardHeight * 0.65;

        if (selectedCard) {
            this.renderArchCards(ctx, screenWidth, padding, available, selectedCard.id);
            this.renderSelectedCard(ctx, screenWidth, screenHeight, selectedCard, largeCardWidth, largeCardHeight);
        } else {
            this.renderArchCards(ctx, screenWidth, padding, available, null);
            
            ctx.font = '16px "Work Sans", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#718096';
            ctx.fillText('Välj ett kort för att köpa', screenWidth / 2, screenHeight * 0.55);

            const continueY = screenHeight - 70;
            this.continueButtonBounds = {
                x: screenWidth / 2 - 100,
                y: continueY,
                width: 200,
                height: 40
            };
            this.drawContinueButton(ctx, screenWidth / 2 - 100, continueY, 200, 40);
        }

        this.renderCollectionZone(ctx, screenWidth, screenHeight, owned, padding);
    }

    renderArchCards(ctx, screenWidth, startY, available, selectedId) {
        const cardHeight = 70;
        const cardWidth = 50;
        const spacing = 15;
        const archHeight = 25;

        const totalWidth = available.length * cardWidth + (available.length - 1) * spacing;
        const startX = (screenWidth - totalWidth) / 2;

        this.cardBounds = [];

        for (let i = 0; i < available.length; i++) {
            const card = available[i];
            const isSelected = card.id === selectedId;
            if (isSelected) continue;

            const centerX = startX + i * (cardWidth + spacing) + cardWidth / 2;
            const normalizedPos = (i - (available.length - 1) / 2) / (available.length > 1 ? (available.length - 1) / 2 : 1);
            
            const angle = normalizedPos * 0.35;
            const archY = startY + Math.abs(normalizedPos) * archHeight;
            
            const x = startX + i * (cardWidth + spacing);
            const y = archY;

            ctx.save();
            ctx.translate(x + cardWidth / 2, y + cardHeight / 2);
            ctx.rotate(angle);
            ctx.translate(-(x + cardWidth / 2), -(y + cardHeight / 2));

            const bounds = this.drawCard(ctx, x, y, cardWidth, cardHeight, card, card.currentTier, false, false, 0);

            ctx.restore();

            const rotatedBounds = this.getRotatedBounds(x, y, cardWidth, cardHeight, angle);
            this.cardBounds.push({
                ...rotatedBounds,
                cardId: card.id,
                canBuy: this.canAfford(card.id)
            });
        }
    }

    getRotatedBounds(x, y, width, height, angle) {
        const cx = x + width / 2;
        const cy = y + height / 2;
        const cos = Math.abs(Math.cos(angle));
        const sin = Math.abs(Math.sin(angle));
        const newWidth = width * cos + height * sin;
        const newHeight = width * sin + height * cos;
        return {
            x: cx - newWidth / 2,
            y: cy - newHeight / 2,
            width: newWidth,
            height: newHeight
        };
    }

    renderSelectedCard(ctx, screenWidth, screenHeight, card, cardWidth, cardHeight) {
        const currentLevel = this.state.upgrades[card.id]?.level || 0;
        const tier = card.tiers[currentLevel];
        if (!tier) return { action: 'continue' };

        const canBuy = this.canAfford(card.id);
        const centerX = screenWidth / 2;
        const cardY = 120;

        const x = centerX - cardWidth / 2;
        this.drawCard(ctx, x, cardY, cardWidth, cardHeight, card, card.currentTier, false, true, 0);

        this.selectedCardBounds = {
            x: x,
            y: cardY,
            width: cardWidth,
            height: cardHeight,
            cardId: card.id,
            canBuy
        };
        this.cardBounds.push({
            x: x,
            y: cardY,
            width: cardWidth,
            height: cardHeight,
            cardId: card.id,
            canBuy
        });

        const romanNumerals = ['I', 'II', 'III', 'IV', 'V'];
        const tierNumeral = romanNumerals[tier.level - 1] || 'I';

        const textY = cardY + cardHeight + 20;
        ctx.font = 'bold 20px "Work Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`${card.name} ${tierNumeral}`, centerX, textY);

        ctx.font = '16px "Work Sans", sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(tier.effect, centerX, textY + 28);

        ctx.font = 'bold 18px "Space Mono", monospace';
        ctx.fillStyle = canBuy ? '#ffd700' : '#718096';
        ctx.fillText(`$${tier.cost}`, centerX, textY + 52);

        const buyY = textY + 80;
        this.buyButtonBounds = {
            x: centerX - 80,
            y: buyY,
            width: 160,
            height: 45
        };
        this.drawBuyButton(ctx, centerX - 80, buyY, 160, 45, canBuy);

        const continueY = screenHeight - 60;
        this.continueButtonBounds = {
            x: centerX - 80,
            y: continueY,
            width: 160,
            height: 40
        };
        this.drawContinueButton(ctx, centerX - 80, continueY, 160, 40);
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

    renderCollectionZone(ctx, screenWidth, screenHeight, owned, padding) {
        ctx.font = 'bold 16px "Space Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`$${Math.floor(this.state.money)}`, screenWidth / 2, 20);

        if (owned.length === 0) return;

        const cardWidth = 50;
        const cardHeight = 70;
        const spacing = 8;
        const totalWidth = owned.length * cardWidth + (owned.length - 1) * spacing;
        const startX = (screenWidth - totalWidth) / 2;
        const cardY = screenHeight - cardHeight - 15;

        for (let i = 0; i < owned.length; i++) {
            const card = owned[i];
            const x = startX + i * (cardWidth + spacing);

            const anim = this.animationState.enteringCards.find(
                a => a.cardId === card.id && a.tierLevel === card.tierLevel
            );

            this.drawCardWithAnimation(ctx, x, cardY, cardWidth, cardHeight, card, card.tier, true, false, anim, 0);
        }
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