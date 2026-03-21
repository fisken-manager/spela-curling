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
        return null;
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

    render(ctx, screenWidth, screenHeight) {
    }

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
}