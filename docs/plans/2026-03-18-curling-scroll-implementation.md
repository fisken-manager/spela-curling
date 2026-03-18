# Curling Scroll Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A web page scrolled exclusively by shooting a curling stone, with music synced to scroll progress.

**Architecture:** Canvas overlay renders stone, power bar, particles, and sweep zone. HTML content beneath translates via CSS transforms. Web Audio API controls playback rate based on velocity and direction. Physics engine handles stone movement, friction, wall bounces.

**Tech Stack:** Vanilla JavaScript, HTML5 Canvas, Web Audio API, CSS transforms, Pointer Events API

---

## Task1: Project Structure &HTML Shell

**Files:**
- Create: `index.html`- Create: `styles/main.css`
- Create: `scripts/game.js`

**Step 1: Create directory structure**

Run: `mkdir -p styles scripts`

**Step 2: Create HTML shell**

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Curling Scroll</title>
    <link rel="stylesheet" href="styles/main.css">
</head>
<body>
    <canvas id="game-canvas"></canvas>
    <div id="content">
    </div>
    <script src="scripts/game.js"></script>
</body>
</html>
```

**Step 3: Create base CSS**

Create `styles/main.css`:

```css
* {margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html, body {
    overflow: hidden;
    width: 100%;
    height: 100%;
}

#game-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10;
    pointer-events: auto;
}

#content {
    position: absolute;
    width: 100%;
    will-change: transform;
}
```

**Step 4: Create JS entry point**

Create `scripts/game.js`:

```javascript
// Entry point - will be expanded
console.log('Curling Scroll initialized');
```

**Step 5: Verify**

Open `index.html` in browser. Expected: blank page, no console errors.

---

## Task 2: Audio System

**Files:**
- Create: `scripts/audio.js`
- Modify: `scripts/game.js`

**Step 1: Create AudioController class**

Create `scripts/audio.js`:

```javascript
export class AudioController {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.sourceNode = null;
        this.isPlaying = false;
        this.currentPosition = 0; // 0-1 (percentage through track)
        this.playbackRate = 1;
        this.lastStartTime = 0;
    }

    async init(audioUrl) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        
        console.log(`Audio loaded: ${this.audioBuffer.duration}s`);
    }

    resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    play() {
        if (!this.audioBuffer || this.isPlaying) return;
        
        this.resumeContext();
        
        this.sourceNode = this.audioContext.createBufferSource();
        this.sourceNode.buffer = this.audioBuffer;
        this.sourceNode.playbackRate.value = this.playbackRate;
        this.sourceNode.connect(this.audioContext.destination);
        
        const offset = this.currentPosition * this.audioBuffer.duration;
        this.sourceNode.start(0, offset);
        
        this.lastStartTime = this.audioContext.currentTime;
        this.isPlaying = true;
        
        this.sourceNode.onended = () => {
            this.isPlaying = false;
        };
    }

    stop() {
        if (!this.isPlaying) return;
        
        // Update position before stopping
        const elapsedTime = this.audioContext.currentTime - this.lastStartTime;
        this.currentPosition += (elapsedTime * this.playbackRate) / this.audioBuffer.duration;
        this.currentPosition = this.currentPosition % 1;
        
        if (this.sourceNode) {
            this.sourceNode.stop();
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }
        
        this.isPlaying = false;
    }

    setPosition(position) {// position: 0-1
        const needsRestart = this.isPlaying;
        this.stop();this.currentPosition = Math.max(0, Math.min(1, position));
        if (needsRestart) {
            this.play();
        }
    }

    setPlaybackRate(rate) {
        this.playbackRate = rate;
        if (this.sourceNode) {
            this.sourceNode.playbackRate.value = rate;
        }
    }

    playReverse() {
        // For reverse, we swap playback and adjust offset
        // Web Audio doesn't support negative playbackRate well
        // So we calculate position manually
    }
}
```

**Step 2: Update game.js to use AudioController**

Update `scripts/game.js`:

```javascript
import { AudioController } from './audio.js';

const audio = new AudioController();

async function init() {
    console.log('Curling Scroll initialized');
    await audio.init('song.wav');
    console.log('Audio ready');
}

