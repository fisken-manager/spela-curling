export class AudioEffectsSystem {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.effectNodes = {};
        this.isInitialized = false;
        this.targetPlaybackRate = 1.0;
        
        // Effect parameter definitions
        this.effectDefinitions = {
            highpass: { type: 'biquad', filterType: 'highpass', defaultFreq: 1000, defaultQ: 1 },
            lowpass: { type: 'biquad', filterType: 'lowpass', defaultFreq: 8000, defaultQ: 1 },
            lowshelf: { type: 'biquad', filterType: 'lowshelf', defaultFreq: 200, defaultGain: 0 },
            delay: { type: 'delay', defaultTime: 0.15, defaultFeedback: 0.3 },
            distortion: { type: 'waveshaper', defaultAmount: 0 },
            bitcrusher: { type: 'bitcrusher', defaultBits: 16, defaultNormFreq: 1 },
            compressor: { type: 'dynamics', defaultThreshold: -24, defaultRatio: 4 },
            reverb: { type: 'convolution', defaultWet: 0 },
            stereoWidth: { type: 'stereo', defaultWidth: 1 },
            panner: { type: 'panner', defaultPan: 0 },
        };
    }

    init() {
        if (this.isInitialized) return;
        
        // Create effect nodes
        this.createBiquadFilter('highpass', 'highpass', 80);
        this.createBiquadFilter('lowpass', 'lowpass', 20000);
        this.createBiquadFilter('lowshelf', 'lowshelf', 200, 0);
        this.createDelayNode('delay', 0.001);
        this.createWaveShaper('distortion');
        this.createCompressor('compressor');
        this.createStereoPanner('panner');
        
        this.isInitialized = true;
        console.log('AudioEffectsSystem initialized');
    }

    createBiquadFilter(name, type, freq, gain = 0) {
        const filter = this.audioContext.createBiquadFilter();
        filter.type = type;
        filter.frequency.value = freq;
        filter.Q.value = 1;
        if (gain !== 0) filter.gain.value = gain;
        this.effectNodes[name] = filter;
        return filter;
    }

    createDelayNode(name, time) {
        const delay = this.audioContext.createDelay(1.0);
        delay.delayTime.value = time;
        this.effectNodes[name] = delay;
        return delay;
    }

    createWaveShaper(name) {
        const waveshaper = this.audioContext.createWaveShaper();
        waveshaper.curve = null;
        waveshaper.oversample = '4x';
        this.effectNodes[name] = waveshaper;
        return waveshaper;
    }

    makeDistortionCurve(amount) {
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

    createCompressor(name) {
        const compressor = this.audioContext.createDynamicsCompressor();
        compressor.threshold.value = -24;
        compressor.knee.value = 30;
        compressor.ratio.value = 1;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;
        this.effectNodes[name] = compressor;
        return compressor;
    }

    createStereoPanner(name) {
        const panner = this.audioContext.createStereoPanner();
        panner.pan.value = 0;
        this.effectNodes[name] = panner;
        return panner;
    }

    connectChain(sourceNode, destinationNode) {
        if (!this.isInitialized) this.init();
        
        // Chain: source → highpass → lowpass → delay → distortion → compressor → panner → destination
        const chain = [
            this.effectNodes.highpass,
            this.effectNodes.lowpass,
            this.effectNodes.delay,
            this.effectNodes.distortion,
            this.effectNodes.compressor,
            this.effectNodes.panner
        ];
        
        // Connect source to first effect
        sourceNode.connect(chain[0]);
        
        // Connect effects in series
        for (let i = 0; i < chain.length - 1; i++) {
            chain[i].connect(chain[i + 1]);
        }
        
        // Connect last effect to destination
        chain[chain.length - 1].connect(destinationNode);
    }

    disconnectChain() {
        Object.values(this.effectNodes).forEach(node => {
            try {
                node.disconnect();
            } catch (e) {}
        });
    }

    updateFromUpgrades(upgrades, physics = {}) {
        if (!this.isInitialized) return;
        
        // Calculate effect parameters based on upgrades
        const params = this.calculateEffectParams(upgrades, physics);
        
        // Apply to effect nodes
        this.applyParams(params);
    }

    calculateEffectParams(upgrades, physics) {
        const params = {
            highpassFreq: 80,  // default nearly transparent
            lowpassFreq: 20000,
            lowshelfGain: 0,
            delayTime: 0.001,  // default = no delay heard
            distortionAmount: 0,
            compressorThreshold: -24,
            compressorRatio: 1,
            pan: 0,
            playbackRate: 1.0,
        };

        // Speed upgrade: highpass filter brightens sound
        const speedLevel = upgrades.speed?.level || 0;
        if (speedLevel > 0) {
            params.highpassFreq = Math.min(1000 + (speedLevel * 500), 8000);
            params.playbackRate = 1.0 + (speedLevel * 0.01);
        }

        // Friction upgrade: chorus-like effect via delay modulation
        const frictionLevel = upgrades.friction?.level || 0;
        if (frictionLevel > 0) {
            params.delayTime = 0.005 + (frictionLevel * 0.003); // subtle chorus
        }

        // Size upgrade: lowshelf boost for "heaviness"
        const sizeLevel = upgrades.size?.level || 0;
        if (sizeLevel > 0) {
            params.lowshelfGain = sizeLevel * 4;
            params.playbackRate = Math.max(0.94, 1.0 - (sizeLevel * 0.006));
        }

        // Glass cannon: distortion + compression
        const glassLevel = upgrades.glass_cannon?.level || 0;
        if (glassLevel > 0) {
            params.distortionAmount = glassLevel * 20;
            params.compressorThreshold = -20 - (glassLevel * 5);
            params.compressorRatio = 4 + (glassLevel * 2);
        }

        // Gold grift: bitcrushing effect via waveshaper
        const griftLevel = upgrades.gold_grift?.level || 0;
        if (griftLevel > 0) {
            params.distortionAmount = Math.max(params.distortionAmount, griftLevel * 30);
            params.lowpassFreq = Math.min(params.lowpassFreq, 8000 - (griftLevel * 1500));
        }

        // Spiders web: lowpass dampening
        const spiderLevel = upgrades.spiders_web?.level || 0;
        if (spiderLevel > 0) {
            params.lowpassFreq = Math.min(params.lowpassFreq, 8000 - (spiderLevel * 1500));
        }

        // Friction forge: lowpass + distortion
        const forgeLevel = upgrades.friction_forge?.level || 0;
        if (forgeLevel > 0) {
            params.lowpassFreq = Math.min(params.lowpassFreq, 2000 - (forgeLevel * 300));
            params.distortionAmount = Math.max(params.distortionAmount, forgeLevel * 15);
        }

        // Snap curl: panning based on velocity
        const snapLevel = upgrades.snap_curl?.level || 0;
        if (snapLevel > 0 && physics.velocity) {
            params.pan = Math.max(-1, Math.min(1, physics.velocity.x * 0.5));
        }

        // Tar launch: heavy compression during boost
        const tarLevel = upgrades.tar_launch?.level || 0;
        if (tarLevel > 0) {
            if (physics.tarBoostActive) {
                params.compressorThreshold = -12;
                params.compressorRatio = 8 + (tarLevel * 4);
                params.distortionAmount = Math.max(params.distortionAmount, 50 + (tarLevel * 25));
            } else {
                // Baseline compression even when not boosted
                params.compressorThreshold = Math.min(params.compressorThreshold, -18);
                params.compressorRatio = Math.max(params.compressorRatio, 3);
            }
        }

        // Herring's last dance: dynamic based on lives
        const herringLevel = upgrades.herrings_last_dance?.level || 0;
        if (herringLevel > 0) {
            const lives = physics.lives ?? 1;
            if (lives === 0) {
                params.highpassFreq = 80; // Full bandwidth
                params.playbackRate = 1.05; // Slightly faster/pitched up
                params.distortionAmount = Math.max(params.distortionAmount, 40);
            } else {
                params.lowpassFreq = Math.min(params.lowpassFreq, lives * 1000 + 2000);
            }
        }

        // Dimension door: subtle delay effect
        const doorLevel = upgrades.dimension_door?.level || 0;
        if (doorLevel > 0) {
            params.delayTime = Math.max(params.delayTime, 0.01 + (doorLevel * 0.01));
        }

        // Cursed harvest: pitch down + reverb feeling via delay
        const harvestLevel = upgrades.cursed_harvest?.level || 0;
        if (harvestLevel > 0) {
            params.playbackRate = Math.max(0.92, params.playbackRate - (harvestLevel * 0.02));
            params.delayTime = Math.max(params.delayTime, 0.02 + (harvestLevel * 0.01));
        }

        // Echo woods: delay/reverb feel
        const echoLevel = upgrades.echo_woods?.level || 0;
        if (echoLevel > 0) {
            params.delayTime = Math.max(params.delayTime, 0.02 + (echoLevel * 0.015));
        }

        // Double shops: slight saturation feel
        const shopLevel = upgrades.double_shops?.level || 0;
        if (shopLevel > 0) {
            params.distortionAmount = Math.max(params.distortionAmount, shopLevel * 8);
        }

        // Spin_win: adds subtle stereo panning based on rotation
        const spinWinLevel = upgrades.spin_win?.level || 0;
        if (spinWinLevel > 0 && physics.angularVelocity) {
            const spin = Math.abs(physics.angularVelocity);
            // Gentle panning based on rotation direction
            params.pan = Math.max(-1, Math.min(1, (physics.angularVelocity / 10) * spinWinLevel * 0.3));
        }

        // Spin_to_speed: adds mechanical stuttering effect via slight pitch modulation
        const spinToSpeedLevel = upgrades.spin_to_speed?.level || 0;
        if (spinToSpeedLevel > 0) {
            // Add slight pitch wobble based on tier
            const wobble = Math.sin(Date.now() * 0.01) * spinToSpeedLevel * 0.005;
            params.playbackRate = Math.max(0.95, Math.min(1.05, params.playbackRate + wobble));
        }

        // Cleanse: this should work by reducing other negative effects
        // but the effects themselves are computed from upgrades, so cleanse
        // just means "I don't have negative upgrades" - handled naturally

        return params;
    }

    applyParams(params) {
        const now = this.audioContext.currentTime;
        const rampTime = 0.15; // 150ms smooth transition

        // Highpass filter
        try {
            this.effectNodes.highpass.frequency.linearRampToValueAtTime(
                Math.max(20, params.highpassFreq), now + rampTime
            );
        } catch (e) {}

        // Lowpass filter
        try {
            this.effectNodes.lowpass.frequency.linearRampToValueAtTime(
                Math.max(100, Math.min(20000, params.lowpassFreq)), now + rampTime
            );
        } catch (e) {}

        // Lowshelf gain
        try {
            this.effectNodes.lowshelf.gain.linearRampToValueAtTime(params.lowshelfGain, now + rampTime);
        } catch (e) {}

        // Delay time
        try {
            this.effectNodes.delay.delayTime.linearRampToValueAtTime(params.delayTime, now + rampTime);
        } catch (e) {}

        // Distortion
        if (params.distortionAmount > 0) {
            this.effectNodes.distortion.curve = this.makeDistortionCurve(params.distortionAmount);
        } else {
            this.effectNodes.distortion.curve = null;
        }

        // Compressor
        try {
            this.effectNodes.compressor.threshold.linearRampToValueAtTime(params.compressorThreshold, now + rampTime);
            this.effectNodes.compressor.ratio.linearRampToValueAtTime(params.compressorRatio, now + rampTime);
        } catch (e) {}

        // Panner
        try {
            this.effectNodes.panner.pan.linearRampToValueAtTime(params.pan, now + rampTime);
        } catch (e) {}

        // Playback rate
        this.targetPlaybackRate = params.playbackRate;
    }

    triggerEffect(name, data = {}) {
        switch (name) {
            case 'wallBounce':
                this.triggerWallBounceEffect(data);
                break;
            case 'coinCollect':
                this.triggerCoinCollectEffect(data);
                break;
            case 'dimensionDoor':
                this.triggerDimensionDoorEffect();
                break;
        }
    }

    triggerWallBounceEffect(data) {
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        // Momentary boost to delay for bounce echo
        const delayLevel = data.wallSpeedLevel || 0;
        if (delayLevel > 0) {
            const bounceDelay = 0.1 + (delayLevel * 0.05);
            this.effectNodes.delay.delayTime.setValueAtTime(bounceDelay, now);
            this.effectNodes.delay.delayTime.linearRampToValueAtTime(0.001, now + 0.3);
        }
    }

    triggerCoinCollectEffect(data) {
        if (!this.isInitialized) return;
        // Subtle frequency boost momentarily
        const now = this.audioContext.currentTime;
        const originalFreq = this.effectNodes.lowshelf.frequency.value;
        
        this.effectNodes.lowshelf.frequency.setValueAtTime(400, now);
        this.effectNodes.lowshelf.frequency.linearRampToValueAtTime(originalFreq, now + 0.1);
    }

    triggerDimensionDoorEffect() {
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        
        // Flanger swoosh: modulate delay time quickly
        this.effectNodes.delay.delayTime.setValueAtTime(0.005, now);
        this.effectNodes.delay.delayTime.linearRampToValueAtTime(0.03, now + 0.05);
        this.effectNodes.delay.delayTime.linearRampToValueAtTime(0.001, now + 0.2);
    }

    setPlaybackRate(rate) {
        this.targetPlaybackRate = rate;
    }

    getPlaybackRate() {
        return this.targetPlaybackRate || 1.0;
    }
}
