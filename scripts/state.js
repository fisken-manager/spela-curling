export const GamePhase = {
    RESTING: 'resting',
    CHARGING: 'charging',
    MOVING: 'moving',
    RETURNING: 'returning'
};

export class GameState {
    constructor() {
        this.isPaused = false;
        this.phase = GamePhase.RESTING;
        
        // Stone state
        this.stone = {
            x: 0,              // horizontal position (screen space)
            worldY: 0,         // vertical position (world space - for scroll)
            vx: 0,            // velocity x
            vy: 0,             // velocity y (positive=upward in world)
            radius: 30,
            angularVelocity: 0,  // ω in radians/second
            rotation: 0,         // accumulated rotation angle (for rendering)
            mass: 19.96,         // kg (standard curling stone)
        };
        
        // Visual positioning - PIXEL BASED
        this.restOffsetPx = 80;    // Avstånd från botten i pixlar (för att hamna nära hog-linjen)
        this.stoneYPx = 0;         // Kommer beräknas
        this.centerXYPx = 0;       
        
        // Input state for flick throw
        this.input = {
            isDragging: false,
            dragStartX: 0,
            dragStartYPx: 0,
            stoneStartX: 0,
            stoneStartYPx: 0,
            flickHistory: [], 
            snapBackProgress: 0, 
            isSnapping: false
        };
        
        this.aimAngle = 0;
        
        // Progress
        this.scrollProgress = 0;  
        
        // Transition progress (0-1: 0=at rest, 1=reached center)
        this.transitionProgress = 0;
        this.inScrollZone = false;  
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        this.isDevMode = isLocalhost && new URLSearchParams(window.location.search).get('dev') === 'true';

        // Screen dimensions        this.screenWidth = window.innerWidth;
        this.screenHeight = window.innerHeight;
        
        // Play area (constrained width, centered)
        this.playAreaMaxWidth = 480;

        // Initialize pixel-based positions
        this.updateScreenDimensions();
        
        // Page dimensions
        this.pageHeight = 0;      // total scrollable height
        
        // Loop State
        this.loopCount = 1;
        this.isLoopTransitioning = false;
        
// Power-ups
        this.powerUpConfig = {
            radius: 25,
            speedBoost: 15,
            frictionMultiplier: 0.03,
            boostDuration: 2.5
        };
        this.powerUps = [];
        this.frictionBoost = null;
        
        // Lives
        this.lives = 1;
        this.lifeCost = 10;
        this.lifePowerUps = [];
        this.lifePowerUpConfig = {
            radius: 25
        };
        
        // Shop power-ups
        this.shopPowerUps = [];
        this.shopPowerUpCollected = null;
        this.shopPowerUpConfig = {
            radius: 28
        };
        
        // Sweep power-ups
        this.sweepPowerUps = [];
        this.sweepPowerUpConfig = {
            radius: 25,
            duration: 5
        };
        this.sweepBoost = null;
        
        // Rotation power-ups
        this.rotationPowerUps = [];
        this.rotationPowerUpConfig = {
            radius: 25,
            minAngularVelocity: 3,
            maxAngularVelocity: 10
        };
        
        // Super boost power-up
        this.superBoostPowerUps = [];
        this.superBoostPowerUpConfig = {
            radius: 30,
            speedBoost: 30,
            frictionMultiplier: 0.03,
            maxVelocityMultiplier: 1.5,
            duration: 5
        };
        this.superBoostCollected = null;
        this.superBoostImageEffect = null;
        
        // Scoring system
        this.score = 0;
        this.money = 5;
        this.gameOver = false;
        this.scoringOrbs = [];
        this.scoringOrbConfig = {
            green: { radius: 8, points: 25 },
            purple: { radius: 9, points: 100 },
            yellow: { radius: 12, money: 1 }
        };
        
        // Combo system
        this.comboMultiplier = 1;
        this.lastOrbTime = 0;
        this.comboTimeout = 500;
        this.recentScore = 0;
        this.scoreAnimations = [];
        this.lastScore = 0;
        this.scoreJumpAnimation = null;

        // Buy menu
        this.showBuyMenu = false;
        this.shopUpgradeSelection = null;
        this.rerollCost = 1;

        // Shop transition animation
        this.shopTransition = null;              // 'fishZoom' | 'waifuAppear' | 'shopFade' | null
        this.shopTransitionProgress = 0;         // 0-1
        this.shopTransitionStartTime = 0;
        this.shopTransitionFishX = 0;            // Screen X where fish was collected
        this.shopTransitionFishY = 0;            // Screen Y where fish was collected

        // Upgrades (all reset on new game)
        this.upgrades = {
            // Basic
            speed: { level: 0 },
            friction: { level: 0 },
            size: { level: 0 },
            magnetism: { level: 0 },
            // Corrupted
            spin_win: { level: 0 },
            gold_grift: { level: 0 },
            glass_cannon: { level: 0 },
            wall_speed: { level: 0 },
            friction_forge: { level: 0 },
            spin_to_speed: { level: 0 },
            // Technical
            rail_rider: { level: 0 },
            echo_woods: { level: 0 },
            event_horizon: { level: 0 },
            snap_curl: { level: 0 },
            wall_ping_coin: { level: 0 },
            double_shops: { level: 0 },
            // High Risk
            tar_launch: { level: 0 },
            sweep_life: { level: 0 },
            frozen_broom: { level: 0 },
            cursed_harvest: { level: 0 },
            herrings_last_dance: { level: 0 },
            // Technical - New
            needle_eye: { level: 0 },
            dimension_door: { level: 0 },
            // Deprecated (kept for saves)
            maxVelocity: { level: 0 },
            frictionReduction: { level: 0 },
            stoneSize: { level: 0 },
            randomCurl: { level: 0 },
            noNegativePickups: { level: 0 },
            coinSpeedBoost: { level: 0 },
            explosiveCollection: { level: 0 },
            bouncyWalls: { level: 0 },
            chainReaction: { level: 0 },
        };

        // Upgrade effect tracking
        this.permanentSpeedBonus = 0;
        this.tar_launchUsed = false;
        this.tarBoostActive = false;
        this.tarBoostTimer = 0;
        this.items_collected_this_throw = 0;
        this.wall_bounces_since_coin = 0;
        this.last_rotation_direction = 0;
        this.rail_rider_cooldown = 0;
        this.rail_rider_active = false;
        this.rail_rider_timer = 0;
        this.rail_rider_wall = null;
        // frozen_broom tracking
        this.frozen_broom_boost_active = false;
        this.frozen_broom_bonus = 0;
        this.frozen_broom_forfeited = false;
        this.frozen_broom_gracePeriod = 0;

        // Coin speed boost
        this.coinSpeedBoostActive = false;
        this.coinSpeedBoostTimer = 0;

        // Random curl timer
        this.randomCurlTimer = 0;

        // Stone Growth powerup
        this.growthPowerUps = [];
        this.growthPowerUpConfig = {
            radius: 25,
            duration: 5,
            growthMultiplier: 1.3
        };
        this.growthBoost = null;

        // Powerdown pickups
        this.curlChaosPickups = [];
        this.curlChaosConfig = {
            radius: 25
        };

        this.sizeShrinkPickups = [];
        this.sizeShrinkConfig = {
            radius: 25
        };
    }
    
