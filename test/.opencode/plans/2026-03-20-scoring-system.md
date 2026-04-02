# Scoring System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add scoring to the curling game with distance-based points, collectible scoring orbs (green/purple), and a game over screen with restart functionality.

**Architecture:** Score accumulates from distance traveled (world units) plus collecting orbs. Orbs are deterministically placed using seeded random based on content length. Game over shows final score and restart button.

**Tech Stack:** Vanilla JS, Canvas 2D rendering, existing game architecture (GameState, Physics, Renderer modules).

---

### Task 1: Add Score State to GameState

**Files:**
- Modify: `scripts/state.js`

**Step 1: Add score properties to constructor**

Add after `this.superBoostImageEffect = null;` (around line 193):

```javascript
// Scoring system
this.score = 0;
this.gameOver = false;
this.scoringOrbs = [];
this.scoringOrbConfig = {
    green: { radius: 15, points: 25 },
    purple: { radius: 18, points: 100 }
};
```

**Step 2: Reset score in resetGame()**

In `resetGame()` method, add after `this.sweepBoost = null;`:

```javascript
this.score = 0;
this.gameOver = false;
```

**Step 3: Add initScoringOrbs() method**

Add new method after `initPowerUps()`:

```javascript
initScoringOrbs() {
    this.scoringOrbs = [];
    const maxScroll = Math.max(1, this.pageHeight - this.screenHeight);
    if (maxScroll <= 0) return;
    
    const segmentSize = 500;
    const numSegments = Math.floor(maxScroll / segmentSize);
    
    let orbId = 0;
    
    for (let i = 0; i < numSegments; i++) {
        const baseProgress = (i * segmentSize) / maxScroll;
        const seed = Math.floor(this.pageHeight + i * 1000);
        
        // Seeded random helper
        const random = (s) => {
            const x = Math.sin(s) * 10000;
            return x - Math.floor(x);
        };
        
        // 2-3 green groups per segment
        const numGreenGroups = 2 + Math.floor(random(seed) * 2);
        
        for (let g = 0; g < numGreenGroups; g++) {
            const groupSeed = seed + g * 100 + 1;
            const patternIndex = Math.floor(random(groupSeed) * 5);
            const patterns = ['arcLeft', 'arcRight', 'diamond', 'vertical', 'box'];
            const pattern = patterns[patternIndex];
            
            const countRange = { min: 3, max: 5 };
            const count = countRange.min + Math.floor(random(groupSeed + 1) * (countRange.max - countRange.min + 1));
            
            const progressOffset = (random(groupSeed + 2) * 0.3 + g * 0.15);
            const orbProgress = baseProgress + progressOffset;
            
            if (orbProgress > 1) continue;
            
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
        
        // 1-2 single purple orbs per segment
        const numPurples = 1 + Math.floor(random(seed + 500) * 2);
        
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
    const spacing = 0.003; // scroll progress spacing
    
    switch (pattern) {
        case 'arcLeft':
            for (let i =0; i < count; i++) {
                const angle = (Math.PI * 0.3) + (i / (count - 1 || 1)) * (Math.PI * 0.4);
                orbs.push({
                    x: centerX - Math.cos(angle) * 40,
                    scrollProgress: baseProgress - (count / 2 - i) * spacing
                });
            }
            break;
        case 'arcRight':
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 0.3) + (i / (count -1 || 1)) * (Math.PI * 0.4);
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
```

**Step 4: Update init() to call initScoringOrbs()**

In `init()` function in `game.js`, add after `state.initPowerUps();`:

```javascript
state.initScoringOrbs();
```

**Step 5: Commit**

```bash
git add scripts/state.js scripts/game.js
git commit -m "feat: add scoring state and deterministic orb generation"
```

---

### Task 2: Add Distance Scoring to Physics

**Files:**
- Modify: `scripts/physics.js`

**Step 1: Add score accumulation in physicsStep()**

In `physicsStep()` method, after the speed calculation and before the stop threshold check, add:

```javascript
// Accumulate distance score
if (state.inScrollZone) {
    state.score += Math.abs(stone.vy * dt * 60);
}
```

