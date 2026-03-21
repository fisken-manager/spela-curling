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
            purchaseAnimation: null,
            selectAnimation: null,
            purchasedCardId: null
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
                    { level: 2, cost: 5, effect: '+30% hastighet', image: 'maxVelocity-tier2.jpg' },
                    { level: 3, cost: 20, effect: '+45% hastighet', image: 'maxVelocity-tier3.jpg' },
                    { level: 4, cost: 40, effect: '+60% hastighet', image: 'maxVelocity-tier4.jpg' },
                    { level: 5, cost: 65, effect: '+75% hastighet', image: 'maxVelocity-tier5.jpg' },
                ]
            },
            {
                id: 'frictionReduction',
                name: 'Minska Friktion',
                tiers: [
                    { level: 1, cost: 1, effect: '-15% friktion', image: 'waifu-friction.jpg' },
                    { level: 2, cost: 5, effect: '-30% friktion', image: 'frictionReduction-tier2.jpg' },
                    { level: 3, cost: 20, effect: '-45% friktion', image: 'frictionReduction-tier3.jpg' },
                    { level: 4, cost: 40, effect: '-60% friktion', image: 'frictionReduction-tier4.jpg' },
                    { level: 5, cost: 65, effect: '-75% friktion', image: 'frictionReduction-tier5.jpg' },
                ]
            },
            {
                id: 'stoneSize',
                name: 'Stenstorlek',
                tiers: [
                    { level: 1, cost: 1, effect: '+25% storlek', image: 'waifu-size.jpg' },
                    { level: 2, cost: 5, effect: '+50% storlek', image: 'stoneSize-tier2.jpg' },
                    { level: 3, cost: 20, effect: '+75% storlek', image: 'stoneSize-tier3.jpg' },
                    { level: 4, cost: 40, effect: '+100% storlek', image: 'stoneSize-tier4.jpg' },
                    { level: 5, cost: 65, effect: '+125% storlek', image: 'stoneSize-tier5.jpg' },
                ]
            },
            {
                id: 'randomCurl',
                name: 'Random Curl',
                tiers: [
                    { level: 1, cost: 10, effect: 'Random snurr/10s', image: 'waifu-curl.jpg' },
                    { level: 2, cost: 20, effect: 'Random snurr/5s', image: 'randomCurl-tier2.jpg' },
                ]
            },
            {
                id: 'noNegativePickups',
                name: 'Inga Negativa',
                tiers: [
                    { level: 1, cost: 10, effect: 'Ta bort negativa pickups', image: 'waifu-shield.jpg' },
                ]
            },
            {
                id: 'coinSpeedBoost',
                name: 'Mynt Acceleration',
                tiers: [
                    { level: 1, cost: 10, effect: 'Mynt ger hastighetsboost', image: 'coinSpeedBoost-tier1.jpg' },
                    { level: 2, cost: 25, effect: '3x mynt, inga hastighetspickup', image: 'coinSpeedBoost-tier2.jpg' },
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
            if (currentLevel > 0) {
                owned.push({
                    ...card,
                    tier: card.tiers[currentLevel - 1],
                    tierLevel: currentLevel
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

        // Special handling for coinSpeedBoost tier 2
        if (cardId === 'coinSpeedBoost' && currentLevel + 1 === 2) {
            // Remove speed boost pickups
            this.state.powerUps = [];
            
            // Remove existing yellow orbs
            this.state.scoringOrbs = this.state.scoringOrbs.filter(o => o.type !== 'yellow');
            
            // Respawn yellow orbs with 3x frequency (smaller segments = more spawn points)
            const maxScroll = Math.max(1, this.state.pageHeight - this.state.screenHeight);
            const segmentSize = 333; // 3x more frequent than original 1000
            const startOffset = 800;
            let orbId = this.state.scoringOrbs.length;
            
            const numSegments = Math.floor((maxScroll - startOffset) / segmentSize);
            
            for (let i = 0; i < numSegments; i++) {
                const baseProgress = (startOffset + i * segmentSize) / maxScroll;
                if (baseProgress > 1) continue;
                
                const seed = Math.floor(this.state.pageHeight + i * 333 + (this.state.loopCount || 1) * 100000);
                const random = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x); };
                
                if (random(seed + 2000) < 0.8) {
                    const yellowSeed = seed + 3000;
                    const progressOffset = random(yellowSeed) * 0.5;
                    const orbProgress = baseProgress + progressOffset;
                    
                    if (orbProgress <= 1) {
                        const wallOffset = 180;
                        const onLeftWall = random(yellowSeed + 1) < 0.5;
                        
                        this.state.scoringOrbs.push({
                            id: `orb-${orbId++}`,
                            type: 'yellow',
                            x: onLeftWall ? -wallOffset : wallOffset,
                            scrollProgress: orbProgress,
                            collected: false
                        });
                    }
                }
            }
        }

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
                this.selectedCardId = null;
                this.animationState.selectAnimation = null;
                return { action: 'continue' };
            }
        }

        if (this.buyButtonBounds) {
            const bb = this.buyButtonBounds;
            if (x >= bb.x && x <= bb.x + bb.width &&
                y >= bb.y && y <= bb.y + bb.height) {
                if (this.selectedCardId && this.canAfford(this.selectedCardId)) {
                    const card = this.cards.find(c => c.id === this.selectedCardId);
                    const currentLevel = this.state.upgrades[this.selectedCardId]?.level || 0;
                    this.animationState.purchasedCardId = this.selectedCardId;
                    this.animationState.purchasedTierLevel = currentLevel + 1;
                    this.purchase(this.selectedCardId);
                    this.selectedCardId = null;
                    this.animationState.selectAnimation = null;
                    return { action: 'purchase' };
                }
            }
        }

        for (const bounds of this.cardBounds) {
            if (x >= bounds.x && x <= bounds.x + bounds.width &&
                y >= bounds.y && y <= bounds.y + bounds.height) {
                if (this.selectedCardId === bounds.cardId) {
                    this.selectedCardId = null;
                    this.animationState.selectAnimation = null;
                } else {
                    this.selectedCardId = bounds.cardId;
                    this.animationState.selectAnimation = { progress: 0 };
                }
                return null;
            }
        }

        this.selectedCardId = null;
        this.animationState.selectAnimation = null;
        return null;
    }

    update(deltaTime) {
        if (this.animationState.purchaseAnimation) {
            this.animationState.purchaseAnimation.progress += deltaTime * 3;
            if (this.animationState.purchaseAnimation.progress >= 1) {
                this.animationState.purchaseAnimation = null;
            }
        }

        if (this.animationState.selectAnimation) {
            this.animationState.selectAnimation.progress += deltaTime * 6;
            if (this.animationState.selectAnimation.progress >= 1) {
                this.animationState.selectAnimation.progress = 1;
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

        // Floating shadow
        const shadowLayers = isSelected ? 3 : 2;
        const shadowOffsetY = isSelected ? 6 : 3;
        
        for (let i = shadowLayers; i > 0; i--) {
            const opacity = 0.06 + (i * 0.03);
            const spread = i * 1;
            ctx.beginPath();
            ctx.roundRect(x + spread, y + shadowOffsetY + spread, width, height, cornerRadius);
            ctx.fillStyle = `rgba(60, 60, 60, ${opacity})`;
            ctx.fill();
        }

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

        ctx.restore();

        // Tier mark for cards with multiple tiers
        const romanNumerals = ['I', 'II', 'III', 'IV', 'V'];
        const tierNumeral = romanNumerals[tier.level - 1] || 'I';
        const maxTier = card.tiers.length;
        
        if (maxTier > 1) {
            const fontSize = Math.max(8, width * 0.12);
            const inset = Math.max(3, width * 0.06);
            const badgeX = x + width - inset - fontSize * 0.8;
            const badgeY = y + inset + fontSize * 0.5;

            ctx.font = `bold ${fontSize}px "Space Mono", monospace`;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#000000';
            ctx.fillText(tierNumeral, badgeX, badgeY);
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

        // Draw money at top right
        ctx.font = 'bold 16px "Space Mono", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`$${Math.floor(this.state.money)}`, screenWidth - 15, 15);

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
            
            // Draw continue button BEFORE owned cards
            const continueY = screenHeight - 180;
            this.continueButtonBounds = {
                x: screenWidth / 2 - 80,
                y: continueY,
                width: 160,
                height: 40
            };
            this.drawContinueButton(ctx, screenWidth / 2 - 80, continueY, 160, 40);
        } else {
            this.renderArchCards(ctx, screenWidth, padding, available, null);

            // Draw continue button BEFORE owned cards
            const continueY = screenHeight - 180;
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
        const cardHeight = 105;
        const cardWidth = 75;
        const spacing = -10;
        const archHeight = 35;

        const totalWidth = available.length * cardWidth + (available.length - 1) * spacing;
        const startX = (screenWidth - totalWidth) / 2;

        this.cardBounds = [];

        for (let i = 0; i < available.length; i++) {
            const card = available[i];
            const isSelected = card.id === selectedId;
            if (isSelected) continue;

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
        if (!tier) return;

        const canBuy = this.canAfford(card.id);
        const centerX = screenWidth / 2;
        
        const anim = this.animationState.selectAnimation;
        let cardY = 120;
        let scale = 1;
        let alpha = 1;

        if (anim && anim.progress < 1) {
            const t = anim.progress;
            const ease = 1 - Math.pow(1 - t, 3);
            scale = 0.3 + ease * 0.7;
            alpha = ease;
            cardY = 60 + ease * 60;
        }

        const x = centerX - (cardWidth * scale) / 2;
        const y = cardY;
        const w = cardWidth * scale;
        const h = cardHeight * scale;

        ctx.save();
        ctx.globalAlpha = alpha;
        
        this.drawCard(ctx, x, y, w, h, card, card.currentTier, false, true, 0);
        
        ctx.restore();

        this.selectedCardBounds = {
            x: x,
            y: y,
            width: w,
            height: h,
            cardId: card.id,
            canBuy
        };
        this.cardBounds.push({
            x: x,
            y: y,
            width: w,
            height: h,
            cardId: card.id,
            canBuy
        });

        const romanNumerals = ['I', 'II', 'III', 'IV', 'V'];
        const tierNumeral = romanNumerals[tier.level - 1] || 'I';

        const textY = y + h + 16;
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

            // Seeded random angle based on card id for consistency
            const seed = card.id.charCodeAt(card.id.length - 1) + card.tierLevel;
            const angle = ((seed * 7) % 11 - 5) * 0.02;

            const anim = this.animationState.enteringCards.find(
                a => a.cardId === card.id && a.tierLevel === card.tierLevel
            );

            this.drawCardWithAnimation(ctx, x, cardY, cardWidth, cardHeight, card, card.tier, true, false, anim, angle);
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