    generateItems(type, baseSeed, pixelSpacing, xRange, minPixelOffset = 0) {
        const items = [];
        const maxScroll = Math.max(1, this.pageHeight - this.screenHeight);
        if (maxScroll <= 0 || pixelSpacing <= 0) return items;
        
        const startOffsetPx = Math.max(10, minPixelOffset);
        const availableScroll = Math.max(0, maxScroll - startOffsetPx);
        let targetCount = Math.floor(availableScroll / pixelSpacing);
        
        if (targetCount <= 0) return items;
        
        const segmentSize = availableScroll / targetCount;
        let itemId = 0;
        
        const random = (s) => {
            const x = Math.sin(s) * 10000;
            return x - Math.floor(x);
        };
        
        const loopSeed = Math.floor(baseSeed + (this.loopCount || 1) * 100000);
        
        for (let i = 0; i < targetCount; i++) {
            const itemSeed = loopSeed + i * 1000;
            const baseProgress = (startOffsetPx + i * segmentSize) / maxScroll;
            
            // Randomize position within this segment
            const progressOffset = random(itemSeed) * (segmentSize / maxScroll);
            let itemProgress = baseProgress + progressOffset;
            
            // Keep away from absolute bottom
            if (itemProgress > 0.98) itemProgress = 0.98;
            
            const itemX = (random(itemSeed + 1) - 0.5) * xRange;
            
            items.push({
                id: `${type}-${itemId++}`,
                x: itemX,
                scrollProgress: itemProgress,
                collected: false
            });
        }
        return items;
    }

