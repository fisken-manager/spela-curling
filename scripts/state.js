export const GamePhase = {
    RESTING: 'resting',
    CHARGING: 'charging',
    MOVING: 'moving',
    RETURNING: 'returning'
};

export class GameState {
    constructor() {
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
        
        // Visual positioning
        this.stoneVisualY = 0.85;    // current visual Y (ratio 0-1, where 0 is top)
        this.restY = 0.85;            // rest position (near bottom)
        this.centerY = 0.5;           // position where scrolling starts (center)
        this.transitionDistance = 0.35; // distance from rest to center (0.85 -0.50)
        
        // Visual velocity (for transition animation)
        this.visualVy = 0;
        
        // World Y offset compensation (tracks scroll position)
        this.worldYOffset = 0;
        
        // Input state for slingshot drag
        this.input = {
            isDragging: false,
            dragStartX: 0,
            dragStartY: 0,
            currentDragX: 0,
            currentDragY: 0,
        };
        
        // Oscillating power bar
        this.power = {
            value: 0,
            direction: 1,
            oscillationRate: 80,
        };
        
        this.aimAngle = 0;
        
        // Progress
        this.scrollProgress = 0;  // 0-1
        
        // Transition progress (0-1: 0=at rest, 1=reached center)
        this.transitionProgress = 0;
        this.inScrollZone = false;  // true when stone has reached center
        
        // Screen dimensions
        this.screenWidth = window.innerWidth;
        this.screenHeight = window.innerHeight;
        
        // Play area (constrained width, centered)
        this.playAreaMaxWidth = 480;
        
        // Page dimensions
        this.pageHeight = 0;      // total scrollable height
        
// Power-ups
        this.powerUpConfig = {
            radius: 25,
            speedBoost: 15,
            frictionMultiplier: 0.03,
            boostDuration: 2.5,
            positions: [
                { scrollProgress: 0.03, x: -80 },
                { scrollProgress: 0.08, x: 70 },
                { scrollProgress: 0.13, x: 0 },
                { scrollProgress: 0.18, x: -50 },
                { scrollProgress: 0.23, x: 60 },
                { scrollProgress: 0.28, x: -70 },
                { scrollProgress: 0.33, x: 40 },
                { scrollProgress: 0.38, x: 0 },
                { scrollProgress: 0.43, x: 50 },
                { scrollProgress: 0.48, x: -60 },
                { scrollProgress: 0.53, x: 0 },
                { scrollProgress: 0.58, x: 70 },
                { scrollProgress: 0.63, x: -40 },
                { scrollProgress: 0.68, x: 0 },
                { scrollProgress: 0.73, x: 55 },
                { scrollProgress: 0.78, x: -50 },
                { scrollProgress: 0.83, x: 0 },
                { scrollProgress: 0.88, x: 60 },
                { scrollProgress: 0.93, x: -70 },
            ]
        };
        this.powerUps = [];
        this.frictionBoost = null;
        
        // Lives
        this.lives = 1;
        this.lifePowerUps = [];
        this.lifePowerUpConfig = {
            radius: 25,
            positions: [
                { scrollProgress: 0.10, x: 0 },
                { scrollProgress: 0.35, x: 0 },
                { scrollProgress: 0.60, x: 0 },
                { scrollProgress: 0.85, x: 0 },
            ]
        };
        
        // Sweep power-ups
        this.sweepPowerUps = [];
        this.sweepPowerUpConfig = {
            radius: 25,
            duration: 5,
            positions: [
                { scrollProgress: 0.05, x: -60 },
                { scrollProgress: 0.25, x: 50 },
                { scrollProgress: 0.45, x: 0 },
                { scrollProgress: 0.65, x: -50 },
                { scrollProgress: 0.85, x: 40 },
            ]
        };
        this.sweepBoost = null;
        
        // Rotation power-ups
        this.rotationPowerUps = [];
        this.rotationPowerUpConfig = {
            radius: 25,
            minAngularVelocity: 3,
            maxAngularVelocity: 10,
            positions: [
                { scrollProgress: 0.15, x: 40 },
                { scrollProgress: 0.40, x: -30 },
                { scrollProgress: 0.70, x: 50 },
                { scrollProgress: 0.90, x: -40 },
            ]
        };
        this.powerUps = [];
        this.frictionBoost = null;
        
        // Lives
        this.lives = 1;
        this.lifePowerUps = [];
        this.lifePowerUpConfig = {
            radius: 25,
            positions: [
                { scrollProgress: 0.50, x: 0 },
            ]
        };
        
        // Sweep power-ups
        this.sweepPowerUps = [];
        this.sweepPowerUpConfig = {
            radius: 25,
            duration: 5,
            positions: [
                { scrollProgress: 0.25,x: -60 },
                { scrollProgress: 0.55, x: 50 },
                { scrollProgress: 0.80, x: 0 },
            ]
        };
        this.sweepBoost = null;
        
// Rotation power-ups
        this.rotationPowerUps = [];
        this.rotationPowerUpConfig = {
            radius: 25,
            minAngularVelocity: 3,
            maxAngularVelocity: 10,
            positions: [
                { scrollProgress: 0.20, x: 40 },
                { scrollProgress: 0.70, x: -30 },
            ]
        };

        // Super boost power-up
        this.superBoostPowerUps = [];
        this.superBoostPowerUpConfig = {
            radius: 30,
            speedBoost: 30,
            frictionMultiplier: 0.03,
            duration: 5,
            positions: [
                { scrollProgress: 0.50, x: 0 },
            ]
        };
        this.superBoostCollected = null;
        this.superBoostImageEffect = null;
        
        // Scoring system
        this.score = 0;
        this.gameOver = false;
        this.scoringOrbs = [];
        this.scoringOrbConfig = {
            green: { radius: 15, points: 25 },
            purple: { radius: 18, points: 100 }
        };
        
        // Combo system
        this.comboMultiplier = 1;
        this.lastOrbTime = 0;
        this.comboTimeout = 500;
        this.recentScore = 0;
        this.scoreAnimations = [];
    }
    
