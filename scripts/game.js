import { AudioController } from './audio.js';
import { GameState } from './state.js';
import { Physics } from './physics.js';
import { InputHandler } from './input.js';
import { Renderer } from './renderer.js';
import { ScrollController } from './scroll.js';
import { TransitionController } from './transition.js';
import { BuyMenu } from './buyMenu.js';

const audio = new AudioController();
const state = new GameState();
const physics = new Physics();
const transition = new TransitionController();
let input = null;
let renderer = null;
let scrollController = null;
let buyMenu = null;
let lastTime = 0;

function setupControls() {
    const controlsPanel = document.getElementById('physics-controls');
    if (!controlsPanel) return;
    
    controlsPanel.addEventListener('mousedown', (e) => e.stopPropagation());
    controlsPanel.addEventListener('touchstart', (e) => e.stopPropagation());

    const header = controlsPanel.querySelector('h3');
    if (header) header.addEventListener('pointerup', (e) => {
        e.stopPropagation();
        controlsPanel.classList.toggle('collapsed');
    });

    const frictionSlider = document.getElementById('friction');
    const frictionVal = document.getElementById('friction-val');
    const curlSlider = document.getElementById('curl');
    const curlVal = document.getElementById('curl-val');
    const angDecaySlider = document.getElementById('angDecay');
    const angDecayVal = document.getElementById('angDecay-val');
    const maxVelSlider = document.getElementById('maxVel');
    const maxVelVal = document.getElementById('maxVel-val');
    const rotRangeSlider = document.getElementById('rotRange');
    const rotRangeVal = document.getElementById('rotRange-val');

    if (frictionSlider) frictionSlider.addEventListener('input', (e) => {
        physics.baseFriction = parseFloat(e.target.value);
        frictionVal.textContent = e.target.value;
    });

    if (curlSlider) curlSlider.addEventListener('input', (e) => {
        physics.baseCurlStrength = parseFloat(e.target.value);
        curlVal.textContent = e.target.value;
    });

    if (angDecaySlider) angDecaySlider.addEventListener('input', (e) => {
        physics.angularDecayFactor = parseFloat(e.target.value);
        angDecayVal.textContent = e.target.value;
    });

    if (maxVelSlider) maxVelSlider.addEventListener('input', (e) => {
        physics.baseMaxVelocity = parseFloat(e.target.value);
        maxVelVal.textContent = e.target.value;
    });

    if (rotRangeSlider) rotRangeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        physics.minAngularVelocity = -val;
        physics.maxAngularVelocity = val;
        rotRangeVal.textContent = val;
    });

    const addMoneyBtn = document.getElementById('add-money-btn');
    if (addMoneyBtn) addMoneyBtn.addEventListener('click', () => {
        state.money += 100;
    });

    const addLifeBtn = document.getElementById('add-life-btn');
    if (addLifeBtn) addLifeBtn.addEventListener('click', () => {
        state.lives += 1;
    });

    const reInitPowerupsBtn = document.getElementById('re-init-powerups');
    if (reInitPowerupsBtn) {
        const itemTypes = ['powerup', 'life', 'sweep', 'rotation', 'super', 'growth', 'curlChaos', 'sizeShrink'];
        
        reInitPowerupsBtn.addEventListener('click', () => {
            state.debugGenTuning = {};
            itemTypes.forEach(id => {
                const el = document.getElementById('dbg-' + id);
                if (el) {
                    state.debugGenTuning[id] = parseInt(el.value, 10);
                }
            });
            state.initPowerUps();
            state.initScoringOrbs();
        });
        
        itemTypes.forEach(id => {
            const input = document.getElementById('dbg-' + id);
            const valEl = document.getElementById('dbg-' + id + '-val');
            if (input && valEl) {
                input.addEventListener('input', (e) => {
                    valEl.textContent = e.target.value;
                });
            }
        });
    }
}

