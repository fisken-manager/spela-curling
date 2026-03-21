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