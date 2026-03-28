export class ShopTransition {
    constructor(state) {
        this.state = state;
        this.waifuSprite = null;
        this.waifuLoaded = false;
        this.logoImage = null;
        this.logoLoaded = false;
        this.chromaCanvas = null;
        this.chromaCtx = null;
        this.particles = [];
// Sprite sheet: 4 columns x 3 rows
        this.spriteCols = 4;
        this.spriteRows = 3;
        // Frame dimensions (tightly packed, no gaps)
        this.frameWidth = 155;
        this.frameHeight = 251;
        this.hGap = 0; // no gap between frames
        this.vGap = 0; // no gap between frames
        this.transitionJustFinished = false;
    }

    async loadWaifuSprite() {
        // Load waifu sprite (3x4 sprite sheet)
        try {
            const response = await fetch('/assets/waifu_shop_sprite.jpeg');
            if (response.ok) {
                const blob = await response.blob();
                this.waifuSprite = await createImageBitmap(blob);
                this.waifuLoaded = true;
                console.log('Waifu sprite loaded:', this.waifuSprite.width, 'x', this.waifuSprite.height);
                // Expected: 465 x 1124 (3 cols × 4 rows, each 155 x 281)
                const expectedW = this.frameWidth * this.spriteCols;
                const expectedH = this.frameHeight * this.spriteRows;
                if (this.waifuSprite.width < expectedW || this.waifuSprite.height < expectedH) {
                    console.warn('Sprite dimensions smaller than expected! Some frames may be missing.');
                }
            }
        } catch (e) {
            console.log('Waifu sprite not found, using placeholder');
        }

        // Load shop logo
        this.logoImage = new Image();
        this.logoImage.src = '/assets/shop-logo.svg';
        this.logoImage.onload = () => {
            this.logoLoaded = true;
        };
        this.logoImage.onerror = () => {
            console.log('Shop logo not found');
        };
    }

    update(deltaTime) {
        if (!this.state.shopTransition) return;

        const elapsed = (performance.now() - this.state.shopTransitionStartTime) / 1000;

        switch (this.state.shopTransition) {
            case 'fishZoom':
                this.updateFishZoom(elapsed);
                break;
            case 'fadeIn':
                this.updateFadeIn(elapsed);
                break;
            case 'elementsSlide':
                this.updateElementsSlide(elapsed);
                break;
        }

        this.updateParticles(deltaTime);
    }

    updateFishZoom(elapsed) {
        const duration = 1.2;
        this.state.shopTransitionProgress = Math.min(1, elapsed / duration);

        if (this.state.shopTransitionProgress >= 1) {
            this.state.shopTransition = 'fadeIn';
            this.state.shopTransitionStartTime = performance.now();
            this.state.shopTransitionProgress = 0;
        }
    }

    updateFadeIn(elapsed) {
        const duration = 0.8;
        this.state.shopTransitionProgress = Math.min(1, elapsed / duration);

        if (this.state.shopTransitionProgress >= 1) {
            this.state.shopTransition = 'elementsSlide';
            this.state.shopTransitionStartTime = performance.now();
            this.state.shopTransitionProgress = 0;
        }
    }

    updateElementsSlide(elapsed) {
        const duration = 0.8;
        this.state.shopTransitionProgress = Math.min(1, elapsed / duration);

        if (this.state.shopTransitionProgress >= 1) {
            this.state.shopTransition = null;
            this.state.showBuyMenu = true;
            this.state.isPaused = true;
            this.state.skipLogoEntrance = true;
            this.transitionJustFinished = true;
        }
    }

    spawnBurst(x, y, count, colorBase) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 1.5 + Math.random() * 0.5,
                size: 2 + Math.random() * 3,
                color: colorBase
            });
        }
    }

    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05;
            p.life -= p.decay * deltaTime;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    render(ctx, screenWidth, screenHeight) {
        if (!this.state.shopTransition && !this.transitionJustFinished) {
            this.renderParticles(ctx);
            return;
        }

        const currentTransition = this.state.shopTransition || 'elementsSlide';

        switch (currentTransition) {
            case 'fishZoom':
                this.renderFishZoom(ctx, screenWidth, screenHeight);
                break;
            case 'fadeIn':
                this.renderFadeIn(ctx, screenWidth, screenHeight);
                break;
            case 'elementsSlide':
                this.renderElementsSlide(ctx, screenWidth, screenHeight);
                break;
        }

        this.renderParticles(ctx);
        this.transitionJustFinished = false;
    }