function setupGameOverUI() {
    const restartBtn = document.getElementById('restart-btn');
    const buyLifeBtn = document.getElementById('buy-life-btn');
    const gameOverOverlay = document.getElementById('game-over');
    const finalScoreEl = document.querySelector('.final-score');
    const moneyEl = document.querySelector('.game-over-money');
    
    if (restartBtn && gameOverOverlay) restartBtn.addEventListener('click', () => {
        state.resetGame();
        state.initPowerUps();
        state.initScoringOrbs();
        gameOverOverlay.classList.add('hidden');
    });
    
    if (renderer && gameOverOverlay && finalScoreEl && moneyEl) {
        const originalRender = renderer.render.bind(renderer);
        renderer.render = (state, deltaTime) => {
            originalRender(state, deltaTime);
            checkGameOver(state, gameOverOverlay, finalScoreEl, moneyEl);
        };
    }
}

function checkGameOver(state, overlay, scoreEl, moneyEl) {
    if (state.gameOver) {
        overlay.classList.remove('hidden');
        scoreEl.textContent = Math.floor(state.score);
        moneyEl.textContent = `$${state.money}`;
    }

    // Preload waifu upgrade images
    buyMenu.preloadImages();
}

async function init() {
    console.log('Curling Scroll initialized');
    state.updateScreenDimensions();
    
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error('Canvas not found');
        return;
    }
    canvas.width = state.screenWidth;
    canvas.height = state.screenHeight;
    
    renderer = new Renderer(canvas);
    buyMenu = new BuyMenu(state);
    input = new InputHandler(canvas, state, physics, audio);
    input.setBuyMenu(buyMenu);
    scrollController = new ScrollController(state, audio);
    setupControls();
    setupGameOverUI();

    // Preload waifu upgrade images
    await buyMenu.preloadImages();

    state.initPowerUps();
    state.initScoringOrbs();
    
    await audio.init([
        'assets/song_1.mp3',
        'assets/song_2.mp3',
        'assets/song_3.mp3',
        'assets/song_4.mp3',
        'assets/song_5.mp3'
    ]);
    
    console.log('All systems ready');
    requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
    const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;
    
    if (!renderer || !scrollController) {
        requestAnimationFrame(gameLoop);
        return;
    }
    
    if (state.showBuyMenu) {
        const ctx = renderer.ctx;
        buyMenu.render(ctx, state.screenWidth, state.screenHeight);
    } else {
        update(deltaTime);
        renderer.updateParticles(deltaTime);
        renderer.render(state, deltaTime);
        scrollController.update(state);
    }
    
    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    updateSnapBack(deltaTime);
    updateCombo(deltaTime);
    
    if (state.phase === 'moving') {
        physics.update(state, deltaTime);
    } else if (state.phase === 'returning') {
        if (!transition.isTransitioning()) {
            transition.start(state);
        }
        transition.update(deltaTime, state, scrollController);
    }
}

function updateCombo(deltaTime) {
        const now = Date.now();
        
        // Initialize combo state if needed
        if (state.comboMultiplier === undefined) {
            state.comboMultiplier = 1;
        }
        if (state.lastOrbTime === undefined) {
            state.lastOrbTime = 0;
        }
        if (state.recentScore === undefined) {
            state.recentScore = 0;
        }
        
        // Reset combo multiplier after timeout
        if (state.lastOrbTime > 0 && now - state.lastOrbTime > state.comboTimeout) {
            state.comboMultiplier = 1;
        }
        
        // Decay recentScore over time (for visual effect)
        state.recentScore = Math.max(0, state.recentScore - deltaTime * 100);
    }

function updateSnapBack(deltaTime) {
    if (state.phase === 'resting' && state.input.isSnapping) {
        const restYPx = state.screenHeight - state.restOffsetPx;
        
        state.input.snapBackProgress += deltaTime * 5; // 0.2s duration
        if (state.input.snapBackProgress >= 1) {
            state.input.snapBackProgress = 1;
            state.input.isSnapping = false;
            state.stone.x = 0;
            state.stoneYPx = restYPx;
        } else {
            const t = state.input.snapBackProgress;
            const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
            state.stone.x = state.input.stoneStartX * (1 - ease);
            state.stoneYPx = state.input.stoneStartYPx + (restYPx - state.input.stoneStartYPx) * ease;
        }
        
        // Update stoneVisualY for compatibility
        state.stoneVisualY = state.stoneYPx / state.screenHeight;
    }
}

init().catch(console.error);