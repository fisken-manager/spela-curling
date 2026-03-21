export class BuyMenu {
    constructor(state) {
        this.state = state;
        this.upgrades = [
            { 
                id: 'maxVelocity', 
                name: 'Maxhastighet', 
                icon: '⚡', 
                effect: '+15% hastighet', 
                pricing: [10, 20],
                image: 'speed'
            },
            { 
                id: 'frictionReduction', 
                name: 'Minska Friktion', 
                icon: '❄', 
                effect: '-15% friktion', 
                pricing: [10, 20],
                image: 'friction'
            },
            { 
                id: 'stoneSize', 
                name: 'Stenstorlek', 
                icon: '🥌', 
                effect: '+25% storlek', 
                pricing: [10, 20],
                image: 'size'
            },
            { 
                id: 'randomCurl', 
                name: 'Random Curl', 
                icon: '↺', 
                effect: 'Random snurr/10s', 
                pricing: [10, 20],
                image: 'curl'
            },
            { 
                id: 'noNegativePickups', 
                name: 'Inga Negativa', 
                icon: '✨', 
                effect: 'Ta bort pickups', 
                pricing: [10, 20],
                image: 'shield'
            },
        ];
        this.clickAreas = [];
        this.waifuImages = {};
    }

    async loadWaifuImage(type) {
        if (this.waifuImages[type]) return this.waifuImages[type];

        try {
            const response = await fetch(`assets/waifu-${type}.png`);
            if (response.ok) {
                const blob = await response.blob();
                const bitmap = await createImageBitmap(blob);
                this.waifuImages[type] = bitmap;
                return bitmap;
            }
        } catch (e) {
            // Image not found, will use fallback
        }
        return null;
    }

    getUpgradeCost(upgradeId) {
        const upgrade = this.upgrades.find(u => u.id === upgradeId);
        if (!upgrade) return null;
        const level = this.state.upgrades[upgradeId]?.level || 0;
        if (level >= upgrade.pricing.length) return null;
        return upgrade.pricing[level];
    }

    canAfford(upgradeId) {
        const cost = this.getUpgradeCost(upgradeId);
        return cost !== null && this.state.money >= cost;
    }

    isMaxedOut(upgradeId) {
        const upgrade = this.upgrades.find(u => u.id === upgradeId);
        if (!upgrade) return false;
        const level = this.state.upgrades[upgradeId]?.level || 0;
        return level >= upgrade.pricing.length;
    }

    purchase(upgradeId) {
        const cost = this.getUpgradeCost(upgradeId);
        if (!this.canAfford(upgradeId)) return false;

        this.state.money -= cost;
        this.state.upgrades[upgradeId] = { 
            level: (this.state.upgrades[upgradeId]?.level || 0) + 1 
        };
        return true;
    }

    render(ctx, screenWidth, screenHeight) {
        this.clickAreas = [];

        // Dark background with overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        const centerX = screenWidth / 2;
        const centerY = screenHeight / 2;
        
        // Menu dimensions
        const panelWidth = Math.min(440, screenWidth - 20);
        const panelHeight = Math.min(600, screenHeight - 20);
        const panelX = centerX - panelWidth / 2;
        const panelY = centerY - panelHeight / 2;

        // Panel background with gradient
        const panelGradient = ctx.createLinearGradient(panelX, panelY, panelX + panelWidth, panelY + panelHeight);
        panelGradient.addColorStop(0, 'rgba(30, 40, 60, 0.98)');
        panelGradient.addColorStop(1, 'rgba(20, 30, 45, 0.98)');
        ctx.fillStyle = panelGradient;
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 16);
        ctx.fill();

        // Border
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Title
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 32px "Space Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('UPPGRADERINGAR', centerX, panelY + 25);

        // Money display
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 22px "Space Mono", monospace';
        ctx.fillText(`$${Math.floor(this.state.money)}`, centerX, panelY + 65);

        // Upgrade items - LARGER BUTTONS
        const itemStartY = panelY + 110;
        const itemHeight = 85;
        const itemPadding = 12;
        const itemWidth = panelWidth - 24;

        for (let i = 0; i < this.upgrades.length; i++) {
            const upgrade = this.upgrades[i];
            const level = this.state.upgrades[upgrade.id]?.level || 0;
            const isMaxed = this.isMaxedOut(upgrade.id);
            const canBuy = this.canAfford(upgrade.id);
            const cost = this.getUpgradeCost(upgrade.id);

            const itemY = itemStartY + i * (itemHeight + itemPadding);
            const itemX = panelX + 12;

            this.clickAreas.push({
                x: itemX,
                y: itemY,
                width: itemWidth,
                height: itemHeight,
                upgradeId: upgrade.id,
                canBuy: canBuy && !isMaxed,
                isMaxed: isMaxed
            });

            // Button background
            if (canBuy && !isMaxed) {
                const btnGradient = ctx.createLinearGradient(itemX, itemY, itemX, itemY + itemHeight);
                btnGradient.addColorStop(0, 'rgba(72, 187, 120, 0.3)');
                btnGradient.addColorStop(1, 'rgba(72, 187, 120, 0.1)');
                ctx.fillStyle = btnGradient;
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
            }
            ctx.beginPath();
            ctx.roundRect(itemX, itemY, itemWidth, itemHeight, 12);
            ctx.fill();

            // Hover border for buyable items
            if (canBuy && !isMaxed) {
                ctx.strokeStyle = 'rgba(72, 187, 120, 0.5)';
                ctx.lineWidth = 2;
                ctx.stroke();
            } else {
                ctx.strokeStyle = 'rgba(113, 128, 150, 0.2)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Icon (large)
            ctx.font = '36px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillStyle = canBuy && !isMaxed ? '#48bb78' : '#718096';
            ctx.fillText(upgrade.icon, itemX + 15, itemY + 18);

            // Name
            ctx.font = 'bold 18px "Work Sans", sans-serif';
            ctx.fillStyle = canBuy && !isMaxed ? '#e2e8f0' : '#718096';
            ctx.fillText(upgrade.name, itemX + 70, itemY + 20);

            // Effect
            ctx.font = '14px "Work Sans", sans-serif';
            ctx.fillStyle = '#a0aec0';
            ctx.fillText(upgrade.effect, itemX + 70, itemY + 45);

            // Level dots (2 max)
            ctx.textAlign = 'right';
            if (isMaxed) {
                ctx.fillStyle = '#48bb78';
                ctx.font = 'bold 14px "Space Mono", monospace';
                ctx.fillText('MAX', itemX + itemWidth - 15, itemY + 25);
            } else {
                ctx.font = '14px Arial';
                for (let l = 0; l < 2; l++) {
                    const dotX = itemX + itemWidth - 40 + l * 18;
                    const dotY = itemY + 25;
                    ctx.beginPath();
                    ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
                    ctx.fillStyle = l < level ? '#48bb78' : 'rgba(255, 255, 255, 0.15)';
                    ctx.fill();
                }
            }

            // Price
            if (!isMaxed) {
                ctx.font = 'bold 18px "Space Mono", monospace';
                ctx.fillStyle = canBuy ? '#ffd700' : '#4a5568';
                ctx.fillText(`$${cost}`, itemX + itemWidth - 15, itemY + 65);
            }
        }

        // Continue button
        const continueY = panelY + panelHeight - 65;
        const continueWidth = 180;
        const continueHeight = 45;
        const continueX = centerX - continueWidth / 2;

        this.clickAreas.push({
            x: continueX,
            y: continueY,
            width: continueWidth,
            height: continueHeight,
            isContinue: true
        });

        const continueGradient = ctx.createLinearGradient(continueX, continueY, continueX + continueWidth, continueY);
        continueGradient.addColorStop(0, '#4a5568');
        continueGradient.addColorStop(1, '#2d3748');
        ctx.fillStyle = continueGradient;
        ctx.beginPath();
        ctx.roundRect(continueX, continueY, continueWidth, continueHeight, 10);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 18px "Work Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('FORTSÄTT', centerX, continueY + continueHeight / 2);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '12px "Work Sans", sans-serif';
        ctx.fillText('Klicka för att fortsätta', centerX, panelY + panelHeight - 18);
    }

    handleClick(x, y) {
        for (const area of this.clickAreas) {
            if (x >= area.x && x <= area.x + area.width &&
                y >= area.y && y <= area.y + area.height) {
                
                if (area.isContinue) {
                    return 'continue';
                }
                
                if (area.canBuy) {
                    return { action: 'purchase', upgradeId: area.upgradeId };
                }
            }
        }
        return null;
    }
}
