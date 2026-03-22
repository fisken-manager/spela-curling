export class Physics {
    constructor() {
        this.physicsTick = 0.001;
        this.baseMaxVelocity = 18;
        this.wallBounceEnergy = 0.8;
        this.sweepBoost = 1.5;
        this.stopThreshold = 0.1;
        
        this.baseFriction = 0.01;
        this.baseCurlStrength = 0.2;
        this.angularDecayFactor = 0.15;
        
        this.minAngularVelocity = -10;
        this.maxAngularVelocity = 10;
    }

    getMaxVelocity(state) {
        const bonusMultiplier = 1 + (state.upgrades.maxVelocity.level * 0.15);
        let maxVel = this.baseMaxVelocity * bonusMultiplier;
        if (state.frictionBoost && state.frictionBoost.maxVelocityMultiplier) {
            maxVel *= state.frictionBoost.maxVelocityMultiplier;
        }
        
        const loopCount = state.loopCount || 1;
        const halvingFactor = Math.pow(0.5, Math.floor(loopCount / 5));
        maxVel *= halvingFactor;

        return maxVel;
    }

    getEffectiveFriction(state) {
        const reduction = state.upgrades.frictionReduction.level * 0.05;
        return this.baseFriction * (1 - reduction);
    }

    getEffectiveCurl(state) {
        let curl = this.baseCurlStrength;
        
        // Random curl upgrade - adds random spin every 10 seconds
        if (state.upgrades.randomCurl.level > 0) {
            const interval = 10; // seconds
            const strength = state.upgrades.randomCurl.level * 2;
            
            state.randomCurlTimer += deltaTime || 0;
            
            if (state.randomCurlTimer >= interval) {
                state.randomCurlTimer = 0;
                // Apply random spin between -5 and 5
                const randomSpin = (Math.random() - 0.5) * 10 * strength;
                state.stone.angularVelocity += randomSpin;
            }
        }
        
        return Math.max(0, curl);
    }

    getEffectiveRadius(state) {
        const baseRadius = 30;
        const sizeBonus = state.upgrades.stoneSize.level * 8; // Increased bonus
        const growthMultiplier = state.growthBoost ? state.growthPowerUpConfig.growthMultiplier : 1;
        return Math.max(1, (baseRadius + sizeBonus) * growthMultiplier);
    }

    getEffectiveOrbRadius(state, orbType) {
        const config = state.scoringOrbConfig[orbType];
        return config.radius;
    }

    update(state, deltaTime) {
        this.state = state;

        if (state.phase !== 'moving') return;
        this.updateFrictionBoost(state, deltaTime);
        this.updateSweepBoost(state, deltaTime);
        this.updateGrowthBoost(state, deltaTime);

        const steps = Math.ceil(deltaTime / this.physicsTick);
        const dt = deltaTime / steps;

        for (let i = 0; i < steps; i++) {
            this.physicsStep(state, dt);
        }
    }

    updateGrowthBoost(state, deltaTime) {
        if (!state.growthBoost) return;
        
        state.growthBoost.timer -= deltaTime;
        if (state.growthBoost.timer <= 0) {
            state.growthBoost = null;
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

        let mu = this.getEffectiveFriction(state);
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
        const curlStrength = this.getEffectiveCurl(state);
        const curlAcceleration = curlStrength * stone.angularVelocity * Math.abs(forwardVelocity) / speedNorm;
        
        stone.vx += curlAcceleration * dt - decelX * dt;
        stone.vy -= decelY * dt;
        
        stone.angularVelocity -= stone.angularVelocity * this.baseFriction * dt * this.angularDecayFactor;
        if (Math.abs(stone.angularVelocity) < 0.01) stone.angularVelocity = 0;
        
        const damping = state.frictionBoost ? 0.9999 : 0.9997;
        stone.vx *= damping;
        stone.vy *= damping;
        
        const effectiveRadius = this.getEffectiveRadius(state);
        stone.x += stone.vx * dt * 60;
        stone.rotation += stone.angularVelocity * dt;
        
        this.handleBounds(state, effectiveRadius);
        this.updateWorldPosition(state, dt);
        this.checkPowerUps(state, effectiveRadius);
    }

checkPowerUps(state, effectiveRadius) {
        const { stone } = state;
        const config = state.powerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        for (const powerUp of state.powerUps) {
            if (powerUp.collected) continue;
            
            const powerUpWorldY = powerUp.scrollProgress * maxScroll;
            const dy = Math.abs(stone.worldY - powerUpWorldY);
            const dx = Math.abs(stone.x - powerUp.x);
            
            const collisionDistance = config.radius + effectiveRadius;
            
            if (dy < collisionDistance && dx < collisionDistance) {
                this.collectPowerUp(state, powerUp, effectiveRadius);
            }
        }
        
        this.checkLifePowerUps(state, effectiveRadius);
        this.checkSweepPowerUps(state, effectiveRadius);
        this.checkRotationPowerUps(state, effectiveRadius);
        this.checkSuperBoostPowerUps(state, effectiveRadius);
        this.checkScoringOrbs(state, effectiveRadius);
        this.checkGrowthPowerUps(state, effectiveRadius);
        this.checkCurlChaosPickups(state, effectiveRadius);
        this.checkSizeShrinkPickups(state, effectiveRadius);
    }

    checkLifePowerUps(state, effectiveRadius) {
        const { stone } = state;
        const config = state.lifePowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        for (const lifePowerUp of state.lifePowerUps) {
            if (lifePowerUp.collected) continue;
            
            const powerUpWorldY = lifePowerUp.scrollProgress * maxScroll;
            const dy = Math.abs(stone.worldY - powerUpWorldY);
            const dx = Math.abs(stone.x - lifePowerUp.x);
            
            const collisionDistance = config.radius + effectiveRadius;
            
            if (dy < collisionDistance && dx < collisionDistance) {
                lifePowerUp.collected = true;
                state.lives++;
                state.lifePowerUpCollected = lifePowerUp;
                
                this.addPowerUpText(state, lifePowerUp.x, '+1 LIV!', '255, 50, 50');
                
                const playArea = state.getPlayArea();
                const screenX = playArea.left + playArea.width / 2 + lifePowerUp.x;
                const screenY = state.screenHeight * 0.5;
                state.triggerRingFlash(screenX, screenY, '255, 50, 50');
            }
        }
    }

    checkSweepPowerUps(state, effectiveRadius) {
        const { stone } = state;
        const config = state.sweepPowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        for (const sweepPowerUp of state.sweepPowerUps) {
            if (sweepPowerUp.collected) continue;
            
            const powerUpWorldY = sweepPowerUp.scrollProgress * maxScroll;
            const dy = Math.abs(stone.worldY - powerUpWorldY);
            const dx = Math.abs(stone.x - sweepPowerUp.x);
            
            const collisionDistance = config.radius + effectiveRadius;
            
            if (dy < collisionDistance && dx < collisionDistance) {
                sweepPowerUp.collected = true;
                state.sweepBoost = {
                    timer: config.duration
                };
                state.sweepPowerUpCollected = sweepPowerUp;
                state.triggerScreenShake(8, 0.15);
                this.addPowerUpText(state, sweepPowerUp.x, 'SOPA!', '50, 255, 50');
            }
        }
    }

    checkRotationPowerUps(state, effectiveRadius) {
        const { stone } = state;
        const config = state.rotationPowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        for (const rotationPowerUp of state.rotationPowerUps) {
            if (rotationPowerUp.collected) continue;
            
            const powerUpWorldY = rotationPowerUp.scrollProgress * maxScroll;
            const dy = Math.abs(stone.worldY - powerUpWorldY);
            const dx = Math.abs(stone.x - rotationPowerUp.x);
            
            const collisionDistance = config.radius + effectiveRadius;
            
            if (dy < collisionDistance && dx < collisionDistance) {
                rotationPowerUp.collected = true;
                
                const direction = Math.random() < 0.5 ? -1 : 1;
                const magnitude = config.minAngularVelocity + 
                    Math.random() * (config.maxAngularVelocity - config.minAngularVelocity);
                stone.angularVelocity += direction * magnitude;
                
                state.rotationPowerUpCollected = rotationPowerUp;
                this.addPowerUpText(state, rotationPowerUp.x, 'SNURR!', '200, 50, 255');
            }
        }
    }

    checkSuperBoostPowerUps(state, effectiveRadius) {
        const { stone } = state;
        const config = state.superBoostPowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);

        for (const superBoostPowerUp of state.superBoostPowerUps) {
            if (superBoostPowerUp.collected) continue;

            const powerUpWorldY = superBoostPowerUp.scrollProgress * maxScroll;
            const dy = Math.abs(stone.worldY - powerUpWorldY);
            const dx = Math.abs(stone.x - superBoostPowerUp.x);

            const collisionDistance = config.radius + effectiveRadius;

            if (dy < collisionDistance && dx < collisionDistance) {
                superBoostPowerUp.collected = true;
                
                state.frictionBoost = {
                    frictionMultiplier: config.frictionMultiplier,
                    maxVelocityMultiplier: config.maxVelocityMultiplier || 1.5,
                    timer: config.duration
                };

                const speed = Math.sqrt(stone.vx ** 2 + stone.vy ** 2);
                const maxVel = this.getMaxVelocity(state);
                if (speed > 0.001) {
                    const boost = config.speedBoost;
                    stone.vx += (stone.vx / speed) * boost;
                    stone.vy += (stone.vy / speed) * boost;

                    const newSpeed = Math.sqrt(stone.vx ** 2 + stone.vy ** 2);
                    if (newSpeed > maxVel) {
                        const scale = maxVel / newSpeed;
                        stone.vx *= scale;
                        stone.vy *= scale;
                    }
                }

                state.superBoostCollected = superBoostPowerUp;
                state.superBoostImageEffect = {
                    y: state.screenHeight,
                    targetYPx: state.stoneYPx - 60,
                    timer: 0,
                    duration: 1.33,
                    peaked: false
                };
                
                this.addPowerUpText(state, superBoostPowerUp.x, 'SUPER!', '255, 140, 0');
            }
        }
    }

    checkGrowthPowerUps(state, effectiveRadius) {
        const { stone } = state;
        const config = state.growthPowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        for (const growthPowerUp of state.growthPowerUps) {
            if (growthPowerUp.collected) continue;
            
            const powerUpWorldY = growthPowerUp.scrollProgress * maxScroll;
            const dy = Math.abs(stone.worldY - powerUpWorldY);
            const dx = Math.abs(stone.x - growthPowerUp.x);
            
            const collisionDistance = config.radius + effectiveRadius;
            
            if (dy < collisionDistance && dx < collisionDistance) {
                growthPowerUp.collected = true;
                state.growthBoost = {
                    timer: config.duration,
                    multiplier: config.growthMultiplier
                };
                state.growthPowerUpCollected = growthPowerUp;
                this.addPowerUpText(state, growthPowerUp.x, 'STOR!', '72, 187, 120');
                state.triggerRingFlash(
                    state.getPlayArea().left + state.getPlayArea().width / 2 + growthPowerUp.x,
                    state.screenHeight * 0.5,
                    '72, 187, 120'
                );
            }
        }
    }

    checkCurlChaosPickups(state, effectiveRadius) {
        const { stone } = state;
        const config = state.curlChaosConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        for (const pickup of state.curlChaosPickups) {
            if (pickup.collected) continue;
            
            const pickupWorldY = pickup.scrollProgress * maxScroll;
            const dy = Math.abs(stone.worldY - pickupWorldY);
            const dx = Math.abs(stone.x - pickup.x);
            
            const collisionDistance = config.radius + effectiveRadius;
            
            if (dy < collisionDistance && dx < collisionDistance) {
                pickup.collected = true;
                state.curlChaosStrength += 0.1;
                state.curlChaosCollected = pickup;
                this.addPowerUpText(state, pickup.x, '+CURL!', '255, 50, 50');
                state.triggerRingFlash(
                    state.getPlayArea().left + state.getPlayArea().width / 2 + pickup.x,
                    state.screenHeight * 0.5,
                    '255, 50, 50'
                );
            }
        }
    }

    checkSizeShrinkPickups(state, effectiveRadius) {
        const { stone } = state;
        const config = state.sizeShrinkConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        for (const pickup of state.sizeShrinkPickups) {
            if (pickup.collected) continue;
            
            const pickupWorldY = pickup.scrollProgress * maxScroll;
            const dy = Math.abs(stone.worldY - pickupWorldY);
            const dx = Math.abs(stone.x - pickup.x);
            
            const collisionDistance = config.radius + effectiveRadius;
            
            if (dy < collisionDistance && dx < collisionDistance) {
                pickup.collected = true;
                state.sizeShrinkPenalty += 3;
                state.sizeShrinkCollected = pickup;
                this.addPowerUpText(state, pickup.x, '-STORLEK!', '200, 50, 255');
                state.triggerRingFlash(
                    state.getPlayArea().left + state.getPlayArea().width / 2 + pickup.x,
                    state.screenHeight * 0.5,
                    '200, 50, 255'
                );
            }
        }
    }

    checkScoringOrbs(state, effectiveRadius) {
        const { stone } = state;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        for (const orb of state.scoringOrbs) {
            if (orb.collected) continue;
            
            const orbWorldY = orb.scrollProgress * maxScroll;
            const dy = Math.abs(stone.worldY - orbWorldY);
            const dx = Math.abs(stone.x - orb.x);
            
            const orbRadius = this.getEffectiveOrbRadius(state, orb.type);
            const collisionDistance = orbRadius + effectiveRadius;
            
            if (dy < collisionDistance && dx < collisionDistance) {
                this.collectScoringOrb(state, orb);
            }
        }
    }

    collectScoringOrb(state, orb) {
        orb.collected = true;
        
        const now = Date.now();
        const config = state.scoringOrbConfig[orb.type];
        
        // Yellow orbs give money only
        if (orb.type === 'yellow') {
            state.money += config.money || 1;
            
            // Coin speed boost upgrade
            if (state.upgrades.coinSpeedBoost?.level > 0) {
                const { stone } = state;
                const speed = Math.sqrt(stone.vx ** 2 + stone.vy ** 2);
                const maxVel = this.getMaxVelocity(state);
                if (speed > 0.001) {
                    const boost = state.powerUpConfig.speedBoost * 0.5; // Half the power of a regular arrow
                    stone.vx += (stone.vx / speed) * boost;
                    stone.vy += (stone.vy / speed) * boost;
                    
                    const newSpeed = Math.sqrt(stone.vx ** 2 + stone.vy ** 2);
                    if (newSpeed > maxVel) {
                        const scale = maxVel / newSpeed;
                        stone.vx *= scale;
                        stone.vy *= scale;
                    }
                }
            }
            
            const playArea = state.getPlayArea();
            const screenX = playArea.left + playArea.width / 2 + orb.x;
            const screenY = state.screenHeight * 0.5;
            
            state.scoreAnimations.push({
                x: screenX,
                y: screenY,
                text: '$1',
                startTime: now,
                duration: 800,
                scale: 1.5,
                isCombo: false,
                isMoney: true
            });
            
            state.scoringOrbCollected = orb;
            state.triggerRingFlash(screenX, screenY, '255, 215, 0');
            return;
        }
        
        const timeSinceLastOrb = now - state.lastOrbTime;
        
        // Combo system: increase multiplier if collected within 500ms
        if (timeSinceLastOrb < state.comboTimeout && state.lastOrbTime > 0) {
            state.comboMultiplier = Math.min(state.comboMultiplier + 1, 100);
        } else {
            state.comboMultiplier = 1;
        }
        
        state.lastOrbTime = now;
        
        const loopMultiplier = state.loopCount || 1;
        const basePoints = config.points * loopMultiplier;
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

    collectPowerUp(state, powerUp, effectiveRadius) {
        const { stone } = state;
        const config = state.powerUpConfig;
        
        powerUp.collected = true;
        
        const speed = Math.sqrt(stone.vx ** 2 + stone.vy ** 2);
        const maxVel = this.getMaxVelocity(state);
        if (speed > 0.001) {
            const boost = config.speedBoost;
            stone.vx += (stone.vx / speed) * boost;
            stone.vy += (stone.vy / speed) * boost;
            
            const newSpeed = Math.sqrt(stone.vx ** 2 + stone.vy ** 2);
            if (newSpeed > maxVel) {
                const scale = maxVel / newSpeed;
                stone.vx *= scale;
                stone.vy *= scale;
            }
        }
        
        state.frictionBoost = {
            frictionMultiplier: config.frictionMultiplier,
            timer: Math.max(state.frictionBoost?.timer || 0, config.boostDuration),
            maxVelocityMultiplier: state.frictionBoost?.maxVelocityMultiplier
        };
        
        state.powerUpCollected = powerUp;
        
        this.addPowerUpText(state, powerUp.x, 'HASTIGHET!', '255, 215, 0');
    }

    addPowerUpText(state, x, text, color) {
        const playArea = state.getPlayArea();
        const screenX = playArea.left + playArea.width / 2 + x;
        const screenY = state.screenHeight * 0.5;
        
        state.scoreAnimations.push({
            x: screenX,
            y: screenY,
            text: text,
            startTime: Date.now(),
            duration: 800,
            scale: 1.2,
            isCombo: false,
            isPowerUp: true,
            color: color
        });
    }

    handleBounds(state, effectiveRadius) {
        const { stone } = state;
        const playArea = state.getPlayArea();
        const leftBound = effectiveRadius - playArea.width / 2;
        const rightBound = playArea.width / 2 - effectiveRadius;
        
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
            // Move stone upward in pixels until it reaches the center of the screen
            const pixelSpeed = stone.vy; 
            const newYPx = state.stoneYPx - pixelSpeed * dt * 60;
            
            if (newYPx <= state.centerXYPx) {
                const overshoot = state.centerXYPx - newYPx;
                state.stoneYPx = state.centerXYPx;
                state.transitionProgress = 1;
                state.inScrollZone = true;
                stone.worldY += overshoot;
            } else {
                state.stoneYPx = newYPx;
                // Update stoneVisualY just for legacy/UI if needed, but the game uses stoneYPx
                state.stoneVisualY = state.stoneYPx / state.screenHeight;
                
                const totalTransitionPx = (state.screenHeight - state.restOffsetPx) - state.centerXYPx;
                const currentProgressPx = (state.screenHeight - state.restOffsetPx) - state.stoneYPx;
                state.transitionProgress = Math.min(1, currentProgressPx / totalTransitionPx);
            }
        } else {
            stone.worldY += stone.vy * dt * 60;
        }
        
        const maxScroll = state.pageHeight - state.screenHeight;
        if (maxScroll > 0) {
            state.scrollProgress = stone.worldY / maxScroll;
            state.scrollProgress = Math.max(0, Math.min(1, state.scrollProgress));
            
            if (state.scrollProgress >= 1) {
                if (!state.isLoopTransitioning) {
                    state.isLoopTransitioning = true;
                    state.loopCount = (state.loopCount || 1) + 1;
                    
                    const performReset = () => {
                        state.scrollProgress = 0;
                        stone.worldY = 0;
                        state.initPowerUps();
                        state.initScoringOrbs();
                    };

                    const loopOverlay = document.getElementById('loop-transition');
                    const loopText = document.getElementById('loop-text');
                    
                    if (loopOverlay && loopText) {
                        loopText.textContent = `Loop #${state.loopCount}`;
                        loopOverlay.classList.add('active');
                        
                        setTimeout(() => {
                            performReset();
                            loopText.classList.add('active');
                        }, 250);
                        
                        setTimeout(() => {
                            loopText.classList.remove('active');
                        }, 1000);
                        
                        setTimeout(() => {
                            loopOverlay.classList.remove('active');
                            state.isLoopTransitioning = false;
                        }, 1250);
                    } else {
                        performReset();
                        state.isLoopTransitioning = false;
                    }
                }
            }
        }
    }

    launch(state, flickPower = 50) {
        const { stone } = state;
        
        if (state.lives <= 0) return;
        
        state.lives--;
        
        const maxVel = this.getMaxVelocity(state);
        const speed = (flickPower / 100) * maxVel;
        
        stone.vx = Math.sin(state.aimAngle) * speed;
        stone.vy = Math.cos(state.aimAngle) * speed;
        
        stone.angularVelocity = this.minAngularVelocity + 
            Math.random() * (this.maxAngularVelocity - this.minAngularVelocity);
        stone.rotation = 0;
        
        state.phase = 'moving';
        state.input = { isDragging: false, dragStartX: 0, dragStartYPx: 0, stoneStartX: 0, stoneStartYPx: 0, flickHistory: [], snapBackProgress: 0, isSnapping: false };
        state.inScrollZone = false;
        
        const totalTransitionPx = (state.screenHeight - state.restOffsetPx) - (state.screenHeight / 2);
        const currentProgressPx = (state.screenHeight - state.restOffsetPx) - state.stoneYPx;
        state.transitionProgress = Math.min(1, currentProgressPx / totalTransitionPx);
    }

    resetStone(state) {
        state.phase = 'resting';
        state.input.isSnapping = true;
        state.input.snapBackProgress = 0;
        state.input.stoneStartX = state.stone.x;
        state.input.stoneStartYPx = state.stoneYPx;
        state.input.flickHistory = [];
    }

    applySweepBoost(state, intensity) {
        if (state.phase !== 'moving') return;
        
        const { stone } = state;
        const currentSpeed = Math.sqrt(stone.vx * stone.vx + stone.vy * stone.vy);
        const maxVel = this.getMaxVelocity(state);
        
        if (currentSpeed > this.stopThreshold) {
            const boost = this.sweepBoost * intensity;
            stone.vx *= (1 + boost * 0.01);
            stone.vy *= (1 + boost * 0.01);
            stone.angularVelocity *= 0.98;
            
            const newSpeed = Math.sqrt(stone.vx * stone.vx + stone.vy * stone.vy);
            if (newSpeed > maxVel) {
                stone.vx = (stone.vx / newSpeed) * maxVel;
                stone.vy = (stone.vy / newSpeed) * maxVel;
            }
        }
    }
}