init().catch(console.error);
```

**Step 3: Verify**

Open `index.html` in browser. Expected: console shows "Audio loaded: X.XXs" and "Audio ready".

---

## Task 3: Game State & Physics

**Files:**
- Create: `scripts/state.js`
- Create: `scripts/physics.js`

**Step 1: Create GameState class**

Create `scripts/state.js`:

```javascript
export const GamePhase = {
    RESTING: 'resting',
    CHARGING: 'charging',
    MOVING: 'moving'
};

export class GameState {
    constructor() {
        this.phase = GamePhase.RESTING;
        
        // Stone state
        this.stone = {
            x: 0,              // world position
            y: 0,
            vx: 0,            // velocity
            vy: 0,
            radius: 30
        };
        
        // Input state
        this.power = 0;           // 0-100
        this.aimAngle = 0;        // radians
        
        // Progress
        this.scrollProgress = 0;  // 0-1
        
        // Screen dimensions
        this.screenWidth = window.innerWidth;
        this.screenHeight = window.innerHeight;
        
        // Page dimensions
        this.pageHeight = 0;      // total scrollable height
    }

    updateScreenDimensions() {
        this.screenWidth = window.innerWidth;
        this.screenHeight = window.innerHeight;
    }
}
```

**Step 2: Create Physics class**

Create `scripts/physics.js`:

```javascript
export class Physics {
    constructor() {
        this.baseFriction = 0.995;
        this.sweepFriction = 0.998;
        this.maxVelocity = 25;
        this.wallBounceEnergy = 0.8;
        this.sweepBoost = 1.5;
    }

    update(state, deltaTime) {
        if (state.phase !== 'moving') return;

        const { stone } = state;
        
        // Apply friction
        const friction = state.isSweeping ? this.sweepFriction : this.baseFriction;
        stone.vx *= friction;
        stone.vy*= friction;
        
        // Update position
        stone.x += stone.vx;
        stone.y += stone.vy;
        
        // Wall bounces
        const leftBound = stone.radius;
        const rightBound = state.screenWidth - stone.radius;
        
        if (stone.x < leftBound) {
            stone.x = leftBound;
            stone.vx = -stone.vx * this.wallBounceEnergy;
        } else if (stone.x > rightBound) {
            stone.x = rightBound;
            stone.vx = -stone.vx * this.wallBounceEnergy;
        }
        
        // Check if stopped
        const speed = Math.sqrt(stone.vx * stone.vx + stone.vy * stone.vy);
        if (speed < 0.1) {
            stone.vx = 0;
            stone.vy = 0;
            state.phase = 'resting';
        }
    }

    launch(state) {
        const { stone } = state;
        const speed = (state.power / 100) * this.maxVelocity;
        
        stone.vx = Math.sin(state.aimAngle) * speed;
        stone.vy = -Math.cos(state.aimAngle) * speed; // Negative because Y increases downward
        
        state.phase = 'moving';
        state.power = 0;
    }

    applySweepBoost(state, intensity) {
        if (state.phase !== 'moving') return;
        
        const { stone } = state;
        const currentSpeed = Math.sqrt(stone.vx * stone.vx + stone.vy * stone.vy);
        
        if (currentSpeed > 0.1) {
            // Boost in direction of travel
            const boost = this.sweepBoost * intensity;
            stone.vx *= (1 + boost * 0.01);
            stone.vy*= (1 + boost * 0.01);
            
            // Cap velocity
            const newSpeed = Math.sqrt(stone.vx * stone.vx + stone.vy * stone.vy);
            if (newSpeed > this.maxVelocity) {
                stone.vx = (stone.vx / newSpeed) * this.maxVelocity;
                stone.vy = (stone.vy / newSpeed) * this.maxVelocity;
            }
        }
    }
}
```

**Step 3: Update game.js to use state**

Update `scripts/game.js`:

```javascript
import { AudioController } from './audio.js';
import { GameState, GamePhase } from './state.js';
import { Physics } from './physics.js';

const audio = new AudioController();
const state = new GameState();
const physics = new Physics();

async function init() {
    console.log('Curling Scroll initialized');
    state.updateScreenDimensions();
    await audio.init('song.wav');
    console.log('Game state and physics ready');
}

