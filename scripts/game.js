import { AudioController } from './audio.js';
import { GameState, GamePhase } from './state.js';
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