export class AudioEffectsSystem {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.isInitialized = false;
        this.targetPlaybackRate = 1.0;
        this.activeEffects = new Map(); // { upgradeId: { expiresAt, rateMultiplier } }
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        console.log('AudioEffectsSystem initialized (pitch modulation only)');
    }

    // Calculate combined playback rate from all active effects
    updateEffects(upgrades, physics = {}) {
        if (!this.isInitialized) return;
        
        const now = this.audioContext.currentTime;
        
        // Clean up expired effects
        for (const [upgradeId, effect] of this.activeEffects.entries()) {
            if (effect.expiresAt <= now) {
                this.activeEffects.delete(upgradeId);
            }
        }
        
        // Calculate combined rate (multiply all active multipliers)
        let combinedRate = 1.0;
        for (const [upgradeId, effect] of this.activeEffects.entries()) {
            combinedRate *= effect.rateMultiplier;
        }
        
        // Clamp to reasonable range
        this.targetPlaybackRate = Math.max(0.85, Math.min(1.15, combinedRate));
    }

    getPlaybackRate() {
        return this.targetPlaybackRate;
    }

    // Add a temporary pitch effect
    addPitchEffect(upgradeId, rateMultiplier, duration = 0.3) {
        if (!this.isInitialized) return;
        
        const now = this.audioContext.currentTime;
        
        // Extend existing effect or create new
        const existing = this.activeEffects.get(upgradeId);
        if (existing && existing.expiresAt > now) {
            existing.expiresAt = now + duration;
        } else {
            this.activeEffects.set(upgradeId, {
                rateMultiplier,
                expiresAt: now + duration
            });
        }
    }

    // Event triggers
    triggerWallBounce(upgrades) {
        if (upgrades.wall_speed?.level > 0) {
            this.addPitchEffect('wall_speed', 0.95, 0.4); // Brief pitch dip
        }
        if (upgrades.echo_woods?.level > 0) {
            this.addPitchEffect('echo_woods', 0.97, 0.5); // Slight pitch dip
        }
        if (upgrades.friction_forge?.level > 0) {
            this.addPitchEffect('friction_forge', 0.96, 0.3);
        }
    }

    triggerCoinCollect(upgrades) {
        if (upgrades.gold_grift?.level > 0) {
            this.addPitchEffect('gold_grift', 1.02, 0.3); // Brief pitch up
        }
        if (upgrades.coinSpeedBoost?.level > 0) {
            this.addPitchEffect('coinSpeedBoost', 1.01, 0.25);
        }
    }

    triggerDimensionDoor(upgrades) {
        if (upgrades.dimension_door?.level > 0) {
            // Portal warp: 0.98 → 0.95 (dip) → 1.02 (rise) over 0.3s
            const now = this.audioContext.currentTime;
            this.addPitchEffect('dimension_door_1', 0.98, 0.15);
            this.addPitchEffect('dimension_door_2', 0.95, 0.25);
            this.addPitchEffect('dimension_door_3', 1.02, 0.4);
        }
    }

    triggerNegativePickup(upgrades) {
        if (upgrades.cursed_harvest?.level > 0) {
            this.addPitchEffect('cursed_harvest', 0.94, 0.4); // Pitch down
        }
    }

    triggerSweepStart(upgrades) {
        if (upgrades.sweep_life?.level > 0) {
            this.addPitchEffect('sweep_life', 1.03, 2.0); // Pitch up while sweeping
        }
    }

    triggerSweepEnd(upgrades) {
        // Remove sweep effect
        this.activeEffects.delete('sweep_life');
        if (upgrades.frozen_broom?.level > 0) {
            this.addPitchEffect('frozen_broom', 0.96, 0.5); // Pitch down
        }
    }

    triggerTarBoost(upgrades) {
        if (upgrades.tar_launch?.level > 0) {
            this.addPitchEffect('tar_launch', 1.04, 10.0); // Speed up during boost
        }
    }

    triggerHerringsLastDance(upgrades) {
        if (upgrades.herrings_last_dance?.level > 0) {
            this.addPitchEffect('herrings_last_dance', 1.05, 999); // Fast when last life
        }
    }
}