init().catch(console.error);
```

**Step 4: Verify**

Open browser console. Expected: "Game state and physics ready".

---

## Task 4: Input Handling

**Files:**
- Create: `scripts/input.js`
- Modify: `scripts/game.js`

**Step 1: Create InputHandler class**

Create `scripts/input.js`:

```javascript
export class InputHandler {
    constructor(canvas, state, physics) {
        this.canvas = canvas;
        this.state = state;
        this.physics = physics;
        
        this.isPointerDown = false;
        this.pointerX = 0;
        this.pointerY = 0;
        this.powerFillRate = 100; // % per second
        
        // Sweep detection
        this.sweepPositions = [];
        this.sweepThreshold = 5;
        
        this.bindEvents();
    }

    bindEvents() {
        this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
        this.canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
        this.canvas.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    }

    onPointerDown(e) {
        e.preventDefault();
        this.isPointerDown = true;
        this.pointerX = e.clientX;
        this.pointerY = e.clientY;
        
        if (this.state.phase === 'resting') {
            this.state.phase = 'charging';
            this.state.power = 0;
        }
    }

    onPointerMove(e) {
        this.pointerX = e.clientX;
        this.pointerY = e.clientY;
        
        // Track for sweep detection
        this.sweepPositions.push({ x: e.clientX, y: e.clientY, time: Date.now() });
        if (this.sweepPositions.length > 10) {
            this.sweepPositions.shift();
        }
        
        // Calculate aim angle during charging
        if (this.state.phase === 'charging' && this.isPointerDown) {
            this.updateAimAngle();
        }
        
        // Detect sweeping during movement
        if (this.state.phase === 'moving') {
            this.detectSweep();
        }
    }

    onPointerUp(e) {
        if (this.state.phase === 'charging' && this.isPointerDown) {
            this.physics.launch(this.state);
        }
        
        this.isPointerDown = false;
        this.state.isSweeping = false;
    }

    updateAimAngle() {
        // Stone is at bottom center of screen
        const stoneScreenX = this.state.screenWidth / 2;
        const stoneScreenY = this.state.screenHeight * 0.7;
        
        const dx = this.pointerX - stoneScreenX;
        const dy = this.pointerY - stoneScreenY;
        
        this.state.aimAngle = Math.atan2(dx, -dy); // -dy because screen Y is inverted
    }

    detectSweep() {
        // Check if pointer is in sweep zone (ahead of stone)
        // and moving rapidly
        
        if (this.sweepPositions.length < 3) return;
        
        // Calculate movement speed
        const recent = this.sweepPositions.slice(-5);
        let totalMovement = 0;
        
        for (let i = 1; i < recent.length; i++) {
            const dx = recent[i].x - recent[i-1].x;
            const dy = recent[i].y - recent[i-1].y;
            totalMovement += Math.sqrt(dx * dx + dy * dy);
        }
        
        // Check if in sweep zone (simplified: above stone on screen)
        const stoneScreenY = this.state.screenHeight * 0.7;
        const inSweepZone = this.pointerY < stoneScreenY && this.pointerY > 0;
        
        if (inSweepZone && totalMovement > this.sweepThreshold) {
            this.state.isSweeping = true;
            const intensity = totalMovement / 50;
            this.physics.applySweepBoost(this.state, intensity);
        } else {
            this.state.isSweeping = false;
        }
    }

    updatePower(deltaTime) {
        if (this.state.phase === 'charging' && this.isPointerDown) {
            this.state.power = Math.min(100, this.state.power + this.powerFillRate * deltaTime);
        }
    }
}
```

**Step 2: Update game.js to use InputHandler**

Update `scripts/game.js`:

```javascript
import { AudioController } from './audio.js';
import { GameState } from './state.js';
import { Physics } from './physics.js';
import { InputHandler } from './input.js';

const audio = new AudioController();
const state = new GameState();
const physics = new Physics();
let input = null;

async function init() {
    console.log('Curling Scroll initialized');
    state.updateScreenDimensions();
    
    const canvas = document.getElementById('game-canvas');
    canvas.width = state.screenWidth;
    canvas.height = state.screenHeight;
    
    input = new InputHandler(canvas, state, physics);
    
    await audio.init('song.wav');
    console.log('Input handler ready');
}

