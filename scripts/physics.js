export class Physics {
    constructor() {
        this.physicsTick = 0.001;
        this.baseMaxVelocity = 21;
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
        // Basic speed upgrade
        const speedLevel = state.upgrades.speed?.level || 0;
        const speedBonus = 1 + (speedLevel * 0.15);
        
        // Legacy support
        const legacyLevel = state.upgrades.maxVelocity?.level || 0;
        const legacyBonus = 1 + (legacyLevel * 0.15);
        
        let maxVel = this.baseMaxVelocity * Math.max(speedBonus, legacyBonus);
        
        // Tung Börda - size penalty to max velocity
        const sizeLevel = state.upgrades.size?.level || 0;
        if (sizeLevel > 0) {
            maxVel *= (1 - sizeLevel * 0.1);
        }
        
        // Friction forge permanent speed bonus
        const frictionForgeLevel = state.upgrades.friction_forge?.level || 0;
        maxVel *= (1 + (state.permanentSpeedBonus || 0));
        
        // Glass cannon bonus
        const glassCannonLevel = state.upgrades.glass_cannon?.level || 0;
        if (glassCannonLevel > 0) {
            maxVel *= (1 + glassCannonLevel * 0.5);
        }
        
        // Tar launch boost
        if (state.tarBoostActive && state.tarBoostTimer > 0) {
            const tarLevel = state.upgrades.tar_launch?.level || 0;
            maxVel *= (1 + tarLevel);
        }
        
        // Spin_win penalty based on items collected
        const spinWinLevel = state.upgrades.spin_win?.level || 0;
        if (spinWinLevel > 0 && state.items_collected_this_throw > 0) {
            const penalty = 1 - (spinWinLevel * 0.05 * state.items_collected_this_throw);
            maxVel *= Math.max(0.3, penalty);
        }
        
        // Gold_grift loop penalty
        const goldGriftLevel = state.upgrades.gold_grift?.level || 0;
        if (goldGriftLevel > 0) {
            const loopCount = state.loopCount || 1;
            const penalty = Math.pow(0.9 - goldGriftLevel * 0.05, Math.max(0, loopCount - 1));
            maxVel *= penalty;
        }
        
        if (state.frictionBoost && state.frictionBoost.maxVelocityMultiplier) {
            maxVel *= state.frictionBoost.maxVelocityMultiplier;
        }
        
        const loopCount = state.loopCount || 1;
        const velocityReductionFactor = Math.pow(0.90, Math.max(0, loopCount - 1));
        maxVel *= velocityReductionFactor;

        return maxVel;
    }

    getEffectiveFriction(state) {
        const loopCount = state.loopCount || 1;
        const loopFrictionMultiplier = Math.pow(1.05, Math.max(0, loopCount - 1));
        
        // Basic friction reduction
        const frictionLevel = state.upgrades.friction?.level || 0;
        const legacyLevel = state.upgrades.frictionReduction?.level || 0;
        const reduction = Math.max(frictionLevel, legacyLevel) * 0.05;
        
        // Size penalty for Vattnad Väg (larger stones = more friction)
        const sizeLevel = state.upgrades.size?.level || 0;
        const sizePenalty = sizeLevel > 0 ? 0 : sizeLevel * 0.02;
        
        let friction = this.baseFriction * (1 - reduction + sizePenalty) * loopFrictionMultiplier;
        
        // needle_eye upgrade - friction decreases when stone is smaller
        const needleEyeLevel = state.upgrades.needle_eye?.level || 0;
        if (needleEyeLevel > 0) {
            const currentRadius = this.getEffectiveRadius(state);
            const baseRadius = 30;
            const sizeRatio = currentRadius / baseRadius;
            // Smaller stone = lower fraction of friction
            if (sizeRatio < 1) {
                const frictionReduction = (1 - sizeRatio) * needleEyeLevel * 0.15;
                friction *= (1 - frictionReduction);
            }
        }
        
        return friction;
    }

    getEffectiveCurl(state, dt = 0) {
        let curl = this.baseCurlStrength;
        
        // Random curl upgrade - adds random spin every 10 seconds
        if (state.upgrades.randomCurl.level > 0) {
            const interval = 10; // seconds
            const strength = state.upgrades.randomCurl.level * 2;
            
            state.randomCurlTimer += dt;
            
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
        
        // Basic size upgrade
        const sizeLevel = state.upgrades.size?.level || 0;
        const legacyLevel = state.upgrades.stoneSize?.level || 0;
        const sizeBonus = Math.max(sizeLevel, legacyLevel) * 8;
        
        // Size penalty from speed upgrade (Hastig Leda)
        const speedLevel = state.upgrades.speed?.level || 0;
        const speedSizePenalty = speedLevel * 3; // -3 radius per level = -10% per level
        
        // Size penalty from sizeShrink pickups
        const sizePenalty = state.sizeShrinkPenalty || 0;
        
        const growthMultiplier = state.growthBoost ? state.growthPowerUpConfig.growthMultiplier : 1;
        return Math.max(10, (baseRadius + sizeBonus - speedSizePenalty - sizePenalty) * growthMultiplier);
    }

    getEffectiveOrbRadius(state, orbType) {
        const config = state.scoringOrbConfig[orbType];
        return config.radius;
    }

    update(state, deltaTime) {
        if (state.phase !== 'moving') return;
        this.updateFrictionBoost(state, deltaTime);
        this.updateSweepBoost(state, deltaTime);
        this.updateGrowthBoost(state, deltaTime);
        this.updateTarBoost(state, deltaTime);
        this.updateRailRider(state, deltaTime);
        this.detectCurlSnap(state, deltaTime);

        const steps = Math.ceil(deltaTime / this.physicsTick);
        const dt = deltaTime / steps;

        for (let i = 0; i < steps; i++) {
            this.physicsStep(state, dt);
        }
    }

    updateTarBoost(state, deltaTime) {
        if (state.tarBoostActive && state.tarBoostTimer > 0) {
            state.tarBoostTimer -= deltaTime;
            if (state.tarBoostTimer <= 0) {
                state.tarBoostActive = false;
                state.tarBoostTimer = 0;
            }
        }
    }

    updateRailRider(state, deltaTime) {
        if (state.rail_rider_cooldown > 0) {
            state.rail_rider_cooldown -= deltaTime;
        }
        if (state.rail_rider_timer > 0) {
            state.rail_rider_timer -= deltaTime;
            if (state.rail_rider_timer <= 0) {
                // Throw stone off wall when rail_rider ends
                if (state.rail_rider_wall && state.phase === 'moving') {
                    const throwSpeed = 8;
                    state.stone.vx = state.rail_rider_wall === 'left' ? throwSpeed : -throwSpeed;
                    state.triggerScreenShake(5, 0.1);
                }
                state.rail_rider_active = false;
                state.rail_rider_wall = null;
            }
        }
    }

    detectCurlSnap(state, deltaTime) {
        const snapCurlLevel = state.upgrades.snap_curl?.level || 0;
        if (snapCurlLevel > 0) {
            const currentDirection = Math.sign(state.stone.angularVelocity);
            if (state.last_rotation_direction !== 0 && currentDirection !== 0 && currentDirection !== state.last_rotation_direction) {
                // Direction changed - apply snap curl bonus
                const curlBonus = 1 + snapCurlLevel;
                state.stone.angularVelocity *= curlBonus;
            }
            state.last_rotation_direction = currentDirection;
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
        
        // Count down grace period for frozen_broom
        if (state.frozen_broom_gracePeriod > 0) {
            state.frozen_broom_gracePeriod -= deltaTime;
        }
        
        state.sweepBoost.timer -= deltaTime;
        if (state.sweepBoost.timer <= 0) {
            // frozen_broom - award bonus if not swept during boost
            if (state.frozen_broom_boost_active && !state.frozen_broom_forfeited && state.upgrades.frozen_broom?.level > 0) {
                state.money += state.frozen_broom_bonus || 0;
                this.addPowerUpText(state, 0, `+$${state.frozen_broom_bonus}!`, '255, 215, 0');
            }
            state.sweepBoost = null;
            state.frozen_broom_boost_active = false;
            state.frozen_broom_bonus = 0;
            state.frozen_broom_gracePeriod = 0;
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
        const curlStrength = this.getEffectiveCurl(state, dt);
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
        this.applyPickupAttraction(state);
        this.checkPowerUps(state, effectiveRadius);
        }

        applyPickupAttraction(state) {
        const eventHorizonLevel = state.upgrades.event_horizon?.level || 0;
        if (eventHorizonLevel === 0) return;

        const eventHorizonRadius = 50 + eventHorizonLevel * 75;
        const eventHorizonStrength = 0.02 + eventHorizonLevel * 0.02;

        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        const stone = state.stone;

        const allPickups = [
            ...(state.powerUps || []),
            ...(state.lifePowerUps || []),
            ...(state.shopPowerUps || []),
            ...(state.sweepPowerUps || []),
            ...(state.rotationPowerUps || []),
            ...(state.superBoostPowerUps || []),
            ...(state.growthPowerUps || []),
            ...(state.curlChaosPickups || []),
            ...(state.sizeShrinkPickups || [])
        ];

        for (const pickup of allPickups) {
            if (pickup.collected) continue;

            const pickupWorldY = pickup.scrollProgress * maxScroll;
            const dy = stone.worldY - pickupWorldY;
            const dx = stone.x - pickup.x;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0 && dist < eventHorizonRadius) {
                const pullX = (dx / dist) * eventHorizonStrength * 60;
                const pullY = (dy / dist) * eventHorizonStrength * 60;
                pickup.x += pullX;
                pickup.scrollProgress += pullY / maxScroll;
            }
        }
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
        this.checkShopPowerUps(state, effectiveRadius);
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

    checkShopPowerUps(state, effectiveRadius) {
        const { stone } = state;
        const config = state.shopPowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        for (const shopPowerUp of state.shopPowerUps) {
            if (shopPowerUp.collected) continue;
            
            const powerUpWorldY = shopPowerUp.scrollProgress * maxScroll;
            const dy = Math.abs(stone.worldY - powerUpWorldY);
            const dx = Math.abs(stone.x - shopPowerUp.x);
            
            const collisionDistance = config.radius + effectiveRadius;
            
            if (dy < collisionDistance && dx < collisionDistance) {
                shopPowerUp.collected = true;
                state.shopUpgradeSelection = null;
                state.rerollCost = 1;
                state.lives++;

                // Start shop transition animation
                state.shopTransition = 'fishZoom';
                state.shopTransitionStartTime = performance.now();
                state.shopTransitionProgress = 0;

                // Storefish position for animation
                const playArea = state.getPlayArea();
                state.shopTransitionFishX = playArea.left + playArea.width / 2 + shopPowerUp.x;
                state.shopTransitionFishY = state.screenHeight * 0.5;

                state.triggerRingFlash(state.shopTransitionFishX, state.shopTransitionFishY, '0, 191, 255');            }
        }
    }

    checkSweepPowerUps(state, effectiveRadius) {
        const { stone } = state;
        const config = state.sweepPowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        // Sweep_life upgrade - convert sweep pickups to lives
        const sweepLifeLevel = state.upgrades.sweep_life?.level || 0;
        
        for (const sweepPowerUp of state.sweepPowerUps) {
            if (sweepPowerUp.collected) continue;
            
            const powerUpWorldY = sweepPowerUp.scrollProgress * maxScroll;
            const dy = Math.abs(stone.worldY - powerUpWorldY);
            const dx = Math.abs(stone.x - sweepPowerUp.x);
            
            const collisionDistance = config.radius + effectiveRadius;
            
            if (dy < collisionDistance && dx < collisionDistance) {
                sweepPowerUp.collected = true;
                
                if (sweepLifeLevel > 0) {
                    // Sweep life upgrade - gives extra life instead of sweep
                    state.lives++;
                    this.addPowerUpText(state, sweepPowerUp.x, '+1 LIV!', '50, 255, 50');
                } else {
                    // Normal sweep boost
                    state.sweepBoost = {
                        timer: config.duration
                    };
                    
                    // frozen_broom - reset tracking when sweep boost starts
                    if (state.upgrades.frozen_broom?.level > 0) {
                        state.frozen_broom_boost_active = true;
                        const bonusAmount = state.upgrades.frozen_broom.level * 5;
                        state.frozen_broom_bonus = bonusAmount;
                        state.frozen_broom_forfeited = false;
                        // Add grace period to avoid forfeiting from finger movement when collecting
                        state.frozen_broom_gracePeriod = 0.5; // 0.5 seconds grace period
                    }
                    
                    this.addPowerUpText(state, sweepPowerUp.x, 'SOPA!', '50, 255, 50');
                }
                
                state.sweepPowerUpCollected = sweepPowerUp;
                state.triggerScreenShake(8, 0.15);
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
                    targetYPx: state.stoneYPx - 90,
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
        
        // cursed_harvest upgrade - increases negative effect
        const cursedHarvestLevel = state.upgrades.cursed_harvest?.level || 0;
        const effectMultiplier = 1 + cursedHarvestLevel;
        
        for (const pickup of state.curlChaosPickups) {
            if (pickup.collected) continue;
            
            const pickupWorldY = pickup.scrollProgress * maxScroll;
            const dy = Math.abs(stone.worldY - pickupWorldY);
            const dx = Math.abs(stone.x - pickup.x);
            
            const collisionDistance = config.radius + effectiveRadius;
            
            if (dy < collisionDistance && dx < collisionDistance) {
                pickup.collected = true;
                const chaosIncrease = 0.1 * effectMultiplier;
                state.curlChaosStrength += chaosIncrease;
                state.curlChaosCollected = pickup;
                this.addPowerUpText(state, pickup.x, `+CURL! x${effectMultiplier}`, '255, 50, 50');
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
        
        // cursed_harvest upgrade - increases negative effect
        const cursedHarvestLevel = state.upgrades.cursed_harvest?.level || 0;
        const effectMultiplier = 1 + cursedHarvestLevel;
        
        for (const pickup of state.sizeShrinkPickups) {
            if (pickup.collected) continue;
            
            const pickupWorldY = pickup.scrollProgress * maxScroll;
            const dy = Math.abs(stone.worldY - pickupWorldY);
            const dx = Math.abs(stone.x - pickup.x);
            
            const collisionDistance = config.radius + effectiveRadius;
            
            if (dy < collisionDistance && dx < collisionDistance) {
                pickup.collected = true;
                const shrinkAmount = 3 * effectMultiplier;
                state.sizeShrinkPenalty += shrinkAmount;
                state.sizeShrinkCollected = pickup;
                this.addPowerUpText(state, pickup.x, `-STORLEK! x${effectMultiplier}`, '200, 50, 255');
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
        
        // Basic magnetism upgrade
        const magnetismLevel = state.upgrades.magnetism?.level || 0;
        const sizeBonusFactor = 1 + ((state.upgrades.size?.level || 0) * 0.2);
        const baseMagnetismRadius = magnetismLevel > 0 ? (50 + magnetismLevel * 50) * sizeBonusFactor : 0;
        
        // Spin_win upgrade - magnetism scales with rotation
        const spinWinLevel = state.upgrades.spin_win?.level || 0;
        const rotationBonus = spinWinLevel > 0 ? Math.abs(stone.angularVelocity) * spinWinLevel * 10 : 0;
        const magnetismRadius = baseMagnetismRadius + rotationBonus;
        
        // Event_horizon upgrade - passive attraction for all pickups
        const eventHorizonLevel = state.upgrades.event_horizon?.level || 0;
        const eventHorizonRadius = eventHorizonLevel > 0 ? 50 + eventHorizonLevel * 75 : 0;
        
        // Combined magnetism strength
        const combinedMagnetism = magnetismLevel > 0 ? (0.05 + magnetismLevel * 0.05) : 0;
        const eventHorizonStrength = eventHorizonLevel > 0 ? (0.02 + eventHorizonLevel * 0.02) : 0;

        for (const orb of state.scoringOrbs) {
            if (orb.collected) continue;
            
            const orbWorldY = orb.scrollProgress * maxScroll;
            const dy = stone.worldY - orbWorldY;
            const dx = stone.x - orb.x;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            const orbRadius = this.getEffectiveOrbRadius(state, orb.type);
            const collisionDistance = orbRadius + effectiveRadius;
            
            if (dist < collisionDistance) {
                this.collectScoringOrb(state, orb);
            } else {
                // Apply magnetism
                let effectiveRadius2 = magnetismRadius;
                let strength = combinedMagnetism;
                
                // Spin_win uses rotation-scaled magnetism
                if (spinWinLevel > 0 && dist < magnetismRadius) {
                    strength = combinedMagnetism * (1 + Math.abs(stone.angularVelocity) * 0.1);
                }
                
                // Coin speed boost increases yellow orb magnetism
                if (orb.type === 'yellow' && state.upgrades.coinSpeedBoost?.level > 0) {
                    strength *= 2;
                }
                
                if (dist < effectiveRadius2 && strength > 0) {
                    const pullX = (dx / dist) * strength * 60;
                    const pullY = (dy / dist) * strength * 60;
                    orb.x += pullX;
                    orb.scrollProgress += pullY / maxScroll;
                }
                
                // Event horizon passive attraction
                if (eventHorizonLevel > 0 && dist < eventHorizonRadius) {
                    const pullX = (dx / dist) * eventHorizonStrength * 60;
                    const pullY = (dy / dist) * eventHorizonStrength * 60;
                    orb.x += pullX;
                    orb.scrollProgress += pullY / maxScroll;
                }
            }
        }
    }

    collectScoringOrb(state, orb) {
        orb.collected = true;
        
        // Track items collected for spin_win penalty
        state.items_collected_this_throw = (state.items_collected_this_throw || 0) + 1;
        
        const now = Date.now();
        const config = state.scoringOrbConfig[orb.type];
        
        // Gold_grift upgrade - convert orbs to money
        const goldGriftLevel = state.upgrades.gold_grift?.level || 0;
        const conversionRate = 0.8 + goldGriftLevel * 0.1;
        
        if (goldGriftLevel > 0 && Math.random() < conversionRate && orb.type !== 'yellow') {
            // Convert to money instead of score
            const moneyValue = orb.type === 'purple' ? 3 : 1;
            state.money += moneyValue;
            
            const playArea = state.getPlayArea();
            const screenX = playArea.left + playArea.width / 2 + orb.x;
            const screenY = state.screenHeight * 0.5;
            
            state.scoreAnimations.push({
                x: screenX,
                y: screenY,
                text: `$${moneyValue}`,
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

        // Explosive Collection Upgrade
        const explosiveLevel = state.upgrades.explosiveCollection?.level || 0;
        if (explosiveLevel > 0 && orb.type === 'purple') {
            // Synergy: Magnetism increases explosion radius
            const magBonus = (state.upgrades.magnetism?.level || 0) * 50;
            const explosionRadius = 150 + explosiveLevel * 100 + magBonus;
            
            state.triggerScreenShake(10, 0.2);
            const playArea = state.getPlayArea();
            state.triggerRingFlash(playArea.left + playArea.width / 2 + orb.x, state.screenHeight * 0.5, '255, 255, 255');
            
            const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
            const orbWorldY = orb.scrollProgress * maxScroll;

            for (const otherOrb of state.scoringOrbs) {
                if (otherOrb.collected) continue;
                const otherWorldY = otherOrb.scrollProgress * maxScroll;
                const dx = orb.x - otherOrb.x;
                const dy = orbWorldY - otherWorldY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < explosionRadius) {
                    this.collectScoringOrb(state, otherOrb);
                }
            }
        }

        // Chain Reaction Upgrade
        const chainLevel = state.upgrades.chainReaction?.level || 0;
        if (chainLevel > 0 && Math.random() < (0.05 + chainLevel * 0.1)) {
            const uncollected = state.scoringOrbs.filter(o => !o.collected);
            if (uncollected.length > 0) {
                const randomOrb = uncollected[Math.floor(Math.random() * uncollected.length)];
                this.collectScoringOrb(state, randomOrb);
            }
        }

        // Yellow orbs give money only
        if (orb.type === 'yellow') {
            state.money += config.money || 1;
            
            // Coin speed boost upgrade
            if (state.upgrades.coinSpeedBoost?.level > 0) {
                const { stone } = state;
                const speed = Math.sqrt(stone.vx ** 2 + stone.vy ** 2);
                const maxVel = this.getMaxVelocity(state);
                if (speed > 0.001) {
                    const boost = state.powerUpConfig.speedBoost * 0.5;
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
        
        // Combo system
        if (timeSinceLastOrb < state.comboTimeout && state.lastOrbTime > 0) {
            state.comboMultiplier = Math.min(state.comboMultiplier + 1, 100);
        } else {
            state.comboMultiplier = 1;
        }
        
        state.lastOrbTime = now;
        
        // Tar launch multiplier for orb value
        const tarMultiplier = state.tarBoostActive ? (1 + (state.upgrades.tar_launch?.level || 0)) : 1;
        
        const loopMultiplier = state.loopCount || 1;
        const basePoints = config.points * loopMultiplier * tarMultiplier;
        const multipliedPoints = basePoints * state.comboMultiplier;
        state.score += multipliedPoints;
        state.recentScore += multipliedPoints;
        
        // Score animation
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
        
        const bounceUpgrade = state.upgrades.bouncyWalls?.level || 0;
        const wallSpeedLevel = state.upgrades.wall_speed?.level || 0;
        const wallPingCoinLevel = state.upgrades.wall_ping_coin?.level || 0;
        const frictionForgeLevel = state.upgrades.friction_forge?.level || 0;
        const spinToSpeedLevel = state.upgrades.spin_to_speed?.level || 0;
        const echoWoodsLevel = state.upgrades.echo_woods?.level || 0;
        const railRiderLevel = state.upgrades.rail_rider?.level || 0;
        const frictionLevel = state.upgrades.friction?.level || 0;
        
        // Glatt Misär - wall bounce speed penalty
        const frictionBouncePenalty = frictionLevel > 0 ? (1 - frictionLevel * 0.1) : 1;
        
        let bounceEnergy = this.wallBounceEnergy;
        
        // BouncyWalls upgrade (legacy)
        if (bounceUpgrade >= 1) {
            bounceEnergy = 1.0;
        }
        if (bounceUpgrade >= 2) {
            bounceEnergy = 1.15;
        }
        
        // Wall_speed handled during bounce below
        
        // Apply Glatt Misär penalty to bounce energy
        bounceEnergy *= frictionBouncePenalty;

        // Check if rail_rider can activate (cooldown ready and upgrade owned)
        // Dimension_door upgrade - Pac-Man style wall wrapping
        const dimensionDoorLevel = state.upgrades.dimension_door?.level || 0;
        if (dimensionDoorLevel > 0) {
            if (stone.x < leftBound) {
                // Wrap from left to right
                stone.x = rightBound;
                this.addPowerUpText(state, stone.x, 'DIMENSIONSDÖRR!', '255, 100, 200');
            } else if (stone.x > rightBound) {
                // Wrap from right to left
                stone.x = leftBound;
                this.addPowerUpText(state, stone.x, 'DIMENSIONSDÖRR!', '255, 100, 200');
            }
        }
        
        const canRailRide = railRiderLevel > 0 && state.rail_rider_cooldown <= 0 && !state.rail_rider_active;
        
        if (stone.x < leftBound) {
            stone.x = leftBound;
            
            // Rail_rider: glide along wall instead of bouncing
            if (canRailRide) {
                state.rail_rider_active = true;
                state.rail_rider_timer = 2 + (railRiderLevel - 1);
                state.rail_rider_cooldown = 10;
                state.rail_rider_wall = 'left';
                stone.vx = 0;
                this.addPowerUpText(state, stone.x, 'TIMMERMANNENS GREPP!', '100, 200, 255');
            } else {
                stone.vx = -stone.vx * bounceEnergy;
                stone.angularVelocity *= 0.5;
            }
        } else if (stone.x > rightBound) {
            stone.x = rightBound;
            
            // Rail_rider: glide along wall instead of bouncing
            if (canRailRide) {
                state.rail_rider_active = true;
                state.rail_rider_timer = 2 + (railRiderLevel - 1);
                state.rail_rider_cooldown = 10;
                state.rail_rider_wall = 'right';
                stone.vx = 0;
                this.addPowerUpText(state, stone.x, 'TIMMERMANNENS GREPP!', '100, 200, 255');
            } else {
                stone.vx = -stone.vx * bounceEnergy;
                stone.angularVelocity *= 0.5;
            }
        }
        
        // Keep stone on wall during rail_rider glide
        if (state.rail_rider_active) {
            if (state.rail_rider_wall === 'left') {
                stone.x = leftBound;
            } else if (state.rail_rider_wall === 'right') {
                stone.x = rightBound;
            }
            // No x-velocity during glide, stone continues forward with vy only
            stone.vx = 0;
        }
        
        const bounced = !state.rail_rider_active && (stone.x <= leftBound || stone.x >= rightBound);
        
        if (bounced) {
            // Wall_ping_coin upgrade - earn money on bounces
            if (wallPingCoinLevel > 0) {
                state.wall_bounces_since_coin = (state.wall_bounces_since_coin || 0) + 1;
                const coinThreshold = wallPingCoinLevel === 1 ? 6 : (wallPingCoinLevel === 2 ? 5 : 4);
                
                if (state.wall_bounces_since_coin >= coinThreshold) {
                    state.money += 1;
                    state.wall_bounces_since_coin = 0;
                    this.addPowerUpText(state, stone.x, `+$1`, '255, 215, 0');
                }
            }
            
            // Friction_forge upgrade - permanent speed bonus but current speed penalty
            if (frictionForgeLevel > 0) {
                const permBonus = frictionForgeLevel * 0.03;
                state.permanentSpeedBonus = (state.permanentSpeedBonus || 0) + permBonus;
                
                const currentPenalty = 0.2 + frictionForgeLevel * 0.05;
                const speed = Math.sqrt(stone.vx ** 2 + stone.vy ** 2);
                if (speed > 0.1) {
                    stone.vx *= (1 - currentPenalty);
                    stone.vy *= (1 - currentPenalty);
                }
            }
            
            // Spin_to_speed upgrade - convert spin to velocity
            if (spinToSpeedLevel > 0) {
                const conversionRate = 0.3 + spinToSpeedLevel * 0.25;
                const spinMagnitude = Math.abs(stone.angularVelocity);
                const speed = Math.sqrt(stone.vx ** 2 + stone.vy ** 2);
                
                if (spinMagnitude > 0.1 && speed > 0.1) {
                    const boost = spinMagnitude * conversionRate;
                    stone.vx += (stone.vx / speed) * boost;
                    stone.vy += (stone.vy / speed) * boost;
                    
                    // Clear or reduce spin based on tier
                    if (spinToSpeedLevel < 3) {
                        stone.angularVelocity = 0;
                    } else {
                        stone.angularVelocity *= 0.3;
                    }
                }
            }
            
            // Echo_woods upgrade - spawn speed pickups on wall hit
            if (echoWoodsLevel > 0) {
                this.spawnEchoPickup(state, stone.x);
            }
            
            // Wall_speed effect
            if (wallSpeedLevel > 0) {
                // 15%, 25%, 40% speed boost
                const boostPercent = wallSpeedLevel === 1 ? 0.15 : (wallSpeedLevel === 2 ? 0.25 : 0.40);
                const speedMultiplier = 1.0 + boostPercent;
                
                stone.vx *= speedMultiplier;
                stone.vy *= speedMultiplier;
                
                // Random direction penalty (for tiers 1 & 2)
                if (wallSpeedLevel < 3) {
                    const randomAngle = (Math.random() - 0.5) * (0.3 - wallSpeedLevel * 0.1);
                    const speed = Math.sqrt(stone.vx ** 2 + stone.vy ** 2);
                    const angle = Math.atan2(stone.vx, stone.vy) + randomAngle;
                    stone.vx = Math.sin(angle) * speed;
                    stone.vy = Math.cos(angle) * speed;
                }
                
                // Clamp to max velocity
                const maxVel = this.getMaxVelocity(state);
                const newSpeed = Math.sqrt(stone.vx ** 2 + stone.vy ** 2);
                if (newSpeed > maxVel) {
                    const scale = maxVel / newSpeed;
                    stone.vx *= scale;
                    stone.vy *= scale;
                }
            }
            
            // Visual effects
            if (bounceUpgrade >= 2 || wallSpeedLevel > 0) {
                state.triggerScreenShake(5, 0.1);
                state.triggerRingFlash(
                    stone.x < leftBound ? playArea.left : playArea.right,
                    state.screenHeight * 0.5,
                    '255, 215, 0'
                );
            }
        }
    }
    
    spawnEchoPickup(state, stoneX) {
        const echoWoodsLevel = state.upgrades.echo_woods?.level || 0;
        const playArea = state.getPlayArea();
        const pickupRadius = 25;
        
        const leftBound = pickupRadius - playArea.width / 2;
        const rightBound = playArea.width / 2 - pickupRadius;
        
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        // Tier 2 spawns 3 pickups, others spawn 1
        const numPickups = echoWoodsLevel === 2 ? 3 : 1;
        
        for (let i = 0; i < numPickups; i++) {
            // Random distance ahead (300 to 600 pixels)
            const distance = 300 + Math.random() * 300;
            // Random angle ahead (-60 to +60 degrees from straight up)
            const angle = (Math.random() - 0.5) * Math.PI * (2/3);
            
            const dx = Math.sin(angle) * distance;
            const dy = Math.cos(angle) * distance;
            
            // New X is stone X + dx, clamped to bounds
            const targetX = stoneX + dx;
            const clampedX = Math.max(leftBound, Math.min(rightBound, targetX));
            
            const forwardOffset = dy / maxScroll;
            
            const pickup = {
                id: `echo-${Date.now()}-${i}`,
                x: clampedX,
                scrollProgress: Math.min(1, state.scrollProgress + forwardOffset),
                collected: false,
                type: echoWoodsLevel >= 3 ? 'super' : 'speed'
            };
            
            if (pickup.type === 'super') {
                state.superBoostPowerUps.push(pickup);
            } else {
                state.powerUps.push(pickup);
            }
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
                        loopText.innerHTML = `Loop #${state.loopCount}<br><span style="font-size: 0.5em; color: #ff5555; display: block; margin-top: 10px;">-10% max hastighet<br>+5% friktion</span>`;
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
                            state.shopUpgradeSelection = null;
                            state.rerollCost = 1;
                            state.lives++;
                            // Start shop transition animation (same as power-up shop)
                            state.shopTransition = 'fishZoom';
                            state.shopTransitionStartTime = performance.now();
                            state.shopTransitionProgress = 0;
                            const playArea = state.getPlayArea();
                            state.shopTransitionFishX = playArea.left + playArea.width / 2;
                            state.shopTransitionFishY = state.screenHeight * 0.5;
                        }, 1250);
                    } else {
                        performReset();
                        state.isLoopTransitioning = false;
                        state.shopUpgradeSelection = null;
                        state.rerollCost = 1;
                        state.lives++;
                        // Start shop transition animation (same as power-up shop)
                        state.shopTransition = 'fishZoom';
                        state.shopTransitionStartTime = performance.now();
                        state.shopTransitionProgress = 0;
                        const playArea = state.getPlayArea();
                        state.shopTransitionFishX = playArea.left + playArea.width / 2;
                        state.shopTransitionFishY = state.screenHeight * 0.5;
                    }
                }
            }
        }
    }

    launch(state, flickPower = 50) {
        const { stone } = state;
        
        state.lives--;
        
        // Reset throw-specific counters
        state.items_collected_this_throw = 0;
        state.wall_bounces_since_coin = state.wall_bounces_since_coin || 0;
        
        // Glass cannon launch power bonus
        const glassCannonLevel = state.upgrades.glass_cannon?.level || 0;
        let launchMultiplier = 1 + (glassCannonLevel * 0.5);
        
        // Tar launch boost (one-time use per throw)
        const tarLevel = state.upgrades.tar_launch?.level || 0;
        if (tarLevel > 0 && !state.tar_launchUsed) {
            launchMultiplier += (1 + tarLevel);
            state.tarBoostActive = true;
            state.tarBoostTimer = 10 + tarLevel * 5;
            state.tar_launchUsed = true;
        }
        
        const maxVel = this.getMaxVelocity(state);
        const speed = (flickPower / 100) * maxVel * launchMultiplier;
        
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
        
        // Reset throw-specific upgrades
        state.tar_launchUsed = false;
        state.tarBoostActive = false;
        state.tarBoostTimer = 0;
        state.items_collected_this_throw = 0;
        
        // Friction_forge permanent bonus carries across throws but resets on gameover
        // (permanentSpeedBonus resets in state.resetGame())
    }

    applySweepBoost(state, intensity) {
        if (state.phase !== 'moving') return;
        
        const { stone } = state;
        const currentSpeed = Math.sqrt(stone.vx * stone.vx + stone.vy * stone.vy);
        const maxVel = this.getMaxVelocity(state);
        
        // frozen_broom - mark as forfeited if sweeping during frozen_broom boost (after grace period)
        if (state.frozen_broom_boost_active && state.upgrades.frozen_broom?.level > 0) {
            if (!state.frozen_broom_gracePeriod || state.frozen_broom_gracePeriod <= 0) {
                state.frozen_broom_forfeited = true;
            }
        }
        
        // sweep_life upgrade - reduce sweep effectiveness
        const sweepLifeLevel = state.upgrades.sweep_life?.level || 0;
        const effectivenessMultiplier = 1 - (sweepLifeLevel * 0.25);
        
        if (currentSpeed > this.stopThreshold) {
            const boost = this.sweepBoost * intensity * effectivenessMultiplier;
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