    convertPowerupsToSweepAndSuper() {
        const sweeps = [];
        const supers = [];
        this.powerUps = this.powerUps.filter((pickup, index) => {
            const num = index + 1;
            if (num % 15 === 0) {
                pickup.id = pickup.id.replace('powerup-', 'super-');
                supers.push(pickup);
                return false;
            }
            if (num % 10 === 0) {
                pickup.id = pickup.id.replace('powerup-', 'sweep-');
                sweeps.push(pickup);
                return false;
            }
            return true;
        });
        this.sweepPowerUps.push(...sweeps);
        this.superBoostPowerUps.push(...supers);
    }

    positionSweepNearEdges() {
        const random = (s) => {
            const x = Math.sin(s) * 10000;
            return x - Math.floor(x);
        };
        
        const edgeMargin = 30;
        const edgeWidth = 80;
        
        for (let i = 0; i < this.sweepPowerUps.length; i++) {
            const pickup = this.sweepPowerUps[i];
            const seed = parseInt(pickup.id.split('-')[1]);
            const side = random(seed) <0.5?-1 : 1;
            const offset = edgeMargin + random(seed + 1) * edgeWidth;
            pickup.x = side * offset;
        }
    }

    enforcePickupProximity() {
        const maxAttempts = 50; // Increased attempts
        const minDistance = 200;
        const verticalTolerance = 300; // Increased vertical buffer
        
        const random = (s) => {
            const x = Math.sin(s) * 10000;
            return x - Math.floor(x);
        };
        
        const pickupTypes = [
            { items: this.powerUps, xRange: 160 },
            { items: this.lifePowerUps, xRange: 100 },
            { items: this.shopPowerUps, xRange: 100 },
            { items: this.sweepPowerUps, xRange: 120 },
            { items: this.rotationPowerUps, xRange: 370 },
            { items: this.superBoostPowerUps, xRange: 100 },
            { items: this.growthPowerUps, xRange: 100 },
            // Only include negative pickups if noNegativePickups is NOT purchased
            ...(this.upgrades.noNegativePickups.level > 0 ? [] : [
                { items: this.curlChaosPickups, xRange: 90 },
                { items: this.sizeShrinkPickups, xRange: 110 }
            ])
        ];
        
        const allPlaced = [];
        
        for (const type of pickupTypes) {
            for (let i = 0; i < type.items.length; i++) {
                const item = type.items[i];
                let attempts = 0;
                
                while (attempts < maxAttempts) {
                    let tooClose = false;
                    
                    for (const existing of allPlaced) {
                        const verticalDistance = Math.abs(item.scrollProgress - existing.scrollProgress) * this.pageHeight;
                        const horizontalDistance = Math.abs(item.x - existing.x);
                        
                        if (verticalDistance < verticalTolerance && horizontalDistance < minDistance) {
                            tooClose = true;
                            break;
                        }
                    }
                    
                    if (!tooClose) break;
                    
                    item.x = (random(parseInt(item.id.split('-')[1]) + attempts * 1000 + 500) - 0.5) * type.xRange;
                    attempts++;
                }
                
                allPlaced.push(item);
            }
        }
    }

initPowerUps() {
        const tuning = this.debugGenTuning || {};
        let powerup = tuning.powerup ?? 1400;
        const life = tuning.life ?? 40000;
        let shop = tuning.shop ?? 80000;
        const rotation = tuning.rotation ?? 3000;
        const growth = tuning.growth ?? 8000;
        const curlChaos = tuning.curlChaos ?? 13500;
        const sizeShrink = tuning.sizeShrink ?? 19000;

        // glass_cannon upgrade reduces speed pickups
        const glassCannonLevel = this.upgrades.glass_cannon?.level || 0;
        const speedReduction = glassCannonLevel > 0 ? 1 / (1.25 + glassCannonLevel * 0.25) : 1;
        powerup = Math.floor(powerup / speedReduction);

        // double_shops upgrade increases shop spawns
        const doubleShopsLevel = this.upgrades.double_shops?.level || 0;
        const shopMultiplier = doubleShopsLevel > 0 ? (1 + doubleShopsLevel) : 1;
        shop = Math.floor(shop / shopMultiplier);

        // spin_to_speed - no speed pickups
        if (this.upgrades.spin_to_speed?.level > 0) {
            this.powerUps = [];
        } else {
            this.powerUps = this.generateItems('powerup', 100, powerup, 160);
        }
        this.lifePowerUps = this.generateItems('life', 200, life, 100);
        this.shopPowerUps = this.generateItems('shop', 900, shop, 100, 5000);
        this.rotationPowerUps = this.generateItems('rotation', 400, rotation, 400);
        this.superBoostPowerUps = [];
        this.growthPowerUps = this.generateItems('growth', 600, growth, 100);
        
        if (this.upgrades.noNegativePickups?.level > 0) {
            this.curlChaosPickups = [];
            this.sizeShrinkPickups = [];
        } else {
            this.curlChaosPickups = this.generateItems('curlChaos', 700, curlChaos, 90);
            this.sizeShrinkPickups = this.generateItems('sizeShrink', 800, sizeShrink, 110);
        }
        
        // Apply coinSpeedBoost tier 2: remove speed pickups, 2x coins
        if (this.upgrades.coinSpeedBoost?.level >= 2) {
            this.powerUps = [];
        }
        
        this.convertPowerupsToSweepAndSuper();
        this.positionSweepNearEdges();
        this.enforcePickupProximity();
    }
    