    initPowerUps() {
        this.powerUps = this.powerUpConfig.positions.map((pos, index) => ({
            id: `powerup-${index}`,
            x: pos.x,
            scrollProgress: pos.scrollProgress,
            collected: false
        }));
        this.lifePowerUps = this.lifePowerUpConfig.positions.map((pos, index) => ({
            id: `life-${index}`,
            x: pos.x,
            scrollProgress: pos.scrollProgress,
            collected: false
        }));
        this.sweepPowerUps = this.sweepPowerUpConfig.positions.map((pos, index) => ({
            id: `sweep-${index}`,
            x: pos.x,
            scrollProgress: pos.scrollProgress,
            collected: false
        }));
        this.rotationPowerUps = this.rotationPowerUpConfig.positions.map((pos, index) => ({
            id: `rotation-${index}`,
            x: pos.x,
            scrollProgress: pos.scrollProgress,
            collected: false
        }));
        this.superBoostPowerUps = this.superBoostPowerUpConfig.positions.map((pos, index) => ({
            id: `super-${index}`,
            x: pos.x,
            scrollProgress: pos.scrollProgress,
            collected: false
        }));
    }
    
    initScoringOrbs() {
        this.scoringOrbs = [];
        const maxScroll = Math.max(1, this.pageHeight - this.screenHeight);
        if (maxScroll <= 0) return;
        
        const segmentSize = 1000;
        const startOffset = 1000;
        const numSegments = Math.floor(maxScroll / segmentSize);
        
        let orbId = 0;
        
        for (let i = 0; i < numSegments; i++) {
            const baseProgress = (i * segmentSize + startOffset) / maxScroll;
            
            if (baseProgress > 1) continue;
            
            const seed = Math.floor(this.pageHeight + i * 1000);
            
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
            
            const progressOffset = random(groupSeed + 2) * 0.3;
            const orbProgress = baseProgress + progressOffset;
            
            if (orbProgress <= 1) {
                const centerX = (random(groupSeed + 3) - 0.5) * 160;
                
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
            const numPurples = Math.floor(random(seed + 500) * 2);
            
            for (let p = 0; p < numPurples; p++) {
                const purpleSeed = seed + 1000 + p * 50;
                const progressOffset = 0.1 + random(purpleSeed) * 0.3 + p * 0.25;
                const orbProgress = baseProgress + progressOffset;
                
                if (orbProgress > 1) continue;
                
                const orbX = (random(purpleSeed + 1) - 0.5) * 160;
                
                this.scoringOrbs.push({
                    id: `orb-${orbId++}`,
                    type: 'purple',
                    x: orbX,
                    scrollProgress: orbProgress,
                    collected: false
                });
            }
        }
    }
    
    generatePatternOrbs(pattern, count, centerX, baseProgress) {
        const orbs = [];
        const spacing = 0.003;
        
        switch (pattern) {
            case 'arcLeft':
                for (let i = 0; i < count; i++) {
                    const angle = (Math.PI * 0.3) + (i / (count - 1 || 1)) * (Math.PI * 0.4);
                    orbs.push({
                        x: centerX - Math.cos(angle) * 40,
                        scrollProgress: baseProgress - (count / 2 - i) * spacing
                    });
                }
                break;
            case 'arcRight':
                for (let i = 0; i < count; i++) {
                    const angle = (Math.PI * 0.3) + (i / (count - 1 || 1)) * (Math.PI * 0.4);
                    orbs.push({
                        x: centerX + Math.cos(angle) * 40,
                        scrollProgress: baseProgress - (count / 2 - i) * spacing
                    });
                }
                break;
            case 'diamond':
                const diamondPositions = [
                    { x: 0, y: 0 },
                    { x: -30, y: -1 },
                    { x: 30, y: -1 },
                    { x: -30, y: 1 },
                    { x: 30, y: 1 }
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
                    { x: -25, y: -1 },
                    { x: 25, y: -1 },
                    { x: -25, y: 1 },
                    { x: 25, y: 1 }
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
    
    resetGame() {
        this.lives = 1;
        this.frictionBoost = null;
        this.sweepBoost = null;
        this.score = 0;
        this.gameOver = false;
        this.comboMultiplier = 1;
        this.lastOrbTime = 0;
        this.recentScore = 0;
        this.scoreAnimations = [];
        for (const powerUp of this.powerUps) {
            powerUp.collected = false;
        }
        for (const lifePowerUp of this.lifePowerUps) {
            lifePowerUp.collected = false;
        }
        for (const sweepPowerUp of this.sweepPowerUps) {
            sweepPowerUp.collected = false;
        }
        for (const rotationPowerUp of this.rotationPowerUps) {
            rotationPowerUp.collected = false;
        }
        for (const superBoostPowerUp of this.superBoostPowerUps) {
            superBoostPowerUp.collected = false;
        }
        this.phase = 'resting';
        this.stone.x = 0;
        this.stone.worldY = 0;
        this.stone.vx = 0;
        this.stone.vy = 0;
        this.stone.angularVelocity = 0;
        this.stone.rotation = 0;
        this.scrollProgress = 0;
        this.power = { value: 0, direction: 1, oscillationRate: 80 };
        this.aimAngle = 0;
        this.input = { isDragging: false, dragStartX: 0, dragStartY: 0, currentDragX: 0, currentDragY: 0 };
        this.stoneVisualY = this.restY;
        this.transitionProgress = 0;
        this.inScrollZone = false;
    }

    getPlayArea() {
        const width = Math.min(this.screenWidth, this.playAreaMaxWidth);
        const left = (this.screenWidth - width) / 2;
        return { left, right: left + width, width };
    }

    updateScreenDimensions() {
        this.screenWidth = window.innerWidth;
        this.screenHeight = window.innerHeight;
    }

triggerScreenShake(intensity, duration) {
        this.screenShake = { intensity, duration, timer: duration };
    }

triggerRingFlash(x, y, color) {
        this.ringFlash = { x, y, color, radius: 0, maxRadius: 200, duration: 0.4, timer: 0.4 };
    }
}