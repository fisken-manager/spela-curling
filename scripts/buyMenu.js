export class BuyMenu {
    constructor(state) {
        this.state = state;
        this.upgrades = [
            { 
                id: 'maxVelocity', 
                name: 'Maxhastighet', 
                icon: '⚡', 
                effect: '+15% per nivå',
                pricing: [1, 5, 20, 40, 65],
                image: 'speed'
            },
            { 
                id: 'frictionReduction', 
                name: 'Minska Friktion', 
                icon: '❄', 
                effect: '-15% per nivå',
                pricing: [1, 5, 20, 40, 65],
                image: 'friction'
            },
            { 
                id: 'stoneSize', 
                name: 'Stenstorlek', 
                icon: '🥌', 
                effect: '+25% per nivå',
                pricing: [1, 5, 20, 40, 65],
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
                pricing: [10],
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
            console.error('Failed to load waifu image:', type, e);
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
        const panelWidth = Math.min(420, screenWidth - 20);
        const panelHeight = Math.min(580, screenHeight - 20);
        const panelX = centerX - panelWidth / 2;
        const panelY = centerY - panelHeight / 2;

        // Panel background with dark blue gradient
        const panelGradient = ctx.createLinearGradient(panelX, panelY, panelX + panelWidth, panelY + panelHeight);
        panelGradient.addColorStop(0, 'rgba(15, 25, 40, 0.98)');
        panelGradient.addColorStop(1, 'rgba(10, 20, 35, 0.98)');
        ctx.fillStyle = panelGradient;
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 16);
        ctx.fill();

        // Subtle border
        ctx.strokeStyle = 'rgba(100, 120, 150, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Title with waifu-style gold
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 28px "Space Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('UPPGRADERINGAR', centerX, panelY + 25);

        // Money display
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 20px "Space Mono", monospace';
        ctx.fillText(`$${Math.floor(this.state.money)}`, centerX, panelY + 60);

        // Upgrade items - LARGER BUTTONS
        const itemStartY = panelY + 100;
        const itemHeight = 90;
        const itemPadding = 10;
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

            // Button background - dark theme
            if (canBuy && !isMaxed) {
                const btnGradient = ctx.createLinearGradient(itemX, itemY, itemX + itemWidth, itemY + itemHeight);
                btnGradient.addColorStop(0, 'rgba(72, 120, 160, 0.3)');
                btnGradient.addColorStop(1, 'rgba(50, 80, 120, 0.1)');
                ctx.fillStyle = btnGradient;
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            }
            ctx.beginPath();
            ctx.roundRect(itemX, itemY, itemWidth, itemHeight, 12);
            ctx.fill();

            // Border - gold for buyable, dimmed for maxed/unaffordable
            if (canBuy && !isMaxed) {
                ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
                ctx.lineWidth = 2;
                ctx.stroke();
            } else {
                ctx.strokeStyle = 'rgba(100, 120, 150, 0.2)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Icon OR Waifu image
            const waifuImage = this.waifuImages[upgrade.image];
            const iconSize = 70; // Larger image
            const iconX = itemX + 10;
            const iconY = itemY + (itemHeight - iconSize) / 2;

            if (waifuImage) {
                ctx.drawImage(waifuImage, iconX, iconY, iconSize, iconSize);
            } else {
                ctx.font = '32px Arial';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillStyle = canBuy && !isMaxed ? '#48bb78' : '#718096';
                ctx.fillText(upgrade.icon, iconX + 10, itemY + 18);
            }

            // Name
            ctx.font = 'bold 18px "Work Sans", sans-serif';
            ctx.fillStyle = canBuy && !isMaxed ? '#e2e8f0' : '#94a3b8';
            ctx.textAlign = 'left';
            ctx.fillText(upgrade.name, itemX + 90, itemY + 20);

            // Effect
            ctx.font = '13px "Work Sans", sans-serif';
            ctx.fillStyle = '#718096';
            ctx.fillText(upgrade.effect, itemX + 90, itemY + 45);

            // Level dots (5 max for speed/friction/size, 2 max for curl, 1 for shield)
            const maxLevels = upgrade.pricing.length;
            ctx.textAlign = 'right';
            if (isMaxed) {
                ctx.fillStyle = '#48bb78';
                ctx.font = 'bold 14px "Space Mono", monospace';
                ctx.fillText('MAX', itemX + itemWidth - 15, itemY + itemHeight / 2);
            } else {
                ctx.font = '14px Arial';
                for (let l = 0; l < maxLevels; l++) {
                    const dotX = itemX + itemWidth - 40 + l * 16;
                    const dotY = itemY + itemHeight / 2;
                    ctx.beginPath();
                    ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
                    ctx.fillStyle = l < level ? '#48bb78' : 'rgba(255, 255, 255, 0.15)';
                    ctx.fill();
                }
            }

            // Price
            if (!isMaxed) {
                ctx.font = 'bold 16px "Space Mono", monospace';
                ctx.fillStyle = canBuy ? '#ffd700' : '#5c6770';
                ctx.fillText(`$${cost}`, itemX + itemWidth - 15, itemY + itemHeight / 2 + 15);
            }
        }

        // Continue button - BELOW upgrades
        const continueY = panelY + panelHeight - 60;
        const continueWidth = 200;
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
    }

    async preloadWaifuImages() {
        const uniqueImages = [...new Set(this.upgrades.map(u => u.image))];
        for (const type of uniqueImages) {
            await this.loadWaifuImage(type);
        }
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
