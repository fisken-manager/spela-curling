export class AudioEffectsSystem {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.isInitialized = false;
        this.targetPlaybackRate = 1.0;
        
        // Track active temporary effects
        this.activeEffects = new Map();  // upgradeId → { expiresAt, nodes, source, destination }
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        console.log('AudioEffectsSystem initialized (event-only, no permanent chain)');
    }

    hasActiveEffects(upgrades) {
        // Check if any upgrade has a level > 0
        for (const upgradeId in upgrades) {
            if (upgrades[upgradeId]?.level > 0) {
                return true;
            }
        }
        return false;
    }

    // Create a temporary effect for a specific event
    // Only creates nodes when actually needed, then cleans them up
    triggerEffect(eventType, upgradeId, data = {}) {
        if (!this.isInitialized) return;
        
        // Don't re-trigger if already active (extend duration instead)
        if (this.activeEffects.has(upgradeId)) {
            const effect = this.activeEffects.get(upgradeId);
            const now = this.audioContext.currentTime;
            if (effect.expiresAt > now) {
                effect.expiresAt = now + (data.duration || 0.5);
                return;
            }
        }

        // Create effect based on type
        let effect = null;
        
        switch(eventType) {
            case 'dimensionDoor':
                effect = this.createPortalWarpEffect(data.duration || 0.3);
                break;
            case 'wallBounce':
                effect = this.createWallBounceEffect(data.duration || 0.4);
                break;
            case 'coinCollect':
                effect = this.createCoinCollectEffect(data.duration || 0.3);
                break;
            case 'negativePickup':
                effect = this.createNegativePickupEffect(data.duration || 0.4);
                break;
            case 'sweepStart':
                effect = this.createSweepEffect(data.duration || 2.0);
                break;
            case 'sweepEnd':
                // Clean up sweep effect if exists
                if (this.activeEffects.has('sweep_life')) {
                    this.cleanupEffect('sweep_life');
                }
                break;
            case 'spin':
                effect = this.createSpinEffect(data.duration || 0.5);
                break;
            case 'directionChange':
                effect = this.createDirectionChangeEffect(data.duration || 0.2);
                break;
            case 'tarBoost':
                effect = this.createTarBoostEffect(data.duration || 10.0);
                break;
            case 'herringsLastDance':
                effect = this.createHerringsEffect(data.duration || 999); // Long duration
                break;
        }

        if (effect) {
            this.activeEffects.set(upgradeId, {
                ...effect,
                expiresAt: this.audioContext.currentTime + (data.duration || 0.5)
            });
        }
    }

    // Portal Warp effect for Grytans Glip (dimension_door)
    // Pitch drops as you enter, pitch rises as you exit
    createPortalWarpEffect(duration = 0.3) {
        const now = this.audioContext.currentTime;
        
        // Create a gain node to modulate playback rate
        const gainNode = this.audioContext.createGain();
        
        // Create a simple pitch bend effect using playback rate
        // We'll schedule the pitch changes
        const halfDuration = duration / 2;
        
        // Pitch drop: 1.0 → 0.7 (low pitch)
        // Pitch rise: 0.7 → 1.0 (back to normal)
        
        return {
            type: 'portalWarp',
            nodes: [gainNode],
            apply: (targetPlaybackRate) => {
                // This effect modifies playback rate dynamically
                return targetPlaybackRate * 0.7; // Drop pitch during portal
            },
            cleanup: () => {
                gainNode.disconnect();
            }
        };
    }

    // Wall bounce effect
    createWallBounceEffect(duration = 0.4) {
        const now = this.audioContext.currentTime;
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(300, now);
        filter.frequency.linearRampToValueAtTime(80, now + duration);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.linearRampToValueAtTime(1.0, now + duration);
        
        filter.connect(gain);
        
        return {
            type: 'wallBounce',
            nodes: [filter, gain],
            apply: (targetPlaybackRate) => targetPlaybackRate,
            cleanup: () => {
                filter.disconnect();
                gain.disconnect();
            }
        };
    }

    // Coin collect effect
    createCoinCollectEffect(duration = 0.3) {
        const now = this.audioContext.currentTime;
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(500, now);
        filter.frequency.linearRampToValueAtTime(80, now + duration);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.linearRampToValueAtTime(1.0, now + duration);
        
        filter.connect(gain);
        
        return {
            type: 'coinCollect',
            nodes: [filter, gain],
            apply: (targetPlaybackRate) => targetPlaybackRate,
            cleanup: () => {
                filter.disconnect();
                gain.disconnect();
            }
        };
    }

    // Negative pickup effect
    createNegativePickupEffect(duration = 0.4) {
        const now = this.audioContext.currentTime;
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(4000, now);
        filter.frequency.linearRampToValueAtTime(8000, now + duration);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.linearRampToValueAtTime(1.0, now + duration);
        
        filter.connect(gain);
        
        return {
            type: 'negativePickup',
            nodes: [filter, gain],
            apply: (targetPlaybackRate) => targetPlaybackRate * 0.95, // Slight pitch drop
            cleanup: () => {
                filter.disconnect();
                gain.disconnect();
            }
        };
    }

    // Sweep effect (ethereal reverb feel)
    createSweepEffect(duration = 2.0) {
        const now = this.audioContext.currentTime;
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(400, now);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.75, now);
        
        filter.connect(gain);
        
        return {
            type: 'sweep',
            nodes: [filter, gain],
            apply: (targetPlaybackRate) => targetPlaybackRate * 1.02, // Slight pitch up
            cleanup: () => {
                filter.disconnect();
                gain.disconnect();
            }
        };
    }

    // Spin effect
    createSpinEffect(duration = 0.5) {
        return {
            type: 'spin',
            nodes: [],
            apply: (targetPlaybackRate) => targetPlaybackRate, // No modification
            cleanup: () => {}
        };
    }

    // Direction change effect
    createDirectionChangeEffect(duration = 0.2) {
        const now = this.audioContext.currentTime;
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.linearRampToValueAtTime(80, now + duration);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.85, now);
        gain.gain.linearRampToValueAtTime(1.0, now + duration);
        
        filter.connect(gain);
        
        return {
            type: 'directionChange',
            nodes: [filter, gain],
            apply: (targetPlaybackRate) => targetPlaybackRate,
            cleanup: () => {
                filter.disconnect();
                gain.disconnect();
            }
        };
    }

    // Tar boost effect (heavy compression feel)
    createTarBoostEffect(duration = 10.0) {
        const now = this.audioContext.currentTime;
        const compressor = this.audioContext.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-12, now);
        compressor.ratio.setValueAtTime(4, now);
        compressor.knee.setValueAtTime(10, now);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.9, now);
        
        compressor.connect(gain);
        
        return {
            type: 'tarBoost',
            nodes: [compressor, gain],
            apply: (targetPlaybackRate) => targetPlaybackRate * 1.03, // Slight speed boost
            cleanup: () => {
                compressor.disconnect();
                gain.disconnect();
            }
        };
    }

    // Herrings last dance effect
    createHerringsEffect(duration = 999) {
        const now = this.audioContext.currentTime;
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(60, now);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(1.0, now);
        
        filter.connect(gain);
        
        return {
            type: 'herrings',
            nodes: [filter, gain],
            apply: (targetPlaybackRate) => targetPlaybackRate * 1.05, // Speed boost when last life
            cleanup: () => {
                filter.disconnect();
                gain.disconnect();
            }
        };
    }

    // Clean up expired effects
    cleanupEffect(upgradeId) {
        if (this.activeEffects.has(upgradeId)) {
            const effect = this.activeEffects.get(upgradeId);
            if (effect.cleanup) {
                effect.cleanup();
            }
            this.activeEffects.delete(upgradeId);
        }
    }

    // Update effects (called every frame)
    updateEffects(upgrades, physics = {}) {
        if (!this.isInitialized) return;
        
        const now = this.audioContext.currentTime;
        
        // Clean up expired effects
        for (const [upgradeId, effect] of this.activeEffects.entries()) {
            if (effect.expiresAt <= now) {
                if (effect.cleanup) {
                    effect.cleanup();
                }
                this.activeEffects.delete(upgradeId);
            }
        }
        
        // Calculate combined playback rate from all active effects
        let combinedPlaybackRate = 1.0;
        for (const [upgradeId, effect] of this.activeEffects.entries()) {
            if (effect.apply) {
                combinedPlaybackRate = effect.apply(combinedPlaybackRate);
            }
        }
        
        this.targetPlaybackRate = combinedPlaybackRate;
    }

    setPlaybackRate(rate) {
        this.targetPlaybackRate = rate;
    }

    getPlaybackRate() {
        return this.targetPlaybackRate || 1.0;
    }

    // Trigger wall bounce event - check for relevant upgrades
    triggerWallBounce(upgrades) {
        if (upgrades.wall_speed?.level > 0) {
            this.triggerEffect('wallBounce', 'wall_speed', { duration: 0.4 });
        }
        if (upgrades.echo_woods?.level > 0) {
            this.triggerEffect('wallBounce', 'echo_woods', { duration: 0.5 });
        }
        if (upgrades.friction_forge?.level > 0) {
            this.triggerEffect('wallBounce', 'friction_forge', { duration: 0.3 });
        }
    }

    // Trigger coin collect event
    triggerCoinCollect(upgrades) {
        if (upgrades.gold_grift?.level > 0) {
            this.triggerEffect('coinCollect', 'gold_grift', { duration: 0.3 });
        }
        if (upgrades.coinSpeedBoost?.level > 0) {
            this.triggerEffect('coinCollect', 'coinSpeedBoost', { duration: 0.25 });
        }
    }

    // Trigger dimension door event (Portal Warp!)
    triggerDimensionDoor(upgrades) {
        if (upgrades.dimension_door?.level > 0) {
            this.triggerEffect('dimensionDoor', 'dimension_door', { duration: 0.3 });
        }
    }

    // Trigger negative pickup event
    triggerNegativePickup(upgrades) {
        if (upgrades.cursed_harvest?.level > 0) {
            this.triggerEffect('negativePickup', 'cursed_harvest', { duration: 0.4 });
        }
    }

    // Trigger sweep start event
    triggerSweepStart(upgrades) {
        if (upgrades.sweep_life?.level > 0) {
            this.triggerEffect('sweepStart', 'sweep_life', { duration: 2.0 });
        }
    }

    // Trigger sweep end event
    triggerSweepEnd(upgrades) {
        this.triggerEffect('sweepEnd', 'sweep_life', { duration: 0.5 });
        if (upgrades.frozen_broom?.level > 0) {
            this.triggerEffect('wallBounce', 'frozen_broom', { duration: 0.5 });
        }
    }

    // Trigger direction change event
    triggerDirectionChange(upgrades) {
        if (upgrades.snap_curl?.level > 0) {
            this.triggerEffect('directionChange', 'snap_curl', { duration: 0.2 });
        }
    }

    // Trigger tar boost event
    triggerTarBoost(upgrades) {
        if (upgrades.tar_launch?.level > 0) {
            this.triggerEffect('tarBoost', 'tar_launch', { duration: 10.0 });
        }
    }

    // Trigger herrings last dance event
    triggerHerringsLastDance(upgrades) {
        if (upgrades.herrings_last_dance?.level > 0) {
            this.triggerEffect('herringsLastDance', 'herrings_last_dance', { duration: 999 });
        }
    }
}