renderFishZoom(ctx, screenWidth, screenHeight) {
        const t = this.state.shopTransitionProgress;
        const ease = 1 - Math.pow(1 - t, 3);
        const scale = this.state.scaleFactor;

        const playArea = this.state.getPlayArea();
        const centerX = playArea.left + playArea.width / 2;
        const centerY = screenHeight / 2;

        const animScale = (1 + ease * 3) * scale;
        const angle = t * Math.PI * 4;

        if (t > 0.8 && t < 0.85) {
            this.spawnBurst(centerX, centerY, 25, 'rgba(0, 191, 255,');
        }

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);
        ctx.scale(animScale, animScale);

        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 50);
        gradient.addColorStop(0, 'rgba(200, 240, 255, 0.3)');
        gradient.addColorStop(0.5, 'rgba(0, 191, 255, 0.15)');
        gradient.addColorStop(1, 'rgba(0, 100, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, 50, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '60px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🐟', 0, 0);

        ctx.restore();

        if (t > 0.7) {
            const fadeAlpha = (t - 0.7) / 0.3;
            ctx.fillStyle = `rgba(15, 15, 24, ${fadeAlpha})`;
            ctx.fillRect(playArea.left, 0, playArea.width, screenHeight);
        }
    }

    renderFadeIn(ctx, screenWidth, screenHeight) {
        const t = this.state.shopTransitionProgress;
        const ease = 1 - Math.pow(1 - t, 3);
        const scale = this.state.scaleFactor;

        const playArea = this.state.getPlayArea();
        
        ctx.fillStyle = '#0f0f18';
        ctx.fillRect(playArea.left, 0, playArea.width, screenHeight);

        const centerX = playArea.left + playArea.width / 2;
        const centerY = screenHeight / 2;

        const animScale = (0.6 + ease * 0.4) * scale;
        const alpha = ease;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(centerX, centerY + 50 * scale);
        ctx.scale(animScale * 2, animScale * 2);
        this.drawWaifu(ctx, 0, 0, t);
        ctx.restore();

        if (this.logoLoaded && this.logoImage) {
            const baseLogoW = Math.min(playArea.width * 0.75, 450 * scale);
            const baseLogoH = baseLogoW * 0.5;
            const logoW = baseLogoW * 2;
            const logoH = baseLogoH * 2;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(centerX, centerY - 150 * scale);
            ctx.scale(animScale / scale, animScale / scale); 
            ctx.drawImage(this.logoImage, -logoW / 2, -logoH / 2, logoW, logoH);
            ctx.restore();
        }
    }

    renderElementsSlide(ctx, screenWidth, screenHeight) {
        const t = this.state.shopTransitionProgress;
        const ease = 1 - Math.pow(1 - t, 3);
        const scale = this.state.scaleFactor;

        const playArea = this.state.getPlayArea();
        
        ctx.fillStyle = '#0f0f18';
        ctx.fillRect(playArea.left, 0, playArea.width, screenHeight);

        const centerX = playArea.left + playArea.width / 2;
        const waifuEndX = playArea.left + 70 * scale;
        const waifuStartX = centerX;
        const waifuStartY = screenHeight / 2 + 50 * scale;
        const waifuEndY = 70 * scale;
        const waifuX = waifuStartX + (waifuEndX - waifuStartX) * ease;
        const waifuY = waifuStartY + (waifuEndY - waifuStartY) * ease;
        const waifuScale = (2 - ease * 1.25) * scale;
        
        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.translate(waifuX, waifuY);
        ctx.scale(waifuScale, waifuScale);
        this.drawWaifu(ctx, 0, 0, t);
        ctx.restore();

        if (this.logoLoaded && this.logoImage) {
            const baseLogoW = Math.min(playArea.width * 0.75, 450 * scale);
            const baseLogoH = baseLogoW * 0.5;
            const logoStartX = centerX;
            const logoStartY = screenHeight / 2 - 150 * scale;
            const logoEndX = centerX;
            const logoEndY = -30 * scale + baseLogoH / 2;
            const logoX = logoStartX + (logoEndX - logoStartX) * ease;
            const logoY = logoStartY + (logoEndY - logoStartY) * ease;
            const logoScale = (2 - ease * 1) * scale;

            ctx.save();
            ctx.globalAlpha = 0.95;
            ctx.translate(logoX, logoY);
            ctx.scale(logoScale, logoScale);
            ctx.drawImage(this.logoImage, -baseLogoW / 2, -baseLogoH / 2, baseLogoW, baseLogoH);
            ctx.restore();
        }
    }

    renderParticles(ctx) {
        const scale = this.state.scaleFactor;
        for (const p of this.particles) {
            ctx.fillStyle = p.color + p.life + ')';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life * scale, 0, Math.PI * 2);
            ctx.fill();
        }
    }

