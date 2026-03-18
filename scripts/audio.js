export class AudioController {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.sourceNode = null;
        this.isPlaying = false;
        this.currentPosition = 0;
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

    setPosition(position) {
        const needsRestart = this.isPlaying;
        this.stop();
        this.currentPosition = Math.max(0, Math.min(1, position));
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
    }
}