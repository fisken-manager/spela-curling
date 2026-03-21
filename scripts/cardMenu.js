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
        const pollinationsUrl = (prompt) => 
            `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=400&height=600`;
        
        return [
            {
                id: 'maxVelocity',
                name: 'Maxhastighet',
                tiers: [
                    { level: 1, cost: 1, effect: '+15% hastighet', image: pollinationsUrl('anime girl sprint lightning speed blue electric') },
                    { level: 2, cost: 5, effect: '+30% hastighet', image: pollinationsUrl('anime girl running wind streak blue cyan') },
                    { level: 3, cost: 20, effect: '+45% hastighet', image: pollinationsUrl('anime girl speed blur motion blue white') },
                    { level: 4, cost: 40, effect: '+60% hastighet', image: pollinationsUrl('anime girl flying speed sonic blue gold') },
                    { level: 5, cost: 65, effect: '+75% hastighet', image: pollinationsUrl('anime girl lightning god speed blue golden') },
                ]
            },
            {
                id: 'frictionReduction',
                name: 'Minska Friktion',
                tiers: [
                    { level: 1, cost: 1, effect: '-15% friktion', image: pollinationsUrl('anime girl ice crystal frost blue white') },
                    { level: 2, cost: 5, effect: '-30% friktion', image: pollinationsUrl('anime girl gliding ice slide silver blue') },
                    { level: 3, cost: 20, effect: '-45% friktion', image: pollinationsUrl('anime girl frozen breath winter cyan white') },
                    { level: 4, cost: 40, effect: '-60% friktion', image: pollinationsUrl('anime girl ice princess elegant silver transparent') },
                    { level: 5, cost: 65, effect: '-75% friktion', image: pollinationsUrl('anime girl ice queen divine frost white crystal') },
                ]
            },
            {
                id: 'stoneSize',
                name: 'Stenstorlek',
                tiers: [
                    { level: 1, cost: 1, effect: '+25% storlek', image: pollinationsUrl('anime girl strong confident boulder red') },
                    { level: 2, cost: 5, effect: '+50% storlek', image: pollinationsUrl('anime girl muscular powerful stone red orange') },
                    { level: 3, cost: 20, effect: '+75% storlek', image: pollinationsUrl('anime girl warrior strong boulder crimson gold') },
                    { level: 4, cost: 40, effect: '+100% storlek', image: pollinationsUrl('anime girl titan strength massive red fiery') },
                    { level: 5, cost: 65, effect: '+125% storlek', image: pollinationsUrl('anime girl giant goddess power red golden mountain') },
                ]
            },
            {
                id: 'randomCurl',
                name: 'Random Curl',
                tiers: [
                    { level: 1, cost: 10, effect: 'Random snurr/10s', image: pollinationsUrl('anime girl spinning vortex purple swirl') },
                    { level: 2, cost: 20, effect: 'Random snurr/5s', image: pollinationsUrl('anime girl chaos spiral pink vortex magic') },
                ]
            },
            {
                id: 'noNegativePickups',
                name: 'Inga Negativa',
                tiers: [
                    { level: 1, cost: 10, effect: 'Ta bort negativa pickups', image: pollinationsUrl('anime girl shield guardian angel white protective') },
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
                this.selectedCardId = bounds.cardId;
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

    drawCard(ctx, x, y, width, height, card, tier, isOwned = false, isSelected = false) {
        const cornerRadius = 14;
        const shadowOffset = 4;

        ctx.beginPath();
        ctx.roundRect(x + shadowOffset, y + shadowOffset, width, height, cornerRadius);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fill();

        let bgGradient;
        if (isOwned) {
            bgGradient = ctx.createLinearGradient(x, y, x + width, y + height);
            bgGradient.addColorStop(0, '#1a3a2a');
            bgGradient.addColorStop(1, '#0d1f15');
        } else {
            bgGradient = ctx.createLinearGradient(x, y, x + width, y + height);
            bgGradient.addColorStop(0, '#2a1f4a');
            bgGradient.addColorStop(1, '#1a1035');
        }

        ctx.beginPath();
        ctx.roundRect(x, y, width, height, cornerRadius);
        ctx.fillStyle = bgGradient;
        ctx.fill();

        ctx.lineWidth = isSelected ? 3 : 2;
        if (isSelected) {
            ctx.strokeStyle = '#ffd700';
        } else if (isOwned) {
            ctx.strokeStyle = 'rgba(72, 187, 120, 0.6)';
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        }
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

        const imageAreaHeight = height * 0.6;
        const imagePadding = 8;
        const imageX = x + imagePadding;
        const imageY = y + imagePadding;
        const imageWidth = width - imagePadding * 2;
        const imageHeight = imageAreaHeight - imagePadding;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(imageX, imageY, imageWidth, imageHeight, 10);
        ctx.clip();

        const tierKey = card.tiers[tier.level - 1]?.image;
        const hasImage = tierKey && this.images[tierKey];

        if (hasImage) {
            ctx.drawImage(this.images[tierKey], imageX, imageY, imageWidth, imageHeight);
        } else {
            const placeholderGradient = ctx.createLinearGradient(imageX, imageY, imageX + imageWidth, imageY + imageHeight);
            if (isOwned) {
                placeholderGradient.addColorStop(0, '#1e4a3a');
                placeholderGradient.addColorStop(1, '#0a2818');
            } else {
                placeholderGradient.addColorStop(0, '#3a2a5a');
                placeholderGradient.addColorStop(1, '#201040');
            }
            ctx.fillStyle = placeholderGradient;
            ctx.fillRect(imageX, imageY, imageWidth, imageHeight);
        }
        ctx.restore();

        const textAreaY = y + imageAreaHeight;
        const textAreaHeight = height - imageAreaHeight;

        const textBgGradient = ctx.createLinearGradient(x, textAreaY, x, y + height);
        textBgGradient.addColorStop(0, 'rgba(20, 20, 30, 0.95)');
        textBgGradient.addColorStop(1, 'rgba(10, 10, 18, 0.98)');
        ctx.beginPath();
        ctx.roundRect(x + 4, textAreaY, width - 8, textAreaHeight - 4, [0, 0, cornerRadius - 2, cornerRadius - 2]);
        ctx.fillStyle = textBgGradient;
        ctx.fill();

        const romanNumerals = ['I', 'II', 'III', 'IV', 'V'];
        const tierNumeral = romanNumerals[tier.level - 1] || 'I';

        ctx.font = 'bold 16px "Work Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = isOwned ? '#48bb78' : '#e2e8f0';
        ctx.fillText(`${card.name} ${tierNumeral}`, x + 12, textAreaY + 10);

        ctx.font = '12px "Work Sans", sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(tier.effect, x + 12, textAreaY + 32, width - 24);

        const canAfford = this.canAfford(card.id);
        const badgeX = x + width - 45;
        const badgeY = textAreaY + 8;
        const badgeWidth = 35;
        const badgeHeight = 22;

        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 4);
        ctx.fillStyle = canAfford && !isOwned ? 'rgba(255, 215, 0, 0.2)' : 'rgba(100, 100, 100, 0.3)';
        ctx.fill();
        ctx.font = 'bold 12px "Space Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = canAfford && !isOwned ? '#ffd700' : '#718096';
        ctx.fillText(`$${tier.cost}`, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);

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

        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        this.renderNoiseOverlay(ctx, screenWidth, screenHeight);

        const padding = 16;
        const purchasableHeight = screenHeight * 0.55;
        const buyZoneHeight = screenHeight * 0.15;
        const collectionHeight = screenHeight * 0.30;

        const available = this.getAvailableUpgrades();
        const owned = this.getOwnedUpgrades();

        this.renderPurchasableZone(ctx, screenWidth, purchasableHeight, available, padding);

        const buyZoneY = purchasableHeight;
        this.renderBuyZone(ctx, screenWidth, buyZoneY, buyZoneHeight);

        const collectionY = purchasableHeight + buyZoneHeight;
        this.renderCollectionZone(ctx, screenWidth, collectionY, collectionHeight, owned, padding);
    }

    renderNoiseOverlay(ctx, width, height) {
        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = Math.random() * 15;
            data[i] = noise;
            data[i + 1] = noise;
            data[i + 2] = noise;
            data[i + 3] = 8;
        }
        ctx.putImageData(imageData, 0, 0);
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

        const cardHeight = height - 100;
        const cardWidth = Math.min(140, (screenWidth - padding * 2) / available.length + 40);
        const overlap = cardWidth * 0.3;
        const totalWidth = available.length > 1 
            ? cardWidth + (available.length - 1) * (cardWidth - overlap)
            : cardWidth;
        const startX = (screenWidth - totalWidth) / 2;
        const baseY = padding + 70;

        this.cardBounds = [];

        for (let i = 0; i < available.length; i++) {
            const card = available[i];
            const isSelected = this.selectedCardId === card.id;
            const canBuy = this.canAfford(card.id);
            const x = startX + i * (cardWidth - overlap);
            let y = baseY;
            let scale = 1;

            if (isSelected) {
                y -= 20;
                scale = 1.05;
            }

            const drawX = isSelected ? x - (cardWidth * scale - cardWidth) / 2 : x;
            const drawY = y;
            const drawWidth = cardWidth * scale;
            const drawHeight = cardHeight * scale;

            const bounds = this.drawCard(ctx, drawX, drawY, drawWidth, drawHeight, card, card.currentTier, false, isSelected);

            this.cardBounds.push({
                ...bounds,
                cardId: card.id,
                canBuy
            });
        }
    }

    renderBuyZone(ctx, screenWidth, y, height) {
        const centerX = screenWidth / 2;
        const buttonWidth = 200;
        const buttonHeight = 40;
        const buttonSpacing = 10;
        const totalButtons = this.selectedCardId ? 2 : 1;
        const totalHeight = totalButtons * buttonHeight + (totalButtons > 1 ? buttonSpacing : 0);
        const startY = y + (height - totalHeight) / 2;

        const continueY = startY;
        this.continueButtonBounds = {
            x: centerX - buttonWidth / 2,
            y: continueY,
            width: buttonWidth,
            height: buttonHeight
        };
        this.drawButton(ctx, centerX - buttonWidth / 2, continueY, buttonWidth, buttonHeight, 'FORTSÄTT', true);

        if (!this.selectedCardId) {
            ctx.font = '14px "Work Sans", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('Välj ett kort för att köpa', centerX, continueY + buttonHeight + 25);
            return;
        }

        const selectedCard = this.cards.find(c => c.id === this.selectedCardId);
        if (!selectedCard) return;

        const currentLevel = this.state.upgrades[this.selectedCardId]?.level || 0;
        const tier = selectedCard.tiers[currentLevel];
        if (!tier) return;

        const canBuy = this.canAfford(this.selectedCardId);

        const buyY = continueY + buttonHeight + buttonSpacing;
        this.buyButtonBounds = {
            x: centerX - buttonWidth / 2,
            y: buyY,
            width: buttonWidth,
            height: buttonHeight
        };

        this.drawButton(ctx, centerX - buttonWidth / 2, buyY, buttonWidth, buttonHeight, `KÖPA ${selectedCard.name} - $${tier.cost}`, canBuy);
    }

    drawButton(ctx, x, y, width, height, text, enabled) {
        const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
        if (enabled) {
            gradient.addColorStop(0, 'rgba(72, 187, 120, 0.3)');
            gradient.addColorStop(1, 'rgba(56, 161, 105, 0.2)');
        } else {
            gradient.addColorStop(0, 'rgba(100, 100, 100, 0.2)');
            gradient.addColorStop(1, 'rgba(60, 60, 60, 0.15)');
        }

        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 10);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = enabled ? 'rgba(72, 187, 120, 0.7)' : 'rgba(100, 100, 100, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = 'bold 16px "Work Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = enabled ? '#48bb78' : '#718096';
        ctx.fillText(text, x + width / 2, y + height / 2);
    }

    renderCollectionZone(ctx, screenWidth, y, height, owned, padding) {
        const panelY = y + 8;
        const panelHeight = height - 16;

        const gradient = ctx.createLinearGradient(0, panelY, 0, panelY + panelHeight);
        gradient.addColorStop(0, 'rgba(20, 40, 30, 0.9)');
        gradient.addColorStop(1, 'rgba(10, 25, 18, 0.95)');

        ctx.beginPath();
        ctx.roundRect(padding, panelY, screenWidth - padding * 2, panelHeight, 12);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = 'rgba(72, 187, 120, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = 'bold 16px "Work Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#48bb78';
        ctx.fillText('DINA KORT', screenWidth / 2, panelY + 12);

        if (owned.length === 0) {
            ctx.font = '14px "Work Sans", sans-serif';
            ctx.fillStyle = '#718096';
            ctx.fillText('Inga kort ägda än', screenWidth / 2, panelY + panelHeight / 2);
            return;
        }

        const cardWidth = 100;
        const cardHeight = panelHeight - 50;
        const cardY = panelY + 35;
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