drawWaifu(ctx, x, y, progress) {
        const scale = this.state.scaleFactor;
        const displayWidth = 100 * scale;
        const displayHeight = Math.round(displayWidth * (this.frameHeight / this.frameWidth));

        if (this.waifuLoaded && this.waifuSprite) {
            this.drawWaifuFrame(ctx, x, y, progress, displayWidth, displayHeight);
        } else {
            this.drawPlaceholderWaifu(ctx, x, y);
        }
    }

    drawWaifuFrame(ctx, x, y, timeSeconds, displayWidth, displayHeight) {
        if (!this.waifuLoaded || !this.waifuSprite) return;

        const now = performance.now() / 1000;
        const totalFrames = 12;
        const frameIndex = Math.floor(now) % totalFrames;
        
        const col = frameIndex % this.spriteCols;
        const row = Math.floor(frameIndex / this.spriteCols);

        const srcX = col * this.frameWidth;
        const srcY = row * this.frameHeight;

        if (!this.chromaCanvas || this.chromaCanvas.width !== Math.ceil(displayWidth) || this.chromaCanvas.height !== Math.ceil(displayHeight)) {
            this.chromaCanvas = document.createElement('canvas');
            this.chromaCanvas.width = Math.ceil(displayWidth);
            this.chromaCanvas.height = Math.ceil(displayHeight);
            this.chromaCtx = this.chromaCanvas.getContext('2d', { willReadFrequently: true });
        }

        this.chromaCtx.clearRect(0, 0, this.chromaCanvas.width, this.chromaCanvas.height);
        this.chromaCtx.save();
        this.chromaCtx.scale(-1, 1);
        this.chromaCtx.drawImage(
            this.waifuSprite,
            srcX, srcY, this.frameWidth, this.frameHeight,
            -displayWidth, 0, displayWidth, displayHeight
        );
        this.chromaCtx.restore();

        try {
            const imageData = this.chromaCtx.getImageData(0, 0, this.chromaCanvas.width, this.chromaCanvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                if (g > 100 && g > r * 1.2 && g > b * 1.2) {
                    data[i + 3] = 0;
                }
            }

            this.chromaCtx.putImageData(imageData, 0, 0);
        } catch (e) {}

        ctx.drawImage(this.chromaCanvas, x - displayWidth / 2, y - displayHeight / 2);
    }

    drawPlaceholderWaifu(ctx, x, y) {
        const scale = this.state.scaleFactor;
        ctx.font = `${Math.floor(48 * scale)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('٩(◕‿◕｡)۶', x, y);
    }

    renderChibi(ctx, waifuX, time, isCardSelected) {
        const scale = this.state.scaleFactor;
        const waifuY = 70 * scale;

        const floatY = Math.sin(time * 0.8) * 2 * scale;
        const floatX = Math.sin(time * 0.5) * 1 * scale;

        ctx.save();
        ctx.globalAlpha = 0.95;

        ctx.translate(waifuX + floatX, waifuY + floatY);
        ctx.scale(0.75, 0.75);
        ctx.translate(-(waifuX + floatX), -(waifuY + floatY));

        this.drawWaifu(ctx, waifuX + floatX, waifuY + floatY, time);

        ctx.restore();
    }
}
