export class AudioController {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.sourceNode = null;
        this.isPlaying = false;
        this.currentPosition = 0;
        this.playbackRate = 1;
        this.lastStartTime = 0;
        this.playlist = [];
        this.currentIndex = 0;
        this.audioBuffers = [];
        this.manuallyStopped = false;
        this.shopBuffer = null;
        this.shopSourceNode = null;
        this.shopGainNode = null;
        this.isShopPlaying = false;
        this.gainNode = null;
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

    async loadShopSong(url) {
        if (!this.audioContext) return;
        
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            this.shopBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            console.log(`Loaded shop song: ${url}`);
        } catch (e) {
            console.warn('Failed to load shop song:', e);
        }
    }

    playShopSong() {
        if (!this.shopBuffer || this.isShopPlaying) return;
        
        this.resumeContext();
        
        this.shopSourceNode = this.audioContext.createBufferSource();
        this.shopSourceNode.buffer = this.shopBuffer;
        
        // Create gain node for volume control (50% volume)
        this.shopGainNode = this.audioContext.createGain();
        this.shopGainNode.gain.value = 0.5;
        
        this.shopSourceNode.connect(this.shopGainNode);
        this.shopGainNode.connect(this.audioContext.destination);
        this.shopSourceNode.start(0);
        this.isShopPlaying = true;
        
        this.shopSourceNode.onended = () => {
            this.isShopPlaying = false;
            this.shopSourceNode = null;
            this.shopGainNode = null;
        };
    }

    stopShopSong() {
        if (!this.isShopPlaying || !this.shopSourceNode) return;
        
        try {
            this.shopSourceNode.stop();
            this.shopSourceNode.disconnect();
            if (this.shopGainNode) {
                this.shopGainNode.disconnect();
            }
        } catch (e) {}
        
        this.shopSourceNode = null;
        this.shopGainNode = null;
        this.isShopPlaying = false;
    }

    fadeOutAndStop(duration = 0.5) {
        if (!this.isPlaying || !this.sourceNode) return;
        
        if (!this.gainNode) {
            this.gainNode = this.audioContext.createGain();
            this.sourceNode.disconnect();
            this.sourceNode.connect(this.gainNode);
            this.gainNode.connect(this.audioContext.destination);
        }
        
        const currentTime = this.audioContext.currentTime;
        this.gainNode.gain.setValueAtTime(1, currentTime);
        this.gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + duration);
        
        setTimeout(() => {
            this.stop();
            if (this.gainNode) {
                this.gainNode.gain.value = 1;
            }
        }, duration * 1000);
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
}