Find the line `const speed = Math.sqrt(stone.vx * stone.vx + stone.vy * stone.vy);` (around line 61) and add the scoring logic after it.

**Step 2: Add checkScoringOrbs() method**

Add after the `checkSuperBoostPowerUps()` method:

```javascript
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
        
        if (dy< collisionDistance && dx < collisionDistance) {
            this.collectScoringOrb(state, orb);
        }
    }
}

collectScoringOrb(state, orb) {
    orb.collected = true;
    state.score += state.scoringOrbConfig[orb.type].points;
    state.scoringOrbCollected = orb;
    
    const playArea = state.getPlayArea();
    const screenX = playArea.left + playArea.width / 2 + orb.x;
    const screenY = state.screenHeight * 0.5;
    
    const color = orb.type === 'purple' ? '147, 122, 234' : '72, 187, 120';
    state.triggerRingFlash(screenX, screenY, color);
}
```

**Step 3: Call checkScoringOrbs in physicsStep()**

In `physicsStep()`, after `this.checkSuperBoostPowerUps(state);`, add:

```javascript
this.checkScoringOrbs(state);
```

**Step 4: Reset orbs on game loop**

In `updateWorldPosition()`, find where power-ups are reset when scroll loops (around line 330-344). Add after the superBoostPowerUps reset:

```javascript
for (const orb of state.scoringOrbs) {
    orb.collected = false;
}
```

**Step 5: Commit**

```bash
git add scripts/physics.js
git commit -m "feat: add distance scoring and orb collision detection"
```

---

### Task 3: Render Scoring Orbs

**Files:**
- Modify: `scripts/renderer.js`

**Step 1: Add drawScoringOrbs() method**

Add after `drawSuperBoostPowerUps()` method:

```javascript
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
    const count = orb.type === 'purple'? 25 : 15;
    
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
```

**Step 2: Call drawScoringOrbs in render()**

In `render()` method, add after `this.drawSuperBoostPowerUps(state);`:

```javascript
this.drawScoringOrbs(state);
```

**Step 3: Commit**

```bash
git add scripts/renderer.js
git commit -m "feat: render scoring orbs with particle effects"
```

---

### Task 4: Add Game Over Screen HTML

**Files:**
- Modify: `index.html`

**Step 1: Add game over overlay**

Add after `</div>` that closes `#content` (before the script tag):

```html
    <div id="game-over" class="hidden">
        <div class="game-over-content">
            <div class="game-over-title">Game Over</div>
            <div class="final-score">0</div>
            <button id="restart-btn">Play Again</button>
        </div>
    </div>
```

**Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add game over overlay HTML"
```

---

### Task 5: Add Game Over Screen CSS

**Files:**
- Modify: `styles/main.css`

**Step 1: Add game over styles**

Add at the end of the file:

```css
#game-over {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

#game-over.hidden {
    display: none;
}

.game-over-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
}

.game-over-title {
    font-size: 2.5rem;
    color: #a0aec0;
    text-transform: uppercase;
    letter-spacing: 0.3em;
}

.final-score {
    font-size: 6rem;
    font-weight: bold;
    color: #48bb78;
    text-shadow: 0 0 30px rgba(72, 187, 120, 0.8);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

#restart-btn {
    padding: 15px 40px;
    font-size: 1.5rem;
    background: #48bb78;
    color: #fff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    transition: transform 0.2s, background 0.2s, box-shadow 0.2s;
}

#restart-btn:hover {
    background: #38a169;
    transform: scale(1.05);
    box-shadow: 0 4px 15px rgba(72, 187, 120, 0.4);
}

