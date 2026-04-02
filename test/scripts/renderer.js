import { applyEffect } from './effects.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.stoneRadius = 30;
        this.particles = [];
        this.prevStoneX = null;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
        this.superBoostImage = null;
        this.loadSuperBoostImage();
    }

    loadSuperBoostImage() {
        this.superBoostImage = new Image();
        this.superBoostImage.src = 'assets/boop.png';
    }
    
    scale(state, value) {
        return value * state.scaleFactor;
    }

    addParticle(x, y, vx, vy, color, life = 1) {
        this.particles.push({
            x: x,
            y: y,
            vx: vx,
            vy: vy,
            color: color,
            life: life,
            maxLife: life
        });
    }

    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= deltaTime;
            p.vy += 5 * deltaTime;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    drawParticles() {
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(${p.color}, ${alpha})`;
            this.ctx.fill();
        }
    }

updateEffects(state, deltaTime) {
        if (state.screenShake) {
            state.screenShake.timer -= deltaTime;
            if (state.screenShake.timer > 0) {
                const progress = state.screenShake.timer / state.screenShake.duration;
                const intensity = state.screenShake.intensity * progress;
                this.shakeOffsetX = (Math.random() - 0.5) * intensity * 2;
                this.shakeOffsetY = (Math.random() - 0.5) * intensity * 2;
            } else {
                state.screenShake = null;
                this.shakeOffsetX = 0;
                this.shakeOffsetY = 0;
            }
        }

        if (state.ringFlash) {
            state.ringFlash.timer -= deltaTime;
            if (state.ringFlash.timer > 0) {
                const progress = 1 - (state.ringFlash.timer / state.ringFlash.duration);
                state.ringFlash.radius = state.ringFlash.maxRadius * progress;
            } else {
                state.ringFlash = null;
            }
        }

        this.updateSuperBoostImageEffect(state, deltaTime);
    }

drawRingFlash(state) {
        if (!state.ringFlash) return;
        
        const rf = state.ringFlash;
        const alpha = rf.timer / rf.duration;
        
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(rf.x, rf.y, rf.radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(${rf.color}, ${alpha})`;
        this.ctx.lineWidth = 8;
        this.ctx.stroke();
        this.ctx.restore();
    }

    addWallBounceParticles(x, y) {
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            this.addParticle(
                x + Math.random() * 10,
                y + Math.random() * 10,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                '255, 200, 100',
                0.5
            );
        }
    }

    addSweepParticles(x, y) {
        for (let i = 0; i < 3; i++) {
            this.addParticle(
                x + (Math.random() - 0.5) * 100,
                y + (Math.random() - 0.5) * 50,
                (Math.random() - 0.5) * 2,
                Math.random() * 2,
                '66, 153, 225',
                0.3
            );
        }
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    getStoneScreenPosition(state) {
        const playArea = state.getPlayArea();
        return {
            x: playArea.left + playArea.width / 2 + state.stone.x,
            y: state.stoneYPx
        };
    }

    drawWalls(state) {
        const playArea = state.getPlayArea();
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = this.scale(state, 3);
        this.ctx.lineCap = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(playArea.left, 0);
        this.ctx.lineTo(playArea.left, state.screenHeight);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(playArea.right, 0);
        this.ctx.lineTo(playArea.right, state.screenHeight);
        this.ctx.stroke();
    }

    drawStone(state) {
        const pos = this.getStoneScreenPosition(state);
        const sizeBonus = state.upgrades.size.level * 8;
        const growthMultiplier = state.growthBoost ? state.growthPowerUpConfig.growthMultiplier : 1;
        const baseRadius = (30 + sizeBonus) * growthMultiplier;
        const radius = this.scale(state, Math.max(1, baseRadius));
        const rotation = state.stone.rotation;
        
        this.ctx.save();
        this.ctx.translate(pos.x, pos.y);
        this.ctx.rotate(rotation);
        
        if (state.frictionBoost) {
            this.ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
            this.ctx.shadowBlur = this.scale(state, 20) + Math.sin(Date.now() / 100) * this.scale(state, 5);
        }
        
        if (state.growthBoost) {
            this.ctx.shadowColor = 'rgba(72, 187, 120, 0.8)';
            this.ctx.shadowBlur = this.scale(state, 25) + Math.sin(Date.now() / 80) * this.scale(state, 8);
        }
        
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        
        let fillColor = 'rgb(255, 0, 0)';
        if (state.frictionBoost) {
            fillColor = 'rgb(255, 180, 0)';
        } else if (state.growthBoost) {
            fillColor = 'rgb(72, 187, 120)';
        }
        this.ctx.fillStyle = fillColor;
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgb(119, 119, 119)';
        this.ctx.lineWidth = this.scale(state, 4);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.arc(0, 0, Math.max(0.1, radius - this.scale(state, 0.5)), 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgb(178, 0, 0)';
        this.ctx.lineWidth = this.scale(state, 1);
        this.ctx.stroke();
        
        const handleWidth = radius * 0.8;
        const handleHeight = radius * 0.28;
        const handleRadius = Math.max(0.1, handleHeight * 0.58);
        this.ctx.beginPath();
        this.ctx.roundRect(-handleWidth / 2, -handleHeight / 2, handleWidth, handleHeight, handleRadius);
        this.ctx.fillStyle = 'rgb(178, 0, 0)';
        this.ctx.fill();
        
        this.ctx.restore();
    }

drawSweepZone(state) {
    if (state.phase !== 'moving' && state.phase !== 'returning') return;
    if (!state.sweepBoost || state.sweepBoost.timer <= 0) return;        
        const playArea = state.getPlayArea();
        
        const alpha = state.isSweeping ? 0.3 : 0.1;
        this.ctx.fillStyle = `rgba(66, 153, 225, ${alpha})`;
        this.ctx.fillRect(playArea.left, 0, playArea.width, state.screenHeight);
    }

drawPowerUps(state) {
        const playArea = state.getPlayArea();
        const config = state.powerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        const radius = this.scale(state, config.radius);
        
        if (state.isDevMode) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = `${this.scale(state, 12)}px monospace`;
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`scroll: ${state.scrollProgress.toFixed(3)} pageH: ${state.pageHeight}`, this.scale(state, 10), this.scale(state, 20));
            this.ctx.fillText(`worldY: ${state.stone.worldY.toFixed(0)} maxScroll: ${maxScroll}`, this.scale(state, 10), this.scale(state, 35));
            this.ctx.fillText(`lives: ${state.lives}`, this.scale(state, 10), this.scale(state, 50));

            if (state.frictionBoost) {
                this.ctx.fillStyle = 'gold';
                this.ctx.fillText(`BOOST: ${state.frictionBoost.timer.toFixed(1)}s`, this.scale(state, 10), this.scale(state, 65));
            }
            if (state.sweepBoost) {
                this.ctx.fillStyle = 'lime';
                this.ctx.fillText(`SWEEP: ${state.sweepBoost.timer.toFixed(1)}s`, this.scale(state, 10), this.scale(state, 80));
            }
        }
        
        if (state.comboMultiplier > 1) {
            this.ctx.fillStyle = '#ffd700';
            this.ctx.font = `bold ${this.scale(state, 16)}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`COMBO x${state.comboMultiplier}!`, state.screenWidth / 2, this.scale(state, 70));
        }
        
        for (const powerUp of state.powerUps) {
            if (powerUp.collected) continue;
            
            const powerUpWorldY = powerUp.scrollProgress * maxScroll;
            const worldDY = powerUpWorldY - state.stone.worldY;
            const screenY = state.screenHeight * 0.5 - worldDY;
            const screenX = playArea.left + playArea.width / 2 + powerUp.x;
            
            if (screenY < -radius || screenY > state.screenHeight + radius) continue;
            
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
            
            const gradient = this.ctx.createRadialGradient(
                screenX, screenY, 0,
                screenX, screenY, radius
            );
            gradient.addColorStop(0, 'rgba(255, 215, 0, 1)');
            gradient.addColorStop(0.7, 'rgba(255, 165, 0, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 100, 0, 0.3)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.lineWidth = this.scale(state, 2);
            this.ctx.stroke();
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.font = `bold ${this.scale(state, 16)}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('⚡', screenX, screenY);
            
            this.ctx.restore();
        }
        
        if (state.powerUpCollected) {
            this.addPowerUpParticles(state, state.powerUpCollected);
            state.powerUpCollected = null;
        }
    }

