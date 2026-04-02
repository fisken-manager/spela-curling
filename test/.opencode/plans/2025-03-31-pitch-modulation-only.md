# Playback Rate Pitch Modulation - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement audio effects using only playback rate pitch modulation - no nodes, just smooth pitch changes to the music.

**Architecture:** Calculate target playback rate based on active events. Apply pitch modulation using sourceNode.playbackRate.linearRampToValueAtTime(). Clean audio always since no nodes are created.

**Tech Stack:** Vanilla JavaScript, Web Audio API playbackRate

---

## Problem

Current system creates separate sound effects on top of music. User wants music itself to be modulated (pitch changes).

## Solution

Use `sourceNode.playbackRate` to change pitch:
- No additional nodes created ever
- Music always plays through direct connection
- Brief pitch changes during events
- Smooth transitions using Web Audio API ramps

---

## Task 1: Rewrite AudioEffectsSystem for Pitch Modulation Only

**Files:**
- Modify: `scripts/audio-effects.js`

**Step 1: Remove all node creation, keep only playback rate calculation**

Replace entire file with:

```javascript
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
```

**Step 2: Commit**

```bash
git add scripts/audio-effects.js
git commit -m "refactor: switch to playback rate pitch modulation only

- Remove all node creation
- Calculate pitch effects using playback rate multipliers
- Each event adds temporary rate multiplier
- Clean audio always - no nodes ever created"
```

---

## Task 2: Apply Playback Rate in AudioController

**Files:**
- Modify: `scripts/audio.js`

**Step 1: Update updateEffects to apply playback rate**

Replace the `updateEffects` method with:

```javascript
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
```

**Step 2: Commit**

```bash
git add scripts/audio.js
git commit -m "feat: apply pitch modulation via playback rate

- Get target playback rate from effects system
- Apply smooth transitions using linearRampToValueAtTime
- 50ms transition time for smooth pitch changes"
```

---

## Task 3: Test All Effects

**Testing Guide:**

1. **Start game, no upgrades** → Music plays at normal pitch (1.0)
2. **Buy dimension_door** → Pass through wall → Hear pitch: normal → dip → rise
3. **Buy wall_speed** → Hit wall → Brief pitch dip
4. **Buy gold_grift** → Collect coin → Brief pitch up
5. **Buy tar_launch** → Throw stone → Music speeds up for 10 seconds
6. **Multiple effects** → Pitch changes blend multiplicatively

**Expected Results:**
- Clean audio always
- Smooth pitch transitions
- Effects clearly audible but not jarring
- No distortion or artifacts

---

## Summary

This implements pitch modulation using only `playbackRate`:
- **Zero nodes created** - Clean audio path always
- **Event-triggered** - Pitch changes only during specific events
- **Smooth transitions** - 50ms ramp time prevents jarring changes
- **Multiplicative blending** - Multiple effects combine naturally

**Files Modified:** 2 (audio-effects.js, audio.js)
**Lines Changed:** ~100
**Testing:** 6 specific effect scenarios
