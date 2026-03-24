import { AudioController } from './audio.js';
import { UPGRADES } from './upgrade-definitions.js';

export class CardMenu {
    constructor(state) {
        this.state = state;
        this.cards = this.initializeCards();
        this.images = {};
        this.logoImage = null;
        this.loadLogo();
        this.selectedCardId = null;
        this.cardBounds = [];
        this.buyButtonBounds = null;
        this.continueButtonBounds = null;
        this.rerollButtonBounds = null;
        this.animationState = {
            enteringCards: [],
            exitingCards: [],
            purchaseAnimation: null,
            selectAnimation: null,
            purchasedCardId: null
        };
        this.stars = [];
        this.fireflies = [];
        this.lastFireflySpawn = 0;
        this.noiseOffset = 0;
        this.noiseCanvas = null;
        this.initializeStars();

        // Entrance animation
        this.isEntering = false;
        this.enterProgress = 1;
        this.shopTransition = null;
    }

    setShopTransition(shopTransition) {
        this.shopTransition = shopTransition;
    }

    resetEntrance() {
        this.isEntering = true;
        this.enterProgress = 0;
        this.skipLogoEntrance = this.state.skipLogoEntrance;
        this.state.skipLogoEntrance = false;
    }

    loadLogo() {
        this.logoImage = new Image();
        this.logoImage.src = 'assets/shop-logo.svg';
    }

    hashCardId(str) {
        let hash = 0;
        for (let c of str) {
            hash = ((hash << 5) - hash + c.charCodeAt(0)) | 0;
        }
        return Math.abs(hash) / 2147483647;
    }

    getCardFloatOffset(cardId, time, isLarge = false) {
        const hash = this.hashCardId(cardId);
        const phase = hash * Math.PI * 2;
        const yFreq = 0.6 + hash * 0.4;
        const rotFreq = 0.3 + ((hash * 13) % 7) * 0.1;
        const amp = isLarge ? 1 : 1.5;
        return {
            y: Math.sin(time * yFreq + phase) * amp,
            rotation: Math.sin(time * rotFreq + phase * 1.7) * 0.007,
            x: Math.sin(time * 0.4 + phase * 2.3) * 0.75
        };
    }

    initializeStars() {
        const numStars = 8 + Math.floor(Math.random() * 8);
        for (let i = 0; i < numStars; i++) {
            this.stars.push({
                x: Math.random(),
                y: Math.random(),
                size: 0.5 + Math.random() * 1,
                phase: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.025 + Math.random() * 0.075
            });
        }
    }

    spawnFirefly(time) {
        this.fireflies.push({
            x: Math.random(),
            y: 0.1 + Math.random() * 0.8,
            vx: (Math.random() - 0.5) * 0.002,
            vy: (Math.random() - 0.5) * 0.0015,
            birthTime: time,
            lifespan: 2 + Math.random() * 3,
            phase: Math.random() * Math.PI * 2,
            glowPhase: Math.random() * Math.PI * 2
        });
    }

    updateFireflies(time, dt) {
        const maxFireflies = 2;
        const spawnInterval = 1.5;
        
        for (let f of this.fireflies) {
            f.vx += (Math.random() - 0.5) * 0.0008;
            f.vy += (Math.random() - 0.5) * 0.0008;
            f.vx = Math.max(-0.003, Math.min(0.003, f.vx));
            f.vy = Math.max(-0.0025, Math.min(0.0025, f.vy));
            
            f.x += f.vx;
            f.y += f.vy;
            
            if (f.x < 0) { f.x = 0; f.vx *= -0.5; }
            if (f.x > 1) { f.x = 1; f.vx *= -0.5; }
            if (f.y < 0.05) { f.y = 0.05; f.vy *= -0.5; }
            if (f.y > 0.95) { f.y = 0.95; f.vy *= -0.5; }
        }
        
        this.fireflies = this.fireflies.filter(f => (time - f.birthTime) < f.lifespan);
        
        if (this.fireflies.length < maxFireflies && time - this.lastFireflySpawn > spawnInterval) {
            this.spawnFirefly(time);
            this.lastFireflySpawn = time;
        }
    }

    drawTurbulence(ctx, x, y, width, height, time) {
        ctx.fillStyle = '#0f0f18';
        ctx.fillRect(x, y, width, height);
    }

