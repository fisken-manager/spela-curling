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
        // Bitcrusher node for Tjärens Offer
        this.bitcrusherNode = null;
        this.tarBoostActive = false;
        // Sub-bass oscillator for Händelsehorisonten
        this.subBassOscillator = null;
        this.subBassGain = null;
        this.eventHorizonActive = false;
        // Metallic ping nodes for Slitvargens Flit
        this.metallicPingNode = null;
        this.metallicPingGain = null;
        // Tremolo for Sillens Sista Dans
        this.tremoloOscillator = null;
        this.tremoloGain = null;
        this.herringsLastDanceActive = false;
        this.lastLives = null;
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

    // Safety reset - call this to ensure audio returns to normal state
    resetAudioEffects() {
        if (!this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // Reset filter to bypass
        if (this.filterNode) {
            this.filterNode.frequency.cancelScheduledValues(now);
            this.filterNode.Q.cancelScheduledValues(now);
            this.filterNode.frequency.setValueAtTime(20000, now);
            this.filterNode.Q.setValueAtTime(1, now);
        }
        
        // Reset gains to normal
        if (this.dryGain) {
            this.dryGain.gain.cancelScheduledValues(now);
            this.dryGain.gain.setValueAtTime(1.0, now);
        }
        
        if (this.wetGain) {
            this.wetGain.gain.cancelScheduledValues(now);
            this.wetGain.gain.setValueAtTime(0.0, now);
        }
        
        // Stop tremolo if active
        if (this.tremoloOscillator) {
            this.tremoloOscillator.stop();
            this.tremoloOscillator.disconnect();
            if (this.tremoloGain) this.tremoloGain.disconnect();
            this.tremoloOscillator = null;
            this.tremoloGain = null;
        }
        
        // End tar boost if active
        if (this.tarBoostActive) {
            this.endTarBoost();
        }
        
        // Stop sub-bass if active
        if (this.subBassOscillator) {
            this.subBassOscillator.stop();
            this.subBassOscillator.disconnect();
            if (this.subBassGain) this.subBassGain.disconnect();
            this.subBassOscillator = null;
            this.subBassGain = null;
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
        
        // Return to bypass state after effect - FASTER
        setTimeout(() => {
            if (this.filterNode && this.audioContext) {
                const restoreTime = this.audioContext.currentTime;
                this.filterNode.frequency.cancelScheduledValues(restoreTime);
                this.filterNode.frequency.setValueAtTime(20000, restoreTime); // Hard reset
                this.filterNode.Q.setValueAtTime(1, restoreTime); // Hard reset
            }
        }, duration * 1000 + 50); // +50ms buffer
    }

    triggerEchoEffect(intensity = 1) {
        if (!this.audioContext || !this.wetGain || !this.dryGain) return;
        
        const now = this.audioContext.currentTime;
        
        // Intensity-based echo levels
        const wetAmount = Math.min(0.7, 0.35 + (intensity * 0.15));
        const dryAmount = 1.0 - (wetAmount * 0.15);
        
        // Fade in echo quickly over 30ms
        this.dryGain.gain.cancelScheduledValues(now);
        this.wetGain.gain.cancelScheduledValues(now);
        
        this.dryGain.gain.setValueAtTime(dryAmount, now);
        this.wetGain.gain.setValueAtTime(wetAmount, now);
        
        // Shorter hold time - 0.4 to 1.0 seconds
        const holdTime = 0.4 + (intensity * 0.3);
        
        // Fade back to dry faster
        setTimeout(() => {
            if (this.dryGain && this.wetGain && this.audioContext) {
                const fadeTime = this.audioContext.currentTime;
                const fadeDuration = 0.3; // Fast fade out
                
                this.dryGain.gain.cancelScheduledValues(fadeTime);
                this.wetGain.gain.cancelScheduledValues(fadeTime);
                
                this.dryGain.gain.setValueAtTime(1.0, fadeTime);
                this.wetGain.gain.setValueAtTime(0.0, fadeTime);
                
                this.dryGain.gain.linearRampToValueAtTime(1.0, fadeTime + fadeDuration);
                this.wetGain.gain.linearRampToValueAtTime(0.0, fadeTime + fadeDuration);
            }
        }, holdTime * 1000);
    }

    // === Tjärens Offer (tar_launch) - Inferno Mode ===
    triggerTarBoost(level = 1, duration = 10) {
        if (!this.audioContext || !this.filterNode) return;
        
        const now = this.audioContext.currentTime;
        this.tarBoostActive = true;
        
        // Intensity based on tar_launch level - MORE EXTREME
        const intensity = level === 1 ? 2.0 : 3.0;
        
        // Create bitcrusher effect using waveshaper for distortion - MORE DISTORTION
        if (!this.bitcrusherNode) {
            this.bitcrusherNode = this.audioContext.createWaveShaper();
            this.bitcrusherNode.curve = this._makeDistortionCurve(intensity * 100); // Doubled from 50 to 100
            this.bitcrusherNode.oversample = '4x';
        } else {
            this.bitcrusherNode.curve = this._makeDistortionCurve(intensity * 100);
        }
        
        // Ramp up distortion faster - 0.3s
        const rampUpTime = 0.3;
        
        // More dramatic filter sweep - start lower, peak higher
        this.filterNode.frequency.cancelScheduledValues(now);
        this.filterNode.Q.cancelScheduledValues(now);
        
        this.filterNode.frequency.setValueAtTime(400, now); // Start very muffled (400Hz)
        this.filterNode.frequency.exponentialRampToValueAtTime(6000, now + rampUpTime); // Peak much higher
        this.filterNode.frequency.exponentialRampToValueAtTime(400, now + duration - 0.3); // Close near end
        
        // Increase Q for more resonance/character
        this.filterNode.Q.setValueAtTime(5, now);
        this.filterNode.Q.linearRampToValueAtTime(8, now + rampUpTime);
        this.filterNode.Q.linearRampToValueAtTime(5, now + duration - 0.3);
        
        // Insert bitcrusher into the chain temporarily
        if (this.filterNode && this.dryGain) {
            this.filterNode.disconnect();
            this.filterNode.connect(this.bitcrusherNode);
            this.bitcrusherNode.connect(this.dryGain);
        }
        
        // End the effect after duration
        setTimeout(() => {
            this.endTarBoost();
        }, duration * 1000);
    }
    
    endTarBoost() {
        if (!this.audioContext || !this.tarBoostActive) return;
        
        const now = this.audioContext.currentTime;
        this.tarBoostActive = false;
        
        // Ramp down distortion and return to bypass
        if (this.filterNode && this.dryGain && this.bitcrusherNode) {
            this.filterNode.frequency.cancelScheduledValues(now);
            this.filterNode.Q.cancelScheduledValues(now);
            
            // Hard reset to bypass
            this.filterNode.frequency.setValueAtTime(20000, now);
            this.filterNode.Q.setValueAtTime(1, now);
            
            // Remove bitcrusher from chain
            this.filterNode.disconnect();
            this.bitcrusherNode.disconnect();
            this.filterNode.connect(this.dryGain);
        }
    }
    
    _makeDistortionCurve(amount) {
        const k = typeof amount === 'number' ? amount : 50;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            const x = i * 2 / n_samples - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    // === Händelsehorisonten (event_horizon) - Sub-bass Rumble ===
    updateEventHorizonRumble(pickupCount = 0, maxPickups = 5) {
        if (!this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // Create or update sub-bass oscillator
        if (!this.subBassOscillator && pickupCount > 0) {
            this.subBassOscillator = this.audioContext.createOscillator();
            this.subBassOscillator.type = 'sine';
            this.subBassOscillator.frequency.value = 45; // 45Hz sub-bass
            
            this.subBassGain = this.audioContext.createGain();
            this.subBassGain.gain.value = 0;
            
            this.subBassOscillator.connect(this.subBassGain);
            this.subBassGain.connect(this.audioContext.destination);
            this.subBassOscillator.start();
        }
        
        if (this.subBassGain) {
            // Volume scales with pickup count (0 to 0.25 max)
            const rumbleVolume = Math.min(0.25, (pickupCount / maxPickups) * 0.25);
            this.subBassGain.gain.setTargetAtTime(rumbleVolume, now, 0.1);
        }
        
        // Stop if no pickups
        if (pickupCount === 0 && this.subBassOscillator) {
            if (this.subBassGain) {
                this.subBassGain.gain.setTargetAtTime(0, now, 0.2);
            }
            setTimeout(() => {
                if (this.subBassOscillator) {
                    this.subBassOscillator.stop();
                    this.subBassOscillator.disconnect();
                    this.subBassOscillator = null;
                    if (this.subBassGain) {
                        this.subBassGain.disconnect();
                        this.subBassGain = null;
                    }
                }
            }, 300);
        }
    }

    // === Slitvargens Flit (friction_forge) - Metallic Ping ===
    triggerMetallicPing(bounceCount = 1) {
        if (!this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // Create metallic ping using bandpass filter + short decay
        const pingOsc = this.audioContext.createOscillator();
        const pingGain = this.audioContext.createGain();
        const pingFilter = this.audioContext.createBiquadFilter();
        
        // Ping frequency slides from 1200Hz down to 600Hz
        pingOsc.type = 'triangle';
        pingOsc.frequency.setValueAtTime(1200, now);
        pingOsc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        
        // Sharp bandpass for metallic character
        pingFilter.type = 'bandpass';
        pingFilter.frequency.value = 1000;
        pingFilter.Q.value = 15;
        
        // Volume based on bounce streak
        const volume = Math.min(0.3, 0.1 + (bounceCount * 0.05));
        pingGain.gain.setValueAtTime(volume, now);
        pingGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        pingOsc.connect(pingFilter);
        pingFilter.connect(pingGain);
        pingGain.connect(this.audioContext.destination);
        
        pingOsc.start(now);
        pingOsc.stop(now + 0.35);
        
        // Add harmonic overtones to music if bounce streak is high
        if (bounceCount >= 3 && this.filterNode) {
            this.filterNode.Q.setTargetAtTime(3 + (bounceCount * 0.5), now, 0.1);
        }
    }

    // === Timmermannens Grepp (rail_rider) - Pitch Bend UP (without speed change) ===
    triggerRailRiderSlide(active = true, duration = 2) {
        if (!this.audioContext || !this.sourceNode) return;
        
        const now = this.audioContext.currentTime;
        
        if (active) {
            // Pitch UP using detune (cents) - doesn't affect playback speed
            // +600 cents = +6 semitones (tritone up) - very noticeable but musical
            const originalDetune = 0;
            const bentDetune = 600; // 6 semitones up (was 400)
            
            // Also add high-pass filter to make it feel "airy" while sliding
            if (this.filterNode) {
                this.filterNode.frequency.cancelScheduledValues(now);
                this.filterNode.frequency.setValueAtTime(20000, now);
                // High-pass sweep: cut bass, emphasize treble for "sliding on rails" feel
                this.filterNode.frequency.exponentialRampToValueAtTime(800, now + 0.1);
                this.filterNode.Q.setValueAtTime(1, now);
                this.filterNode.Q.linearRampToValueAtTime(4, now + 0.2);
            }
            
            // Immediate dramatic pitch rise
            this.sourceNode.detune.cancelScheduledValues(now);
            this.sourceNode.detune.setValueAtTime(originalDetune, now);
            this.sourceNode.detune.linearRampToValueAtTime(bentDetune, now + 0.1);
            
            // Hold the bent pitch for most of the duration
            const holdEnd = now + duration - 0.4;
            if (holdEnd > now + 0.2) {
                this.sourceNode.detune.setValueAtTime(bentDetune, holdEnd);
            }
            
            // Schedule return to normal pitch
            setTimeout(() => {
                if (this.sourceNode && this.audioContext) {
                    const returnTime = this.audioContext.currentTime;
                    // Return with exponential curve
                    this.sourceNode.detune.cancelScheduledValues(returnTime);
                    this.sourceNode.detune.setValueAtTime(bentDetune, returnTime);
                    this.sourceNode.detune.linearRampToValueAtTime(originalDetune, returnTime + 0.4);
                    
                    // Reset filter
                    if (this.filterNode) {
                        this.filterNode.frequency.cancelScheduledValues(returnTime);
                        this.filterNode.Q.cancelScheduledValues(returnTime);
                        this.filterNode.frequency.setValueAtTime(20000, returnTime);
                        this.filterNode.Q.setValueAtTime(1, returnTime);
                    }
                }
            }, duration * 1000);
        }
    }

    // === Sillens Sista Dans (herrings_last_dance) - Tremolo vs Muffled ===
    updateHerringsDanceEffect(lives = 1) {
        if (!this.audioContext || !this.filterNode) return;
        
        const now = this.audioContext.currentTime;
        
        // If lives changed, update effect
        if (this.lastLives !== lives) {
            this.lastLives = lives;
            
            if (lives === 0) {
                // At 0 lives: Add tremolo (panic effect)
                if (!this.tremoloOscillator) {
                    this.tremoloOscillator = this.audioContext.createOscillator();
                    this.tremoloOscillator.type = 'sine';
                    this.tremoloOscillator.frequency.value = 5; // 5Hz tremolo
                    
                    this.tremoloGain = this.audioContext.createGain();
                    this.tremoloGain.gain.value = 0.3; // 30% depth
                    
                    // Connect tremolo to modulate the dry gain
                    if (this.dryGain) {
                        this.tremoloOscillator.connect(this.tremoloGain);
                        this.tremoloGain.connect(this.dryGain.gain);
                        this.tremoloOscillator.start();
                    }
                }
                
                // Remove any lowpass muffling - return to full frequency
                this.filterNode.frequency.setTargetAtTime(20000, now, 0.3);
                
            } else {
                // At 1+ lives: Stop tremolo and return to normal
                if (this.tremoloOscillator) {
                    this.tremoloOscillator.stop();
                    this.tremoloOscillator.disconnect();
                    this.tremoloGain.disconnect();
                    this.tremoloOscillator = null;
                    this.tremoloGain = null;
                }
                
                // Return to normal frequency (not muffled!)
                this.filterNode.frequency.setTargetAtTime(20000, now, 0.3);
            }
        }
    }

    // === Blodspengar (coinSpeedBoost) - Staccato Chop + Filter ===
    triggerCoinChop(streakCount = 1) {
        if (!this.audioContext || !this.dryGain || !this.filterNode) return;
        
        const now = this.audioContext.currentTime;
        
        // Intensity based on streak - more coins = more aggressive effect
        const maxStreak = 5;
        const intensity = Math.min(streakCount / maxStreak, 1.0); // 0.0 to 1.0
        
        // Create staccato chop effect - rapidly gate the volume
        const chopDuration = 0.1 + (intensity * 0.1); // 100ms to 200ms (SHORTER!)
        const numChops = 2 + Math.floor(intensity * 3); // 2 to 5 chops
        const chopInterval = chopDuration / numChops;
        
        // Cancel any existing gain schedules
        this.dryGain.gain.cancelScheduledValues(now);
        this.filterNode.frequency.cancelScheduledValues(now);
        
        // Create the chop pattern (volume drops to near-zero then back)
        let currentTime = now;
        for (let i = 0; i < numChops; i++) {
            // Chop closed (silent)
            this.dryGain.gain.setValueAtTime(0.1, currentTime);
            currentTime += chopInterval * 0.3; // 30% of interval is "chopped"
            
            // Chop open (loud)
            this.dryGain.gain.setValueAtTime(1.0, currentTime);
            currentTime += chopInterval * 0.7; // 70% of interval is "open"
        }
        
        // High-pass filter opens up for brighter energy, then returns to bypass
        const peakFreq = 3000 + (intensity * 4000); // 3000Hz to 7000Hz
        
        this.filterNode.frequency.setValueAtTime(20000, now); // Start bypassed
        this.filterNode.frequency.exponentialRampToValueAtTime(peakFreq, now + chopDuration * 0.3);
        this.filterNode.frequency.exponentialRampToValueAtTime(20000, now + chopDuration); // Return to bypass!
        
        // Increase Q briefly
        this.filterNode.Q.setValueAtTime(1, now);
        this.filterNode.Q.linearRampToValueAtTime(2 + intensity * 2, now + chopDuration * 0.3);
        this.filterNode.Q.linearRampToValueAtTime(1, now + chopDuration);
        
        // Ensure everything resets after chops
        setTimeout(() => {
            if (this.dryGain && this.filterNode && this.audioContext) {
                const resetTime = this.audioContext.currentTime;
                this.dryGain.gain.cancelScheduledValues(resetTime);
                this.filterNode.frequency.cancelScheduledValues(resetTime);
                this.filterNode.Q.cancelScheduledValues(resetTime);
                
                // Hard reset to normal
                this.dryGain.gain.setValueAtTime(1.0, resetTime);
                this.filterNode.frequency.setValueAtTime(20000, resetTime);
                this.filterNode.Q.setValueAtTime(1, resetTime);
            }
        }, chopDuration * 1000 + 50); // +50ms buffer
    }
}
