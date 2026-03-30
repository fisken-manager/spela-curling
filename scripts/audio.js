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
        this.filterNode = null;
        this.lastWhooshTime = 0;
        this.whooshCooldown = 0.08; // Minimum 80ms between whooshes
        // Echo nodes for Eko från Skogen
        this.delayNodeLeft = null;
        this.delayNodeRight = null;
        this.feedbackNodeLeft = null;
        this.feedbackNodeRight = null;
        this.mergerNode = null;
        this.dryGain = null;
        this.wetGain = null;
    }

    async init(playlist) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.playlist = playlist;
        this.currentIndex = 0;
        this.audioBuffers = new Array(playlist.length);
        
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
        
        console.log(`Playlist initialized, playing first of ${playlist.length} tracks`);
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
        this.sourceNode.playbackRate.value = this.playbackRate;
        
        // Create filter node for upgrade effects
        this.filterNode = this.audioContext.createBiquadFilter();
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.value = 20000; // Start "bypassed" (very high freq)
        this.filterNode.Q.value = 1;
        
        // Create stereo echo nodes for Eko från Skogen
        // Left delay
        this.delayNodeLeft = this.audioContext.createDelay(2.0);
        this.delayNodeLeft.delayTime.value = 0.18; // 180ms delay
        this.feedbackNodeLeft = this.audioContext.createGain();
        this.feedbackNodeLeft.gain.value = 0.55; // 55% feedback
        
        // Right delay
        this.delayNodeRight = this.audioContext.createDelay(2.0);
        this.delayNodeRight.delayTime.value = 0.12; // 120ms delay (offset from left)
        this.feedbackNodeRight = this.audioContext.createGain();
        this.feedbackNodeRight.gain.value = 0.5; // 50% feedback
        
        // Merger to combine left and right back to stereo
        this.mergerNode = this.audioContext.createChannelMerger(2);
        
        // Create dry/wet mix
        this.dryGain = this.audioContext.createGain();
        this.dryGain.gain.value = 1.0;
        this.wetGain = this.audioContext.createGain();
        this.wetGain.gain.value = 0.0; // Start dry (no echo)
        
        // Chain: source -> filter
        this.sourceNode.connect(this.filterNode);
        
        // Dry path: filter -> dryGain -> destination
        this.filterNode.connect(this.dryGain);
        this.dryGain.connect(this.audioContext.destination);
        
        // Wet path: filter -> delays (with feedback) -> wetGain -> merger -> destination
        this.filterNode.connect(this.delayNodeLeft);
        this.filterNode.connect(this.delayNodeRight);
        
        // Left delay feedback loop
        this.delayNodeLeft.connect(this.feedbackNodeLeft);
        this.feedbackNodeLeft.connect(this.delayNodeLeft);
        this.delayNodeLeft.connect(this.mergerNode, 0, 0); // Connect to left channel
        
        // Right delay feedback loop
        this.delayNodeRight.connect(this.feedbackNodeRight);
        this.feedbackNodeRight.connect(this.delayNodeRight);
        this.delayNodeRight.connect(this.mergerNode, 0, 1); // Connect to right channel
        
        // Merger output through wet gain
        this.mergerNode.connect(this.wetGain);
        this.wetGain.connect(this.audioContext.destination);
        
        const offset = this.currentPosition * this.audioBuffer.duration;
        this.sourceNode.start(0, offset);
        
        this.lastStartTime = this.audioContext.currentTime;
        this.isPlaying = true;
        
        this.sourceNode.onended = () => {
            this.isPlaying = false;
            this.filterNode = null;
            this.delayNodeLeft = null;
            this.delayNodeRight = null;
            this.feedbackNodeLeft = null;
            this.feedbackNodeRight = null;
            this.mergerNode = null;
            this.dryGain = null;
            this.wetGain = null;
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
        
        if (this.filterNode) {
            this.filterNode.disconnect();
            this.filterNode = null;
        }
        
        if (this.delayNodeLeft) {
            this.delayNodeLeft.disconnect();
            this.delayNodeLeft = null;
        }
        if (this.delayNodeRight) {
            this.delayNodeRight.disconnect();
            this.delayNodeRight = null;
        }
        if (this.feedbackNodeLeft) {
            this.feedbackNodeLeft.disconnect();
            this.feedbackNodeLeft = null;
        }
        if (this.feedbackNodeRight) {
            this.feedbackNodeRight.disconnect();
            this.feedbackNodeRight = null;
        }
        if (this.mergerNode) {
            this.mergerNode.disconnect();
            this.mergerNode = null;
        }
        if (this.dryGain) {
            this.dryGain.disconnect();
            this.dryGain = null;
        }
        if (this.wetGain) {
            this.wetGain.disconnect();
            this.wetGain = null;
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

    triggerTeleportWhoosh(velocityIntensity = 1) {
        if (!this.audioContext || !this.filterNode) return;
        
        const now = this.audioContext.currentTime;
        const nowMs = performance.now();
        
        // Cooldown check - don't overlap effects during rapid teleports
        if (nowMs - this.lastWhooshTime < this.whooshCooldown * 1000) {
            return;
        }
        this.lastWhooshTime = nowMs;
        
        // Exponential intensity scaling - fast speeds get MUCH more intense
        let intensity = velocityIntensity;
        if (velocityIntensity > 1.2) {
            intensity = Math.pow(velocityIntensity, 2.2) * 0.8;
        }
        intensity = Math.max(0.5, Math.min(8.0, intensity));
        
        // Duration gets shorter as speed increases (snappier effect)
        const baseDuration = 0.4;
        const duration = Math.max(0.15, baseDuration / Math.sqrt(intensity));
        const halfDuration = duration / 2;
        
        // More dramatic frequency sweep for higher speeds
        const baseFreq = Math.max(80, 200 - (intensity * 40));
        const peakFreq = 3000 + (intensity * 1200);
        
        // Set filter to lowpass with steeper rolloff at high speeds
        this.filterNode.type = 'lowpass';
        
        // Cancel any scheduled changes and start fresh
        this.filterNode.frequency.cancelScheduledValues(now);
        this.filterNode.Q.cancelScheduledValues(now);
        
        // Start at muffled base frequency
        this.filterNode.frequency.setValueAtTime(baseFreq, now);
        
        // Rapid sweep up to peak (shorter attack for fast speeds)
        const attackTime = Math.max(0.02, halfDuration * 0.4);
        this.filterNode.frequency.exponentialRampToValueAtTime(peakFreq, now + attackTime);
        
        // Decay back down
        this.filterNode.frequency.exponentialRampToValueAtTime(baseFreq, now + duration);
        
        // Dramatic Q curve - resonance peaks in the middle
        const baseQ = 0.7;
        const peakQ = 2 + (intensity * 1.5);
        this.filterNode.Q.setValueAtTime(baseQ, now);
        this.filterNode.Q.linearRampToValueAtTime(peakQ, now + attackTime);
        this.filterNode.Q.linearRampToValueAtTime(baseQ, now + duration);
        
        // Add playback rate modulation for extra "warp" effect at high speeds
        if (intensity > 1.5 && this.sourceNode) {
            const originalRate = this.playbackRate;
            const pitchDip = originalRate * (1 - Math.min(0.15, intensity * 0.03));
            const pitchPeak = originalRate * (1 + Math.min(0.08, intensity * 0.02));
            
            this.sourceNode.playbackRate.setValueAtTime(pitchDip, now);
            this.sourceNode.playbackRate.linearRampToValueAtTime(pitchPeak, now + attackTime);
            this.sourceNode.playbackRate.linearRampToValueAtTime(originalRate, now + duration);
        }
        
        // Return to bypass state after effect
        setTimeout(() => {
            if (this.filterNode && this.audioContext) {
                const restoreTime = this.audioContext.currentTime;
                this.filterNode.frequency.cancelScheduledValues(restoreTime);
                this.filterNode.frequency.setTargetAtTime(20000, restoreTime, 0.05);
                this.filterNode.Q.setTargetAtTime(1, restoreTime, 0.05);
            }
        }, duration * 1000);
    }

    triggerEchoEffect(intensity = 1) {
        if (!this.audioContext || !this.wetGain || !this.dryGain) return;
        
        const now = this.audioContext.currentTime;
        
        // MUCH MORE NOTICEABLE echo effect
        // intensity 0.8 -> strong echo (45% wet)
        // intensity 1.6 -> very strong echo (65% wet)
        // intensity 2.4 -> overwhelming echo (80% wet)
        const wetAmount = Math.min(0.8, 0.45 + (intensity * 0.15));
        const dryAmount = 1.0 - (wetAmount * 0.2); // Keep dry prominent so it doesn't get lost
        
        // Fade in echo quickly over 50ms
        this.dryGain.gain.cancelScheduledValues(now);
        this.wetGain.gain.cancelScheduledValues(now);
        
        // Immediate jump to echo levels for impact
        this.dryGain.gain.setValueAtTime(dryAmount, now);
        this.wetGain.gain.setValueAtTime(wetAmount, now);
        
        // Hold for 0.8-2.0 seconds depending on intensity (longer for more noticeable effect)
        const holdTime = 0.8 + (intensity * 0.5);
        
        // Fade back to dry more slowly
        setTimeout(() => {
            if (this.dryGain && this.wetGain && this.audioContext) {
                const fadeTime = this.audioContext.currentTime;
                const fadeDuration = 0.6; // Slower fade out
                
                this.dryGain.gain.cancelScheduledValues(fadeTime);
                this.wetGain.gain.cancelScheduledValues(fadeTime);
                
                this.dryGain.gain.setValueAtTime(this.dryGain.gain.value, fadeTime);
                this.wetGain.gain.setValueAtTime(this.wetGain.gain.value, fadeTime);
                
                this.dryGain.gain.linearRampToValueAtTime(1.0, fadeTime + fadeDuration);
                this.wetGain.gain.linearRampToValueAtTime(0.0, fadeTime + fadeDuration);
            }
        }, holdTime * 1000);
    }
}