    drawStars(ctx, x, y, width, height, time) {
        ctx.save();
        
        for (let star of this.stars) {
            const sx = x + Math.floor(star.x * width);
            const sy = y + Math.floor(star.y * height);
            
            const twinkle = Math.max(0.1, 0.4 + Math.sin(time * star.twinkleSpeed + star.phase) * 0.3 + Math.sin(time * star.twinkleSpeed * 1.7 + star.phase * 1.3) * 0.15);
            
            const size = Math.max(1, Math.floor(star.size * twinkle * 2));
            
            ctx.fillStyle = `rgba(255,255, 255, ${twinkle})`;
            ctx.fillRect(sx, sy, size, size);
            
            if (twinkle > 0.6) {
                ctx.fillStyle = `rgba(255, 255, 255, ${(twinkle - 0.6) * 0.5})`;
                ctx.fillRect(sx - 1, sy, size + 2, size);
                ctx.fillRect(sx, sy - 1, size, size + 2);
            }
        }
        
        ctx.restore();
    }

    drawFireflies(ctx, x, y, width, height, time) {
        ctx.save();
        
        for (let f of this.fireflies) {
            const age = time - f.birthTime;
            let alpha = 1;
            
            if (age < 0.3) {
                alpha = age / 0.3;
            } else if (age > f.lifespan - 0.5) {
                alpha = (f.lifespan - age) / 0.5;
            }
            
            const pulse = 0.6 + Math.sin(time * 0.4 + f.glowPhase) * 0.3;
            
            const fx = x + Math.floor(f.x * width);
            const fy = y + Math.floor(f.y * height);
            
            const glowRadius = Math.floor(2 + pulse);
            
            for (let dy = -glowRadius; dy <= glowRadius; dy++) {
                for (let dx = -glowRadius; dx <= glowRadius; dx++) {
                    const dist = Math.abs(dx) + Math.abs(dy);
                    if (dist <= glowRadius) {
                        const distAlpha = alpha * pulse * (1 - dist / (glowRadius + 1)) * 0.7;
                        ctx.fillStyle = `rgba(255, 200, 50, ${distAlpha})`;
                        ctx.fillRect(fx + dx, fy + dy, 1, 1);
                    }
                }
            }
            
            ctx.fillStyle = `rgba(255, 220, 100, ${alpha * pulse})`;
            ctx.fillRect(fx, fy, 1, 1);
        }
        
        ctx.restore();
    }

    drawBackground(ctx, x, y, width, height, time) {
        this.drawTurbulence(ctx, x, y, width, height, time);
        this.drawStars(ctx, x, y, width, height, time);
        this.updateFireflies(time, 0.016);
        this.drawFireflies(ctx, x, y, width, height, time);
    }

    initializeCards() {
        let baseUpgrades = JSON.parse(JSON.stringify(UPGRADES));
        
        // DEV MODE OVERRIDE
        if (this.state.isDevMode) {
            const override = localStorage.getItem('upgrades_override');
            if (override) {
                try {
                    const overrides = JSON.parse(override);
                    baseUpgrades = baseUpgrades.map(upgrade => {
                        if (overrides[upgrade.id]) {
                            return { ...upgrade, ...overrides[upgrade.id] };
                        }
                        return upgrade;
                    });
                    console.log('Dev Mode: Applied upgrade overrides from localStorage');
                } catch (e) {
                    console.error('Failed to parse upgrades_override', e);
                }
            }
        }
        
        return baseUpgrades;
    }

    getAvailableUpgrades() {
        if (this.state.shopUpgradeSelection !== undefined && this.state.shopUpgradeSelection !== null) {
            return this.state.shopUpgradeSelection;
        }
        
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
        
        const shuffled = [...available];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        const selection = shuffled.slice(0, 3);
        this.state.shopUpgradeSelection = selection;
        return selection;
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

        // Special handling for specific upgrades
        const newLevel = currentLevel + 1;

        // noNegativePickups - remove negative pickups
        if (cardId === 'noNegativePickups' && newLevel > 0) {
            this.state.curlChaosPickups = [];
            this.state.sizeShrinkPickups = [];
        }

        // spin_to_speed - remove speed pickups when purchased
        if (cardId === 'spin_to_speed' && newLevel > 0) {
            this.state.powerUps = [];
        }

        // glass_cannon - reduce speed pickup spawn rate
        if (cardId === 'glass_cannon') {
            // Handled in physics/initPowerUps - no immediate action needed
        }

        // double_shops - double shop pickup spawn rate
        if (cardId === 'double_shops') {
            // Handled in state.initPowerUps on next init
        }

        // Legacy: coinSpeedBoost tier 2
        if (cardId === 'coinSpeedBoost' && newLevel === 2) {
            this.state.powerUps = [];
            
            this.state.scoringOrbs = this.state.scoringOrbs.filter(o => o.type !== 'yellow');
            
            const maxScroll = Math.max(1, this.state.pageHeight - this.state.screenHeight);
            const segmentSize = 167;
            const progressOffsetScale = segmentSize / maxScroll;
            const startOffset = 800;
            let orbId = this.state.scoringOrbs.length;
            
            const numSegments = Math.floor((maxScroll - startOffset) / segmentSize);
            
            for (let i = 0; i < numSegments; i++) {
                const baseProgress = (startOffset + i * segmentSize) / maxScroll;
                if (baseProgress > 1) continue;
                
                const seed = Math.floor(this.state.pageHeight + i * 500 + (this.state.loopCount || 1) * 100000);
                const random = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x); };
                
                if (random(seed + 2000) < (0.8 / 3)) {
                    const yellowSeed = seed + 3000;
                    const progressOffset = random(yellowSeed) * 5 * progressOffsetScale;
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
            tierLevel: newLevel,
            progress: 0
        });

