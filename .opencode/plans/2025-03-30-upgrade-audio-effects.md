# Upgrade Audio Effects Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add dynamic Web Audio API effects to the background music that change based on which upgrades are active and their tier levels during gameplay.

**Architecture:** Extend the existing `AudioController` class with an effects chain system (source → filter nodes → destination). Each upgrade contributes parameters to a "mix calculator" that blends effects dynamically. Effects update per-frame during gameplay based on `state.upgrades`.

**Tech Stack:** Vanilla JavaScript, Web Audio API (BiquadFilterNode, DelayNode, WaveShaperNode, etc.), existing game state system.

---

## Implementation Overview

**Effect Chain Flow:**
```
BufferSource → GainNode → [Effect Nodes Chain] → Destination
                           ↓
                    (Highpass, Lowpass, Delay, 
                     Distortion, Bitcrusher, etc.)
```

**Upgrade-to-Effect Mapping:**

| Upgrade | Effect Type | Parameter Logic |
|---------|-------------|-----------------|
| speed | Highpass filter | freq = 1000 + (level * 500) Hz |
| friction | Chorus/Flanger | wetness = level * 0.15, depth = level * 0.2 |
| size | Lowshelf boost | gain = level * 4 dB, pitch = -level * 0.006 |
| coinSpeedBoost | Ring modulator + delay | mix = level * 0.3 |
| spin_win | Phaser | rate = angularVelocity * 0.1 Hz |
| gold_grift | Bitcrusher | reduction = level * 4 bits |
| glass_cannon | Compression + distortion | threshold = -20 - (level * 10) dB |
| wall_speed | Collision delay | 150ms delay triggered on bounce |
| friction_forge | Lowpass + waveshaper | freq = 2000 - (level * 400), distortion = level * 0.2 |
| spin_to_speed | Mechanical stutter | bitcrusher + periodic mute |
| spiders_web | Lowpass dampening | freq = 8000 - (level * 1500) |
| cursed_harvest | Reverb + pitch | decay = level * 2s, pitch = -level * 0.01 |
| rail_rider | Stereo width | width = 1 - (level * 0.25) |
| echo_woods | Convolution reverb | wet = level * 0.4 |
| event_horizon | Lowpass + sidechain | freq drops as pickups near |
| snap_curl | Stereo panning | pan = velocity.x * 0.5 |
| wall_ping_coin | Synced delay | 8th note delay on coin collect |
| double_shops | Saturation + width | drive = 0.1 + (level * 0.1) |
| cleanse | Filter sweep | gradual highpass sweep clearing effects |
| dimension_door | Flanger + pitch bend | depth = 0.3, pitch bend -0.05 on pass |
| tar_launch | Heavy compression | ratio = 4 + (level * 4), distortion = level * 0.3 |
| sweep_life | Reverb + highpass | wet = 0.5, freq = 800 Hz |
| frozen_broom | Crystalline texture | reverb + subtle bitcrusher at 12 bits |
| herrings_last_dance | Dynamic filter | lives === 0 ? highpass(0) : lowpass(lives * 1000) |

---

## Task 1: Create Audio Effects System Foundation

**Files:**
- Create: `scripts/audio-effects.js`
- Modify: `scripts/audio.js` (import and integrate)

**Step 1: Create the audio effects system module**

