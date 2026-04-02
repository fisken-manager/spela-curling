# Fix Audio Effects Bypass When No Upgrades - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure audio effects chain is completely bypassed when no upgrades are active, preventing unwanted audio artifacts on the baseline music.

**Architecture:** Add a `hasActiveEffects()` method to AudioEffectsSystem that checks if any upgrade would contribute audio effects. Only connect the effects chain in `audio.js` play() when this returns true. Update `game.js` to skip effects updates when no upgrades active.

**Tech Stack:** Vanilla JavaScript, Web Audio API

---

## Problem Analysis

**Current Issue:** The effects chain (6 Web Audio nodes in series: highpass → lowpass → delay → distortion → compressor → panner) is ALWAYS connected, even with no upgrades. This causes weird audio artifacts on the baseline music when the stone moves fast.

**Root Cause:** In `audio.js:160-161`:
```javascript
if (this.effectsSystem && this.effectsSystem.isInitialized) {
    this.effectsSystem.connectChain(this.sourceNode, this.audioContext.destination);
}
```
The chain is connected based on initialization status, not whether upgrades are active.

**Solution:** Only connect the effects chain when at least one upgrade is active.

---

## Task 1: Add hasActiveEffects Method to AudioEffectsSystem

**Files:**
- Modify: `scripts/audio-effects.js`

**Step 1: Add hasActiveEffects method after init()**

```javascript
// scripts/audio-effects.js - Add after init() method around line 37

hasActiveEffects(upgrades) {
    // Check if any upgrade has a level > 0
    for (const upgradeId in upgrades) {
        if (upgrades[upgradeId]?.level > 0) {
            return true;
        }
    }
    return false;
}
```

**Step 2: Verify the method is available**

No test needed - method is simple and will be tested in integration.

**Step 3: Commit**

```bash
git add scripts/audio-effects.js
git commit -m "feat: add hasActiveEffects method to AudioEffectsSystem

- Check if any upgrade has level > 0
- Returns boolean for conditional effects chain connection"
```

---

## Task 2: Modify AudioController to Conditionally Use Effects Chain

**Files:**
- Modify: `scripts/audio.js:160-164`

**Step 1: Modify play() method to check for active effects**

```javascript
// scripts/audio.js - Replace lines 159-164

// Use effects chain only when upgrades are active
const hasEffects = this.effectsSystem && this.effectsSystem.isInitialized && 
                   this.effectsSystem.hasActiveEffects(this.activeUpgrades);

if (hasEffects) {
    this.effectsSystem.connectChain(this.sourceNode, this.audioContext.destination);
} else {
    this.sourceNode.connect(this.audioContext.destination);
}
```

**Step 2: Handle disconnection in stop() method**

The existing stop() already handles disconnection:
```javascript
// scripts/audio.js - Existing code at line 220-221
if (this.effectsSystem) {
    this.effectsSystem.disconnectChain();
}
```
This works because disconnectChain() safely handles nodes that may not be connected.

**Step 3: Test by running game**

1. Start game with no upgrades
2. Music should sound normal without artifacts
3. Throw stone fast - should sound clean

**Step 4: Commit**

```bash
git add scripts/audio.js
git commit -m "fix: only use effects chain when upgrades are active

- Check hasActiveEffects before connecting chain
- Direct connection to destination when no upgrades
- Prevents unwanted audio artifacts on baseline music"
```

---

## Task 3: Optimize Game Loop to Skip Effect Updates When No Upgrades

**Files:**
- Modify: `scripts/game.js:405-418`

**Step 1: Update game loop to check for active upgrades before updating effects**

```javascript
// scripts/game.js - Replace lines 405-418 (audio effects update block)

// Update audio effects based on current upgrades (only during gameplay, not in shop)
if (!state.showBuyMenu && audio.isPlaying && audio.effectsSystem) {
    // Check if any upgrades are active before updating effects
    const hasUpgrades = audio.effectsSystem.hasActiveEffects(state.upgrades);
    
    if (hasUpgrades) {
        const physicsData = {
            velocity: state.stone?.velocity || { x: 0, y: 0 },
            angularVelocity: state.stone?.angularVelocity || 0,
            lives: state.lives ?? 1,
            tarBoostActive: state.tarBoostActive || false,
        };
        audio.updateEffects(state.upgrades, physicsData);
    }
}
```

**Step 2: Test by running game**

1. Start game with no upgrades
2. Verify no audio.updateEffects() is called (check console with logging if needed)
3. Buy an upgrade
4. Verify audio effects update is now called
5. Throw stone - should hear effects

**Step 3: Commit**

```bash
git add scripts/game.js
git commit -m "perf: skip audio effects updates when no upgrades active

- Check hasActiveEffects before calling updateEffects
- Reduces unnecessary per-frame processing
- Maintains clean baseline audio performance"
```

---

## Summary

This fix ensures the audio effects chain is completely bypassed when no upgrades are active, eliminating the weird artifacts on baseline music.

**Changes:**
1. `audio-effects.js`: Add `hasActiveEffects()` method
2. `audio.js`: Conditionally connect effects chain based on active upgrades
3. `game.js`: Skip effect updates when no upgrades active

**Testing:**
- Start game without upgrades → clean audio
- Play for a bit → still clean
- Buy any upgrade → effects activate
- Reset game (lose all upgrades) → back to clean audio

**Files Modified:** 3
**Estimated Time:** 10 minutes
