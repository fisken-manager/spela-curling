export class BuyMenu {
    constructor(state) {
        this.state = state;
        this.upgrades = [
            { id: 'maxVelocity', name: 'Maxhastighet', icon: '⚡', effect: '+15% per nivå', pricing: [1, 5, 20, 40, 65], image: 'waifu-speed.jpg' },
            { id: 'frictionReduction', name: 'Minska Friktion', icon: '❄', effect: '-15% per nivå', pricing: [1, 5, 20, 40, 65], image: 'waifu-friction.jpg' },
            { id: 'stoneSize', name: 'Stenstorlek', icon: '🥌', effect: '+25% per nivå', pricing: [1, 5, 20, 40, 65], image: 'waifu-size.jpg' },
            { id: 'randomCurl', name: 'Random Curl', icon: '↺', effect: 'Random snurr/10s', pricing: [10, 20], image: 'waifu-curl.jpg' },
            { id: 'noNegativePickups', name: 'Inga Negativa', icon: '✨', effect: 'Ta bort pickups', pricing: [10], image: 'waifu-shield.jpg' },
        ];
        this.clickAreas = [];
        this.images = {};
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

    async preloadImages() {
        const uniqueImages = [...new Set(this.upgrades.map(u => u.image))];
        for (const type of uniqueImages) {
            try {
                const response = await fetch(`assets/${type}`);
                if (response.ok) {
                    const blob = await response.blob();
                    this.images[type] = await createImageBitmap(blob);
                }
            } catch (e) {
                console.warn(`Failed to load image: ${type}`, e);
            }
        }
    }

    render(ctx, screenWidth, screenHeight) {
        this.clickAreas = [];

        // Dark background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.94)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        const centerX = screenWidth / 2;
        const centerY = screenHeight / 2;
        
        // Panel dimensions
        const panelWidth = Math.min(400, screenWidth - 20);
        const panelHeight = Math.min(580, screenHeight - 20);
        const panelX = centerX - panelWidth / 2;
        const panelY = centerY - panelHeight / 2;

        // Panel background
        const panelGradient = ctx.createLinearGradient(panelX, panelY, panelX + panelWidth, panelY + panelHeight);
        panelGradient.addColorStop(0, 'rgba(15, 30, 50, 0.96)');
        panelGradient.addColorStop(1, 'rgba(10, 25, 40, 0.96)');
        ctx.fillStyle = panelGradient;
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 14);
        ctx.fill();

        // Border
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Title
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 28px "Space Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('UPPGRADERINGAR', centerX, panelY + 25);

        // Money
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 20px "Space Mono", monospace';
        ctx.fillText(`$${Math.floor(this.state.money)}`, centerX, panelY + 60);

        // Upgrade items
        const itemStartY = panelY + 95;
        const itemHeight = 85;
        const itemPadding = 10;
        const itemWidth = panelWidth - 20;

        for (let i = 0; i < this.upgrades.length; i++) {
            const upgrade = this.upgrades[i];
            const level = this.state.upgrades[upgrade.id]?.level || 0;
            const isMaxed = this.isMaxedOut(upgrade.id);
            const canBuy = this.canAfford(upgrade.id);
            const cost = this.getUpgradeCost(upgrade.id);

            const itemY = itemStartY + i * (itemHeight + itemPadding);
            const itemX = panelX + 10;

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
                const btnGradient = ctx.createLinearGradient(itemX, itemY, itemX + itemWidth, itemY + itemHeight);
                btnGradient.addColorStop(0, 'rgba(72, 120, 160, 0.25)');
                btnGradient.addColorStop(1, 'rgba(72, 120, 160, 0.08)');
                ctx.fillStyle = btnGradient;
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
            }
            ctx.beginPath();
            ctx.roundRect(itemX, itemY, itemWidth, itemHeight, 10);
            ctx.fill();

            // Border
            if (canBuy && !isMaxed) {
                ctx.strokeStyle = 'rgba(72, 120, 160, 0.5)';
                ctx.lineWidth = 2;
                ctx.stroke();
            } else if (isMaxed) {
                ctx.strokeStyle = 'rgba(72, 187, 120, 0.3)';
                ctx.lineWidth = 1;
                ctx.stroke();
            } else {
                ctx.strokeStyle = 'rgba(150, 150, 150, 0.15)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Icon or image
            const iconSize = 65;
            const iconX = itemX + 20;
            const iconY = itemY + (itemHeight - iconSize) / 2;

            const hasImage = this.images[upgrade.image];
            if (hasImage) {
                ctx.drawImage(this.images[upgrade.image], iconX - iconSize/2, iconY, iconSize, iconSize);
            } else {
                ctx.font = '36px Arial';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillStyle = canBuy && !isMaxed ? '#48bb78' : '#718096';
                ctx.fillText(upgrade.icon, iconX, iconY + 8);
            }

            // Name (to the right of icon)
            const nameX = iconX + iconSize + 10;
            ctx.font = 'bold 17px "Work Sans", sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillStyle = canBuy && !isMaxed ? '#e2e8f0' : '#94a3b8';
            ctx.fillText(upgrade.name, nameX, iconY + 12);

            // Effect
            ctx.font = '13px "Work Sans", sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(upgrade.effect, nameX, iconY + 35);

            // Level dots
            const maxLevels = upgrade.pricing.length;
            ctx.textAlign = 'right';
            if (isMaxed) {
                ctx.fillStyle = '#48bb78';
                ctx.font = 'bold 13px "Space Mono", monospace';
                ctx.fillText('MAX', itemX + itemWidth - 15, itemY + itemHeight / 2);
            } else {
                ctx.font = '13px Arial';
                for (let l = 0; l < maxLevels; l++) {
                    const dotX = itemX + itemWidth - 45 + l * 14;
                    const dotY = itemY + itemHeight / 2;
                    ctx.beginPath();
                    ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
                    ctx.fillStyle = l < level ? '#48bb78' : 'rgba(255, 255, 255, 0.2)';
                    ctx.fill();
                }
            }

            // Price
            if (!isMaxed) {
                ctx.font = 'bold 16px "Space Mono", monospace';
                ctx.fillStyle = canBuy ? '#ffd700' : '#5c6770';
                ctx.fillText(`$${cost}`, itemX + itemWidth - 15, itemY + itemHeight / 2 + 10);
            }
        }

        // Continue button
        const continueY = panelY + panelHeight - 55;
        const continueWidth = 160;
        const continueHeight = 42;
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
        ctx.roundRect(continueX, continueY, continueWidth, continueHeight, 8);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 16px "Work Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('FORTSÄTT', centerX, continueY + continueHeight / 2);
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
