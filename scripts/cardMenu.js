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

drawTurbulence(ctx, width, height, time) {
        ctx.fillStyle = '#0f0f18';
        ctx.fillRect(0, 0, width, height);
    }

    drawStars(ctx, width, height, time) {
        ctx.save();
        
        for (let star of this.stars) {
            const x = Math.floor(star.x * width);
            const y = Math.floor(star.y * height);
            
            const twinkle = Math.max(0.1, 0.4 + Math.sin(time * star.twinkleSpeed + star.phase) * 0.3 + Math.sin(time * star.twinkleSpeed * 1.7 + star.phase * 1.3) * 0.15);
            
            const size = Math.max(1, Math.floor(star.size * twinkle * 2));
            
            ctx.fillStyle = `rgba(255,255, 255, ${twinkle})`;
            ctx.fillRect(x, y, size, size);
            
            if (twinkle > 0.6) {
                ctx.fillStyle = `rgba(255, 255, 255, ${(twinkle - 0.6) * 0.5})`;
                ctx.fillRect(x - 1, y, size + 2, size);
                ctx.fillRect(x, y - 1, size, size + 2);
            }
        }
        
        ctx.restore();
    }

    drawFireflies(ctx, width, height, time) {
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
            
            const x = Math.floor(f.x * width);
            const y = Math.floor(f.y * height);
            
            const glowRadius = Math.floor(2 + pulse);
            
            for (let dy = -glowRadius; dy <= glowRadius; dy++) {
                for (let dx = -glowRadius; dx <= glowRadius; dx++) {
                    const dist = Math.abs(dx) + Math.abs(dy);
                    if (dist <= glowRadius) {
                        const distAlpha = alpha * pulse * (1 - dist / (glowRadius + 1)) * 0.7;
                        ctx.fillStyle = `rgba(255, 200, 50, ${distAlpha})`;
                        ctx.fillRect(x + dx, y + dy, 1, 1);
                    }
                }
            }
            
            ctx.fillStyle = `rgba(255, 220, 100, ${alpha * pulse})`;
            ctx.fillRect(x, y, 1, 1);
        }
        
        ctx.restore();
    }