    initScoringOrbs() {
        this.scoringOrbs = [];
        const maxScroll = Math.max(1, this.pageHeight - this.screenHeight);
        if (maxScroll <= 0) return;
        
        // Apply coinSpeedBoost tier 2: 2x spawn rate
        const coinBoostTier2 = this.upgrades.coinSpeedBoost?.level >= 2;
        const segmentSize = coinBoostTier2 ? 167 : 333; // 3x baseline, 2x with tier 2
        
        // Scale offsets to segment size so coins distribute evenly
        const progressOffsetScale = segmentSize / maxScroll;
        
        const startOffset = 800;
        const numSegments = Math.floor((maxScroll - startOffset) / segmentSize);
        
        let orbId = 0;
        
        for (let i = 0; i < numSegments; i++) {
            const baseProgress = (startOffset + i * segmentSize) / maxScroll;
            
            if (baseProgress > 1) continue;
            
            const seed = Math.floor(this.pageHeight + i * 1000 + (this.loopCount || 1) * 100000);
            
            const random = (s) => {
                const x = Math.sin(s) * 10000;
                return x - Math.floor(x);
            };
            
            // 1 green group per segment
            const groupSeed = seed + 1;
            const patternIndex = Math.floor(random(groupSeed) * 5);
            const patterns = ['arcLeft', 'arcRight', 'diamond', 'vertical', 'box'];
            const pattern = patterns[patternIndex];
            
            const countRange = { min: 3, max: 5 };
            const count = countRange.min + Math.floor(random(groupSeed + 1) * (countRange.max - countRange.min + 1));
            
            const progressOffset = random(groupSeed + 2) * 3 * progressOffsetScale;
            const orbProgress = baseProgress + progressOffset;
            
            if (orbProgress <= 1 && random(groupSeed + 4) < 0.2) {
                const centerX = (random(groupSeed + 3) - 0.5) * 320;
                
                const orbs = this.generatePatternOrbs(pattern, count, centerX, orbProgress);
                for (const orb of orbs) {
                    this.scoringOrbs.push({
                        id: `orb-${orbId++}`,
                        type: 'green',
                        x: orb.x,
                        scrollProgress: orb.scrollProgress,
                        collected: false
                    });
                }
            }
            
            // 0-1 purple per segment
            const numPurples = random(seed + 499) < 0.2 ? Math.floor(random(seed + 500) * 2) : 0;
            
            for (let p = 0; p < numPurples; p++) {
                const purpleSeed = seed + 1000 + p * 50;
                const progressOffset = progressOffsetScale + random(purpleSeed) * 3 * progressOffsetScale + p * 2.5 * progressOffsetScale;
                const orbProgress = baseProgress + progressOffset;
                
                if (orbProgress > 1) continue;
                
                const orbX = (random(purpleSeed + 1) - 0.5) * 320;
                
                this.scoringOrbs.push({
                    id: `orb-${orbId++}`,
                    type: 'purple',
                    x: orbX,
                    scrollProgress: orbProgress,
                    collected: false
                });
            }
            
            // Yellow orbs at wall edges (80% chance per segment)
            if (random(seed + 2000) < (0.8 / 3)) {
                const yellowSeed = seed + 3000;
const progressOffset = random(yellowSeed) * 5 * progressOffsetScale;
            const orbProgress = baseProgress + progressOffset;
                
                if (orbProgress <= 1) {
                    const wallOffset = 180;
                    const onLeftWall = random(yellowSeed + 1) < 0.5;
                    const orbX = onLeftWall ? -wallOffset : wallOffset;
                    
                    this.scoringOrbs.push({
                        id: `orb-${orbId++}`,
                        type: 'yellow',
                        x: orbX,
                        scrollProgress: orbProgress,
                        collected: false
                    });
                }
            }
        }
    }
    
