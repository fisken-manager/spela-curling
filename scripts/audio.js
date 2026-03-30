import { AudioEffectsSystem } from './audio-effects.js';

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
        this.effectsSystem = null;
        this.activeUpgrades = {};
        this.currentPlaybackRate = 1.0;
    }

    async init(playlist) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.playlist = playlist;
        this.currentIndex = 0;
        this.audioBuffers = new Array(playlist.length);
        
        // Initialize effects system
        this.effectsSystem = new AudioEffectsSystem(this.audioContext);
        this.effectsSystem.init();
        
        if (playlist.length > 0) {
            // Load the first song
            const firstUrl = playlist[0];
            const response = await fetch(firstUrl);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.audioBuffers[0] = buffer;
            this.audioBuffer = buffer;
            console.log(`Loaded first track: ${firstUrl} (${buffer.duration}s)`);
            
            // Load the rest in the background
            this._loadRemainingSongs(playlist);
        }
        
        console.log(`Playlist initialized with audio effects, playing first of ${playlist.length} tracks`);
    }

    async _loadRemainingSongs(playlist) {
        for (let i = 1; i < playlist.length; i++) {
            const url = playlist[i];
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const buffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.audioBuffers[i] = buffer;
                console.log(`Loaded background track: ${url} (${buffer.duration}s)`);
            } catch (err) {
                console.warn(`Failed to load background track: ${url}`, err);
            }
        }
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
        this.sourceNode.playbackRate.value = this.currentPlaybackRate;
        
        // ALWAYS connect directly to destination - no effects chain
        // Effects are handled via playback rate modulation only
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
        let attempts = 0;
        let originalIndex = this.currentIndex;
        this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
        
        // Find the next loaded track, if any
        while (!this.audioBuffers[this.currentIndex] && attempts < this.playlist.length) {
            console.warn(`Track ${this.playlist[this.currentIndex]} not loaded yet, skipping...`);
            this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
            attempts++;
        }
        
        if (!this.audioBuffers[this.currentIndex]) {
            console.error("No loaded tracks found in playlist!");
            this.currentIndex = originalIndex;
            return;
        }

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
        
        // No effects chain to disconnect - effects use playback rate only
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
        this.currentPlaybackRate = rate;
        if (this.sourceNode) {
            this.sourceNode.playbackRate.linearRampToValueAtTime(rate, this.audioContext.currentTime + 0.1);
        }
    }

    triggerAudioEffect(eventType, data = {}) {
        if (!this.effectsSystem) return;
        
        // Just trigger the effect - no per-frame updates needed
        switch(eventType) {
            case 'wallBounce':
                this.effectsSystem.triggerWallBounce(this.activeUpgrades);
                break;
            case 'coinCollect':
                this.effectsSystem.triggerCoinCollect(this.activeUpgrades);
                break;
            case 'dimensionDoor':
                this.effectsSystem.triggerDimensionDoor(this.activeUpgrades);
                break;
            case 'negativePickup':
                this.effectsSystem.triggerNegativePickup(this.activeUpgrades);
                break;
            case 'sweepStart':
                this.effectsSystem.triggerSweepStart(this.activeUpgrades);
                break;
            case 'sweepEnd':
                this.effectsSystem.triggerSweepEnd(this.activeUpgrades);
                break;
            case 'directionChange':
                this.effectsSystem.triggerDirectionChange(this.activeUpgrades);
                break;
            case 'tarBoost':
                this.effectsSystem.triggerTarBoost(this.activeUpgrades);
                break;
            case 'herringsLastDance':
                this.effectsSystem.triggerHerringsLastDance(this.activeUpgrades);
                break;
        }
    }

    updateEffects(upgrades, physics) {
        if (!this.effectsSystem || !this.isPlaying) return;
        
        this.activeUpgrades = upgrades;
        this.effectsSystem.updateEffects(upgrades, physics);
        
        // Get target playback rate from effects system
        const newRate = this.effectsSystem.getPlaybackRate();
        
        // Apply to source node with smooth transition
        if (Math.abs(newRate - this.currentPlaybackRate) > 0.001 && this.sourceNode) {
            this.currentPlaybackRate = newRate;
            const now = this.audioContext.currentTime;
            try {
                this.sourceNode.playbackRate.linearRampToValueAtTime(newRate, now + 0.05);
            } catch (e) {
                // Fallback if ramp fails
                this.sourceNode.playbackRate.value = newRate;
            }
        }
    }
}