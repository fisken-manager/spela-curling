export class Physics {
    constructor() {
        this.physicsTick = 0.001;
        this.baseMaxVelocity = 21;
        this.wallBounceEnergy = 0.8;
        this.sweepBoost = 1.5;
        this.stopThreshold = 0.1;
        
        this.baseFriction = 1.6;
        this.baseCurlStrength = 0.2;
        this.angularDecayFactor = 0.15;
        
        this.minAngularVelocity = -10;
        this.maxAngularVelocity = 10;
    }

    getStoneEffectiveWorldY(state) {
        return state.stone.worldY - (state.stoneYPx - state.screenHeight * 0.5);
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
            maxVel *= (1 - sizeLevel * 0.01);
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

        // Sillens Sista Dans - +50% max velocity at 0 lives, -50% at 1+ lives
        const herringsDanceLevel = state.upgrades.herrings_last_dance?.level || 0;
        if (herringsDanceLevel > 0) {
            if (state.lives === 0) {
                maxVel *= 1.5; // +50% when at death's door
            } else {
                maxVel *= 0.5; // -50% when safe
            }
        }

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

    update(state, deltaTime, audio = null) {
        if (state.phase !== 'moving') return;
        this.updateFrictionBoost(state, deltaTime);
        this.updateSweepBoost(state, deltaTime, audio);
        this.updateGrowthBoost(state, deltaTime);
        this.updateTarBoost(state, deltaTime);
        this.updateRailRider(state, deltaTime);
        this.detectCurlSnap(state, deltaTime);

        const steps = Math.ceil(deltaTime / this.physicsTick);
        const dt = deltaTime / steps;

        for (let i = 0; i < steps; i++) {
            this.physicsStep(state, dt, audio);
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

    updateSweepBoost(state, deltaTime, audio = null) {
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
            
            // Trigger sweep end audio effect
            if (audio && audio.triggerAudioEffect) {
                audio.triggerAudioEffect('sweepEnd', {
                    upgradeId: 'sweep_life'
                });
            }
            
            state.sweepBoost = null;
            state.frozen_broom_boost_active = false;
            state.frozen_broom_bonus = 0;
            state.frozen_broom_gracePeriod = 0;
        }
    }

    physicsStep(state, dt, audio = null) {
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
        
        // Spindelns Väv - center pull force (very gentle)
        const spidersWebLevel = state.upgrades.spiders_web?.level || 0;
        if (spidersWebLevel > 0) {
            const pullStrength = spidersWebLevel === 1 ? 0.001 : (spidersWebLevel === 2 ? 0.002 : 0.004);
            const centerPull = -stone.x * pullStrength * dt * 60;
            stone.vx += centerPull;
        }
        
        // Spin_win increases rotation decay
        const spinWinLevel = state.upgrades.spin_win?.level || 0;
        const decayMultiplier = 1 + spinWinLevel * 0.4;
        stone.angularVelocity -= stone.angularVelocity * this.baseFriction * dt * this.angularDecayFactor * decayMultiplier;
        if (Math.abs(stone.angularVelocity) < 0.01) stone.angularVelocity = 0;
        
        const effectiveRadius = this.getEffectiveRadius(state);
        stone.x += stone.vx * dt * 60;
        stone.rotation += stone.angularVelocity * dt;
        
        this.handleBounds(state, effectiveRadius, audio);
        this.updateWorldPosition(state, dt);
        this.applyPickupAttraction(state);
        this.checkPowerUps(state, effectiveRadius, audio);
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
            // Only include negative pickups if cleanse is NOT active
            ...(state.upgrades.cleanse?.level > 0 ? [] : state.curlChaosPickups || []),
            ...(state.upgrades.cleanse?.level > 0 ? [] : state.sizeShrinkPickups || [])
        ];

        for (const pickup of allPickups) {
            if (pickup.collected) continue;

            const pickupWorldY = pickup.scrollProgress * maxScroll;
            const effectiveWorldY = this.getStoneEffectiveWorldY(state);
            const dy = effectiveWorldY - pickupWorldY;
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

    applyMagnetismToPickup(state, pickup, objectRadius, maxScroll, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength) {
        if (magnetismRadius <= 0 && eventHorizonRadius <= 0) return;
        if (combinedMagnetism <= 0 && eventHorizonStrength <= 0) return;

        const { stone } = state;
        const pickupWorldY = pickup.scrollProgress * maxScroll;
        const dy = stone.worldY - pickupWorldY;
        const dx = stone.x - pickup.x;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= 0) return;

        // Weight based on area: π × r². Scale relative to green orb (r=8, area=64π)
        const weightScale = 64 / (objectRadius * objectRadius);

        // Magnetism + spin_win pull
        if (combinedMagnetism > 0) {
            const effRadius = magnetismRadius * weightScale;
            const effStrength = combinedMagnetism * weightScale;
            if (dist < effRadius && effStrength > 0) {
                pickup.x += (dx / dist) * effStrength * 60;
                pickup.scrollProgress += (dy / dist) * effStrength * 60 / maxScroll;
            }
        }

        // Event horizon pull (same weight-based scaling)
        if (eventHorizonRadius > 0) {
            const effRadius = eventHorizonRadius * weightScale;
            const effStrength = eventHorizonStrength * weightScale;
            if (dist < effRadius && effStrength > 0) {
                pickup.x += (dx / dist) * effStrength * 60;
                pickup.scrollProgress += (dy / dist) * effStrength * 60 / maxScroll;
            }
        }
    }

    checkPowerUps(state, effectiveRadius, audio = null) {
        const { stone } = state;
        const config = state.powerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);

        // Pre-compute magnetism values for all pickups
        const magnetismLevel = state.upgrades.magnetism?.level || 0;
        const sizeBonusFactor = 1 + ((state.upgrades.size?.level || 0) * 0.2);
        const baseMagnetismRadius = magnetismLevel > 0 ? (50 + magnetismLevel * 50) * sizeBonusFactor : 0;
        const magnetismStrength = magnetismLevel > 0 ? (0.05 + magnetismLevel * 0.05) : 0;

        const spinWinLevel = state.upgrades.spin_win?.level || 0;
        const spin = Math.abs(stone.angularVelocity);
        const spinWinScale = spinWinLevel > 0 ? Math.min(1, spin / 10) : 0;
        const spinWinStrength = spinWinLevel > 0 ? (0.1 * spinWinLevel) * spinWinScale : 0;
        const spinWinRadius = spinWinLevel > 0 ? (50 + spinWinLevel * 50) * sizeBonusFactor * (1 + spin * spinWinLevel * 0.5) : 0;

        const eventHorizonLevel = state.upgrades.event_horizon?.level || 0;
        const eventHorizonRadius = eventHorizonLevel > 0 ? 50 + eventHorizonLevel * 75 : 0;
        const eventHorizonStrength = eventHorizonLevel > 0 ? (0.02 + eventHorizonLevel * 0.02) : 0;

        const combinedMagnetism = magnetismStrength + spinWinStrength;
        const magnetismRadius = baseMagnetismRadius + spinWinRadius;

        for (const powerUp of state.powerUps) {
            if (powerUp.collected) continue;

            const powerUpWorldY = powerUp.scrollProgress * maxScroll;
            const effectiveWorldY = this.getStoneEffectiveWorldY(state);
            const dy = Math.abs(effectiveWorldY - powerUpWorldY);
            const dx = Math.abs(stone.x - powerUp.x);

            const collisionDistance = config.radius + effectiveRadius;

            if (dy < collisionDistance && dx < collisionDistance) {
                this.collectPowerUp(state, powerUp, effectiveRadius);
            } else {
                this.applyMagnetismToPickup(state, powerUp, config.radius, maxScroll, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength);
            }
        }

        this.checkLifePowerUps(state, effectiveRadius, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength);
        this.checkShopPowerUps(state, effectiveRadius, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength);
        this.checkSweepPowerUps(state, effectiveRadius, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength, audio);
        this.checkRotationPowerUps(state, effectiveRadius, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength);
        this.checkSuperBoostPowerUps(state, effectiveRadius, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength);
        this.checkScoringOrbs(state, effectiveRadius, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength, audio);
        this.checkGrowthPowerUps(state, effectiveRadius, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength);
        this.checkCurlChaosPickups(state, effectiveRadius, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength);
        this.checkSizeShrinkPickups(state, effectiveRadius, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength);
    }

    checkLifePowerUps(state, effectiveRadius, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength) {
        const { stone } = state;
        const config = state.lifePowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        for (const lifePowerUp of state.lifePowerUps) {
            if (lifePowerUp.collected) continue;
            
            const powerUpWorldY = lifePowerUp.scrollProgress * maxScroll;
            const effectiveWorldY = this.getStoneEffectiveWorldY(state);
            const dy = Math.abs(effectiveWorldY - powerUpWorldY);
            const dx = Math.abs(stone.x - lifePowerUp.x);
            
            const collisionDistance = config.radius + effectiveRadius;
            
            if (dy < collisionDistance && dx < collisionDistance) {
                lifePowerUp.collected = true;
                const oldMaxVel = this.getMaxVelocity(state);
                state.lives++;
                const newMaxVel = this.getMaxVelocity(state);
                const currentSpeed = Math.sqrt(stone.vx ** 2 + stone.vy ** 2);
                if (currentSpeed > 0.001 && oldMaxVel > 0) {
                    const scale = newMaxVel / oldMaxVel;
                    stone.vx *= scale;
                    stone.vy *= scale;
                }
                state.lifePowerUpCollected = lifePowerUp;
                
                this.addPowerUpText(state, lifePowerUp.x, '+1 LIV!', '255, 50, 50');
                
                const playArea = state.getPlayArea();
                const screenX = playArea.left + playArea.width / 2 + lifePowerUp.x;
                const screenY = state.stoneYPx;
                state.triggerRingFlash(screenX, screenY, '255, 50, 50');
            } else {
                this.applyMagnetismToPickup(state, lifePowerUp, config.radius, maxScroll, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength);
            }
        }
    }

    checkShopPowerUps(state, effectiveRadius, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength) {
        const { stone } = state;
        const config = state.shopPowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        for (const shopPowerUp of state.shopPowerUps) {
            if (shopPowerUp.collected) continue;
            
            const powerUpWorldY = shopPowerUp.scrollProgress * maxScroll;
            const effectiveWorldY = this.getStoneEffectiveWorldY(state);
            const dy = Math.abs(effectiveWorldY - powerUpWorldY);
            const dx = Math.abs(stone.x - shopPowerUp.x);
            
            const collisionDistance = config.radius + effectiveRadius;
            
            if (dy < collisionDistance && dx < collisionDistance) {
                shopPowerUp.collected = true;
                state.shopUpgradeSelection = null;
                state.rerollCost = 1;
                const oldMaxVel = this.getMaxVelocity(state);
                state.lives++;
                const newMaxVel = this.getMaxVelocity(state);
                const currentSpeed = Math.sqrt(stone.vx ** 2 + stone.vy ** 2);
                if (currentSpeed > 0.001 && oldMaxVel > 0) {
                    const scale = newMaxVel / oldMaxVel;
                    stone.vx *= scale;
                    stone.vy *= scale;
                }

                // Start shop transition animation
                state.shopTransition = 'fishZoom';
                state.shopTransitionStartTime = performance.now();
                state.shopTransitionProgress = 0;

                // Storefish position for animation
                const playArea = state.getPlayArea();
                state.shopTransitionFishX = playArea.left + playArea.width / 2 + shopPowerUp.x;
                state.shopTransitionFishY = state.stoneYPx;

                state.triggerRingFlash(state.shopTransitionFishX, state.shopTransitionFishY, '0, 191, 255');
            } else {
                this.applyMagnetismToPickup(state, shopPowerUp, config.radius, maxScroll, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength);
            }
        }
    }

    checkSweepPowerUps(state, effectiveRadius, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength, audio = null) {
        const { stone } = state;
        const config = state.sweepPowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        // Sweep_life upgrade - convert sweep pickups to lives
        const sweepLifeLevel = state.upgrades.sweep_life?.level || 0;
        
        for (const sweepPowerUp of state.sweepPowerUps) {
            if (sweepPowerUp.collected) continue;
            
            const powerUpWorldY = sweepPowerUp.scrollProgress * maxScroll;
            const effectiveWorldY = this.getStoneEffectiveWorldY(state);
            const dy = Math.abs(effectiveWorldY - powerUpWorldY);
            const dx = Math.abs(stone.x - sweepPowerUp.x);
            
            const collisionDistance = config.radius + effectiveRadius;
            
            if (dy < collisionDistance && dx < collisionDistance) {
                sweepPowerUp.collected = true;
                
                if (sweepLifeLevel > 0) {
                    // Sweep life upgrade - gives extra life instead of sweep
                    const oldMaxVel = this.getMaxVelocity(state);
                    state.lives++;
                    const newMaxVel = this.getMaxVelocity(state);
                    const currentSpeed = Math.sqrt(stone.vx ** 2 + stone.vy ** 2);
                    if (currentSpeed > 0.001 && oldMaxVel > 0) {
                        const scale = newMaxVel / oldMaxVel;
                        stone.vx *= scale;
                        stone.vy *= scale;
                    }
                    this.addPowerUpText(state, sweepPowerUp.x, '+1 LIV!', '50, 255, 50');
                } else {
                    // Normal sweep boost
                    state.sweepBoost = {
                        timer: config.duration
                    };
                    
                    // Trigger sweep start audio effect
                    if (audio && audio.triggerAudioEffect) {
                        audio.triggerAudioEffect('sweepStart', {
                            upgradeId: 'sweep_life'
                        });
                    }
                    
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
            } else {
                this.applyMagnetismToPickup(state, sweepPowerUp, config.radius, maxScroll, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength);
            }
        }
    }

    checkRotationPowerUps(state, effectiveRadius, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength) {
        const { stone } = state;
        const config = state.rotationPowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        for (const rotationPowerUp of state.rotationPowerUps) {
            if (rotationPowerUp.collected) continue;
            
            const powerUpWorldY = rotationPowerUp.scrollProgress * maxScroll;
            const effectiveWorldY = this.getStoneEffectiveWorldY(state);
            const dy = Math.abs(effectiveWorldY - powerUpWorldY);
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
            } else {
                this.applyMagnetismToPickup(state, rotationPowerUp, config.radius, maxScroll, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength);
            }
        }
    }

    checkSuperBoostPowerUps(state, effectiveRadius, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength) {
        const { stone } = state;
        const config = state.superBoostPowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);

        for (const superBoostPowerUp of state.superBoostPowerUps) {
            if (superBoostPowerUp.collected) continue;

            const powerUpWorldY = superBoostPowerUp.scrollProgress * maxScroll;
            const effectiveWorldY = this.getStoneEffectiveWorldY(state);
            const dy = Math.abs(effectiveWorldY - powerUpWorldY);
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
            } else {
                this.applyMagnetismToPickup(state, superBoostPowerUp, config.radius, maxScroll, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength);
            }
        }
    }

    checkGrowthPowerUps(state, effectiveRadius, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength) {
        const { stone } = state;
        const config = state.growthPowerUpConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        for (const growthPowerUp of state.growthPowerUps) {
            if (growthPowerUp.collected) continue;
            
            const powerUpWorldY = growthPowerUp.scrollProgress * maxScroll;
            const effectiveWorldY = this.getStoneEffectiveWorldY(state);
            const dy = Math.abs(effectiveWorldY - powerUpWorldY);
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
                    state.stoneYPx,
                    '72, 187, 120'
                );
            } else {
                this.applyMagnetismToPickup(state, growthPowerUp, config.radius, maxScroll, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength);
            }
        }
    }

    checkCurlChaosPickups(state, effectiveRadius, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength) {
        // Skip if cleanse upgrade is active
        if (state.upgrades.cleanse?.level > 0) return;
        
        const { stone } = state;
        const config = state.curlChaosConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        // cursed_harvest upgrade - increases negative effect
        const cursedHarvestLevel = state.upgrades.cursed_harvest?.level || 0;
        const effectMultiplier = 1 + cursedHarvestLevel;
        
        for (const pickup of state.curlChaosPickups) {
            if (pickup.collected) continue;
            
            const pickupWorldY = pickup.scrollProgress * maxScroll;
            const effectiveWorldY = this.getStoneEffectiveWorldY(state);
            const dy = Math.abs(effectiveWorldY - pickupWorldY);
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
                    state.stoneYPx,
                    '255, 50, 50'
                );
            } else {
                this.applyMagnetismToPickup(state, pickup, config.radius, maxScroll, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength);
            }
        }
    }

    checkSizeShrinkPickups(state, effectiveRadius, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength) {
        // Skip if cleanse upgrade is active
        if (state.upgrades.cleanse?.level > 0) return;
        
        const { stone } = state;
        const config = state.sizeShrinkConfig;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);
        
        // cursed_harvest upgrade - increases negative effect
        const cursedHarvestLevel = state.upgrades.cursed_harvest?.level || 0;
        const effectMultiplier = 1 + cursedHarvestLevel;
        
        for (const pickup of state.sizeShrinkPickups) {
            if (pickup.collected) continue;
            
            const pickupWorldY = pickup.scrollProgress * maxScroll;
            const effectiveWorldY = this.getStoneEffectiveWorldY(state);
            const dy = Math.abs(effectiveWorldY - pickupWorldY);
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
                    state.stoneYPx,
                    '200, 50, 255'
                );
            } else {
                this.applyMagnetismToPickup(state, pickup, config.radius, maxScroll, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength);
            }
        }
    }

    checkScoringOrbs(state, effectiveRadius, magnetismRadius, combinedMagnetism, eventHorizonRadius, eventHorizonStrength, audio = null) {
        const { stone } = state;
        const maxScroll = Math.max(1, state.pageHeight - state.screenHeight);

        const coinSpeedBoostLevel = state.upgrades.coinSpeedBoost?.level || 0;

        for (const orb of state.scoringOrbs) {
            if (orb.collected) continue;

            const orbWorldY = orb.scrollProgress * maxScroll;
            const effectiveWorldY = this.getStoneEffectiveWorldY(state);
            const dy = effectiveWorldY - orbWorldY;
            const dx = stone.x - orb.x;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const orbRadius = this.getEffectiveOrbRadius(state, orb.type);
            const collisionDistance = orbRadius + effectiveRadius;

            if (dist < collisionDistance) {
                this.collectScoringOrb(state, orb, audio);
            } else {
                // Coin speed boost doubles magnetism for yellow orbs
                const orbMagnetism = (orb.type === 'yellow' && coinSpeedBoostLevel > 0) ? combinedMagnetism * 2 : combinedMagnetism;
                this.applyMagnetismToPickup(state, orb, orbRadius, maxScroll, magnetismRadius, orbMagnetism, eventHorizonRadius, eventHorizonStrength);
            }
        }
    }

    collectScoringOrb(state, orb, audio = null) {
        orb.collected = true;
        
        // Track items collected for spin_win penalty
        state.items_collected_this_throw = (state.items_collected_this_throw || 0) + 1;
        
        const now = Date.now();
        const config = state.scoringOrbConfig[orb.type];
        
        // Trigger coin collect audio effect for yellow orbs
        if (orb.type === 'yellow' && audio && audio.triggerAudioEffect) {
            audio.triggerAudioEffect('coinCollect', {
                amount: config.money || 1,
                combo: state.comboMultiplier || 1,
                upgradeId: 'gold_grift'
            });
        }
        
        // Gold_grift upgrade - convert orbs to money
        const goldGriftLevel = state.upgrades.gold_grift?.level || 0;
        const conversionRate = 0.8 + goldGriftLevel * 0.1;
        
        if (goldGriftLevel > 0 && Math.random() < conversionRate && orb.type !== 'yellow') {
            // Convert to money instead of score
            const moneyValue = orb.type === 'purple' ? 3 : 1;
            state.money += moneyValue;
            
            const playArea = state.getPlayArea();
            const screenX = playArea.left + playArea.width / 2 + orb.x;
            const screenY = state.stoneYPx;
            
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
            state.triggerRingFlash(playArea.left + playArea.width / 2 + orb.x, state.stoneYPx, '255, 255, 255');
            
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
            const screenY = state.stoneYPx;
            
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
        const screenY = state.stoneYPx;
        
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
        const screenY = state.stoneYPx;
        
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

    handleBounds(state, effectiveRadius, audio = null) {
        const { stone } = state;
        const playArea = state.getPlayArea();
        const speed = Math.sqrt(stone.vx * stone.vx + stone.vy * stone.vy);
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
        // This happens FIRST and skips all other wall interactions
        const dimensionDoorLevel = state.upgrades.dimension_door?.level || 0;
        if (dimensionDoorLevel > 0) {
            if (stone.x < leftBound) {
                // Wrap from left to right
                stone.x = rightBound;
                // Trigger dimension door audio effect
                if (audio && audio.triggerAudioEffect) {
                    audio.triggerAudioEffect('dimensionDoor', {
                        upgradeId: 'dimension_door'
                    });
                }
                return; // Skip all other wall handling
            } else if (stone.x > rightBound) {
                // Wrap from right to left
                stone.x = leftBound;
                // Trigger dimension door audio effect
                if (audio && audio.triggerAudioEffect) {
                    audio.triggerAudioEffect('dimensionDoor', {
                        upgradeId: 'dimension_door'
                    });
                }
                return; // Skip all other wall handling
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
                // Spindelns Väv - make bounce shallower (more toward walls), same speed
                const spidersWebLevel = state.upgrades.spiders_web?.level || 0;
                if (spidersWebLevel > 0) {
                    const angleMultiplier = spidersWebLevel === 1 ? 1.30 : (spidersWebLevel === 2 ? 1.60 : 2.00);
                    // Flip vx normally
                    stone.vx = -stone.vx * bounceEnergy;
                    // Reduce vy to make angle shallower (more horizontal toward walls)
                    stone.vy = stone.vy * bounceEnergy / angleMultiplier;
                } else {
                    stone.vx = -stone.vx * bounceEnergy;
                }
                stone.angularVelocity *= 0.5;
                
                // Trigger wall bounce audio effect
                if (audio && audio.triggerAudioEffect) {
                    audio.triggerAudioEffect('wallBounce', {
                        velocity: speed,
                        wallSpeedLevel: wallSpeedLevel,
                        dimensionDoorActive: dimensionDoorLevel > 0,
                        upgradeId: 'wall_speed'
                    });
                }
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
                // Spindelns Väv - make bounce shallower (more toward walls), same speed
                const spidersWebLevel = state.upgrades.spiders_web?.level || 0;
                if (spidersWebLevel > 0) {
                    const angleMultiplier = spidersWebLevel === 1 ? 1.30 : (spidersWebLevel === 2 ? 1.60 : 2.00);
                    // Flip vx normally
                    stone.vx = -stone.vx * bounceEnergy;
                    // Reduce vy to make angle shallower (more horizontal toward walls)
                    stone.vy = stone.vy * bounceEnergy / angleMultiplier;
                } else {
                    stone.vx = -stone.vx * bounceEnergy;
                }
                stone.angularVelocity *= 0.5;
                
                // Trigger wall bounce audio effect
                if (audio && audio.triggerAudioEffect) {
                    audio.triggerAudioEffect('wallBounce', {
                        velocity: speed,
                        wallSpeedLevel: wallSpeedLevel,
                        dimensionDoorActive: dimensionDoorLevel > 0,
                        upgradeId: 'wall_speed'
                    });
                }
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
                // +3% per bounce, capped by tier
                const maxBonus = frictionForgeLevel === 1 ? 2.0 : (frictionForgeLevel === 2 ? 4.0 : 6.0);
                state.permanentSpeedBonus = (state.permanentSpeedBonus || 0);
                if (state.permanentSpeedBonus < maxBonus) {
                    state.permanentSpeedBonus = Math.min(state.permanentSpeedBonus + 0.03, maxBonus);
                }
                
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
                    state.stoneYPx,
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
                            const oldMaxVel = this.getMaxVelocity(state);
                            state.lives++;
                            const newMaxVel = this.getMaxVelocity(state);
                            const currentSpeed = Math.sqrt(stone.vx ** 2 + stone.vy ** 2);
                            if (currentSpeed > 0.001 && oldMaxVel > 0) {
                                const scale = newMaxVel / oldMaxVel;
                                stone.vx *= scale;
                                stone.vy *= scale;
                            }
                            // Start shop transition animation (same as power-up shop)
                            state.shopTransition = 'fishZoom';
                            state.shopTransitionStartTime = performance.now();
                            state.shopTransitionProgress = 0;
                            const playArea = state.getPlayArea();
                            state.shopTransitionFishX = playArea.left + playArea.width / 2;
                            state.shopTransitionFishY = state.stoneYPx;
                        }, 1250);
                    } else {
                        performReset();
                        state.isLoopTransitioning = false;
                        state.shopUpgradeSelection = null;
                        state.rerollCost = 1;
                        const oldMaxVel = this.getMaxVelocity(state);
                        state.lives++;
                        const newMaxVel = this.getMaxVelocity(state);
                        const currentSpeed = Math.sqrt(stone.vx ** 2 + stone.vy ** 2);
                        if (currentSpeed > 0.001 && oldMaxVel > 0) {
                            const scale = newMaxVel / oldMaxVel;
                            stone.vx *= scale;
                            stone.vy *= scale;
                        }
                        // Start shop transition animation (same as power-up shop)
                        state.shopTransition = 'fishZoom';
                        state.shopTransitionStartTime = performance.now();
                        state.shopTransitionProgress = 0;
                        const playArea = state.getPlayArea();
                        state.shopTransitionFishX = playArea.left + playArea.width / 2;
                        state.shopTransitionFishY = state.stoneYPx;
                    }
                }
            }
        }
    }

    launch(state, flickPower = 50, audio = null) {
        const { stone } = state;
        
        state.lives--;
        
        // Trigger herrings_last_dance audio effect when at 0 lives
        if (state.lives === 0 && state.upgrades.herrings_last_dance?.level > 0) {
            if (audio && audio.triggerAudioEffect) {
                audio.triggerAudioEffect('herringsLastDance', {
                    upgradeId: 'herrings_last_dance',
                    duration: 999 // Long duration
                });
            }
        }
        
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
            
            // Trigger tar boost audio effect
            if (audio && audio.triggerAudioEffect) {
                audio.triggerAudioEffect('tarBoost', {
                    upgradeId: 'tar_launch',
                    duration: 10 + tarLevel * 5
                });
            }
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
