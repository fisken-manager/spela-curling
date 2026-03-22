export class AudioController {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.sourceNode = null;
        this.isPlaying = false;
        this.currentPosition = 0;
        this.playbackRate = 1;
        this.lastStartTime = 0;
        this.maxVelocity = 12;
        this.playlist = [];
        this.currentIndex = 0;
        this.audioBuffers = [];
        this.manuallyStopped = false;
    }

    async init(playlist) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.playlist = playlist;
        this.currentIndex = 0;
        
        for (const url of playlist) {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.audioBuffers.push(buffer);
            console.log(`Loaded: ${url} (${buffer.duration}s)`);
        }
        
        this.audioBuffer = this.audioBuffers[0];
        console.log(`Playlist ready: ${playlist.length} tracks`);
    }

    resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    play() {
        if (!this.audioBuffer || this.isPlaying) return;
        
        this.resumeContext();
        this.manuallyStopped = false;
        
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
            if (!this.manuallyStopped) {
                this.advanceTrack();
            }
        };
    }

    advanceTrack() {
        this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
        this.audioBuffer = this.audioBuffers[this.currentIndex];
        this.currentPosition = 0;
        console.log(`Now playing: ${this.playlist[this.currentIndex]}`);
        this.play();
    }

    stop() {
        if (!this.isPlaying) return;
        
        this.manuallyStopped = true;
        
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