    generatePatternOrbs(pattern, count, centerX, baseProgress) {
        const orbs = [];
        const spacing = 0.006; // Double the vertical spacing
        
        switch (pattern) {
            case 'arcLeft':
                for (let i = 0; i < count; i++) {
                    const angle = (Math.PI * 0.3) + (i / (count - 1 || 1)) * (Math.PI * 0.4);
                    orbs.push({
                        x: centerX - Math.cos(angle) * 80,
                        scrollProgress: baseProgress - (count / 2 - i) * spacing
                    });
                }
                break;
            case 'arcRight':
                for (let i = 0; i < count; i++) {
                    const angle = (Math.PI * 0.3) + (i / (count - 1 || 1)) * (Math.PI * 0.4);
                    orbs.push({
                        x: centerX + Math.cos(angle) * 80,
                        scrollProgress: baseProgress - (count / 2 - i) * spacing
                    });
                }
                break;
            case 'diamond':
                const diamondPositions = [
                    { x: 0, y: 0 },
                    { x: -60, y: -2 },
                    { x: 60, y: -2 },
                    { x: -60, y: 2 },
                    { x: 60, y: 2 }
                ];
                for (const pos of diamondPositions) {
                    orbs.push({
                        x: centerX + pos.x,
                        scrollProgress: baseProgress + pos.y * spacing
                    });
                }
                break;
            case 'vertical':
                for (let i = 0; i < count; i++) {
                    orbs.push({
                        x: centerX,
                        scrollProgress: baseProgress - (count / 2 - i) * spacing
                    });
                }
                break;
            case 'box':
                const boxPositions = [
                    { x: -50, y: -2 },
                    { x: 50, y: -2 },
                    { x: -50, y: 2 },
                    { x: 50, y: 2 }
                ];
                for (const pos of boxPositions) {
                    orbs.push({
                        x: centerX + pos.x,
                        scrollProgress: baseProgress + pos.y * spacing
                    });
                }
                break;
        }
        return orbs;
    }
    
