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