init().catch(console.error);
```

**Step 3: Verify**

Open browser. Click and hold on canvas. Check console for any errors. Expected: no errors.

---

## Task 5: Renderer

**Files:**
- Create: `scripts/renderer.js`
- Modify: `scripts/game.js`

**Step 1: Create Renderer class**

Create `scripts/renderer.js`:

```javascript
export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.stoneRadius = 30;
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawStone(state) {
        const stoneScreenX = state.screenWidth / 2;
        const stoneScreenY = state.screenHeight * 0.7;
        const radius = this.stoneRadius;
        
        this.ctx.beginPath();
        this.ctx.arc(stoneScreenX, stoneScreenY, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#4a5568';
        this.ctx.fill();
        this.ctx.strokeStyle = '#2d3748';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();// Draw handle
        this.ctx.beginPath();
        this.ctx.arc(stoneScreenX, stoneScreenY, radius * 0.5, 0, Math.PI * 2);
        this.ctx.fillStyle = '#e53e3e';
        this.ctx.fill();
    }

    drawPowerBar(state) {
        if (state.phase !== 'charging') return;
        
        const barWidth = 200;
        const barHeight = 20;
        const x = (state.screenWidth - barWidth) / 2;
        const y = state.screenHeight * 0.85;
        
        // Background
        this.ctx.fillStyle = '#2d3748';
        this.ctx.fillRect(x, y, barWidth, barHeight);
        
        // Fill
        const fillWidth = (state.power / 100) * barWidth;
        this.ctx.fillStyle = '#e53e3e';
        this.ctx.fillRect(x, y, fillWidth, barHeight);
        
        // Border
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, barWidth, barHeight);
    }

    drawAimLine(state) {
        if (state.phase !== 'charging') return;
        
        const stoneScreenX = state.screenWidth / 2;
        const stoneScreenY = state.screenHeight * 0.7;
        const lineLength = 100;
        
        const endX = stoneScreenX + Math.sin(state.aimAngle) * lineLength;
        const endY = stoneScreenY - Math.cos(state.aimAngle) * lineLength;
        
        this.ctx.beginPath();
        this.ctx.moveTo(stoneScreenX, stoneScreenY);
        this.ctx.lineTo(endX, endY);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Arrow head
        const arrowSize = 10;
        const angle = state.aimAngle;
        this.ctx.beginPath();
        this.ctx.moveTo(endX, endY);
        this.ctx.lineTo(
            endX - arrowSize * Math.sin(angle - 0.3),
            endY + arrowSize * Math.cos(angle - 0.3)
        );
        this.ctx.lineTo(
            endX - arrowSize * Math.sin(angle + 0.3),
            endY + arrowSize * Math.cos(angle + 0.3)
        );
        this.ctx.closePath();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.fill();
    }

    drawSweepZone(state) {
        if (state.phase !== 'moving') return;
        
        const zoneHeight = state.screenHeight * 0.3;
        const y = state.screenHeight * 0.4;
        
        const alpha = state.isSweeping ? 0.3 : 0.1;
        this.ctx.fillStyle = `rgba(66, 153, 225, ${alpha})`;
        this.ctx.fillRect(0, y, state.screenWidth, zoneHeight);
    }

    render(state) {
        this.clear();
        
        this.drawSweepZone(state);
        this.drawStone(state);
        this.drawAimLine(state);
        this.drawPowerBar(state);
    }
}
```

**Step 2: Update game.js with game loop**

Update `scripts/game.js`:

```javascript
import { AudioController } from './audio.js';
import { GameState } from './state.js';
import { Physics } from './physics.js';
import { InputHandler } from './input.js';
import { Renderer } from './renderer.js';

const audio = new AudioController();
const state = new GameState();
const physics = new Physics();
let input = null;
let renderer = null;
let lastTime = 0;

async function init() {
    console.log('Curling Scroll initialized');
    state.updateScreenDimensions();
    
    const canvas = document.getElementById('game-canvas');
    canvas.width = state.screenWidth;
    canvas.height = state.screenHeight;
    
    renderer = new Renderer(canvas);
    input = new InputHandler(canvas, state, physics);
    
    await audio.init('song.wav');
    console.log('Renderer ready');
    
    requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    
    update(deltaTime);
    renderer.render(state);
    
    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    input.updatePower(deltaTime);
    physics.update(state, deltaTime);
}

