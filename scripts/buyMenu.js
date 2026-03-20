export class BuyMenu {
    constructor(state) {
        this.state = state;
        this.upgrades = [
            { id: 'stoneSize', name: 'Stenstorlek', icon: '⬤', effect: '+3 radie', pricing: [1, 5, 20, 40, 65] },
            { id: 'maxVelocity', name: 'Maxhastighet', icon: '⚡', effect: '+5 max hastighet', pricing: [1, 5, 20, 40, 65] },
            { id: 'frictionReduction', name: 'Friktion', icon: '❄', effect: '-5% friktion', pricing: [1, 5, 20, 40, 65] },
            { id: 'powerdownResistance', name: 'Motstånd', icon: '🛡', effect: '-5% nackdelar', pricing: [1, 5, 20, 40, 65] },
            { id: 'curlPower', name: 'Curlkraft', icon: '↺', effect: '-10% curl', pricing: [1, 5, 20, 40, 65] },
            { id: 'orbSize', name: 'Orbstorlek', icon: '⚪', effect: '+5% orbstorlek', pricing: [1, 5, 20, 40, 65] },
            { id: 'extraLife', name: 'Extra Liv', icon: '♥', effect: '+1 liv', pricing: 'dynamic' },
        ];
        this.clickAreas = [];
    }

    getUpgradeCost(upgradeId) {
        if (upgradeId === 'extraLife') {
            return this.state.lifeCost;
        }
        const upgrade = this.upgrades.find(u => u.id === upgradeId);
        if (!upgrade) return null;
        const level = this.state.upgrades[upgradeId].level;
        if (upgrade.pricing === 'dynamic') {
            return this.state.lifeCost;
        }
        if (level >= upgrade.pricing.length) return null;
        return upgrade.pricing[level];
    }

    canAfford(upgradeId) {
        const cost = this.getUpgradeCost(upgradeId);
        return cost !== null && this.state.money >= cost;
    }

    isMaxedOut(upgradeId) {
        if (upgradeId === 'extraLife') return false;
        const upgrade = this.upgrades.find(u => u.id === upgradeId);
        if (!upgrade || upgrade.pricing === 'dynamic') return false;
        const level = this.state.upgrades[upgradeId].level;
        return level >= upgrade.pricing.length;
    }

    purchase(upgradeId) {
        const cost = this.getUpgradeCost(upgradeId);
        if (!this.canAfford(upgradeId)) return false;

        this.state.money -= cost;

        if (upgradeId === 'extraLife') {
            this.state.lives++;
            this.state.lifeCost *= 10;
        } else {
            this.state.upgrades[upgradeId].level++;
        }

        return true;
    }

    render(ctx, screenWidth, screenHeight) {
        this.clickAreas = [];

        ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        const centerX = screenWidth / 2;
        const centerY = screenHeight / 2;
        const panelWidth = Math.min(400, screenWidth - 40);
        const panelHeight = Math.min(500, screenHeight - 40);
        const panelX = centerX - panelWidth / 2;
        const panelY = centerY - panelHeight / 2;

        ctx.fillStyle = 'rgba(30, 40, 60, 0.95)';
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 12);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('UPPGRADERINGAR', centerX, panelY + 20);

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`$${this.state.money}`, centerX, panelY + 55);

        const itemStartY = panelY + 90;
        const itemHeight = 42;
        const itemPadding = 6;
        const itemWidth = panelWidth - 24;

        for (let i = 0; i < this.upgrades.length; i++) {
            const upgrade = this.upgrades[i];
            const level = upgrade.id === 'extraLife' ? 0 : (this.state.upgrades[upgrade.id]?.level || 0);
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

            if (canBuy && !isMaxed) {
                const gradient = ctx.createLinearGradient(itemX, itemY, itemX + itemWidth, itemY);
                gradient.addColorStop(0, 'rgba(72, 187, 120, 0.2)');
                gradient.addColorStop(1, 'rgba(72, 187, 120, 0.05)');
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            }
            ctx.beginPath();
            ctx.roundRect(itemX, itemY, itemWidth, itemHeight, 6);
            ctx.fill();

            ctx.font = '20px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = canBuy && !isMaxed ? '#48bb78' : '#718096';
            ctx.fillText(upgrade.icon, itemX + 10, itemY + itemHeight / 2);

            ctx.font = 'bold 14px Arial';
            ctx.fillStyle = canBuy && !isMaxed ? '#e2e8f0' : '#718096';
            ctx.fillText(upgrade.name, itemX + 40, itemY + 12);

            ctx.font = '12px Arial';
            ctx.fillStyle = '#a0aec0';
            ctx.fillText(upgrade.effect, itemX + 40, itemY + 28);

            if (upgrade.id !== 'extraLife') {
                ctx.textAlign = 'right';
                if (isMaxed) {
                    ctx.fillStyle = '#48bb78';
                    ctx.font = 'bold 12px Arial';
                    ctx.fillText('MAX', itemX + itemWidth - 10, itemY + itemHeight / 2);
                } else {
                    ctx.font = '12px Arial';
                    for (let l = 0; l < 5; l++) {
                        const dotX = itemX + itemWidth - 80 + l * 14;
                        const dotY = itemY + itemHeight / 2;
                        ctx.beginPath();
                        ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
                        ctx.fillStyle = l < level ? '#48bb78' : 'rgba(255, 255, 255, 0.2)';
                        ctx.fill();
                    }
                }
            }

            ctx.textAlign = 'right';
            if (!isMaxed) {
                ctx.font = 'bold 14px Arial';
                ctx.fillStyle = canBuy ? '#ffd700' : '#4a5568';
                ctx.fillText(`$${cost}`, itemX + itemWidth - 10, itemY + itemHeight / 2);
            }
        }

        const continueY = panelY + panelHeight - 50;
        const continueWidth = 140;
        const continueHeight = 36;
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

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('FORTSÄTT', centerX, continueY + continueHeight / 2);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '11px Arial';
        ctx.fillText('Klicka för att köpa', centerX, panelY + panelHeight - 12);
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