drawBackground(ctx, width, height, time) {
        this.drawTurbulence(ctx, width, height, time);
        this.drawStars(ctx, width, height, time);
        this.updateFireflies(time, 0.016);
        this.drawFireflies(ctx, width, height, time);
    }

    initializeCards() {
        return [
            {
                id: 'maxVelocity',
                name: 'Hastig Leda',
                proverb: 'Ät int gul snö om du inte har bråttom.',
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
                name: 'Glatt Misär',
                proverb: 'Även en blind matta kan flyga.',
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
                name: 'Tung Börda',
                proverb: 'Bygg int en struts av sand.',
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
                name: 'Vilsen Skruv',
                proverb: 'Kasta int bävern i sågverket.',
                tiers: [
                    { level: 1, cost: 10, effect: 'Random snurr/10s', image: 'waifu-curl.jpg' },
                    { level: 2, cost: 20, effect: 'Random snurr/5s', image: 'randomCurl-tier2.jpg' },
                ]
            },
            {
                id: 'noNegativePickups',
                name: 'Falsk Trygghet',
                proverb: 'Måla int kycklingen blå.',
                tiers: [
                    { level: 1, cost: 10, effect: 'Ta bort negativa pickups', image: 'waifu-shield.jpg' },
                ]
            },
            {
                id: 'coinSpeedBoost',
                name: 'Blodspengar',
                proverb: 'Alla hattar, ingen boskap, men mycke sås.',
                tiers: [
                    { level: 1, cost: 10, effect: 'Mynt ger hastighetsboost', image: 'coinSpeedBoost-tier1.jpg' },
                    { level: 2, cost: 25, effect: '2x mynt, inga hastighetspickup', image: 'coinSpeedBoost-tier2.jpg' },
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

        // Special handling for noNegativePickups
        if (cardId === 'noNegativePickups' && currentLevel + 1 > 0) {
            this.state.curlChaosPickups = [];
            this.state.sizeShrinkPickups = [];
        }

        // Special handling for coinSpeedBoost tier 2
        if (cardId === 'coinSpeedBoost' && currentLevel + 1 === 2) {
            // Remove speed boost pickups
            this.state.powerUps = [];
            
            // Remove existing yellow orbs and respawn with 2x frequency
            this.state.scoringOrbs = this.state.scoringOrbs.filter(o => o.type !== 'yellow');
            
            // Respawn yellow orbs with 2x frequency (smaller segments)
            const maxScroll = Math.max(1, this.state.pageHeight - this.state.screenHeight);
            const segmentSize = 167; // 2x more frequent than new baseline 333
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
        this.buyButtonBounds = null;
        this.continueButtonBounds = null;

        const time = performance.now() / 1000;

        this.drawBackground(ctx, screenWidth, screenHeight, time);

        // Draw Shop Logo
        if (this.logoImage && this.logoImage.complete) {
            const logoWidth = Math.min(screenWidth * 0.7, 300);
            const logoHeight = logoWidth * (300 / 600); // 2:1 ratio
            ctx.drawImage(this.logoImage, 15, 10, logoWidth, logoHeight);
        }

        ctx.font = 'bold 16px "Space Mono", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`$${Math.floor(this.state.money)}`, screenWidth - 15, 15);

        const padding = 160; // Increased padding to avoid overlap with two-row logo
        const available = this.getAvailableUpgrades();
        const owned = this.getOwnedUpgrades();

        const selectedCard = this.selectedCardId 
            ? available.find(c => c.id === this.selectedCardId) 
            : null;

        const largeCardHeight = screenHeight * 0.40;
        const largeCardWidth = largeCardHeight * 0.65;

        if (selectedCard) {
            this.renderArchCards(ctx, screenWidth, padding, available, selectedCard.id, time);
            this.renderSelectedCard(ctx, screenWidth, screenHeight, selectedCard, largeCardWidth, largeCardHeight, time);
        } else {
            this.renderArchCards(ctx, screenWidth, padding, available, null, time);

            const continueY = screenHeight - 180;
            this.continueButtonBounds = {
                x: screenWidth / 2 - 100,
                y: continueY,
                width: 200,
                height: 40
            };
            this.drawContinueButton(ctx, screenWidth / 2 - 100, continueY, 200, 40);
        }

        this.renderCollectionZone(ctx, screenWidth, screenHeight, padding, time);
    }

    renderArchCards(ctx, screenWidth, startY, available, selectedId, time) {
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
            
            const floatOffset = this.getCardFloatOffset(card.id, time);

            const x = startX + i * (cardWidth + spacing);
            const y = archY + floatOffset.y;

            ctx.save();
            ctx.translate(x + cardWidth / 2, y + cardHeight / 2);
            ctx.rotate(angle + floatOffset.rotation);
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

    renderSelectedCard(ctx, screenWidth, screenHeight, card, cardWidth, cardHeight, time) {
        const currentLevel = this.state.upgrades[card.id]?.level || 0;
        const tier = card.tiers[currentLevel];
        if (!tier) return;

        const canBuy = this.canAfford(card.id);
        const centerX = screenWidth / 2;
        
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
        ctx.font = 'bold 20px "Work Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`${card.name} ${tierNumeral}`, centerX, textY);

        ctx.font = '16px "Work Sans", sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(tier.effect, centerX, textY + 28);

        if (card.proverb) {
            ctx.font = 'italic 14px "Space Mono", monospace';
            ctx.fillStyle = '#64748b';
            ctx.fillText(`"${card.proverb}"`, centerX, textY + 52);
        }

        ctx.font = 'bold 18px "Space Mono", monospace';
        ctx.fillStyle = canBuy ? '#ffd700' : '#718096';
        ctx.fillText(`$${tier.cost}`, centerX, textY + 80);

        const buyY = textY + 110;
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
        ctx.fillText('LÄMNA', x + width / 2, y + height / 2);
    }

    renderCollectionZone(ctx, screenWidth, screenHeight, owned, padding, time) {
        if (owned.length === 0) return;

        const cardWidth = 50;
        const cardHeight = 70;
        const spacing = 8;
        const totalWidth = owned.length * cardWidth + (owned.length - 1) * spacing;
        const startX = (screenWidth - totalWidth) / 2;
        const cardY = screenHeight - cardHeight - 15;

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

            this.drawCardWithAnimation(ctx, baseX + floatOffset.x, baseY + floatOffset.y, cardWidth, cardHeight, card, card.tier, true, false, anim, angle + floatOffset.rotation);
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