init().catch(console.error);
```

**Step 3: Verify**

Open browser. Click and hold - should see power bar fill and aim line appear. Release - stone should show as "moving" in console (check state.phase).

---

## Task 6: Scroll Controller & Content

**Files:**
- Create: `scripts/scroll.js`
- Modify: `index.html`
- Modify: `scripts/game.js`

**Step 1: Add placeholder content to HTML**

Update `index.html` content div:

```html
<div id="content">
    <section class="content-section">
        <h1>Welcome to Curling Scroll</h1>
        <p>Shoot the stone to scroll through this page.</p>
    </section>
    <section class="content-section">
        <h2>Section 2</h2>
        <p>This is placeholder content for testing the scroll mechanic.</p>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
    </section>
    <section class="content-section">
        <h2>Section 3</h2>
        <p>More content here to scroll through.</p>
        <img src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect fill='%234a5568' width='400' height='300'/><text x='50%' y='50%' text-anchor='middle' fill='%23fff' font-size='24'>Placeholder Image</text></svg>" alt="placeholder">
    </section>
    <section class="content-section">
        <h2>Section 4</h2>
        <p>Keep scrolling to see more content.</p>
    </section>
    <section class="content-section">
        <h2>Section 5</h2>
        <p>Almost there!</p>
    </section>
    <section class="content-section">
        <h2>Section 6</h2>
        <p>End of content - loops back to start.</p>
    </section>
</div>
```

**Step 2: Add content styles**

Add to `styles/main.css`:

```css
.content-section {
    min-height: 100vh;
    padding: 60px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
}

.content-section h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.content-section h2 {
    font-size: 2rem;
    margin-bottom: 1rem;
}

.content-section p {
    font-size: 1.2rem;
    max-width: 600px;
    line-height: 1.6;
    margin-bottom: 1rem;
}

.content-section img {
    max-width: 100%;
    height: auto;
    margin: 1rem 0;
}

