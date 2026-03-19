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

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    getStoneScreenPosition(state) {
        const playArea = state.getPlayArea();
        return {
            x: playArea.left + playArea.width / 2 + state.stone.x,
            y: state.screenHeight * state.stoneVisualY
        };
    }

    drawWalls(state) {
        const playArea = state.getPlayArea();
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        
        // Left wall at play area left edge
        this.ctx.beginPath();
        this.ctx.moveTo(playArea.left, 0);
        this.ctx.lineTo(playArea.left, state.screenHeight);
        this.ctx.stroke();
        
        // Right wall at play area right edge
        this.ctx.beginPath();
        this.ctx.moveTo(playArea.right, 0);
        this.ctx.lineTo(playArea.right, state.screenHeight);
        this.ctx.stroke();
    }

    drawStone(state) {
        const pos = this.getStoneScreenPosition(state);
        const radius = this.stoneRadius;
        const rotation = state.stone.rotation;
        
        this.ctx.save();
        this.ctx.translate(pos.x, pos.y);
        this.ctx.rotate(rotation);
        
        if (state.frictionBoost) {
            this.ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
            this.ctx.shadowBlur = 20 + Math.sin(Date.now() / 100) * 5;
        }
        
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = state.frictionBoost ? 'rgb(255, 180, 0)' : 'rgb(255, 0, 0)';
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgb(119, 119, 119)';
        this.ctx.lineWidth = 4;
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius - 0.5, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgb(178, 0, 0)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        const handleWidth = radius * 0.8;
        const handleHeight = radius * 0.28;
        const handleRadius = handleHeight * 0.58;
        this.ctx.beginPath();
        this.ctx.roundRect(-handleWidth / 2, -handleHeight / 2, handleWidth, handleHeight, handleRadius);
        this.ctx.fillStyle = 'rgb(178, 0, 0)';
        this.ctx.fill();
        
        this.ctx.restore();
    }

    drawSlingshotElastic(state) {
        if (state.phase !== 'charging' || !state.input.isDragging) return;
        
        const stonePos = this.getStoneScreenPosition(state);
        const dragX = state.input.currentDragX;
        const dragY = state.input.currentDragY;
        
        const dx = dragX - stonePos.x;
        const dy = dragY - stonePos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 150;
        const clampedDistance = Math.min(distance, maxDistance);
        
        if (distance > 0) {
            const normalizedDx = dx / distance;
            const normalizedDy = dy / distance;
            const endX = stonePos.x + normalizedDx * clampedDistance;
            const endY = stonePos.y + normalizedDy * clampedDistance;
            
            const tension = clampedDistance / maxDistance;
            const lineWidth = 2 + tension * 4;
            const alpha = 0.3 + tension * 0.5;
            
            this.ctx.beginPath();
            this.ctx.moveTo(stonePos.x, stonePos.y);
            this.ctx.lineTo(endX, endY);
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.lineWidth = lineWidth;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.arc(endX, endY, 8, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.fill();
        }
    }

drawVGauge(state) {
        if (state.phase !== 'charging' || !state.input.isDragging) return;
        
        const stonePos = this.getStoneScreenPosition(state);
        const power = state.power.value;
        const aimAngle = state.aimAngle;
        
        const vSize = 100;
        const vAngleSpread = Math.PI / 6;
        const vOffset = 50;
        
        const vBaseX = stonePos.x - Math.sin(aimAngle) * vOffset;
        const vBaseY = stonePos.y + Math.cos(aimAngle) * vOffset;
        
        const tipX = vBaseX + Math.sin(aimAngle) * vSize;
        const tipY = vBaseY - Math.cos(aimAngle) * vSize;
        
        const leftAngle = aimAngle - vAngleSpread;
        const rightAngle = aimAngle + vAngleSpread;
        
        const leftX = vBaseX + Math.sin(leftAngle) * vSize * 0.6;
        const leftY = vBaseY - Math.cos(leftAngle) * vSize * 0.6;
        const rightX = vBaseX + Math.sin(rightAngle) * vSize * 0.6;
        const rightY = vBaseY - Math.cos(rightAngle) * vSize * 0.6;
        
        const fillRatio = power / 100;
        
        let fillColor;
        if (power < 33) {
            fillColor = '#48bb78';
        } else if (power < 67) {
            fillColor = '#ed8936';
        } else {
            fillColor = '#e53e3e';
        }
        
        this.ctx.save();
        
        this.ctx.beginPath();
        this.ctx.moveTo(tipX, tipY);
        this.ctx.lineTo(leftX, leftY);
        this.ctx.lineTo(rightX, rightY);
        this.ctx.closePath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        if (fillRatio > 0.01) {
            const fillProgress = fillRatio;
            
            const fillLeftX = leftX + (tipX - leftX) * fillProgress;
            const fillLeftY = leftY + (tipY - leftY) * fillProgress;
            const fillRightX = rightX + (tipX - rightX) * fillProgress;
            const fillRightY = rightY + (tipY - rightY) * fillProgress;
            
            this.ctx.beginPath();
            this.ctx.moveTo(leftX, leftY);
            this.ctx.lineTo(fillLeftX, fillLeftY);
            this.ctx.lineTo(fillRightX, fillRightY);
            this.ctx.lineTo(rightX, rightY);
            this.ctx.closePath();
            this.ctx.fillStyle = fillColor;
            this.ctx.fill();
            
            if (power >= 50) {
                this.ctx.shadowColor = fillColor;
                this.ctx.shadowBlur = 10;
                this.ctx.fill();
            }
        }
        
        this.ctx.restore();
    }

    drawPowerBar(state) {
    }

    drawAimLine(state) {
    }

drawSweepZone(state) {
        if (state.phase !== 'moving' && state.phase !== 'returning') return;
        if (!state.sweepBoost || state.sweepBoost.timer <= 0) return;
        
        const playArea = state.getPlayArea();
        
        // Sweep zone positioned ahead of stone (higher on screen = smaller Y)
        const stoneY = state.stoneVisualY;
        const zoneHeight = 0.2; // 20% of screen height
        const zoneY = stoneY - 0.15; // Zone starts15% above stone
        
        if (zoneY < 0 || zoneY > 1) return; // Don't draw if off screen
        
        const alpha = state.isSweeping ? 0.3 : 0.1;
        this.ctx.fillStyle = `rgba(66, 153, 225, ${alpha})`;
        this.ctx.fillRect(playArea.left, zoneY * state.screenHeight, playArea.width, zoneHeight * state.screenHeight);
    }

drawPowerUps(state) {
        if (state.phase !== 'moving' && state.phase !== 'returning') return;
        
        const playArea = state.getPlayArea();
        const config = state.powerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px monospace';
        this.ctx.fillText(`scroll: ${state.scrollProgress.toFixed(3)} pageH: ${state.pageHeight}`, 10, 20);
        this.ctx.fillText(`worldY: ${state.stone.worldY.toFixed(0)} maxScroll: ${maxScroll}`, 10, 35);
        this.ctx.fillText(`lives: ${state.lives}`, 10, 50);

        this.ctx.fillStyle = '#48bb78';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Score: ${Math.floor(state.score)}`, state.screenWidth / 2, 40);

        if (state.frictionBoost) {
            this.ctx.fillStyle = 'gold';
            this.ctx.fillText(`BOOST: ${state.frictionBoost.timer.toFixed(1)}s`, 10, 65);
        }
        if (state.sweepBoost) {
            this.ctx.fillStyle = 'lime';
            this.ctx.fillText(`SWEEP: ${state.sweepBoost.timer.toFixed(1)}s`, 10, 80);
        }
        
        for (const powerUp of state.powerUps) {
            if (powerUp.collected) continue;
            
            const powerUpWorldY = powerUp.scrollProgress * maxScroll;
            const worldDY = powerUpWorldY - state.stone.worldY;
            const screenY = state.screenHeight * 0.5 - worldDY;
            const screenX = playArea.left + playArea.width / 2 + powerUp.x;
            
            if (screenY < -config.radius || screenY > state.screenHeight + config.radius) continue;
            
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, config.radius, 0, Math.PI * 2);
            
            const gradient = this.ctx.createRadialGradient(
                screenX, screenY, 0,
                screenX, screenY, config.radius
            );
            gradient.addColorStop(0, 'rgba(255, 215, 0, 1)');
            gradient.addColorStop(0.7, 'rgba(255, 165, 0, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 100, 0, 0.3)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.font = 'bold 16px Arial';
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
        if (state.phase !== 'moving' && state.phase !== 'returning') return;
        
        const playArea = state.getPlayArea();
        const config = state.lifePowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        for (const lifePowerUp of state.lifePowerUps) {
            if (lifePowerUp.collected) continue;
            
            const powerUpWorldY = lifePowerUp.scrollProgress * maxScroll;
            const worldDY = powerUpWorldY - state.stone.worldY;
            const screenY = state.screenHeight * 0.5 - worldDY;
            const screenX = playArea.left + playArea.width / 2 + lifePowerUp.x;
            
            if (screenY < -config.radius || screenY > state.screenHeight + config.radius) continue;
            
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, config.radius, 0, Math.PI * 2);
            
            const gradient = this.ctx.createRadialGradient(
                screenX, screenY, 0,
                screenX, screenY, config.radius
            );
            gradient.addColorStop(0, 'rgba(255, 50, 50, 1)');
            gradient.addColorStop(0.7, 'rgba(200, 0, 0, 0.9)');
            gradient.addColorStop(1, 'rgba(150, 0, 0, 0.4)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.font = 'bold 14px Arial';
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
        if (state.phase !== 'moving' && state.phase !== 'returning') return;
        
        const playArea = state.getPlayArea();
        const config = state.sweepPowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        for (const sweepPowerUp of state.sweepPowerUps) {
            if (sweepPowerUp.collected) continue;
            
            const powerUpWorldY = sweepPowerUp.scrollProgress * maxScroll;
            const worldDY = powerUpWorldY - state.stone.worldY;
            const screenY = state.screenHeight * 0.5 - worldDY;
            const screenX = playArea.left + playArea.width / 2 + sweepPowerUp.x;
            
            if (screenY < -config.radius || screenY > state.screenHeight + config.radius) continue;
            
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, config.radius, 0, Math.PI * 2);
            
            const gradient = this.ctx.createRadialGradient(
                screenX, screenY, 0,
                screenX, screenY, config.radius
            );
            gradient.addColorStop(0, 'rgba(50, 255, 50, 1)');
            gradient.addColorStop(0.7, 'rgba(0, 200, 0, 0.9)');
            gradient.addColorStop(1, 'rgba(0, 150, 0, 0.4)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.font = 'bold 14px Arial';
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
                '50, 255, 50',
                0.6
            );
        }
    }

    drawSopaText(state) {
        if (!state.sweepBoost || state.sweepBoost.timer <= 0) return;
        
        const centerX = state.screenWidth / 2;
        const centerY = state.screenHeight / 2;
        
        this.ctx.save();
        
        this.ctx.font = 'bold 120px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        this.ctx.shadowColor = 'rgba(0, 255, 0, 0.8)';
        this.ctx.shadowBlur = 30;
        
        const alpha = Math.min(1, state.sweepBoost.timer / 5);
        this.ctx.fillStyle = `rgba(50, 255, 50, ${alpha})`;
        this.ctx.fillText('SOPA!', centerX, centerY);
        
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
        this.ctx.lineWidth = 4;
        this.ctx.strokeText('SOPA!', centerX, centerY);
        
        this.ctx.restore();

        const broomRotation = Math.sin(Date.now() / 100) * 0.5;
        this.ctx.save();
        
        this.ctx.font = '80px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        this.ctx.save();
        this.ctx.translate(centerX - 200, centerY);
        this.ctx.rotate(-broomRotation - 0.3);
        this.ctx.fillText('🧹', 0, 0);
        this.ctx.restore();
        
        this.ctx.save();
        this.ctx.translate(centerX + 200, centerY);
        this.ctx.rotate(broomRotation + 0.3);
        this.ctx.fillText('🧹', 0, 0);
        this.ctx.restore();
        
        this.ctx.restore();
    }

    drawRotationPowerUps(state) {
        if (state.phase !== 'moving' && state.phase !== 'returning') return;
        
        const playArea = state.getPlayArea();
        const config = state.rotationPowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        for (const rotationPowerUp of state.rotationPowerUps) {
            if (rotationPowerUp.collected) continue;
            
            const powerUpWorldY = rotationPowerUp.scrollProgress * maxScroll;
            const worldDY = powerUpWorldY - state.stone.worldY;
            const screenY = state.screenHeight * 0.5 - worldDY;
            const screenX = playArea.left + playArea.width / 2 + rotationPowerUp.x;
            
            if (screenY < -config.radius || screenY > state.screenHeight + config.radius) continue;
            
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, config.radius, 0, Math.PI * 2);
            
            const gradient = this.ctx.createRadialGradient(
                screenX, screenY, 0,
                screenX, screenY, config.radius
            );
            gradient.addColorStop(0, 'rgba(200, 50, 255, 1)');
            gradient.addColorStop(0.7, 'rgba(150, 0, 200, 0.9)');
            gradient.addColorStop(1, 'rgba(100, 0, 150, 0.4)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.font = 'bold 14px Arial';
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
        if (state.phase !== 'moving' && state.phase !== 'returning') return;

        const playArea = state.getPlayArea();
        const config = state.superBoostPowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);

        for (const superBoostPowerUp of state.superBoostPowerUps) {
            if (superBoostPowerUp.collected) continue;

            const powerUpWorldY = superBoostPowerUp.scrollProgress * maxScroll;
            const worldDY = powerUpWorldY - state.stone.worldY;
            const screenY = state.screenHeight * 0.5 - worldDY;
            const screenX = playArea.left + playArea.width / 2 + superBoostPowerUp.x;

            if (screenY < -config.radius || screenY > state.screenHeight + config.radius) continue;

            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, config.radius, 0, Math.PI * 2);

            const gradient = this.ctx.createRadialGradient(
                screenX, screenY, 0,
                screenX, screenY, config.radius
            );
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.3, 'rgba(255, 215, 0, 1)');
            gradient.addColorStop(0.7, 'rgba(255, 140, 0, 0.9)');
            gradient.addColorStop(1, 'rgba(255, 69, 0, 0.4)');

            this.ctx.fillStyle = gradient;
            this.ctx.fill();

            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();

            this.ctx.fillStyle = 'rgba(255, 255, 255, 1)';
            this.ctx.font = 'bold 16px Arial';
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

    drawScoringOrbs(state) {
        if (state.phase !== 'moving' && state.phase !== 'returning') return;
        
        const playArea = state.getPlayArea();
        const config = state.scoringOrbConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        for (const orb of state.scoringOrbs) {
            if (orb.collected) continue;
            
            const orbWorldY = orb.scrollProgress * maxScroll;
            const worldDY = orbWorldY - state.stone.worldY;
            const screenY = state.screenHeight * 0.5 - worldDY;
            const screenX = playArea.left + playArea.width / 2 + orb.x;
            
            const radius = config[orb.type].radius;
            
            if (screenY < -radius || screenY > state.screenHeight + radius) continue;
            
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
            
            if (orb.type === 'green') {
                const gradient = this.ctx.createRadialGradient(
                    screenX, screenY, 0,
                    screenX, screenY, radius
                );
                gradient.addColorStop(0, 'rgba(72, 187, 120, 1)');
                gradient.addColorStop(0.7, 'rgba(56, 161, 105, 0.9)');
                gradient.addColorStop(1, 'rgba(47, 133, 90, 0.4)');
                
                this.ctx.fillStyle = gradient;
                this.ctx.fill();
                
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            } else {
                const gradient = this.ctx.createRadialGradient(
                    screenX, screenY, 0,
                    screenX, screenY, radius
                );
                gradient.addColorStop(0, 'rgba(159, 122, 234, 1)');
                gradient.addColorStop(0.7, 'rgba(128, 90, 213, 0.9)');
                gradient.addColorStop(1, 'rgba(107, 70, 193, 0.4)');
                
                this.ctx.fillStyle = gradient;
                this.ctx.fill();
                
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
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
        
        const color = orb.type === 'purple' ? '147, 122, 234' : '72, 187, 120';
        const count = orb.type === 'purple' ? 25 : 15;
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 6 + 2;
            this.addParticle(
                screenX,
                screenY,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color,
                0.6
            );
        }
    }

    updateSuperBoostImageEffect(state, deltaTime) {
        if (!state.superBoostImageEffect) return;

        const effect = state.superBoostImageEffect;
        effect.timer += deltaTime;

        const progress = Math.min(effect.timer / effect.duration, 1);
        const bounce = Math.sin(progress * Math.PI);
        const startY = state.screenHeight;
        const targetY = effect.targetY;
        effect.y = startY - (startY - targetY) * bounce;

        if (!effect.peaked && progress >= 0.5) {
            effect.peaked = true;
            state.triggerScreenShake(15, 0.3);
            const playArea = state.getPlayArea();
            const screenX = playArea.left + playArea.width / 2 + state.stone.x;
            const screenY = state.screenHeight * state.stoneVisualY;
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
        const stoneY = state.screenHeight * state.stoneVisualY;
        
        const imageWidth = 60;
        const imageHeight = 120;
        const x = stoneX - imageWidth / 2;
        const y = effect.y - imageHeight;

        const progress = Math.min(effect.timer / effect.duration, 1);
        const alpha = Math.sin(progress * Math.PI);

        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.drawImage(this.superBoostImage, x, y, imageWidth, imageHeight);
        this.ctx.restore();
    }

    render(state, deltaTime = 0.016) {
        this.updateEffects(state, deltaTime);
        
        this.ctx.save();
        this.ctx.translate(this.shakeOffsetX, this.shakeOffsetY);
        
        this.clear();
        
        this.drawWalls(state);
        this.drawSweepZone(state);
        this.drawPowerUps(state);
        this.drawLifePowerUps(state);
        this.drawSweepPowerUps(state);
        this.drawRotationPowerUps(state);
        this.drawSuperBoostPowerUps(state);
        this.drawScoringOrbs(state);
        this.drawStone(state);
        this.drawSopaText(state);
        this.drawSlingshotElastic(state);
        this.drawVGauge(state);
        this.drawSuperBoostImageEffect(state);
        
        const pos = this.getStoneScreenPosition(state);
        
        if (state.phase === 'moving') {
            if (state.isSweeping) {
                this.addSweepParticles(pos.x, pos.y);
            }
            
            if (this.prevStoneX !== null) {
                const playArea = state.getPlayArea();
                const leftBound = state.stone.radius - playArea.width / 2;
                const rightBound = playArea.width / 2 - state.stone.radius;
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