import { AudioController } from './audio.js';
import { GameState } from './state.js';
import { Physics } from './physics.js';
import { InputHandler } from './input.js';
import { Renderer } from './renderer.js';
import { ScrollController } from './scroll.js';
import { TransitionController } from './transition.js';
import { CardMenu } from './cardMenu.js';
import { SnakeTextAnimation } from './snake-text.js';
import { WebGLFisheye } from './webgl-fisheye.js';
import { ShopTransition } from './shopTransition.js';

const audio = new AudioController();
const state = new GameState();
const physics = new Physics();
const transition = new TransitionController();
let input = null;
let renderer = null;
let scrollController = null;
let cardMenu = null;
let snakeText = null;
let webglFisheye = null;
let shopTransition = null;
let lastTime = 0;
let prevShowBuyMenu = false;
let prevShopTransition = null;

function setupControls() {
    const controlsPanel = document.getElementById('physics-controls');
    if (!controlsPanel) return;

    if (state.isDevMode) {
        controlsPanel.style.display = 'block';
    }
    
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

    const openShopBtn = document.getElementById('open-shop-btn');
    if (openShopBtn) openShopBtn.addEventListener('click', () => {
        // Trigger shop transition animation
        state.shopTransition = 'fishZoom';
        state.shopTransitionStartTime = performance.now();
        state.shopTransitionProgress = 0;
        // Set fish position to center of screen for dev menu
        state.shopTransitionFishX = state.screenWidth / 2;
        state.shopTransitionFishY = state.screenHeight / 2;
        state.shopUpgradeSelection = null;
        state.rerollCost = 1;
        state.lives++;
        // Fade out game music
        if (audio.isPlaying) {
            audio.fadeOutAndStop(0.5);
        }
    });

    const reInitPowerupsBtn = document.getElementById('re-init-powerups');
    if (reInitPowerupsBtn) {
        const itemTypes = ['powerup', 'life', 'shop', 'sweep', 'rotation', 'super', 'growth', 'curlChaos', 'sizeShrink'];
        
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

    // Fisheye effect controls (WebGL based)
    const fisheyeTypeSelect = document.getElementById('fisheye-type');
    const fisheyeTypeVal = document.getElementById('fisheye-type-val');
    const fisheyeStrengthSlider = document.getElementById('fisheye-strength');
    const fisheyeStrengthVal = document.getElementById('fisheye-strength-val');

    function updateFisheyeEffect() {
        const type = fisheyeTypeSelect?.value || 'none';
        const strength = parseInt(fisheyeStrengthSlider?.value || 30);
        
        // Try WebGL first
        if (webglFisheye && webglFisheye.enabled && webglFisheye.initialized) {
            webglFisheye.setEffect(type, strength);
            
            // Show/hide fisheye canvas
            const fisheyeCanvas = document.getElementById('fisheye-canvas');
            const gameCanvas = document.getElementById('game-canvas');
            
            if (type === 'none') {
                if (fisheyeCanvas) fisheyeCanvas.classList.remove('active');
                if (gameCanvas) gameCanvas.classList.remove('hidden-for-fisheye');
            }
        }
        
        if (fisheyeStrengthVal) fisheyeStrengthVal.textContent = strength;
    }

    if (fisheyeTypeSelect) {
        fisheyeTypeSelect.addEventListener('change', (e) => {
            if (fisheyeTypeVal) fisheyeTypeVal.textContent = e.target.value;
            updateFisheyeEffect();
        });
    }

    if (fisheyeStrengthSlider) {
        fisheyeStrengthSlider.addEventListener('input', (e) => {
            updateFisheyeEffect();
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

    if (buyLifeBtn && gameOverOverlay) buyLifeBtn.addEventListener('click', () => {
        if (state.money >= state.lifeCost) {
            state.money -= state.lifeCost;
            state.lifeCost *= 2;
            state.lives = 1;
            state.gameOver = false;
            state.phase = 'resting';
            // Keep current scroll position, just reset stone to resting position
            state.stone.x = 0;
            state.stoneYPx = state.screenHeight - state.restOffsetPx;
            gameOverOverlay.classList.add('hidden');
        }
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
    const canvas = document.getElementById('game-canvas');
    if (state.gameOver) {
        canvas.style.zIndex = '0';
    } else {
        canvas.style.zIndex = '10';
    }

    if (state.gameOver) {
        overlay.classList.remove('hidden');
        scoreEl.textContent = state.formatScore(state.score);
        moneyEl.textContent = `${state.money}$`;
        
        const buyLifeBtn = document.getElementById('buy-life-btn');
        if (buyLifeBtn) {
            buyLifeBtn.textContent = `Köp Liv ($${state.lifeCost})`;
            if (state.money >= state.lifeCost) {
                buyLifeBtn.disabled = false;
                buyLifeBtn.classList.remove('disabled');
            } else {
                buyLifeBtn.disabled = true;
                buyLifeBtn.classList.add('disabled');
            }
        }
    }
}

function syncViewport() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Update state dimensions
    state.screenWidth = width;
    state.screenHeight = height;
    state.updateScreenDimensions();
    
    // Force the layout viewport to match the visual viewport (the window)
    // This fixes the "Chrome Floor" issue where innerWidth > clientWidth
    let viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        viewport.setAttribute('content', `width=${width}, initial-scale=1.0, maximum-scale=1.0, user-scalable=0`);
    }
}

async function init() {
    console.log('Curling Scroll initialized');
    
    // Start snake text animation immediately (doesn't need assets)
    snakeText = new SnakeTextAnimation('hero-sub-snake', {
        snakeLength: 7,
        speed: 18
    });
    snakeText.init();
    snakeText.start();
    
    // Sync viewport before any sizing happens
    syncViewport();
    
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error('Canvas not found');
        return;
    }
    canvas.width = state.screenWidth;
    canvas.height = state.screenHeight;
    
    // Remove manual style overrides - let CSS 100% work with the synced viewport
    canvas.style.width = '';
    canvas.style.height = '';
    
    const content = document.getElementById('content');
    if (content) {
        content.style.width = '';
    }
    
    renderer = new Renderer(canvas);
    cardMenu = new CardMenu(state);
    
    // Initialize shop transition
    shopTransition = new ShopTransition(state);
    shopTransition.loadWaifuSprite();
    cardMenu.setShopTransition(shopTransition);
    
    // Initialize WebGL fisheye overlay
    const fisheyeCanvas = document.getElementById('fisheye-canvas');
    if (fisheyeCanvas) {
        try {
            webglFisheye = new WebGLFisheye(fisheyeCanvas);
            if (webglFisheye.enabled) {
                console.log('WebGL fisheye initialized successfully');
            } else {
                console.log('WebGL fisheye disabled (WebGL not available)');
            }
        } catch (e) {
            console.warn('WebGL fisheye initialization failed:', e);
            webglFisheye = null;
        }
    }
    
    input = new InputHandler(canvas, state, physics, audio);
    input.setCardMenu(cardMenu);
    scrollController = new ScrollController(state, audio, physics);
    setupControls();
    setupGameOverUI();

    // Preload card images before game starts
    await cardMenu.preloadImages();

    state.initPowerUps();
    state.initScoringOrbs();
    
    await audio.init([
        'assets/song_1.mp3',
        'assets/song_2.mp3',
        'assets/song_3.mp3',
        'assets/song_4.mp3',
        'assets/song_5.mp3'
    ]);
    
    // Load shop song
    await audio.loadShopSong('assets/shop_song.mp3');
    
    window.addEventListener('blur', () => {
        state.isPaused = true;
        if (audio && audio.isPlaying) {
            audio.stop();
        }
        if (state.input && state.input.isDragging) {
            state.phase = 'resting';
            state.input.isDragging = false;
            state.input.isSnapping = true;
            state.input.snapBackProgress = 0;
            state.aimAngle = 0;
        }
    });

    window.addEventListener('focus', () => {
        state.isPaused = false;
        lastTime = performance.now(); // prevent huge deltaTime
    });

    window.addEventListener('resize', () => {
        if (snakeText) {
            snakeText.handleResize();
        }
        
        // Sync viewport and state dimensions
        syncViewport();
        
        const canvas = document.getElementById('game-canvas');
        if (canvas) {
            canvas.width = state.screenWidth;
            canvas.height = state.screenHeight;
        }
    });

    console.log('All systems ready');
    requestAnimationFrame(gameLoop);
}

function applyFisheyeEffect() {
        if (!webglFisheye || !webglFisheye.enabled || !webglFisheye.initialized || webglFisheye.currentEffect === 'none') {
            return;
        }
        
        const fisheyeCanvas = document.getElementById('fisheye-canvas');
        const gameCanvas = document.getElementById('game-canvas');
        
        if (fisheyeCanvas && gameCanvas && webglFisheye.render(gameCanvas)) {
            gameCanvas.classList.add('hidden-for-fisheye');
            fisheyeCanvas.classList.add('active');
        }
    }

function gameLoop(timestamp) {
    const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;
    
    if (!renderer || !scrollController) {
        requestAnimationFrame(gameLoop);
        return;
    }
    
    // Handle shop transition animation
    if (state.shopTransition) {
        // Fade out game music when transition starts
        if (!prevShopTransition && audio.isPlaying) {
            audio.fadeOutAndStop(0.5);
        }
        prevShopTransition = state.shopTransition;
        
        renderer.render(state, deltaTime);
        shopTransition.update(deltaTime);
        shopTransition.render(renderer.ctx, state.screenWidth, state.screenHeight);
        applyFisheyeEffect();
        requestAnimationFrame(gameLoop);
        return;
    }
    prevShopTransition = null;
    
    // Play/stop shop music
    if (state.showBuyMenu && !prevShowBuyMenu) {
        cardMenu.resetEntrance();
        audio.playShopSong();
    } else if (!state.showBuyMenu && prevShowBuyMenu) {
        audio.stopShopSong();
    }
    prevShowBuyMenu = state.showBuyMenu;
    
    if (state.isPaused) {
        if (state.showBuyMenu) {
            cardMenu.update(deltaTime);
            cardMenu.render(renderer.ctx, state.screenWidth, state.screenHeight);
        } else {
            renderer.render(state, 0);
        }
        applyFisheyeEffect();
        requestAnimationFrame(gameLoop);
        return;
    }
    
    if (state.showBuyMenu) {
        cardMenu.update(deltaTime);
        cardMenu.render(renderer.ctx, state.screenWidth, state.screenHeight);
    } else {
        update(deltaTime);
        renderer.updateParticles(deltaTime);
        renderer.render(state, deltaTime);
        scrollController.update(state);
    }
    
    applyFisheyeEffect();
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