```javascript
// scripts/audio-effects.js

export class AudioEffectsSystem {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.effectNodes = {};
        this.isInitialized = false;
        
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
        this.createBiquadFilter('highpass', 'highpass', 1000);
        this.createBiquadFilter('lowpass', 'lowpass', 8000);
        this.createBiquadFilter('lowshelf', 'lowshelf', 200, 0);
        this.createDelayNode('delay', 0.15);
        this.createWaveShaper('distortion');
        this.createCompressor('compressor');
        this.createStereoPanner('panner');
        
        this.isInitialized = true;
    }

    createBiquadFilter(name, type, freq, gain = 0) {
        const filter = this.audioContext.createBiquadFilter();
        filter.type = type;
        filter.frequency.value = freq;
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
        waveshaper.curve = this.makeDistortionCurve(0);
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
        compressor.ratio.value = 4;
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
            delayWet: 0,
            distortionAmount: 0,
            compressorThreshold: -24,
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
            params.delayWet = frictionLevel * 0.15;
        }

        // Size upgrade: lowshelf boost for "heaviness"
        const sizeLevel = upgrades.size?.level || 0;
        if (sizeLevel > 0) {
            params.lowshelfGain = sizeLevel * 4;
            params.playbackRate = Math.max(0.9, 1.0 - (sizeLevel * 0.006));
        }

        // Glass cannon: distortion + compression
        const glassLevel = upgrades.glass_cannon?.level || 0;
        if (glassLevel > 0) {
            params.distortionAmount = glassLevel * 20;
            params.compressorThreshold = -20 - (glassLevel * 10);
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

        // Rail rider: narrow stereo width via panner
        const railLevel = upgrades.rail_rider?.level || 0;
        if (railLevel > 0) {
            // Note: StereoPanner just pans L/R, we'd need a stereo widener
            // For now, keep centered
            params.pan = 0;
        }

        // Snap curl: panning based on velocity
        if (upgrades.snap_curl?.level > 0 && physics.velocity) {
            params.pan = Math.max(-1, Math.min(1, physics.velocity.x * 0.5));
        }

        // Tar launch: heavy compression during boost
        if (upgrades.tar_launch?.level > 0) {
            const tarLevel = upgrades.tar_launch.level;
            // This would need to be triggered dynamically during boost
            // For now, set moderate values
            params.compressorThreshold = Math.min(params.compressorThreshold, -16);
            params.distortionAmount = Math.max(params.distortionAmount, tarLevel * 25);
        }

        // Herring's last dance: dynamic based on lives
        if (upgrades.herrings_last_dance?.level > 0) {
            const lives = physics.lives || 1;
            if (lives === 0) {
                params.highpassFreq = 80; // Full bandwidth
                params.playbackRate = 1.05; // Slightly faster/pitched up
            } else {
                params.lowpassFreq = Math.min(params.lowpassFreq, lives * 1000);
            }
        }

        // Dimension door: flanger-like effect
        const doorLevel = upgrades.dimension_door?.level || 0;
        if (doorLevel > 0) {
            params.delayWet = Math.max(params.delayWet, doorLevel * 0.3);
        }

        return params;
    }

    applyParams(params) {
        // Smooth parameter transitions using linearRampToValueAtTime
        const now = this.audioContext.currentTime;
        const rampTime = 0.1; // 100ms smooth transition

        this.effectNodes.highpass.frequency.linearRampToValueAtTime(params.highpassFreq, now + rampTime);
        this.effectNodes.lowpass.frequency.linearRampToValueAtTime(params.lowpassFreq, now + rampTime);
        this.effectNodes.lowshelf.gain.linearRampToValueAtTime(params.lowshelfGain, now + rampTime);
        this.effectNodes.delay.delayTime.linearRampToValueAtTime(params.delayWet > 0 ? 0.15 : 0.001, now + rampTime);
        
        // Update distortion curve
        if (params.distortionAmount > 0) {
            this.effectNodes.distortion.curve = this.makeDistortionCurve(params.distortionAmount);
        } else {
            this.effectNodes.distortion.curve = null;
        }
        
        this.effectNodes.compressor.threshold.linearRampToValueAtTime(params.compressorThreshold, now + rampTime);
        this.effectNodes.panner.pan.linearRampToValueAtTime(params.pan, now + rampTime);
    }

    triggerEffect(name, data = {}) {
        // Trigger one-off effects (like wall bounce delay)
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
        // Create a one-shot delay effect for wall bounces
        const delayTime = 0.15;
        const feedback = 0.3;
        // Implementation would create temporary delay nodes
        // For now, just boost the existing delay momentarily
        const now = this.audioContext.currentTime;
        this.effectNodes.delay.delayTime.setValueAtTime(delayTime, now);
        this.effectNodes.delay.delayTime.linearRampToValueAtTime(0.001, now + 0.5);
    }

    triggerCoinCollectEffect(data) {
        // Add rhythmic emphasis on coin collection
        // Could create a subtle pitch bend up
    }

    triggerDimensionDoorEffect() {
        // Flanger swoosh when passing through walls
        const now = this.audioContext.currentTime;
        // Modulate delay time for flanger effect
        this.effectNodes.delay.delayTime.setValueAtTime(0.01, now);
        this.effectNodes.delay.delayTime.linearRampToValueAtTime(0.02, now + 0.1);
        this.effectNodes.delay.delayTime.linearRampToValueAtTime(0.001, now + 0.5);
    }

    setPlaybackRate(rate) {
        // Store for application to source nodes
        this.targetPlaybackRate = rate;
    }

    getPlaybackRate() {
        return this.targetPlaybackRate || 1.0;
    }
}
```

