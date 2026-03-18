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