export class AudioEffectsSystem {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.effectNodes = {};
        this.isInitialized = false;
        this.targetPlaybackRate = 1.0;
        
        // Track passive effects (always active when upgrade owned)
        this.passiveParams = {
            highpassFreq: 80,
            lowpassFreq: 20000,
            lowshelfGain: 0,
            delayTime: 0.001,
            distortionAmount: 0,
            compressorThreshold: -24,
            compressorRatio: 1,
            pan: 0,
            playbackRate: 1.0,
        };
        
        // Track active temporary effects
        this.activeEffects = {};  // { upgradeId: { expiresAt, params } }
        
        // Combined params (passive + active effects blended)
        this.currentParams = { ...this.passiveParams };
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
        console.log('AudioEffectsSystem initialized (event-triggered)');
    }

    hasActiveEffects(upgrades) {
        for (const upgradeId in upgrades) {
            if (upgrades[upgradeId]?.level > 0) {
                return true;
            }
        }
        return false;
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
        
        const chain = [
            this.effectNodes.highpass,
            this.effectNodes.lowpass,
            this.effectNodes.delay,
            this.effectNodes.distortion,
            this.effectNodes.compressor,
            this.effectNodes.panner
        ];
        
        sourceNode.connect(chain[0]);
        
        for (let i = 0; i < chain.length - 1; i++) {
            chain[i].connect(chain[i + 1]);
        }
        
        chain[chain.length - 1].connect(destinationNode);
    }

    disconnectChain() {
        Object.values(this.effectNodes).forEach(node => {
            try {
                node.disconnect();
            } catch (e) {}
        });
    }

    // Update passive effects based on owned upgrades (continuous)
    updatePassiveEffects(upgrades) {
        const params = {
            highpassFreq: 80,
            lowpassFreq: 20000,
            lowshelfGain: 0,
            delayTime: 0.001,
            distortionAmount: 0,
            compressorThreshold: -24,
            compressorRatio: 1,
            pan: 0,
            playbackRate: 1.0,
        };

        // === PASSIVE UPGRADES (always active when owned) ===
        
        // speed: brightens sound
        const speedLevel = upgrades.speed?.level || 0;
        if (speedLevel > 0) {
            params.highpassFreq = 200 + (speedLevel * 150); // 350-950 Hz (moderate)
        }

        // friction: slippery feel (subtle delay)
        const frictionLevel = upgrades.friction?.level || 0;
        if (frictionLevel > 0) {
            params.delayTime = 0.003 + (frictionLevel * 0.002); // 0.005-0.013s
        }

        // size: heavier feel (bass boost)
        const sizeLevel = upgrades.size?.level || 0;
        if (sizeLevel > 0) {
            params.lowshelfGain = sizeLevel * 3; // 3-15 dB (moderate bass)
            params.playbackRate = 1.0 - (sizeLevel * 0.003); // 0.985-0.97 (slight pitch down)
        }

        // spiders_web: muffled feel
        const spiderLevel = upgrades.spiders_web?.level || 0;
        if (spiderLevel > 0) {
            params.lowpassFreq = 12000 - (spiderLevel * 1000); // 11000-8000 Hz
        }

        // glass_cannon: subtle grit
        const glassLevel = upgrades.glass_cannon?.level || 0;
        if (glassLevel > 0) {
            params.distortionAmount = glassLevel * 8; // 8-40 (light distortion)
        }

        // tar_launch: baseline compression (when NOT boosted)
        const tarLevel = upgrades.tar_launch?.level || 0;
        if (tarLevel > 0) {
            params.compressorThreshold = -20 - (tarLevel * 2); // -22 to -30
            params.compressorRatio = 2 + tarLevel; // 2-4 ratio
        }

        // spin_to_speed: mechanical texture (pitch wobble)
        const spinToSpeedLevel = upgrades.spin_to_speed?.level || 0;
        if (spinToSpeedLevel > 0) {
            const wobble = Math.sin(Date.now() * 0.005) * spinToSpeedLevel * 0.003;
            params.playbackRate = Math.max(0.95, Math.min(1.05, params.playbackRate + wobble));
        }

        // rail_rider: narrow stereo
        const railLevel = upgrades.rail_rider?.level || 0;
        if (railLevel > 0) {
            // Keep centered (pan = 0)
        }

        // double_shops: slight saturation
        const shopLevel = upgrades.double_shops?.level || 0;
        if (shopLevel > 0) {
            params.distortionAmount = Math.max(params.distortionAmount, shopLevel * 5);
        }

        // herrings_last_dance: dynamic based on lives (use last-known lives)
        const herringLevel = upgrades.herrings_last_dance?.level || 0;
        if (herringLevel > 0) {
            // Will be updated dynamically in updateEffects
            params.playbackRate = Math.max(params.playbackRate, 1.0);
        }

        // needle_eye: size affects friction
        const needleLevel = upgrades.needle_eye?.level || 0;
        if (needleLevel > 0 && sizeLevel > 0) {
            const frictionReduction = (sizeLevel * needleLevel * 0.002);
            params.delayTime = Math.max(0.001, params.delayTime - frictionReduction);
        }

        // event_horizon: slight pull (lowpass)
        const horizonLevel = upgrades.event_horizon?.level || 0;
        if (horizonLevel > 0) {
            params.lowpassFreq = Math.min(params.lowpassFreq, 16000 - (horizonLevel * 1500));
        }

        // cleanse: removes negative effects (already handled by default params)
        // No audio effect itself, just prevents negative upgrades from applying

        this.passiveParams = params;
    }

    // Trigger a temporary effect (short duration)
    triggerTemporaryEffect(upgradeId, duration = 0.5, customParams = null) {
        if (!this.isInitialized) return;
        
        const now = this.audioContext.currentTime;
        const expiresAt = now + duration;
        
        // Don't re-trigger if already active (except if expired)
        if (this.activeEffects[upgradeId]) {
            if (this.activeEffects[upgradeId].expiresAt > now) {
                // Extend duration
                this.activeEffects[upgradeId].expiresAt = expiresAt;
                return;
            }
        }
        
        const params = customParams || this.getEffectParamsForUpgrade(upgradeId);
        
        if (params) {
            this.activeEffects[upgradeId] = {
                expiresAt,
                params
            };
        }
    }

    // Get effect parameters for a specific upgrade
    getEffectParamsForUpgrade(upgradeId) {
        switch(upgradeId) {
            case 'gold_grift':
                // Metallic shimmer on coin pickup
                return { distortionAmount: 15, lowpassFreq: 6000 };
                
            case 'coinSpeedBoost':
                // Bright shimmer
                return { highpassFreq: 1200 };
                
            case 'wall_speed':
                // Echo on wall bounce
                return { delayTime: 0.08 };
                
            case 'echo_woods':
                // Reverb feel on wall bounce
                return { delayTime: 0.12, lowpassFreq: 8000 };
                
            case 'wall_ping_coin':
                // Coin from wall - metallic
                return { distortionAmount: 10 };
                
            case 'dimension_door':
                // Flanger on wall pass
                return { delayTime: 0.05 };
                
            case 'cursed_harvest':
                // Dark on negative pickup
                return { playbackRate: 0.94, lowpassFreq: 5000 };
                
            case 'friction_forge':
                // Industrial grit on wall bounce
                return { distortionAmount: 20, lowpassFreq: 3000 };
                
            case 'sweep_life':
                // Ethereal when sweeping
                return { delayTime: 0.1, highpassFreq: 600 };
                
            case 'frozen_broom':
                // Crystalline when NOT sweeping
                return { distortionAmount: 5, delayTime: 0.04 };
                
            case 'spin_win':
                // Pan based on spin
                return { pan: 0.3 }; // Will be adjusted dynamically
                
            case 'snap_curl':
                // Snap on direction change
                return { highpassFreq: 800 };
                
            default:
                return null;
        }
    }

    // Trigger effect on specific event
    triggerEffect(eventType, upgradeId, data = {}) {
        if (!this.isInitialized) return;
        
        // Handle different event types
        switch(eventType) {
            case 'wallBounce':
                // Trigger wall-related effects
                const wallUpgrades = ['wall_speed', 'echo_woods', 'wall_ping_coin', 'friction_forge'];
                for (const id of wallUpgrades) {
                    if (data.upgrades && data.upgrades[id]?.level > 0) {
                        this.triggerTemporaryEffect(id, 0.5);
                    }
                }
                break;
                
            case 'coinCollect':
                // Trigger coin-related effects
                const coinUpgrades = ['gold_grift', 'coinSpeedBoost'];
                for (const id of coinUpgrades) {
                    if (data.upgrades && data.upgrades[id]?.level > 0) {
                        this.triggerTemporaryEffect(id, 0.3);
                    }
                }
                break;
                
            case 'dimensionDoor':
                // Flanger effect
                if (data.upgrades && data.upgrades.dimension_door?.level > 0) {
                    this.triggerTemporaryEffect('dimension_door', 0.3);
                }
                break;
                
            case 'sweepStart':
                // Start sweep effect
                if (data.upgrades && data.upgrades.sweep_life?.level > 0) {
                    this.triggerTemporaryEffect('sweep_life', 999); // Long duration, ends on sweepEnd
                }
                break;
                
            case 'sweepEnd':
                // End sweep effect
                delete this.activeEffects['sweep_life'];
                if (data.upgrades && data.upgrades.frozen_broom?.level > 0) {
                    this.triggerTemporaryEffect('frozen_broom', 0.5);
                }
                break;
                
            case 'negativePickup':
                // Negative pickup effect
                if (data.upgrades && data.upgrades.cursed_harvest?.level > 0) {
                    this.triggerTemporaryEffect('cursed_harvest', 0.5);
                }
                break;
                
            case 'directionChange':
                // Direction change effect
                if (data.upgrades && data.upgrades.snap_curl?.level > 0) {
                    this.triggerTemporaryEffect('snap_curl', 0.2);
                }
                break;
                
            case 'tarBoost':
                // Heavy compression during boost
                if (data.upgrades && data.upgrades.tar_launch?.level > 0) {
                    this.triggerTemporaryEffect('tar_launch', 10, {
                        compressorThreshold: -10,
                        compressorRatio: 8,
                        distortionAmount: 40
                    });
                }
                break;
                
            case 'spin':
                // Spin panning
                if (data.upgrades && data.upgrades.spin_win?.level > 0) {
                    const pan = Math.max(-1, Math.min(1, (data.angularVelocity || 0) * 0.1));
                    this.triggerTemporaryEffect('spin_win', 0.3, { pan });
                }
                break;
        }
    }

    // Update effects (call every frame)
    updateEffects(upgrades, physics = {}) {
        if (!this.isInitialized) return;
        
        // Update passive effects
        this.updatePassiveEffects(upgrades);
        
        // Clean up expired effects
        const now = this.audioContext.currentTime;
        for (const upgradeId in this.activeEffects) {
            if (this.activeEffects[upgradeId].expiresAt <= now) {
                delete this.activeEffects[upgradeId];
            }
        }
        
        // Start with passive params
        const blended = { ...this.passiveParams };
        
        // Blend in all active temporary effects
        for (const upgradeId in this.activeEffects) {
            const effect = this.activeEffects[upgradeId];
            
            // Blend each parameter (average or max depending on type)
            if (effect.params.highpassFreq) {
                blended.highpassFreq = Math.max(blended.highpassFreq, effect.params.highpassFreq);
            }
            if (effect.params.lowpassFreq) {
                blended.lowpassFreq = Math.min(blended.lowpassFreq, effect.params.lowpassFreq);
            }
            if (effect.params.lowshelfGain) {
                blended.lowshelfGain += effect.params.lowshelfGain;
            }
            if (effect.params.delayTime) {
                blended.delayTime = Math.max(blended.delayTime, effect.params.delayTime);
            }
            if (effect.params.distortionAmount) {
                blended.distortionAmount += effect.params.distortionAmount;
            }
            if (effect.params.compressorThreshold) {
                blended.compressorThreshold = Math.min(blended.compressorThreshold, effect.params.compressorThreshold);
            }
            if (effect.params.compressorRatio) {
                blended.compressorRatio = Math.max(blended.compressorRatio, effect.params.compressorRatio);
            }
            if (effect.params.pan !== undefined) {
                blended.pan += effect.params.pan;
            }
            if (effect.params.playbackRate) {
                blended.playbackRate *= effect.params.playbackRate;
            }
        }
        
        // Clamp blended values
        blended.pan = Math.max(-1, Math.min(1, blended.pan));
        blended.playbackRate = Math.max(0.9, Math.min(1.1, blended.playbackRate));
        
        // Update herring's last dance based on current lives
        const herringLevel = upgrades.herrings_last_dance?.level || 0;
        if (herringLevel > 0) {
            const lives = physics.lives ?? 1;
            if (lives === 0) {
                // Last life - boost everything
                blended.playbackRate = Math.max(blended.playbackRate, 1.05);
                blended.distortionAmount += 10;
            } else {
                // Have lives - slightly muffled
                blended.lowpassFreq = Math.min(blended.lowpassFreq, 14000 - (lives * 1000));
            }
        }
        
        // Apply blended params
        this.currentParams = blended;
        this.applyParams(blended);
        
        // Update playback rate
        this.targetPlaybackRate = blended.playbackRate;
    }

    applyParams(params) {
        const now = this.audioContext.currentTime;
        const rampTime = 0.05; // 50ms snap-back

        try {
            this.effectNodes.highpass.frequency.linearRampToValueAtTime(
                Math.max(20, params.highpassFreq), now + rampTime
            );
        } catch (e) {}

        try {
            this.effectNodes.lowpass.frequency.linearRampToValueAtTime(
                Math.max(100, Math.min(20000, params.lowpassFreq)), now + rampTime
            );
        } catch (e) {}

        try {
            this.effectNodes.lowshelf.gain.linearRampToValueAtTime(params.lowshelfGain, now + rampTime);
        } catch (e) {}

        try {
            this.effectNodes.delay.delayTime.linearRampToValueAtTime(params.delayTime, now + rampTime);
        } catch (e) {}

        if (params.distortionAmount > 0) {
            this.effectNodes.distortion.curve = this.makeDistortionCurve(params.distortionAmount);
        } else {
            this.effectNodes.distortion.curve = null;
        }

        try {
            this.effectNodes.compressor.threshold.linearRampToValueAtTime(params.compressorThreshold, now + rampTime);
            this.effectNodes.compressor.ratio.linearRampToValueAtTime(params.compressorRatio, now + rampTime);
        } catch (e) {}

        try {
            this.effectNodes.panner.pan.linearRampToValueAtTime(params.pan, now + rampTime);
        } catch (e) {}
    }

    setPlaybackRate(rate) {
        this.targetPlaybackRate = rate;
    }

    getPlaybackRate() {
        return this.targetPlaybackRate || 1.0;
    }
}
