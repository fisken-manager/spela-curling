import { AudioController } from './audio.js';

const audio = new AudioController();

async function init() {
    console.log('Curling Scroll initialized');
    await audio.init('song.wav');
    console.log('Audio ready');
}

init().catch(console.error);