#restart-btn:active {
    transform: scale(0.98);
}
```

**Step 2: Commit**

```bash
git add styles/main.css
git commit -m "feat: add game over screen styles"
```

---

### Task 6: Wire Up Game Over Logic

**Files:**
- Modify: `scripts/transition.js`
- Modify: `scripts/game.js`

**Step 1: Set gameOver flag in transition.js**

In `update()` method, find the `if (t >= 1)` block (around line 53). Modify the lives check:

```javascript
if (state.lives <= 0) {
    state.gameOver = true;
    state.phase = 'returning';
    state.stoneVisualY = state.restY;
} else {
    state.phase = 'resting';
    state.stoneVisualY = state.restY;
}
```

Replace the existing if-else block that handles `state.lives <= 0`:

```javascript
if (t >= 1) {
    this.isActive = false;
    state.transitionProgress = 0;
    state.inScrollZone = false;
    state.powerUpCollected = null;
    state.lifePowerUpCollected = null;
    state.resetForNewThrow();
    
    if (state.lives <= 0) {
        state.gameOver = true;
        state.phase = 'returning';
        state.stoneVisualY = state.restY;
    } else {
        state.phase = 'resting';
        state.stoneVisualY = state.restY;
    }
}
```

**Step 2: Add UI handling in game.js**

In the `init()` function, after `setupControls();`, add:

```javascript
setupGameOverUI();
```

Add new function after `setupControls()`:

```javascript
function setupGameOverUI() {
    const restartBtn = document.getElementById('restart-btn');
    const gameOverOverlay = document.getElementById('game-over');
    const finalScoreEl = document.querySelector('.final-score');
    
    restartBtn.addEventListener('click', () => {
        state.resetGame();
        state.initPowerUps();
        state.initScoringOrbs();
        gameOverOverlay.classList.add('hidden');
    });
    
    // Update score display in game loop
    const originalRender = renderer.render.bind(renderer);
    renderer.render = (state, deltaTime) => {
        originalRender(state, deltaTime);
        updateScoreDisplay(state);
        checkGameOver(state, gameOverOverlay, finalScoreEl);
    };
}

function updateScoreDisplay(state) {
    // Score is displayed in renderer debug area for now
    // Will be shown on game over screen
}

function checkGameOver(state, overlay, scoreEl) {
    if (state.gameOver) {
        overlay.classList.remove('hidden');
        scoreEl.textContent = Math.floor(state.score);
    }
}
```

**Step 3: Commit**

```bash
git add scripts/transition.js scripts/game.js
git commit -m "feat: wire up game over screen with restart button"
```

---

### Task 7: Add HUD Score Display

**Files:**
- Modify: `scripts/renderer.js`

**Step 1: Add score display in drawPowerUps()**

In `drawPowerUps()` method, find the debug text rendering and add score display. After the existing debug text lines, add:

```javascript
this.ctx.fillStyle = 'white';
this.ctx.font = 'bold 20px Arial';
this.ctx.textAlign = 'right';
this.ctx.fillText(`Score: ${Math.floor(state.score)}`, state.screenWidth - 20, 30);
```

Find the existing debug text in drawPowerUps and modify to include score. After line 348 (`this.ctx.fillText('lives: ${state.lives}', 10, 50);`), add:

```javascript
this.ctx.fillStyle = '#48bb78';
this.ctx.font = 'bold 24px Arial';
this.ctx.textAlign = 'center';
this.ctx.fillText(`Score: ${Math.floor(state.score)}`, state.screenWidth / 2, 40);
```

**Step 2: Commit**

```bash
git add scripts/renderer.js
git commit -m "feat: add score display to HUD"
```

---

### Task 8: Final Integration and Testing

**Step 1: Run the game**

Open `index.html` in browser and verify:
1. Score accumulates when stone moves
2. Green and purple orbs appear in patterns
3. Collecting orbs adds score and shows particles
4. Game over screen appears when lives run out
5. Restart button resets game and hides overlay

**Step 2: Fix any bugs found**

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete scoring system with orbs and game over"
```

---

## Summary

| Task | Files | Description |
|------|-------|-------------|
| 1 | state.js, game.js | Score state and orb generation |
| 2 | physics.js | Distance scoring and orb collision |
| 3 | renderer.js | Render scoring orbs |
| 4 | index.html | Game over overlay HTML |
| 5 | main.css | Game over styles |
| 6 | transition.js, game.js | Game over logic and restart |
| 7 | renderer.js | HUD score display |
| 8 | All | Test and fix |

**Estimated time:** 45-60 minutes