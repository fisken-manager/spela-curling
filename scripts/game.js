import { AudioController } from './audio.js';
import { GameState } from './state.js';
import { Physics } from './physics.js';
import { InputHandler } from './input.js';
import { Renderer } from './renderer.js';
import { ScrollController } from './scroll.js';
import { TransitionController } from './transition.js';

const audio = new AudioController();
const state = new GameState();
const physics = new Physics();
const transition = new TransitionController();
let input = null;
let renderer = null;
let scrollController = null;
let lastTime = 0;

function setupControls() {
    const controlsPanel = document.getElementById('physics-controls');
    controlsPanel.addEventListener('mousedown', (e) => e.stopPropagation());
    controlsPanel.addEventListener('touchstart', (e) => e.stopPropagation());

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

    frictionSlider.addEventListener('input', (e) => {
        physics.baseFriction = parseFloat(e.target.value);
        frictionVal.textContent = e.target.value;
    });

    curlSlider.addEventListener('input', (e) => {
        physics.curlStrength = parseFloat(e.target.value);
        curlVal.textContent = e.target.value;
    });

    angDecaySlider.addEventListener('input', (e) => {
        physics.angularDecayFactor = parseFloat(e.target.value);
        angDecayVal.textContent = e.target.value;
    });

    maxVelSlider.addEventListener('input', (e) => {
        physics.maxVelocity = parseFloat(e.target.value);
        maxVelVal.textContent = e.target.value;
    });

    rotRangeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        physics.minAngularVelocity = -val;
        physics.maxAngularVelocity = val;
        rotRangeVal.textContent = val;
    });
}

async function init() {
    console.log('Curling Scroll initialized');
    state.updateScreenDimensions();
    
    const canvas = document.getElementById('game-canvas');
    canvas.width = state.screenWidth;
    canvas.height = state.screenHeight;
    
    renderer = new Renderer(canvas);
    input = new InputHandler(canvas, state, physics, audio);
    scrollController = new ScrollController(state, audio);
    setupControls();
    
    state.initPowerUps();
    state.initScoringOrbs();
    
    await audio.init('song.wav');
    
    console.log('All systems ready');
    requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
    const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;
    
    update(deltaTime);
    renderer.updateParticles(deltaTime);
    renderer.render(state, deltaTime);
    scrollController.update(state);
    
    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    updatePower(deltaTime);
    
    if (state.phase === 'moving') {
        physics.update(state, deltaTime);
    } else if (state.phase === 'returning') {
        if (!transition.isTransitioning()) {
            transition.start(state);
        }
        transition.update(deltaTime, state, scrollController);
    }
}

function updatePower(deltaTime) {
    if (state.phase === 'charging' && state.input.isDragging) {
        state.power.value += state.power.direction * state.power.oscillationRate * deltaTime;
        
        if (state.power.value >= 100) {
            state.power.value = 100;
            state.power.direction = -1;
        } else if (state.power.value <= 0) {
            state.power.value = 0;
            state.power.direction = 1;
        }
    }
}

init().catch(console.error);