**Step 2: Run verification that module exports correctly**

Run: `node -e "import('./scripts/audio-effects.js').then(m => console.log('AudioEffectsSystem exported:', typeof m.AudioEffectsSystem)).catch(e => console.error(e))"`

Expected: `AudioEffectsSystem exported: function`

**Step 3: Commit**

```bash
git add scripts/audio-effects.js
git commit -m "feat: add audio effects system foundation with Web Audio API nodes

- Create AudioEffectsSystem class with filter, delay, distortion, compressor nodes
- Add effect parameter calculation based on upgrade levels
- Implement smooth parameter transitions
- Support trigger effects for one-off events (wall bounce, coin collect)"
```

---

## Task 2: Integrate Effects System into AudioController

**Files:**
- Modify: `scripts/audio.js:1-222`

**Step 1: Import the effects system**

```javascript
// scripts/audio.js - Line 1
import { AudioEffectsSystem } from './audio-effects.js';
```

**Step 2: Add effects system to AudioController constructor**

```javascript
// scripts/audio.js - Modify constructor around line 19
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
    this.effectsSystem = null;  // ADD THIS
    this.activeUpgrades = {};   // ADD THIS
    this.currentPlaybackRate = 1.0; // ADD THIS for effects system
}
```

**Step 3: Initialize effects system in init()**

```javascript
// scripts/audio.js - Modify init() around line 21
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
```

**Step 4: Modify play() to use effects chain**

```javascript
// scripts/audio.js - Modify play() around line 140
play() {
    if (!this.audioBuffer || this.isPlaying) return;
    
    this.resumeContext();
    this.manuallyStopped = false;
    
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.playbackRate.value = this.currentPlaybackRate;
    
    // Use effects chain instead of direct connection
    if (this.effectsSystem && this.effectsSystem.isInitialized) {
        this.effectsSystem.connectChain(this.sourceNode, this.audioContext.destination);
    } else {
        this.sourceNode.connect(this.audioContext.destination);
    }
    
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
```

**Step 5: Add method to update effects from game state**

```javascript
// scripts/audio.js - Add after line 222
updateEffects(upgrades, physics) {
    if (!this.effectsSystem || !this.isPlaying) return;
    
    this.activeUpgrades = upgrades;
    this.effectsSystem.updateFromUpgrades(upgrades, physics);
    
    // Update playback rate if changed
    const newRate = this.effectsSystem.getPlaybackRate();
    if (newRate !== this.currentPlaybackRate && this.sourceNode) {
        this.currentPlaybackRate = newRate;
        this.sourceNode.playbackRate.linearRampToValueAtTime(newRate, this.audioContext.currentTime + 0.1);
    }
}

triggerAudioEffect(name, data) {
    if (!this.effectsSystem) return;
    this.effectsSystem.triggerEffect(name, data);
}
```

**Step 6: Modify stop() to disconnect effects chain**

```javascript
// scripts/audio.js - Modify stop() around line 189
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
    
    // Disconnect effects chain
    if (this.effectsSystem) {
        this.effectsSystem.disconnectChain();
    }
    
    this.isPlaying = false;
}
```

**Step 7: Commit**

```bash
git add scripts/audio.js
git commit -m "feat: integrate AudioEffectsSystem into AudioController

- Import and initialize AudioEffectsSystem in AudioController
- Route audio through effects chain instead of direct to destination
- Add updateEffects() method for per-frame updates from game state
- Add triggerAudioEffect() for one-off effects
- Properly disconnect effects chain on stop()"
```

---

## Task 3: Wire Effects Updates into Game Loop

**Files:**
- Modify: `scripts/game.js:391-450`

**Step 1: Add effects update call to game loop**