body {
    background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

**Step 3: Create ScrollController**

Create `scripts/scroll.js`:

```javascript
export class ScrollController {
    constructor(state) {
        this.state = state;
        this.contentElement = document.getElementById('content');
        this.calculatePageHeight();
        
        window.addEventListener('resize', () => {
            this.calculatePageHeight();
        });
    }

    calculatePageHeight() {
        this.state.pageHeight = this.contentElement.scrollHeight;
        this.state.updateScreenDimensions();
    }

    update(state) {
        // Convert stone world position to scroll progress
        // Stone position (world Y) maps to scroll position
        
        const viewportHeight = state.screenHeight;
        const scrollableDistance = state.pageHeight - viewportHeight;
        
        if (scrollableDistance <= 0) return;
        
        // Stone's world Y position determines scroll progress
        // Stone starts at 0 (bottom of page), increases as it moves up
        const stoneWorldY = state.stone.y;
        
        // Stone Y increases as it moves "up" in scroll
        // So scrollProgress = stone Y / max distance
        state.scrollProgress = stoneWorldY / scrollableDistance;
        state.scrollProgress = Math.max(0, Math.min(1, state.scrollProgress));
        
        // Apply scroll via transform
        const scrollOffset = state.scrollProgress * scrollableDistance;
        this.contentElement.style.transform = `translateY(-${scrollOffset}px)`;
    }

    getTotalHeight() {
        return this.state.pageHeight;
    }
}
```

**Step 4: Update game.js with scroll controller**

Update `scripts/game.js`:

```javascript
import { AudioController } from './audio.js';
import { GameState } from './state.js';
import { Physics } from './physics.js';
import { InputHandler } from './input.js';
import { Renderer } from './renderer.js';
import { ScrollController } from './scroll.js';

const audio = new AudioController();
const state = new GameState();
const physics = new Physics();
let input = null;
let renderer = null;
let scrollController = null;
let lastTime = 0;

async function init() {
    console.log('Curling Scroll initialized');
    state.updateScreenDimensions();
    
    const canvas = document.getElementById('game-canvas');
    canvas.width = state.screenWidth;
    canvas.height = state.screenHeight;
    
    renderer = new Renderer(canvas);
    input = new InputHandler(canvas, state, physics);
    scrollController = new ScrollController(state);
    
    await audio.init('song.wav');
    
    console.log('All systems ready');
    requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
    const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;
    
    update(deltaTime);
    renderer.render(state);
    scrollController.update(state);
    
    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    input.updatePower(deltaTime);
    physics.update(state, deltaTime);
}

init().catch(console.error);
```

**Step 5: Verify**

Open browser. Content sections should be visible behind canvas. When stone "moves" (need to wire up stone.y to physics), content should scroll.

---

## Task 7: Wire Stone Physics to Scroll Position

**Files:**
- Modify: `scripts/physics.js`
- Modify: `scripts/state.js`

**Step 1: Update physics to modify stone.y**

In `scripts/physics.js`, the `update` method already modifies stone position. Update to properly scroll:

```javascript
update(state, deltaTime) {
    if (state.phase !== 'moving') return;

    const { stone } = state;
    
    // Apply friction
    const friction = state.isSweeping ? this.sweepFriction : this.baseFriction;
    stone.vx *= friction;
    stone.vy *= friction;
    
    // Update world position
    stone.x += stone.vx;
    stone.y += stone.vy;
    
    // Wall bounces (horizontal)
    const leftBound = stone.radius;
    const rightBound = state.screenWidth - stone.radius;
    
    if (stone.x < leftBound) {
        stone.x = leftBound;
        stone.vx = -stone.vx * this.wallBounceEnergy;
    } else if (stone.x > rightBound) {
        stone.x = rightBound;
        stone.vx = -stone.vx * this.wallBounceEnergy;
    }
    
    // Update scroll progress based on stone Y
    const maxScroll = state.pageHeight - state.screenHeight;
    state.scrollProgress = stone.y / maxScroll;
    
    // Loop when reaching top
    if (state.scrollProgress >= 1) {
        state.scrollProgress = 0;
        stone.y = 0;
    }
    
    // Check if stopped
    const speed = Math.sqrt(stone.vx * stone.vx + stone.vy * stone.vy);
    if (speed < 0.1) {
        stone.vx = 0;
        stone.vy = 0;
        state.phase = 'resting';
    }
}
```

**Step 2: Update launch to start from current progress**

In `scripts/physics.js`, update `launch`:

```javascript
launch(state) {
    const { stone } = state;
    const speed = (state.power / 100) * this.maxVelocity;
    
    stone.vx = Math.sin(state.aimAngle) * speed;
    stone.vy = Math.cos(state.aimAngle) * speed; // Positive = moving up in scroll
    
    state.phase = 'moving';
    state.power = 0;
}
```

**Step 3: Verify**

Open browser. Hold and release - stone should "launch" and content should scroll. When stone stops, can charge and launch again.

---

## Task 8: Audio Sync to Scroll Progress

**Files:**
- Modify: `scripts/scroll.js`
- Modify: `scripts/audio.js`

**Step 1: Update ScrollController to sync audio**

Update `scripts/scroll.js`:

```javascript
export class ScrollController {
    constructor(state, audioController) {
        this.state = state;
        this.audio = audioController;
        this.contentElement = document.getElementById('content');
        this.lastProgress = 0;
        this.calculatePageHeight();
        
        window.addEventListener('resize', () => {
            this.calculatePageHeight();
        });
    }

    calculatePageHeight() {
        this.state.pageHeight = this.contentElement.scrollHeight;
        this.state.updateScreenDimensions();
    }

    update(state) {
        const viewportHeight = state.screenHeight;
        const scrollableDistance = state.pageHeight - viewportHeight;
        
        if (scrollableDistance <= 0) return;
        
        // Stone world Y determines scroll progress
        const stoneWorldY = state.stone.y;
        state.scrollProgress = stoneWorldY / scrollableDistance;
        state.scrollProgress = Math.max(0, state.scrollProgress);
        
        // Loop handling
        if (state.scrollProgress >= 1) {
            state.scrollProgress = 0;
            state.stone.y = 0;
        }
        
        // Apply scroll via transform
        const scrollOffset = state.scrollProgress * scrollableDistance;
        this.contentElement.style.transform = `translateY(-${scrollOffset}px)`;
        
        // Sync audio
        this.syncAudio(state);
        
        this.lastProgress = state.scrollProgress;
    }

    syncAudio(state) {
        if (!this.audio || !this.audio.audioBuffer) return;
        
        const progress = state.scrollProgress;
        const velocity = state.phase === 'moving' 
            ? Math.sqrt(state.stone.vx ** 2 + state.stone.vy ** 2)
            : 0;
        
        // Set audio position to scroll progress
        this.audio.setPosition(progress);
        
        // Set playback rate based on velocity
        const baseRate = velocity / this.audio.maxVelocity || 1;
        const rate = Math.max(0.1, Math.min(2, baseRate));
        
        // Handle direction
        const direction = state.stone.vy > 0 ? 1 : -1;
        
        if (state.phase === 'moving') {
            this.audio.setPlaybackRate(rate * direction);
            if (!this.audio.isPlaying) {
                this.audio.play();
            }
        } else {
            this.audio.stop();
        }
    }

    getTotalHeight() {
        return this.state.pageHeight;
    }
}
```

**Step 2: Add maxVelocity to AudioController**

Update `scripts/audio.js`:

```javascript
export class AudioController {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.sourceNode = null;
        this.isPlaying = false;
        this.currentPosition = 0;
        this.playbackRate = 1;
        this.lastStartTime = 0;
        this.maxVelocity = 25; // Match physics maxVelocity
    }
    
    // ... rest stays same
}
```

**Step 3: Update game.js to pass audio to ScrollController**

Update `scripts/game.js`:

```javascript
// ... in init function
scrollController = new ScrollController(state, audio);
```

**Step 4: Verify**

Open browser. Interact with page to trigger audio context (click). Launch stone - music should play and sync with scroll speed.

---

## Task 9: Final Polish - Particles & Visual Effects

**Files:**
- Modify: `scripts/renderer.js`

**Step 1: Add particle system to Renderer**

Update `scripts/renderer.js`:

```javascript
export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.stoneRadius = 30;
        this.particles = [];
    }

    addParticle(x, y, vx, vy, color, life =1) {
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
            p.vy += 5* deltaTime; // gravity
            
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

    // ... rest of methods same, add particle calls
}
```

**Step 2: Update game loop to pass deltaTime to renderer**

Update `scripts/game.js`:

```javascript
function gameLoop(timestamp) {
    const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;
    
    update(deltaTime);
    renderer.updateParticles(deltaTime);
    renderer.render(state);
    scrollController.update(state);
    
    requestAnimationFrame(gameLoop);
}
```

**Step 3: Verify**

Particles should appear when bouncing off walls and when sweeping.

---

## Task 10: Clean Up & Final Testing

**Files:**
- All files

**Step 1: Handle browser audio context policy**

Update `scripts/input.js` pointer down handler:

```javascript
onPointerDown(e) {
    e.preventDefault();
    this.isPointerDown = true;
    this.pointerX = e.clientX;
    this.pointerY = e.clientY;
    
    // Resume audio context on user interaction
    if (this.audio && this.audio.audioContext) {
        this.audio.resumeContext();
    }
    
    if (this.state.phase === 'resting') {
        this.state.phase = 'charging';
        this.state.power = 0;
    }
}
```

**Step 2: Add maxVelocity getter to Physics**

Add to `scripts/physics.js`:

```javascript
getMaxVelocity() {
    return this.maxVelocity;
}
```

**Step 3: Initialize stone position**

Update `scripts/state.js`:

```javascript
constructor() {
    // ... existing code
    this.stone.y = 0; // Start at bottom of page
}
```

**Step 4: Test complete workflow**

Open browser. Test:
1. Click and hold to charge power
2. Aim by moving pointer
3. Release to launch
4. Sweep by moving pointer in sweep zone while stone moves
5. Music should sync with movement
6. Stone should bounce off walls
7. Content should scroll
8. Loop when reaching end

**Step 5: Commit final working version**

```bash
git add -A
git commit -m "feat: implement curling scroll mechanic withaudio sync"
```

---

## Summary

This plan builds the curling scroll experience incrementally:

1. **Task 1-2**: HTML shell + Audio system
2. **Task 3**: Game state & physics
3. **Task 4**: Input handling
4. **Task 5**: Canvas renderer
5. **Task 6**: Scroll controller + content
6. **Task 7**: Wire physics to scroll
7. **Task 8**: Audio sync
8. **Task 9**: Visual polish
9. **Task 10**: Final testing

Each task is testable independently. Follow the red-green-refactor pattern where applicable.