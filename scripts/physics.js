export class Physics {
    constructor() {
        this.physicsTick = 0.001;
        this.maxVelocity = 25;
        this.wallBounceEnergy = 0.8;
        this.sweepBoost = 1.5;
        this.stopThreshold = 0.1;
        
        this.baseFriction = 0.01;
        this.curlStrength = 0.05;
        this.angularDecayFactor = 0.5;
        
        this.minAngularVelocity = -10;
        this.maxAngularVelocity = 10;
    }

    getMu(velocity) {
        if (this.state && this.state.frictionBoost) {
            return this.baseFriction * this.state.frictionBoost.frictionMultiplier;
        }
        return this.baseFriction;
    }

    update(state, deltaTime) {
        this.state = state;
        
        if (state.phase !== 'moving') return;

        this.updateFrictionBoost(state, deltaTime);
        this.updateSweepBoost(state, deltaTime);

        const steps = Math.ceil(deltaTime / this.physicsTick);
        const dt = deltaTime / steps;

        for (let i = 0; i < steps; i++) {
            this.physicsStep(state, dt);
        }
    }

    updateFrictionBoost(state, deltaTime) {
        if (!state.frictionBoost) return;
        
        state.frictionBoost.timer -= deltaTime;
        if (state.frictionBoost.timer <= 0) {
            state.frictionBoost = null;
        }
    }

    updateSweepBoost(state, deltaTime) {
        if (!state.sweepBoost) return;
        
        state.sweepBoost.timer -= deltaTime;
        if (state.sweepBoost.timer <= 0) {
            state.sweepBoost = null;
        }
    }

    physicsStep(state, dt) {
        const { stone } = state;
        
        const speed = Math.sqrt(stone.vx * stone.vx + stone.vy * stone.vy);
        
        if (state.inScrollZone) {
            state.score += Math.abs(stone.vy * dt * 60);
        }
        
        if (speed < this.stopThreshold) {
            stone.vx = 0;
            stone.vy = 0;
            stone.angularVelocity = 0;
            state.phase = 'returning';
            return;
        }

        let mu = this.baseFriction;
        if (state.frictionBoost) {
            mu *= state.frictionBoost.frictionMultiplier;
        }
        if (state.isSweeping) {
            mu *= 0.6;
        }
        const frictionDecel = mu;
        const speedNorm = speed || 0.001;
        const decelX = (stone.vx / speedNorm) * frictionDecel;
        const decelY = (stone.vy / speedNorm) * frictionDecel;
        
        const forwardVelocity = stone.vy;
        const curlAcceleration = this.curlStrength * stone.angularVelocity * Math.abs(forwardVelocity) / speedNorm;
        
        stone.vx += curlAcceleration * dt - decelX * dt;
        stone.vy -= decelY * dt;
        
        stone.angularVelocity -= stone.angularVelocity * this.baseFriction * dt * this.angularDecayFactor;
        if (Math.abs(stone.angularVelocity) < 0.01) stone.angularVelocity = 0;
        
        const damping = state.frictionBoost ? 0.9999 : 0.9997;
        stone.vx *= damping;
        stone.vy *= damping;
        
        stone.x += stone.vx * dt * 60;
        stone.rotation += stone.angularVelocity * dt;
        
        this.handleBounds(state);
        this.updateWorldPosition(state, dt);
        this.checkPowerUps(state);
    }

checkPowerUps(state) {
        const { stone } = state;
        const config = state.powerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        for (const powerUp of state.powerUps) {
            if (powerUp.collected) continue;
            
            const powerUpWorldY = powerUp.scrollProgress * maxScroll;
            const dy = Math.abs(stone.worldY - powerUpWorldY);
            const dx = Math.abs(stone.x - powerUp.x);
            
            const collisionDistance = config.radius + stone.radius;
            
            if (dy < collisionDistance && dx < collisionDistance) {
                this.collectPowerUp(state, powerUp);
            }
        }
        
        this.checkLifePowerUps(state);
        this.checkSweepPowerUps(state);
        this.checkRotationPowerUps(state);
        this.checkSuperBoostPowerUps(state);
        this.checkScoringOrbs(state);
    }

    checkLifePowerUps(state) {
        const { stone } = state;
        const config = state.lifePowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        for (const lifePowerUp of state.lifePowerUps) {
            if (lifePowerUp.collected) continue;
            
            const powerUpWorldY = lifePowerUp.scrollProgress * maxScroll;
            const dy = Math.abs(stone.worldY - powerUpWorldY);
            const dx = Math.abs(stone.x - lifePowerUp.x);
            
            const collisionDistance = config.radius + stone.radius;
            
            if (dy < collisionDistance && dx < collisionDistance) {
                lifePowerUp.collected = true;
                state.lives++;
                state.lifePowerUpCollected = lifePowerUp;
                
                const playArea = state.getPlayArea();
                const screenX = playArea.left + playArea.width / 2 + lifePowerUp.x;
                const screenY = state.screenHeight * 0.5;
                state.triggerRingFlash(screenX, screenY, '255, 50, 50');
            }
        }
    }

    checkSweepPowerUps(state) {
        const { stone } = state;
        const config = state.sweepPowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        for (const sweepPowerUp of state.sweepPowerUps) {
            if (sweepPowerUp.collected) continue;
            
            const powerUpWorldY = sweepPowerUp.scrollProgress * maxScroll;
            const dy = Math.abs(stone.worldY - powerUpWorldY);
            const dx = Math.abs(stone.x - sweepPowerUp.x);
            
            const collisionDistance = config.radius + stone.radius;
            
            if (dy < collisionDistance && dx < collisionDistance) {
                sweepPowerUp.collected = true;
                state.sweepBoost = {
                    timer: config.duration
                };
                state.sweepPowerUpCollected = sweepPowerUp;
                state.triggerScreenShake(8, 0.15);
            }
        }
    }

    checkRotationPowerUps(state) {
        const { stone } = state;
        const config = state.rotationPowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        for (const rotationPowerUp of state.rotationPowerUps) {
            if (rotationPowerUp.collected) continue;
            
            const powerUpWorldY = rotationPowerUp.scrollProgress * maxScroll;
            const dy = Math.abs(stone.worldY - powerUpWorldY);
            const dx = Math.abs(stone.x - rotationPowerUp.x);
            
            const collisionDistance = config.radius + stone.radius;
            
            if (dy < collisionDistance && dx < collisionDistance) {
                rotationPowerUp.collected = true;
                
                const direction = Math.random() < 0.5 ? -1 : 1;
                const magnitude = config.minAngularVelocity + 
                    Math.random() * (config.maxAngularVelocity - config.minAngularVelocity);
                stone.angularVelocity += direction * magnitude;
                
                state.rotationPowerUpCollected = rotationPowerUp;
            }
        }
    }

    checkSuperBoostPowerUps(state) {
        const { stone } = state;
        const config = state.superBoostPowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);

        for (const superBoostPowerUp of state.superBoostPowerUps) {
            if (superBoostPowerUp.collected) continue;

            const powerUpWorldY = superBoostPowerUp.scrollProgress * maxScroll;
            const dy = Math.abs(stone.worldY - powerUpWorldY);
            const dx = Math.abs(stone.x - superBoostPowerUp.x);

            const collisionDistance = config.radius + stone.radius;

            if (dy < collisionDistance && dx < collisionDistance) {
                superBoostPowerUp.collected = true;
                
                const speed = Math.sqrt(stone.vx ** 2 + stone.vy ** 2);
                if (speed > 0.001) {
                    const boost = config.speedBoost;
                    stone.vx += (stone.vx / speed) * boost;
                    stone.vy += (stone.vy / speed) * boost;

                    const newSpeed = Math.sqrt(stone.vx ** 2 + stone.vy ** 2);
                    if (newSpeed > this.maxVelocity) {
                        const scale = this.maxVelocity / newSpeed;
                        stone.vx *= scale;
                        stone.vy *= scale;
                    }
                }

                state.frictionBoost = {
                    frictionMultiplier: config.frictionMultiplier,
                    timer: config.duration
                };

                state.superBoostCollected = superBoostPowerUp;
                state.superBoostImageEffect = {
                    y: state.screenHeight,
                    targetY: state.screenHeight * state.stoneVisualY + 60,
                    timer: 0,
                    duration: 1.33,
                    peaked: false
                };
            }
        }
    }

    checkScoringOrbs(state) {
        const { stone } = state;
        const config = state.scoringOrbConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        for (const orb of state.scoringOrbs) {
            if (orb.collected) continue;
            
            const orbWorldY = orb.scrollProgress * maxScroll;
            const dy = Math.abs(stone.worldY - orbWorldY);
            const dx = Math.abs(stone.x - orb.x);
            
            const collisionDistance = config[orb.type].radius + stone.radius;
            
            if (dy < collisionDistance && dx < collisionDistance) {
                this.collectScoringOrb(state, orb);
            }
        }
    }

    collectScoringOrb(state, orb) {
        orb.collected = true;
        
        const now = Date.now();
        const timeSinceLastOrb = now - state.lastOrbTime;
        
        // Combo system: increase multiplier if collected within 500ms
        if (timeSinceLastOrb < state.comboTimeout && state.lastOrbTime > 0) {
            state.comboMultiplier = Math.min(state.comboMultiplier + 1, 100);
        } else {
            state.comboMultiplier = 1;
        }
        
        state.lastOrbTime = now;
        
        const basePoints = state.scoringOrbConfig[orb.type].points;
        const multipliedPoints = basePoints * state.comboMultiplier;
        state.score += multipliedPoints;
        state.recentScore += multipliedPoints;
        
        // Create score animation
        const playArea = state.getPlayArea();
        const screenX = playArea.left + playArea.width / 2 + orb.x;
        const screenY = state.screenHeight * 0.5;
        
        state.scoreAnimations.push({
            x: screenX,
            y: screenY,
            text: multipliedPoints > basePoints ? `+${multipliedPoints} x${state.comboMultiplier}` : `+${basePoints}`,
            startTime: now,
            duration: 800,
            scale: 1 + (state.comboMultiplier - 1) * 0.1,
            isCombo: multipliedPoints > basePoints
        });
        
        state.scoringOrbCollected = orb;
        
        const color = orb.type === 'purple' ? '147, 122, 234' : '72, 187, 120';
        state.triggerRingFlash(screenX, screenY, color);
    }

    collectPowerUp(state, powerUp) {
        const { stone } = state;
        const config = state.powerUpConfig;
        
        powerUp.collected = true;
        
        const speed = Math.sqrt(stone.vx ** 2 + stone.vy ** 2);
        if (speed > 0.001) {
            const boost = config.speedBoost;
            stone.vx += (stone.vx / speed) * boost;
            stone.vy += (stone.vy / speed) * boost;
            
            const newSpeed = Math.sqrt(stone.vx ** 2 + stone.vy ** 2);
            if (newSpeed > this.maxVelocity) {
                const scale = this.maxVelocity / newSpeed;
                stone.vx *= scale;
                stone.vy *= scale;
            }
        }
        
        state.frictionBoost = {
            frictionMultiplier: config.frictionMultiplier,
            timer: config.boostDuration
        };
        
        state.powerUpCollected = powerUp;
    }

    handleBounds(state) {
        const { stone } = state;
        const playArea = state.getPlayArea();
        const leftBound = stone.radius - playArea.width / 2;
        const rightBound = playArea.width / 2 - stone.radius;
        
        if (stone.x < leftBound) {
            stone.x = leftBound;
            stone.vx = -stone.vx * this.wallBounceEnergy;
            stone.angularVelocity *= 0.5;
        } else if (stone.x > rightBound) {
            stone.x = rightBound;
            stone.vx = -stone.vx * this.wallBounceEnergy;
            stone.angularVelocity *= 0.5;
        }
    }

    updateWorldPosition(state, dt) {
        const { stone } = state;
        
        if (!state.inScrollZone) {
            const visualSpeed = stone.vy / state.screenHeight;
            const newVisualY = state.stoneVisualY - visualSpeed * dt * 60;
            
            if (newVisualY <= state.centerY) {
                const overshoot = state.centerY - newVisualY;
                state.stoneVisualY = state.centerY;
                state.transitionProgress = 1;
                state.inScrollZone = true;
                stone.worldY += overshoot * state.screenHeight;
            } else {
                state.stoneVisualY = newVisualY;
                state.transitionProgress = (state.restY - newVisualY) / state.transitionDistance;
            }
        } else {
            stone.worldY += stone.vy * dt * 60;
        }
        
        const maxScroll = state.pageHeight - state.screenHeight;
        if (maxScroll > 0) {
            state.scrollProgress = stone.worldY / maxScroll;
            state.scrollProgress = Math.max(0, Math.min(1, state.scrollProgress));
            
            if (state.scrollProgress >= 1) {
                state.scrollProgress = 0;
                stone.worldY = 0;
                for (const powerUp of state.powerUps) {
                    powerUp.collected = false;
                }
                for (const lifePowerUp of state.lifePowerUps) {
                    lifePowerUp.collected = false;
                }
                for (const sweepPowerUp of state.sweepPowerUps) {
                    sweepPowerUp.collected = false;
                }
                for (const rotationPowerUp of state.rotationPowerUps) {
                    rotationPowerUp.collected = false;
                }
                for (const superBoostPowerUp of state.superBoostPowerUps) {
                    superBoostPowerUp.collected = false;
                }
                for (const orb of state.scoringOrbs) {
                    orb.collected = false;
                }
            }
        }
    }

    launch(state) {
        const { stone } = state;
        
        if (state.lives <= 0) return;
        
        state.lives--;
        
        const powerValue = state.power.value;
        const speed = (powerValue / 100) * this.maxVelocity;
        
        stone.vx = Math.sin(state.aimAngle) * speed;
        stone.vy = Math.cos(state.aimAngle) * speed;
        
        stone.angularVelocity = this.minAngularVelocity + 
            Math.random() * (this.maxAngularVelocity - this.minAngularVelocity);
        stone.rotation = 0;
        
        state.phase = 'moving';
        state.power = { value: 0, direction: 1, oscillationRate: 80 };
        state.input = { isDragging: false, dragStartX: 0, dragStartY: 0, currentDragX: 0, currentDragY: 0 };
        state.transitionProgress = 0;
        state.inScrollZone = false;
        state.stoneVisualY = state.restY;
    }

    applySweepBoost(state, intensity) {
        if (state.phase !== 'moving') return;
        
        const { stone } = state;
        const currentSpeed = Math.sqrt(stone.vx * stone.vx + stone.vy * stone.vy);
        
        if (currentSpeed > this.stopThreshold) {
            const boost = this.sweepBoost * intensity;
            stone.vx *= (1 + boost * 0.01);
            stone.vy *= (1 + boost * 0.01);
            stone.angularVelocity *= 0.98;
            
            const newSpeed = Math.sqrt(stone.vx * stone.vx + stone.vy * stone.vy);
            if (newSpeed > this.maxVelocity) {
                stone.vx = (stone.vx / newSpeed) * this.maxVelocity;
                stone.vy = (stone.vy / newSpeed) * this.maxVelocity;
            }
        }
    }

    getMaxVelocity() {
        return this.maxVelocity;
    }
}