```javascript
// scripts/game.js - Modify gameLoop() around line 391
function gameLoop(timestamp) {
    const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;
    
    if (!renderer || !scrollController) {
        requestAnimationFrame(gameLoop);
        return;
    }
    
    // Update audio effects based on current upgrades (only during gameplay)
    if (!state.showBuyMenu && !state.shopTransition && audio.effectsSystem) {
        const physicsData = {
            velocity: state.stone?.velocity || { x: 0, y: 0 },
            angularVelocity: state.stone?.angularVelocity || 0,
            lives: state.lives,
            tarBoostActive: state.tarBoostActive,
        };
        audio.updateEffects(state.upgrades, physicsData);
    }
    
    // Handle shop transition animation
    if (state.shopTransition) {
        // ... rest of existing code
```

**Step 2: Commit**

```bash
git add scripts/game.js
git commit -m "feat: wire audio effects updates into game loop

- Call audio.updateEffects() every frame during gameplay
- Pass current upgrades and physics state (velocity, lives, boost status)
- Skip updates in shop/menu to avoid effects when not playing"
```

---

## Task 4: Add Physics Event Audio Triggers

**Files:**
- Modify: `scripts/physics.js:1033-1113` (wall collision handling)

**Step 1: Add wall bounce audio trigger**

```javascript
// scripts/physics.js - In handleCollisions() around line 1033
// Inside the wall collision block, after state.lastBounceTime = now:

// Trigger wall bounce audio effect
if (audio && audio.triggerAudioEffect) {
    audio.triggerAudioEffect('wallBounce', {
        velocity: speed,
        wallSpeedLevel: wallSpeedLevel,
        dimensionDoorActive: dimensionDoorLevel > 0
    });
}
```

**Step 2: Add coin collection audio trigger**

```javascript
// scripts/physics.js - In collectCoin() or coin pickup handler
// Trigger coin collect audio effect
if (audio && audio.triggerAudioEffect) {
    audio.triggerAudioEffect('coinCollect', {
        amount: coinValue,
        combo: state.comboMultiplier || 1
    });
}
```

**Step 3: Add dimension door audio trigger**

```javascript
// scripts/physics.js - In dimension door wall pass handling around line 1063
// When passing through wall:
if (audio && audio.triggerAudioEffect) {
    audio.triggerAudioEffect('dimensionDoor');
}
```

**Step 4: Commit**

```bash
git add scripts/physics.js
git commit -m "feat: add physics event audio triggers

- Trigger wallBounce effect on wall collisions
- Trigger coinCollect effect on coin pickup
- Trigger dimensionDoor effect when passing through walls
- Pass relevant game data to effects (velocity, combo, etc.)"
```

---

## Task 5: Test and Fine-Tune Effect Parameters

**Files:**
- Modify: `scripts/audio-effects.js` (parameter values)

**Step 1: Test individual upgrade effects**

```bash
# Run the game and test each upgrade
# 1. Buy speed upgrade (T1, T3, T5) - listen for highpass filter opening up
# 2. Buy friction upgrade - listen for delay/chorus effect
# 3. Buy size upgrade - listen for bass boost and pitch drop
# 4. Test glass cannon - distortion should increase with tiers
# 5. Test wall collisions - should hear delay effect
```

**Step 2: Fine-tune parameter ranges**

Based on testing, adjust these values in `calculateEffectParams()`:

```javascript
// scripts/audio-effects.js - Adjust these if needed:
// Speed highpass: currently 1000 + (level * 500), max 8000
// If too aggressive: change to 500 + (level * 300), max 4000

// Size pitch drop: currently 1.0 - (level * 0.006)
// If too noticeable: change to 1.0 - (level * 0.003)

// Glass cannon distortion: currently level * 20
// If too harsh: change to level * 10
```

**Step 3: Commit**

```bash
git add scripts/audio-effects.js
git commit -m "tweak: adjust audio effect parameter ranges based on testing

- Fine-tune speed highpass filter range
- Adjust size pitch shift amount
- Balance glass cannon distortion level"
```

---

## Task 6: Add Optional Advanced Effects

**Files:**
- Modify: `scripts/audio-effects.js`

**Step 1: Add ring modulator for coinSpeedBoost**

```javascript
// scripts/audio-effects.js - Add to init()
createRingModulator(name) {
    // Ring modulator for metallic/coin sounds
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const mix = this.audioContext.createGain();
    
    osc.frequency.value = 800; // 800 Hz carrier
    osc.type = 'sine';
    
    mix.gain.value = 0; // Start dry
    
    this.effectNodes[name] = { osc, gain, mix };
    
    osc.start();
    return { osc, gain, mix };
}
```