        return true;
    }

    reroll() {
        const cost = this.state.rerollCost || 1;
        if (this.state.money < cost) return false;
        
        this.state.money -= cost;
        this.state.rerollCost = cost + 1;
        this.state.shopUpgradeSelection = null;
        this.selectedCardId = null;
        this.animationState.selectAnimation = null;
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

        if (this.rerollButtonBounds) {
            const rb = this.rerollButtonBounds;
            if (x >= rb.x && x <= rb.x + rb.width &&
                y >= rb.y && y <= rb.y + rb.height) {
                if (this.state.money >= (this.state.rerollCost || 1)) {
                    this.reroll();
                    return { action: 'reroll' };
                }
            }
        }

        if (this.buyButtonBounds) {
            const bb = this.buyButtonBounds;
            if (x >= bb.x && x <= bb.x + bb.width &&
                y >= bb.y && y <= bb.y + bb.height) {
                if (this.selectedCardId && this.canAfford(this.selectedCardId)) {
                    const purchasedCardId = this.selectedCardId;
                    const card = this.cards.find(c => c.id === purchasedCardId);
                    const currentLevel = this.state.upgrades[purchasedCardId]?.level || 0;
                    this.animationState.purchasedCardId = purchasedCardId;
                    this.animationState.purchasedTierLevel = currentLevel + 1;
                    this.purchase(purchasedCardId);
                    this.state.shopUpgradeSelection = this.state.shopUpgradeSelection.filter(c => c.id !== purchasedCardId);
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
        if (this.isEntering) {
            this.enterProgress += deltaTime * 2;
            if (this.enterProgress >= 1) {
                this.enterProgress = 1;
                this.isEntering = false;
            }
        }

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
        this.buyButtonBounds = null;
        this.continueButtonBounds = null;
        this.rerollButtonBounds = null;

        const time = performance.now() / 1000;

        const playArea = this.state.getPlayArea();
        const areaWidth = playArea.width;
        const areaLeft = playArea.left;

        ctx.save();
        ctx.beginPath();
        ctx.rect(areaLeft, 0, areaWidth, screenHeight);
        ctx.clip();

        this.drawBackground(ctx, areaLeft, 0, areaWidth, screenHeight, time);

        const waifuX = areaLeft + 70;
        if (this.shopTransition) {
            this.shopTransition.renderChibi(ctx, waifuX, time, this.selectedCardId !== null);
        }

        let logoScale = 1;
        let logoAlpha = 1;
        
        if (!this.skipLogoEntrance) {
            const logoProgress = Math.min(1, this.enterProgress * 1.5);
            logoScale = 0.5 + logoProgress * 0.5;
            logoAlpha = logoProgress;
        }

        if (this.logoImage && this.logoImage.complete) {
            const logoWidth = Math.min(areaWidth * 0.75, 450);
            const logoHeight = logoWidth * 0.5;
            const logoX = areaLeft + (areaWidth - logoWidth) / 2;
            
            const pulse = Math.sin(time * 4) * 0.15 + 0.85;
            let flicker = 1.0;
            if (Math.random() < 0.05) {
                flicker = Math.random() > 0.5 ? 0.4 : 0.7;
            }

            ctx.save();
            ctx.globalAlpha = logoAlpha * pulse * flicker;
            ctx.translate(areaLeft + areaWidth / 2, -30 + logoHeight / 2);
            ctx.scale(logoScale, logoScale);
            ctx.translate(-(areaLeft + areaWidth / 2), -(-30 + logoHeight / 2));
            
            ctx.shadowColor = 'rgba(0, 191, 255, 0.8)';
            ctx.shadowBlur = 15;
            
            ctx.drawImage(this.logoImage, logoX, -30, logoWidth, logoHeight);
            ctx.restore();
        }

        const moneyProgress = Math.min(1, (this.enterProgress - 0.1) / 0.9);
        const moneyScale = 0.8 + moneyProgress * 0.2;
        const moneyAlpha = moneyProgress;

        ctx.save();
        ctx.globalAlpha = moneyAlpha;
        ctx.translate(areaLeft + areaWidth - 15, 15);
        ctx.scale(moneyScale, moneyScale);
        ctx.font = 'bold 16px "Space Mono", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`$${Math.floor(this.state.money)}`, 0, 0);
        ctx.restore();

        const padding = 130;
        const available = this.getAvailableUpgrades();
        const owned = this.getOwnedUpgrades();

        const selectedCard = this.selectedCardId 
            ? available.find(c => c.id === this.selectedCardId) 
            : null;

        const largeCardHeight = screenHeight * 0.40;
        const largeCardWidth = largeCardHeight;

        if (selectedCard) {
            this.renderArchCards(ctx, areaLeft, areaWidth, padding, available, selectedCard.id, time);
            this.renderSelectedCard(ctx, areaLeft, areaWidth, screenHeight, selectedCard, largeCardWidth, largeCardHeight, time);
        } else {
            this.renderArchCards(ctx, areaLeft, areaWidth, padding, available, null, time);

            const buttonProgress = Math.max(0, (this.enterProgress - 0.3) / 0.7);
            const buttonAlpha = Math.min(1, buttonProgress);
            const buttonSlide = (1 - Math.min(1, buttonProgress)) * 50;

            ctx.save();
            ctx.globalAlpha = buttonAlpha;

            const continueY = screenHeight - 180 + buttonSlide;
            const centerX = areaLeft + areaWidth / 2;
            this.continueButtonBounds = {
                x: centerX - 100,
                y: continueY,
                width: 200,
                height: 40
            };
            this.drawContinueButton(ctx, centerX - 100, continueY, 200, 40);

            this.drawTicker(ctx, areaLeft, areaWidth, time, continueY - 180);

            const rerollCost = this.state.rerollCost || 1;
            const canAffordReroll = this.state.money >= rerollCost;
            this.rerollButtonBounds = {
                x: centerX - 60,
                y: continueY - 50,
                width: 120,
                height: 35
            };
            this.drawRerollButton(ctx, centerX - 60, continueY - 50, 120, 35, canAffordReroll, rerollCost);

            ctx.restore();
        }

        this.renderCollectionZone(ctx, areaLeft, areaWidth, screenHeight, owned, time);
        
        ctx.restore();
    }

    renderArchCards(ctx, areaLeft, areaWidth, startY, available, selectedId, time) {
        const cardHeight = 120;
        const cardWidth = 120;
        const spacing = -10;
        const archHeight = 35;

        const totalWidth = available.length * cardWidth + (available.length - 1) * spacing;
        const startX = areaLeft + (areaWidth - totalWidth) / 2;

        this.cardBounds = [];

        for (let i = 0; i < available.length; i++) {
            const card = available[i];
            const isSelected = card.id === selectedId;
            if (isSelected) continue;

            const normalizedPos = (i - (available.length - 1) / 2) / (available.length > 1 ? (available.length - 1) / 2 : 1);
            
            const angle = normalizedPos * 0.15;
            const archY = startY + Math.abs(normalizedPos) * archHeight;
            
            const floatOffset = this.getCardFloatOffset(card.id, time);

            // Staggered entrance animation
            const cardDelay = i * 0.08;
            let cardProgress = 1;
            let cardScale = 1;
            let cardAlpha = 1;
            
            if (this.isEntering) {
                cardProgress = Math.max(0, (this.enterProgress - cardDelay) / (1 - cardDelay));
                cardProgress = Math.min(1, cardProgress);
                // ease-out-back for bouncy entrance
                const c1 = 1.70158;
                const c3 = c1 + 1;
                cardScale = 1 + (c3 * cardProgress * cardProgress * cardProgress - c1 * cardProgress * cardProgress) * 0.3;
                if (cardProgress < 1) {
                    cardScale = cardProgress < 0.5 
                        ? cardProgress * cardProgress * 2 
                        : 1 - Math.pow(-2 * cardProgress + 2, 2) / 2;
                    cardScale = 0.3 + cardScale * 0.7;
                }
                cardAlpha = Math.min(1, cardProgress * 2);
            }

            const x = startX + i * (cardWidth + spacing);
            const y = archY + floatOffset.y;

            ctx.save();
            ctx.globalAlpha = cardAlpha;
            ctx.translate(x + cardWidth / 2, y + cardHeight / 2);
            ctx.rotate(angle + floatOffset.rotation);
            ctx.scale(cardScale, cardScale);
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

    wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }

    drawWrappedText(ctx, lines, x, startY, lineHeight, font, color, textAlign) {
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.textAlign = textAlign || 'center';
        ctx.textBaseline = 'top';

        let y = startY;
        for (const line of lines) {
            ctx.fillText(line, x, y);
            y += lineHeight;
        }
        
        return y;
    }

    renderSelectedCard(ctx, areaLeft, areaWidth, screenHeight, card, cardWidth, cardHeight, time) {
        const currentLevel = this.state.upgrades[card.id]?.level || 0;
        const tier = card.tiers[currentLevel];
        if (!tier) return;

        const canBuy = this.canAfford(card.id);
        const centerX = areaLeft + areaWidth / 2;
        
        const anim = this.animationState.selectAnimation;
        let cardY = 200;
        let scale = 1;
        let alpha = 1;

        if (anim && anim.progress < 1) {
            const t = anim.progress;
            const ease = 1 - Math.pow(1 - t, 3);
            scale = 0.3 + ease * 0.7;
            alpha = ease;
            cardY = 140 + ease * 60;
        }

        const floatOffset = this.getCardFloatOffset(card.id, time, true);

        const x = centerX - (cardWidth * scale) / 2 + floatOffset.x;
        const y = cardY + floatOffset.y;
        const w = cardWidth * scale;
        const h = cardHeight * scale;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(floatOffset.rotation);
        ctx.translate(-(x + w / 2), -(y + h / 2));
        
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
        const maxTextWidth = Math.min(areaWidth * 0.85, 350);

        let currentY = textY;

        ctx.font = 'bold 20px "Work Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`${card.name} ${tierNumeral}`, centerX, currentY);
        currentY += 28;

        ctx.font = '16px "Work Sans", sans-serif';
        const effectLines = this.wrapText(ctx, tier.effect, maxTextWidth);
        currentY = this.drawWrappedText(ctx, effectLines, centerX, currentY, 20, '16px "Work Sans", sans-serif', '#94a3b8', 'center');
        currentY += 12;

        if (card.proverb) {
            const proverbLines = this.wrapText(ctx, `"${card.proverb}"`, maxTextWidth);
            currentY = this.drawWrappedText(ctx, proverbLines, centerX, currentY, 18, 'italic 14px "Space Mono", monospace', '#64748b', 'center');
            currentY += 12;
        }

        ctx.font = 'bold 18px "Space Mono", monospace';
        ctx.fillStyle = canBuy ? '#ffd700' : '#718096';
        ctx.fillText(`$${tier.cost}`, centerX, currentY);
        currentY += 30;

        this.buyButtonBounds = {
            x: centerX - 80,
            y: currentY,
            width: 160,
            height: 45
        };
        this.drawBuyButton(ctx, centerX - 80, currentY, 160, 45, canBuy);
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
        ctx.fillText('LÄMNA', x + width / 2, y + height / 2);
    }

    drawTicker(ctx, areaLeft, areaWidth, time, y) {
        if (!this.tickerText) {
            const quotes = [
                "Att födas är en olycka. Att curla är en till.",
                "Den eviga vintern väntar på ingen man. Men banan är bokad till 21:00.",
                "Sömn är för de omedvetna. Sopa istället.",
                "Isen bryr sig inte om era ambitioner. Den väntar bara på att tina bort.",
                "Ni ska spela samma match i evighet. Det är namnet på spelet.",
                "Måla inte kycklingen blå innan hon värpt.",
                "Även en blind matta kan flyga om vinden är stark nog.",
                "Gräv inte där du står, stå där du gräver.",
                "Huvva. Kroppen är ett kroppsskrälle, skrangligt som en gammal kärra.",
                "Det är inte raketkirurgi. Det är bara livet som smular.",
                "Skogen ser allt. Särskilt dina svaga kast.",
                "Mörkret samlas vid hog line. Välkomna.",
                "Skadedjuren har vaknat. Sätt på skorna.",
                "Sadeln skaver bara om hästen är död. Er vilja lever än.",
                "Kasta inte bävern i sågverket — sågen är redan rostig.",
                "Nu har vi salladen i sörjan, och det är lunchdags.",
                "Alla hattar, ingen boskap, men mycket sås.",
                "Man kan inte göra omelett utan att knäcka ägg. Eller hur?",
                "Tystnad är guld. Sopa är silver.",
                "Lidandet är konstant. Isen är kall.",
                "Viljan har fått råtta. Spela ändå.",
                "Du kastar geväret i kornfältet. Jag ser dig."
            ];
            
            const shuffled = quotes.sort(() => 0.5 - Math.random());
            this.tickerText = shuffled.join("   ✦   ") + "   ✦   ";
        }
        
        const tickerHeight = 45;
        
        ctx.save();
        
        ctx.fillStyle = '#ff69b4';
        ctx.fillRect(areaLeft, y, areaWidth, tickerHeight);
        
        ctx.font = '24px "DotGothic16", monospace';
        ctx.fillStyle = '#000000';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        
        const textWidth = ctx.measureText(this.tickerText).width;
        
        const speed = 50;
        let offset = -((time * speed) % textWidth);
        if (offset > 0) offset -= textWidth;
        
        let currentX = areaLeft + offset;
        while (currentX < areaLeft + areaWidth) {
            ctx.fillText(this.tickerText, currentX, y + tickerHeight / 2 + 1);
            currentX += textWidth;
        }
        
        ctx.restore();
    }

    drawRerollButton(ctx, x, y, width, height, canAfford, cost) {
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 10);
        ctx.fillStyle = canAfford ? 'rgba(100, 200, 255, 0.15)' : 'rgba(100, 100, 100, 0.2)';
        ctx.fill();

        ctx.strokeStyle = canAfford ? '#64b5f6' : 'rgba(100, 100, 100, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = 'bold 14px "Space Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = canAfford ? '#64b5f6' : '#718096';
        ctx.fillText(`REROLL ($${cost})`, x + width / 2, y + height / 2);
    }

    renderCollectionZone(ctx, areaLeft, areaWidth, screenHeight, owned, time) {
        if (owned.length === 0) return;

        const cardWidth = 60;
        const cardHeight = 60;
        const spacing = 8;
        const totalWidth = owned.length * cardWidth + (owned.length - 1) * spacing;
        const startX = areaLeft + (areaWidth - totalWidth) / 2;
        const cardY = screenHeight - cardHeight - 15;

        // Collection zone entrance animation (delayed)
        const collectionDelay = 0.5;
        const collectionProgress = Math.max(0, (this.enterProgress - collectionDelay) / (1 - collectionDelay));

        for (let i = 0; i < owned.length; i++) {
            const card = owned[i];
            const baseX = startX + i * (cardWidth + spacing);
            const baseY = cardY;

            const ownedId = `${card.id}-${card.tierLevel}`;
            const floatOffset = this.getCardFloatOffset(ownedId, time);

            const seed = card.id.charCodeAt(card.id.length - 1) + card.tierLevel;
            const angle = ((seed *7) % 11 - 5) * 0.02;

            const anim = this.animationState.enteringCards.find(
                a => a.cardId === card.id && a.tierLevel === card.tierLevel
            );

            // Staggered entrance for owned cards
            const cardDelay = i * 0.05;
            let cardProgress = Math.min(1, Math.max(0, (collectionProgress - cardDelay) / 0.3));
            let cardAlpha = Math.min(1, cardProgress * 2);
            let cardScale = 0.5 + cardProgress * 0.5;

            ctx.save();
            ctx.globalAlpha = cardAlpha;
            ctx.translate(baseX + floatOffset.x + cardWidth / 2, baseY + floatOffset.y + cardHeight / 2);
            ctx.scale(cardScale, cardScale);
            ctx.translate(-(baseX + floatOffset.x + cardWidth / 2), -(baseY + floatOffset.y + cardHeight / 2));

            this.drawCard(ctx, baseX + floatOffset.x, baseY + floatOffset.y, cardWidth, cardHeight, card, card.tier, true, false, angle + floatOffset.rotation);

            ctx.restore();
        }
    }

    async preloadImages() {
        // Preload logo
        if (this.logoImage) {
            await new Promise(r => {
                if (this.logoImage.complete) r();
                else {
                    this.logoImage.onload = r;
                    this.logoImage.onerror = r;
                }
            });
        }

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