addPowerUpParticles(state, powerUp) {
        const playArea = state.getPlayArea();
        const screenX = playArea.left + playArea.width / 2 + powerUp.x;
        const screenY = state.screenHeight * 0.5;
        
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 8 + 3;
            this.addParticle(
                screenX,
                screenY,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                '255, 215, 0',
                0.8
            );
        }
    }

drawLifePowerUps(state) {
        const playArea = state.getPlayArea();
        const config = state.lifePowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        const radius = this.scale(state, config.radius);
        
        for (const lifePowerUp of state.lifePowerUps) {
            if (lifePowerUp.collected) continue;
            
            const powerUpWorldY = lifePowerUp.scrollProgress * maxScroll;
            const worldDY = powerUpWorldY - state.stone.worldY;
            const screenY = state.screenHeight * 0.5 - worldDY;
            const screenX = playArea.left + playArea.width / 2 + lifePowerUp.x;
            
            if (screenY < -radius || screenY > state.screenHeight + radius) continue;
            
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
            
            const gradient = this.ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius);
            gradient.addColorStop(0, 'rgba(255, 50, 50, 1)');
            gradient.addColorStop(0.7, 'rgba(200, 0, 0, 0.9)');
            gradient.addColorStop(1, 'rgba(150, 0, 0, 0.4)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.lineWidth = this.scale(state, 2);
            this.ctx.stroke();
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.font = `bold ${this.scale(state, 14)}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('♥', screenX, screenY);
            
            this.ctx.restore();
        }
        
        if (state.lifePowerUpCollected) {
            this.addLifePowerUpParticles(state, state.lifePowerUpCollected);
            state.lifePowerUpCollected = null;
        }
    }

    drawShopPowerUps(state) {
        const playArea = state.getPlayArea();
        const config = state.shopPowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        const radius = this.scale(state, config.radius);
        
        for (const shopPowerUp of state.shopPowerUps) {
            if (shopPowerUp.collected) continue;
            
            const powerUpWorldY = shopPowerUp.scrollProgress * maxScroll;
            const worldDY = powerUpWorldY - state.stone.worldY;
            const screenY = state.screenHeight * 0.5 - worldDY;
            const screenX = playArea.left + playArea.width / 2 + shopPowerUp.x;
            
            if (screenY < -radius || screenY > state.screenHeight + radius) continue;
            
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
            
            const gradient = this.ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius);
            gradient.addColorStop(0, 'rgba(0, 191, 255, 1)');
            gradient.addColorStop(0.7, 'rgba(30, 144, 255, 0.9)');
            gradient.addColorStop(1, 'rgba(65, 105, 225, 0.4)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.lineWidth = this.scale(state, 2);
            this.ctx.stroke();
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.font = `bold ${this.scale(state, 16)}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('🐟', screenX, screenY);
            
            this.ctx.restore();
        }
        
        if (state.shopPowerUpCollected) {
            this.addShopPowerUpParticles(state, state.shopPowerUpCollected);
            state.shopPowerUpCollected = null;
        }
    }

    addShopPowerUpParticles(state, shopPowerUp) {
        const playArea = state.getPlayArea();
        const screenX = playArea.left + playArea.width / 2 + shopPowerUp.x;
        const screenY = state.screenHeight * 0.5;
        
        for (let i = 0; i < 25; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 10 + 4;
            this.addParticle(
                screenX,
                screenY,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                '0, 191, 255',
                1.0
            );
        }
    }

    addLifePowerUpParticles(state, lifePowerUp) {
        const playArea = state.getPlayArea();
        const screenX = playArea.left + playArea.width / 2 + lifePowerUp.x;
        const screenY = state.screenHeight * 0.5;
        
        for (let i = 0; i < 25; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 10 + 4;
            this.addParticle(
                screenX,
                screenY,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                '255, 50, 50',
                1.0
            );
        }
    }

    drawSweepPowerUps(state) {
        const playArea = state.getPlayArea();
        const config = state.sweepPowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        const radius = this.scale(state, config.radius);
        
        for (const sweepPowerUp of state.sweepPowerUps) {
            if (sweepPowerUp.collected) continue;
            
            const powerUpWorldY = sweepPowerUp.scrollProgress * maxScroll;
            const worldDY = powerUpWorldY - state.stone.worldY;
            const screenY = state.screenHeight * 0.5 - worldDY;
            const screenX = playArea.left + playArea.width / 2 + sweepPowerUp.x;
            
            if (screenY < -radius || screenY > state.screenHeight + radius) continue;
            
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
            
            const gradient = this.ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius);
            gradient.addColorStop(0, 'rgba(0, 255, 255, 1)');
            gradient.addColorStop(0.7, 'rgba(0, 200, 200, 0.9)');
            gradient.addColorStop(1, 'rgba(0, 150, 150, 0.4)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            this.ctx.strokeStyle = 'rgba(200, 255, 255, 0.6)';
            this.ctx.lineWidth = this.scale(state, 2);
            this.ctx.stroke();
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.font = `bold ${this.scale(state, 14)}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('🧹', screenX, screenY);
            
            this.ctx.restore();
        }
        
        if (state.sweepPowerUpCollected) {
            this.addSweepPowerUpParticles(state, state.sweepPowerUpCollected);
            state.sweepPowerUpCollected = null;
        }
    }

    addSweepPowerUpParticles(state, sweepPowerUp) {
        const playArea = state.getPlayArea();
        const screenX = playArea.left + playArea.width / 2 + sweepPowerUp.x;
        const screenY = state.screenHeight * 0.5;
        
        for (let i = 0; i < 30; i++) {
            const angle = (Math.random() - 0.5) * Math.PI * 0.3;
            const speed = Math.random() * 12 + 6;
            const offsetAngle = (Math.random() - 0.5) * 0.5;
            this.addParticle(
                screenX + Math.cos(offsetAngle) * 20,
                screenY + (Math.random() - 0.5) * 40,
                Math.sin(angle) * speed,
                -Math.cos(angle) * speed,
                '0, 255, 255',
                0.6
            );
        }
    }

    drawSopaText(state) {
        if (!state.sweepBoost || state.sweepBoost.timer <= 0) return;
        
        const centerX = state.screenWidth / 2;
        const centerY = state.screenHeight / 2;
        const scale = state.scaleFactor;
        
        this.ctx.save();
        
        this.ctx.font = `bold ${this.scale(state, 120)}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        this.ctx.shadowColor = 'rgba(0, 255, 255, 0.8)';
        this.ctx.shadowBlur = this.scale(state, 30);
        
        const alpha = Math.min(1, state.sweepBoost.timer / 5);
        this.ctx.fillStyle = `rgba(0, 255, 255, ${alpha})`;
        this.ctx.fillText('SOPA!', centerX, centerY);
        
        this.ctx.strokeStyle = `rgba(200, 255, 255, ${alpha * 0.8})`;
        this.ctx.lineWidth = this.scale(state, 4);
        this.ctx.strokeText('SOPA!', centerX, centerY);
        
        this.ctx.restore();

        const broomRotation = Math.sin(Date.now() / 100) * 0.5;
        this.ctx.save();
        
        this.ctx.font = `${this.scale(state, 80)}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        this.ctx.save();
        this.ctx.translate(centerX - this.scale(state, 200), centerY);
        this.ctx.rotate(-broomRotation - 0.3);
        this.ctx.fillText('🧹', 0, 0);
        this.ctx.restore();
        
        this.ctx.save();
        this.ctx.translate(centerX + this.scale(state, 200), centerY);
        this.ctx.rotate(broomRotation + 0.3);
        this.ctx.fillText('🧹', 0, 0);
        this.ctx.restore();
        
        this.ctx.restore();
    }

    drawRotationPowerUps(state) {
        const playArea = state.getPlayArea();
        const config = state.rotationPowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        const radius = this.scale(state, config.radius);
        
        for (const rotationPowerUp of state.rotationPowerUps) {
            if (rotationPowerUp.collected) continue;
            
            const powerUpWorldY = rotationPowerUp.scrollProgress * maxScroll;
            const worldDY = powerUpWorldY - state.stone.worldY;
            const screenY = state.screenHeight * 0.5 - worldDY;
            const screenX = playArea.left + playArea.width / 2 + rotationPowerUp.x;
            
            if (screenY < -radius || screenY > state.screenHeight + radius) continue;
            
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
            
            const gradient = this.ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius);
            gradient.addColorStop(0, 'rgba(200, 50, 255, 1)');
            gradient.addColorStop(0.7, 'rgba(150, 0, 200, 0.9)');
            gradient.addColorStop(1, 'rgba(100, 0, 150, 0.4)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.lineWidth = this.scale(state, 2);
            this.ctx.stroke();
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.font = `bold ${this.scale(state, 14)}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('↻', screenX, screenY);
            
            this.ctx.restore();
        }
        
        if (state.rotationPowerUpCollected) {
            this.addRotationPowerUpParticles(state, state.rotationPowerUpCollected);
            state.rotationPowerUpCollected = null;
        }
    }

    addRotationPowerUpParticles(state, rotationPowerUp) {
        const playArea = state.getPlayArea();
        const screenX = playArea.left + playArea.width / 2 + rotationPowerUp.x;
        const screenY = state.screenHeight * 0.5;
        
        for (let ring = 0; ring < 3; ring++) {
            const particlesInRing = 12;
            for (let i = 0; i < particlesInRing; i++) {
                const baseAngle = (i / particlesInRing) * Math.PI * 2;
                const angle = baseAngle + ring * 0.3;
                const speed = 4 + ring * 2;
                const tangentAngle = angle + Math.PI / 2;
                this.addParticle(
                    screenX,
                    screenY,
                    Math.cos(tangentAngle) * speed + Math.cos(angle) * 2,
                    Math.sin(tangentAngle) * speed + Math.sin(angle) * 2,
                    '200, 50, 255',
                    0.8
                );
            }
        }
    }

    drawSuperBoostPowerUps(state) {
        const playArea = state.getPlayArea();
        const config = state.superBoostPowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        const radius = this.scale(state, config.radius);

        for (const superBoostPowerUp of state.superBoostPowerUps) {
            if (superBoostPowerUp.collected) continue;

            const powerUpWorldY = superBoostPowerUp.scrollProgress * maxScroll;
            const worldDY = powerUpWorldY - state.stone.worldY;
            const screenY = state.screenHeight * 0.5 - worldDY;
            const screenX = playArea.left + playArea.width / 2 + superBoostPowerUp.x;

            if (screenY < -radius || screenY > state.screenHeight + radius) continue;

            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);

            const gradient = this.ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.3, 'rgba(255, 215, 0, 1)');
            gradient.addColorStop(0.7, 'rgba(255, 140, 0, 0.9)');
            gradient.addColorStop(1, 'rgba(255, 69, 0, 0.4)');

            this.ctx.fillStyle = gradient;
            this.ctx.fill();

            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.lineWidth = this.scale(state, 3);
            this.ctx.stroke();

            this.ctx.fillStyle = 'rgba(255, 255, 255, 1)';
            this.ctx.font = `bold ${this.scale(state, 16)}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('⚡', screenX, screenY);

            this.ctx.restore();
        }

        if (state.superBoostCollected) {
            state.superBoostCollected = null;
        }
    }

    addSuperBoostPowerUpParticles(state, superBoostPowerUp) {
        const playArea = state.getPlayArea();
        const screenX = playArea.left + playArea.width / 2 + superBoostPowerUp.x;
        const screenY = state.screenHeight * 0.5;

        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 15 + 5;
            this.addParticle(
                screenX,
                screenY,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                '255, 215, 0',
                1.0
            );
        }
    }

    drawGrowthPowerUps(state) {
        const playArea = state.getPlayArea();
        const config = state.growthPowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        const radius = this.scale(state, config.radius);
        
        for (const growthPowerUp of state.growthPowerUps) {
            if (growthPowerUp.collected) continue;
            
            const powerUpWorldY = growthPowerUp.scrollProgress * maxScroll;
            const worldDY = powerUpWorldY - state.stone.worldY;
            const screenY = state.screenHeight * 0.5 - worldDY;
            const screenX = playArea.left + playArea.width / 2 + growthPowerUp.x;
            
            if (screenY < -radius || screenY > state.screenHeight + radius) continue;
            
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
            
            const gradient = this.ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius);
            gradient.addColorStop(0, 'rgba(72, 187, 120, 1)');
            gradient.addColorStop(0.7, 'rgba(56, 161, 105, 0.9)');
            gradient.addColorStop(1, 'rgba(47, 133, 90, 0.4)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.lineWidth = this.scale(state, 2);
            this.ctx.stroke();
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.font = `bold ${this.scale(state, 14)}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('+', screenX, screenY);
            
            this.ctx.restore();
        }
        
        if (state.growthPowerUpCollected) {
            this.addGrowthPowerUpParticles(state, state.growthPowerUpCollected);
            state.growthPowerUpCollected = null;
        }
    }

    addGrowthPowerUpParticles(state, growthPowerUp) {
        const playArea = state.getPlayArea();
        const screenX = playArea.left + playArea.width / 2 + growthPowerUp.x;
        const screenY = state.screenHeight * 0.5;
        
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 6 + 3;
            this.addParticle(
                screenX,
                screenY,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                '72, 187, 120',
                0.8
            );
        }
    }

    drawCurlChaosPickups(state) {
        // Don't draw if cleanse upgrade is active
        if (state.upgrades.cleanse?.level > 0) return;
        
        const playArea = state.getPlayArea();
        const config = state.curlChaosConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        const radius = this.scale(state, config.radius);
        
        for (const pickup of state.curlChaosPickups) {
            if (pickup.collected) continue;
            
            const powerUpWorldY = pickup.scrollProgress * maxScroll;
            const worldDY = powerUpWorldY - state.stone.worldY;
            const screenY = state.screenHeight * 0.5 - worldDY;
            const screenX = playArea.left + playArea.width / 2 + pickup.x;
            
            if (screenY < -radius || screenY > state.screenHeight + radius) continue;
            
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
            
            const gradient = this.ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius);
            gradient.addColorStop(0, 'rgba(139, 69, 19, 1)');
            gradient.addColorStop(0.7, 'rgba(160, 82, 45, 0.9)');
            gradient.addColorStop(1, 'rgba(210, 105, 30, 0.4)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            this.ctx.strokeStyle = 'rgba(222, 184, 135, 0.8)';
            this.ctx.lineWidth = this.scale(state, 2);
            this.ctx.stroke();
            
            this.ctx.fillStyle = 'rgba(255, 228, 196, 0.9)';
            this.ctx.font = `bold ${this.scale(state, 14)}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('~', screenX, screenY);
            
            this.ctx.restore();
        }
        
        if (state.curlChaosCollected) {
            this.addCurlChaosParticles(state, state.curlChaosCollected);
            state.curlChaosCollected = null;
        }
    }

    addCurlChaosParticles(state, pickup) {
        const playArea = state.getPlayArea();
        const screenX = playArea.left + playArea.width / 2 + pickup.x;
        const screenY = state.screenHeight * 0.5;
        
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            this.addParticle(
                screenX,
                screenY,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                '139, 69, 19',
                0.6
            );
        }
    }

    drawSizeShrinkPickups(state) {
        // Don't draw if cleanse upgrade is active
        if (state.upgrades.cleanse?.level > 0) return;
        
        const playArea = state.getPlayArea();
        const config = state.sizeShrinkConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        const radius = this.scale(state, config.radius);
        
        for (const pickup of state.sizeShrinkPickups) {
            if (pickup.collected) continue;
            
            const powerUpWorldY = pickup.scrollProgress * maxScroll;
            const worldDY = powerUpWorldY - state.stone.worldY;
            const screenY = state.screenHeight * 0.5 - worldDY;
            const screenX = playArea.left + playArea.width / 2 + pickup.x;
            
            if (screenY < -radius || screenY > state.screenHeight + radius) continue;
            
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
            
            const gradient = this.ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius);
            gradient.addColorStop(0, 'rgba(105, 105, 105, 1)');
            gradient.addColorStop(0.7, 'rgba(80, 80, 80, 0.9)');
            gradient.addColorStop(1, 'rgba(50, 50, 50, 0.4)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            this.ctx.strokeStyle = 'rgba(169, 169, 169, 0.8)';
            this.ctx.lineWidth = this.scale(state, 2);
            this.ctx.stroke();
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.font = `bold ${this.scale(state, 14)}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('-', screenX, screenY);
            
            this.ctx.restore();
        }
        
        if (state.sizeShrinkCollected) {
            this.addSizeShrinkParticles(state, state.sizeShrinkCollected);
            state.sizeShrinkCollected = null;
        }
    }

    addSizeShrinkParticles(state, pickup) {
        const playArea = state.getPlayArea();
        const screenX = playArea.left + playArea.width / 2 + pickup.x;
        const screenY = state.screenHeight * 0.5;
        
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            this.addParticle(
                screenX,
                screenY,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                '105, 105, 105',
                0.6
            );
        }
    }

    drawScoringOrbs(state) {
        if (!state.scoringOrbs || state.scoringOrbs.length === 0) return;
        
        const playArea = state.getPlayArea();
        const config = state.scoringOrbConfig;
        if (!config) return;
        
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        for (const orb of state.scoringOrbs) {
            if (orb.collected) continue;
            
            const orbWorldY = orb.scrollProgress * maxScroll;
            const worldDY = orbWorldY - state.stone.worldY;
            const screenY = state.screenHeight * 0.5 - worldDY;
            const screenX = playArea.left + playArea.width / 2 + orb.x;
            
            const radius = this.scale(state, config[orb.type].radius);
            
            if (screenY < -radius || screenY > state.screenHeight + radius) continue;
            
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
            
            if (orb.type === 'green') {
                const gradient = this.ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius);
                gradient.addColorStop(0, 'rgba(72, 187, 120, 1)');
                gradient.addColorStop(0.7, 'rgba(56, 161, 105, 0.9)');
                gradient.addColorStop(1, 'rgba(47, 133, 90, 0.4)');
                
                this.ctx.fillStyle = gradient;
                this.ctx.fill();
                
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                this.ctx.lineWidth = this.scale(state, 2);
                this.ctx.stroke();
            } else if (orb.type === 'purple') {
                const gradient = this.ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius);
                gradient.addColorStop(0, 'rgba(159, 122, 234, 1)');
                gradient.addColorStop(0.7, 'rgba(128, 90, 213, 0.9)');
                gradient.addColorStop(1, 'rgba(107, 70, 193, 0.4)');
                
                this.ctx.fillStyle = gradient;
                this.ctx.fill();
                
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                this.ctx.lineWidth = this.scale(state, 2);
                this.ctx.stroke();
            } else if (orb.type === 'yellow') {
                const gradient = this.ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius);
                gradient.addColorStop(0, 'rgba(255, 215, 0, 1)');
                gradient.addColorStop(0.6, 'rgba(255, 193, 7, 0.9)');
                gradient.addColorStop(1, 'rgba(255, 160, 0, 0.4)');
                
                this.ctx.fillStyle = gradient;
                this.ctx.fill();
                
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                this.ctx.lineWidth = this.scale(state, 2);
                this.ctx.stroke();
                
                this.ctx.fillStyle = 'rgba(139, 69, 19, 1)';
                this.ctx.font = `bold ${Math.floor(this.scale(state, config[orb.type].radius * 1.2))}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('$', screenX, screenY);
            }
            
            this.ctx.restore();
        }
        
        if (state.scoringOrbCollected) {
            this.addScoringOrbParticles(state, state.scoringOrbCollected);
            state.scoringOrbCollected = null;
        }
    }

    addScoringOrbParticles(state, orb) {
        const playArea = state.getPlayArea();
        const screenX = playArea.left + playArea.width / 2 + orb.x;
        const screenY = state.screenHeight * 0.5;
        
        let color;
        let count;
        
        if (orb.type === 'yellow') {
            color = '255, 215, 0';
            count = 10;
        } else if (orb.type === 'purple') {
            color = '147, 122, 234';
            count = 8;
        } else {
            color = '72, 187, 120';
            count = 5;
        }
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 2;
            this.addParticle(
                screenX,
                screenY,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color,
                0.4
            );
        }
    }

    updateScoreAnimations(state, deltaTime) {
        if (!state.scoreAnimations) {
            state.scoreAnimations = [];
            return;
        }
        
        const now = Date.now();
        state.scoreAnimations = state.scoreAnimations.filter(anim => {
            const elapsed = now - anim.startTime;
            return elapsed < anim.duration;
        });
    }

    drawScoreAnimations(state) {
        if (!state.scoreAnimations || state.scoreAnimations.length === 0) return;
        
        const now = Date.now();
        
        for (const anim of state.scoreAnimations) {
            const elapsed = now - anim.startTime;
            const progress = elapsed / anim.duration;
            
            const y = anim.y - progress * this.scale(state, 80);
            
            let animScale;
            if (progress < 0.2) {
                animScale = 0.5 + progress * 5;
            } else {
                animScale = 1.5 - (progress - 0.2) * 1.25;
            }
            animScale *= anim.scale;
            
            const alpha = 1 - progress;
            
            this.ctx.save();
            this.ctx.font = `bold ${Math.floor(this.scale(state, 20) * animScale)}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            this.ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.8})`;
            this.ctx.lineWidth = this.scale(state, 3);
            this.ctx.strokeText(anim.text, anim.x, y);
            
            if (anim.isPowerUp && anim.color) {
                this.ctx.fillStyle = `rgba(${anim.color}, ${alpha})`;
            } else if (anim.isMoney) {
                this.ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
            } else if (anim.isCombo) {
                const comboColor = this.getComboColor(anim.text);
                this.ctx.fillStyle = `rgba(${comboColor}, ${alpha})`;
            } else {
                this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            }
            this.ctx.fillText(anim.text, anim.x, y);
            
            this.ctx.restore();
        }
    }

    getComboColor(text) {
        // Extract multiplier from text like "+50 x2"
        const match = text.match(/x(\d+)/);
        if (!match) return '255, 255, 255';
        
        const multiplier = parseInt(match[1]);
        if (multiplier >= 10) return '255, 50, 50'; // Red for high combos
        if (multiplier >= 5) return '255, 200, 50'; // Gold for medium combos
        if (multiplier >= 3) return '255, 215, 0'; // Yellow-gold
        return '72, 187, 120'; // Green for low combos
    }

drawScoreText(state) {
        const baseY = this.scale(state, 40);
        const centerX = state.screenWidth / 2;
        
        if (state.lastScore === undefined) {
            state.lastScore = state.score || 0;
        }
        
        const currentScore = state.score || 0;
        
        if (currentScore !== state.lastScore) {
            const scoreIncrease = currentScore - state.lastScore;
            state.lastScore = currentScore;
            
            if (scoreIncrease >= 50) {
                state.scoreJumpAnimation = {
                    value: Math.floor(currentScore),
                    scale: 1.5 + Math.min(scoreIncrease / 100, 1),
                    startTime: Date.now(),
                    duration: 600
                };
            } else if (scoreIncrease >= 25) {
                state.scoreJumpAnimation = {
                    value: Math.floor(currentScore),
                    scale: 1.2,
                    startTime: Date.now(),
                    duration: 400
                };
            }
        }
        
        let jumpScale = 1;
        let glowIntensity = 0;
        
        if (state.scoreJumpAnimation) {
            const elapsed = Date.now() - state.scoreJumpAnimation.startTime;
            const progress = Math.min(elapsed / state.scoreJumpAnimation.duration, 1);
            
            if (progress < 1) {
                const bounce = Math.sin(progress * Math.PI);
                jumpScale = 1 + (state.scoreJumpAnimation.scale - 1) * bounce;
                glowIntensity = bounce;
            } else {
                state.scoreJumpAnimation = null;
            }
        }
        
        let color = '#48bb78';
        const recentScore = state.recentScore || 0;
        if (recentScore >= 500) {
            color = '#ff3232';
        } else if (recentScore >= 200) {
            color = '#ffc832';
        } else if (recentScore >= 100) {
            color = '#ffd700';
        }
        
        const fontSize = Math.floor(this.scale(state, 24) * jumpScale);
        
        this.ctx.save();
        this.ctx.fillStyle = color;
        this.ctx.font = `bold ${fontSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        if (glowIntensity > 0) {
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = this.scale(state, 20) * glowIntensity;
        } else {
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            this.ctx.shadowBlur = this.scale(state, 4);
            this.ctx.shadowOffsetX = this.scale(state, 2);
            this.ctx.shadowOffsetY = this.scale(state, 2);
        }
        
        this.ctx.fillText(`Score: ${state.formatScore(currentScore)}`, centerX, baseY);
        
        this.ctx.restore();
        
        const playArea = state.getPlayArea();
        
        const lives = state.lives || 0;
        this.ctx.save();
        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.font = `bold ${this.scale(state, 20)}px Arial`;
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = this.scale(state, 4);
        this.ctx.shadowOffsetX = this.scale(state, 2);
        this.ctx.shadowOffsetY = this.scale(state, 2);
        this.ctx.fillText(`♥${lives}`, playArea.left + this.scale(state, 10), baseY);
        this.ctx.restore();
        
        const money = state.money || 0;
        const moneyStr = `${money}$`;
        this.ctx.save();
        this.ctx.font = `bold ${this.scale(state, 20)}px Arial`;
        
        const minTextWidth = this.ctx.measureText('999$').width;
        const actualTextWidth = this.ctx.measureText(moneyStr).width;
        const textWidth = Math.max(minTextWidth, actualTextWidth);
        
        const paddingX = this.scale(state, 12);
        const barWidth = textWidth + paddingX * 2;
        const barHeight = this.scale(state, 32);
        const barRight = playArea.right - this.scale(state, 10);
        const barX = barRight - barWidth;
        const barY = baseY - barHeight / 2;

        this.ctx.beginPath();
        this.ctx.roundRect(barX, barY, barWidth, barHeight, this.scale(state, 10));
        this.ctx.fillStyle = 'rgba(60, 60, 60, 0.85)';
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(170, 170, 170, 0.8)';
        this.ctx.lineWidth = this.scale(state, 2);
        this.ctx.stroke();

        this.ctx.fillStyle = '#ffd700';
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'middle';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = this.scale(state, 4);
        this.ctx.shadowOffsetX = this.scale(state, 2);
        this.ctx.shadowOffsetY = this.scale(state, 2);
        this.ctx.fillText(moneyStr, barX + barWidth - paddingX, baseY);
        this.ctx.restore();
    }

    updateSuperBoostImageEffect(state, deltaTime) {
        if (!state.superBoostImageEffect) return;

        const effect = state.superBoostImageEffect;
        effect.timer += deltaTime;

        const progress = Math.min(effect.timer / effect.duration, 1);
        const bounce = Math.sin(progress * Math.PI);
        const startY = state.screenHeight;
        const targetYPx = effect.targetYPx;
        effect.y = startY - (startY - targetYPx) * bounce;

        if (!effect.peaked && progress >= 0.5) {
            effect.peaked = true;
            state.triggerScreenShake(15, 0.3);
            const playArea = state.getPlayArea();
            const screenX = playArea.left + playArea.width / 2 + state.stone.x;
            const screenY = state.stoneYPx;
            for (let i = 0; i < 50; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 20 + 8;
                this.addParticle(
                    screenX,
                    screenY,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    '255, 215, 0',
                    1.2
                );
            }
        }

        if (progress >= 1) {
            state.superBoostImageEffect = null;
        }
    }

    drawSuperBoostImageEffect(state) {
        if (!state.superBoostImageEffect || !this.superBoostImage) return;

        const effect = state.superBoostImageEffect;
        const playArea = state.getPlayArea();
        const stoneX = playArea.left + playArea.width / 2 + state.stone.x;
        const stoneY = state.stoneYPx;
        
        const imageWidth = this.scale(state, 60);
        const imageHeight = this.scale(state, 120);
        const x = stoneX - imageWidth / 2;
        const y = effect.y;

        const progress = Math.min(effect.timer / effect.duration, 1);
        const alpha = Math.sin(progress * Math.PI);

        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.drawImage(this.superBoostImage, x, y, imageWidth, imageHeight);
        this.ctx.restore();
    }

    drawMagnetism(state) {
        const magnetismLevel = state.upgrades.magnetism?.level || 0;
        if (magnetismLevel === 0) return;

        const stonePos = this.getStoneScreenPosition(state);
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        const playArea = state.getPlayArea();
        
        const sizeBonusFactor = 1 + (state.upgrades.size.level * 0.2);
        const magnetismRadius = this.scale(state, (50 + magnetismLevel * 50) * sizeBonusFactor);

        this.ctx.save();
        for (const orb of state.scoringOrbs) {
            if (orb.collected) continue;

            const orbWorldY = orb.scrollProgress * maxScroll;
            const worldDY = orbWorldY - state.stone.worldY;
            const screenY = state.screenHeight * 0.5 - worldDY;
            const screenX = playArea.left + playArea.width / 2 + orb.x;

            const dx = screenX - stonePos.x;
            const dy = screenY - stonePos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < magnetismRadius) {
                const alpha = (1 - dist / magnetismRadius) * 0.4 * (0.7 + Math.sin(Date.now() / 100) * 0.3);
                this.ctx.beginPath();
                this.ctx.moveTo(stonePos.x, stonePos.y);
                this.ctx.lineTo(screenX, screenY);
                this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
        }
        this.ctx.restore();
    }

    render(state, deltaTime = 0.016) {
        // Check game over status
        const overlay = document.getElementById('game-over');
        if (overlay && state.gameOver) {
            overlay.classList.remove('hidden');
            const finalScoreEl = document.querySelector('.final-score');
            const moneyEl = document.querySelector('.game-over-money');
            if (finalScoreEl) finalScoreEl.textContent = state.formatScore(state.score);
            if (moneyEl) moneyEl.textContent = `${state.money}$`;
        }

        this.updateEffects(state, deltaTime);
        this.updateScoreAnimations(state, deltaTime);
        
        this.ctx.save();
        this.ctx.translate(this.shakeOffsetX, this.shakeOffsetY);
        
        this.clear();
        
        this.drawWalls(state);
        this.drawSweepZone(state);
        this.drawPowerUps(state);
        this.drawLifePowerUps(state);
        this.drawShopPowerUps(state);
        this.drawSweepPowerUps(state);
        this.drawRotationPowerUps(state);
        this.drawSuperBoostPowerUps(state);
        this.drawGrowthPowerUps(state);
        this.drawCurlChaosPickups(state);
        this.drawSizeShrinkPickups(state);
        this.drawScoringOrbs(state);
        this.drawMagnetism(state);
        this.drawStone(state);
        this.drawSopaText(state);
        this.drawSuperBoostImageEffect(state);
        this.drawScoreAnimations(state);
        
        const pos = this.getStoneScreenPosition(state);
        
        if (state.phase === 'moving') {
            if (state.isSweeping) {
                this.addSweepParticles(pos.x, pos.y);
            }
            
            if (this.prevStoneX !== null) {
                const playArea = state.getPlayArea();
        const sizeBonus = state.upgrades.size.level * 8;
                const growthMultiplier = state.growthBoost ? state.growthPowerUpConfig.growthMultiplier : 1;
                const effectiveRadius = Math.max(1, (30 + sizeBonus) * growthMultiplier);
                const leftBound = effectiveRadius - playArea.width / 2;
                const rightBound = playArea.width / 2 - effectiveRadius;
                const atLeftWall = state.stone.x <= leftBound + 5;
                const atRightWall = state.stone.x >= rightBound - 5;
                const justHitWall = (atLeftWall || atRightWall) && 
                    Math.abs(state.stone.x - this.prevStoneX) > 1;
                
                if (justHitWall) {
                    const wallScreenX = atLeftWall ? playArea.left : playArea.right;
                    this.addWallBounceParticles(wallScreenX, pos.y);
                }
            }
            this.prevStoneX = state.stone.x;
        } else {
            this.prevStoneX = null;
        }
        
        this.drawParticles();
        
        this.ctx.restore();
        
        this.drawRingFlash(state);
        this.drawScoreText(state);
    }

renderDemo(state, deltaTime = 0.016) {
        this.updateEffects(state, deltaTime);

        this.ctx.save();
        this.ctx.translate(this.shakeOffsetX, this.shakeOffsetY);

        this.ctx.clearRect(-50, -50, this.canvas.width + 100, this.canvas.height + 100);

        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(50, 50, this.canvas.width - 100, this.canvas.height - 100);

        this.drawParticles();
        this.ctx.restore();

        this.drawRingFlash(state);
        this.drawSuperBoostImageEffect(state);
    }
}