    resetForNewThrow() {
        this.frictionBoost = null;
        this.sweepBoost = null;
    }
    
    formatScore(score) {
        if (score < 1000000000) return Math.floor(score).toString();
        const parts = score.toExponential(3).split('e+');
        return `${parts[0]}e${parts[1]}`;
    }

    resetGame() {
        this.lives = 1;
        this.lifeCost = 10;
        this.frictionBoost = null;
        this.sweepBoost = null;
        this.growthBoost = null;
        this.score = 0;
        this.money = 5;
        this.gameOver = false;
        this.comboMultiplier = 1;
        this.lastOrbTime = 0;
        this.recentScore = 0;
        this.scoreAnimations = [];
        this.lastScore = 0;
        this.scoreJumpAnimation = null;
        this.loopCount = 1;
        this.isLoopTransitioning = false;

        // Reset buy menu
        this.showBuyMenu = false;
        this.shopUpgradeSelection = null;
        this.rerollCost = 1;
        this.shopTransition = null;
        this.shopTransitionProgress = 0;

        // Reset upgrades
        for (const key of Object.keys(this.upgrades)) {
            this.upgrades[key].level = 0;
        }

        // Reset powerdown effects
        this.curlChaosStrength = 0;
        this.sizeShrinkPenalty = 0;

        // Reset upgrade tracking
        this.permanentSpeedBonus = 0;
        this.tar_launchUsed = false;
        this.tarBoostActive = false;
        this.tarBoostTimer = 0;
        this.items_collected_this_throw = 0;
        this.wall_bounces_since_coin = 0;
        this.last_rotation_direction = 0;
        this.rail_rider_cooldown = 0;
        this.rail_rider_active = false;
        this.rail_rider_timer = 0;
        this.rail_rider_wall = null;
        this.frozen_broom_boost_active = false;
        this.frozen_broom_bonus = 0;
        this.frozen_broom_forfeited = false;
        this.frozen_broom_gracePeriod = 0;

        this.phase = 'resting';
        this.stone.x = 0;
        this.stone.worldY = 0;
        this.stone.vx = 0;
        this.stone.vy = 0;
        this.stone.angularVelocity = 0;
        this.stone.rotation = 0;
        this.scrollProgress = 0;
        this.input = { isDragging: false, dragStartX: 0, dragStartYPx: 0, stoneStartX: 0, stoneStartYPx: 0, flickHistory: [], snapBackProgress: 0, isSnapping: false };
        this.stoneYPx = this.screenHeight - this.restOffsetPx;
        this.transitionProgress = 0;
        this.inScrollZone = false;  
        this.isDevMode = new URLSearchParams(window.location.search).get('dev') === 'true';
        }
    getPlayArea() {
        const width = Math.min(this.screenWidth, this.playAreaMaxWidth);
        const left = (this.screenWidth - width) / 2;
        return { left, right: left + width, width };
    }

    updateScreenDimensions() {
        this.screenWidth = window.innerWidth;
        this.screenHeight = window.innerHeight;
        
        // Calculate stone Y position in pixels (fixed offset from bottom)
        this.stoneYPx = this.screenHeight - this.restOffsetPx;
        
        // Center Y position (for scrolling)
        this.centerXYPx = this.screenHeight / 2;
        
        // Calculate visual Y for compatibility (0-1 ratio)
        this.stoneVisualY = this.stoneYPx / this.screenHeight;
        
        // Update transition distance
        this.transitionDistance = this.stoneYPx / this.screenHeight - 0.5;
    }

triggerScreenShake(intensity, duration) {
        this.screenShake = { intensity, duration, timer: duration };
    }

triggerRingFlash(x, y, color) {
        this.ringFlash = { x, y, color, radius: 0, maxRadius: 60, duration: 0.2, timer: 0.2 };
    }
}
