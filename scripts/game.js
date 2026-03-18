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