**Step 2: Add dynamic compression for tar_launch**

```javascript
// scripts/audio-effects.js - Add to calculateEffectParams()
if (physics.tarBoostActive && upgrades.tar_launch?.level > 0) {
    const tarLevel = upgrades.tar_launch.level;
    params.compressorThreshold = -12; // Heavy compression
    params.compressorRatio = 8 + (tarLevel * 4); // 8:1 to 16:1
    params.distortionAmount = Math.max(params.distortionAmount, 50 + (tarLevel * 25));
}
```

**Step 3: Commit**

```bash
git add scripts/audio-effects.js
git commit -m "feat: add advanced audio effects

- Add ring modulator for coinSpeedBoost metallic texture
- Add heavy compression during tar_launch boost
- Dynamic compressor ratio based on upgrade tier"
```

---

## Task 7: Documentation and Final Testing

**Files:**
- Create: `docs/audio-effects.md`

**Step 1: Write documentation**

```markdown
# Audio Effects System

## Overview
The audio effects system dynamically modifies background music based on active upgrades during gameplay.

## How It Works
1. Web Audio API nodes create an effects chain between the music source and speakers
2. Each upgrade contributes parameters to the overall mix
3. Effects update 60 times per second during gameplay
4. One-off effects trigger on specific events (wall bounces, coin collects)

## Upgrade Effects

### Basic Upgrades
- **speed**: Highpass filter opens up (brighter sound), slight pitch up
- **friction**: Delay/chorus effect for slippery feel
- **size**: Lowshelf bass boost, slight pitch down for heaviness
- **coinSpeedBoost**: Ring modulator adds metallic shimmer

### Corrupted Upgrades
- **glass_cannon**: Distortion and compression increase with tiers
- **gold_grift**: Bitcrushing reduces fidelity, simulating digital corruption
- **spiders_web**: Lowpass filter dampens highs
- **cursed_harvest**: Pitch down and reverb for ominous feel

### Technical Upgrades
- **rail_rider**: Narrow stereo width for focused feel
- **snap_curl**: Stereo panning follows velocity
- **dimension_door**: Flanger swoosh when passing through walls
- **wall_ping_coin**: Synced delay on coin collection from walls

### High Risk Upgrades
- **tar_launch**: Heavy compression + distortion during boost
- **herrings_last_dance**: Full bandwidth when last life, muffled otherwise
- **frozen_broom**: Crystalline reverb texture

## Testing
1. Buy upgrades in shop
2. Listen during gameplay
3. Higher tiers = stronger effects
4. Some effects combine (e.g., speed + size = bright but heavy)
```

**Step 2: Final testing checklist**

```bash
# Test all 20+ upgrades
for upgrade in speed friction size coinSpeedBoost spin_win gold_grift glass_cannon wall_speed friction_forge spin_to_speed spiders_web rail_rider echo_woods event_horizon snap_curl wall_ping_coin double_shops cleanse dimension_door cursed_harvest tar_launch sweep_life frozen_broom herrings_last_dance; do
    echo "Testing $upgrade..."
    # Buy upgrade T1
    # Verify effect is subtle
    # Buy upgrade T3/T5  
    # Verify effect is stronger
    # Reset and try next
done
```

**Step 3: Commit**

```bash
git add docs/audio-effects.md
git commit -m "docs: add audio effects system documentation

- Document how the effects system works
- List all upgrade-to-effect mappings
- Include testing guide"
```

---

## Summary

This implementation adds 24 distinct upgrade-based audio effects using the Web Audio API. The system:

1. **Creates reusable effect nodes** (filters, delays, distortion, compression)
2. **Calculates mix parameters** from upgrade levels every frame
3. **Triggers one-off effects** on physics events (wall bounces, coin collects)
4. **Smooths transitions** using Web Audio API ramp functions
5. **Scales with tiers** - higher upgrade levels = stronger effects

**Total Tasks:** 7
**Estimated Time:** 60-90 minutes
**Files Changed:** 3 (audio.js, physics.js, new audio-effects.js)
**Files Created:** 2 (audio-effects.js, audio-effects.md)
