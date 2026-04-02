# Audio Effects System

## Overview
The audio effects system dynamically modifies background music based on active upgrades during gameplay. Effects update every frame based on which upgrades are active and their tier levels.

## How It Works
1. Web Audio API nodes create an effects chain between the music source and speakers
2. Each upgrade contributes parameters to the overall mix
3. Effects update 60 times per second during gameplay
4. One-off effects trigger on specific events (wall bounces, coin collects)
5. Effects only active during gameplay, not in shop/menu

## Upgrade Effects

### Basic Upgrades
- **speed**: Highpass filter opens up (brighter sound), slight pitch up
- **friction**: Delay/chorus effect for slippery feel
- **size**: Lowshelf bass boost, slight pitch down for heaviness
- **coinSpeedBoost**: Metallic shimmer via distortion

### Corrupted Upgrades
- **glass_cannon**: Distortion and compression increase with tiers
- **gold_grift**: Bitcrushing reduces fidelity, simulating digital corruption
- **spiders_web**: Lowpass filter dampens highs
- **cursed_harvest**: Pitch down and delay for ominous feel
- **friction_forge**: Lowpass + industrial distortion

### Technical Upgrades
- **rail_rider**: Subtle stereo panning
- **snap_curl**: Stereo panning follows stone velocity
- **dimension_door**: Delay effect + flanger swoosh when passing through walls
- **wall_ping_coin**: Delay sync on coin collection from walls
- **double_shops**: Subtle saturation
- **echo_woods**: Delay/reverb feel
- **spin_win**: Stereo panning based on rotation
- **spin_to_speed**: Mechanical pitch wobble

### High Risk Upgrades
- **tar_launch**: Heavy compression + distortion during boost
- **herrings_last_dance**: Full bandwidth when last life, muffled otherwise
- **frozen_broom**: Crystalline delay texture
- **sweep_life**: Delay/reverb feel

## One-Off Effects

These trigger on specific physics events:

- **wallBounce**: Momentary delay boost when hitting walls
- **coinCollect**: Frequency boost on coin collection
- **dimensionDoor**: Flanger swoosh when passing through walls

## Effect Parameters

Each upgrade contributes to these parameters which blend together:

| Parameter | Default | Description |
|-----------|---------|-------------|
| highpassFreq | 80 Hz | Highpass filter frequency (higher = brighter) |
| lowpassFreq | 20000 Hz | Lowpass filter frequency (lower = darker) |
| lowshelfGain | 0 dB | Bass boost amount |
| delayTime | 0.001 s | Delay effect time |
| distortionAmount | 0 | Waveshaper distortion (0 = clean) |
| compressorThreshold | -24 dB | Compressor threshold |
| compressorRatio | 1 | Compressor ratio |
| pan | 0 | Stereo pan (-1 to 1) |
| playbackRate | 1.0 | Pitch shift (higher = faster) |

## File Structure

```
scripts/
├── audio.js           # AudioController with effects integration
├── audio-effects.js   # AudioEffectsSystem class
└── physics.js         # Physics event triggers

docs/
└── audio-effects.md   # This documentation
```

## Testing Guide

1. Start the game with no upgrades - music should sound normal
2. Buy speed upgrade (T1-T5) - listen for brightness increase
3. Buy size upgrade - listen for bass boost and pitch drop
4. Buy glass cannon - listen for distortion increase
5. Hit walls - should hear delay effect
6. Collect coins - should hear subtle frequency boost
7. Buy dimension door - hear flanger on wall passes

## Parameter Ranges

### Speed Highpass Filter
- T1: 1500 Hz (subtle brightness)
- T3: 2500 Hz (noticeable brightness)
- T5: 3500 Hz (strong brightness)

### Size Bass Boost
- T1: 4 dB (subtle weight)
- T3: 12 dB (heavy feel)
- T5: 20 dB (very heavy)

### Glass Cannon Distortion
- T1: 20 (subtle grit)
- T3: 60 (clear distortion)
- T5: 100 (heavy distortion)

### Gold Grift Bitcrushing
- T1: 30 (slight digital grit)
- T2: 60 (more noticeable)
- T3: 90 (obvious corruption)

## Future Enhancements

Potential improvements for the audio effects system:

1. **Ring Modulator**: Add metallic ring modulation for coinSpeedBoost
2. **Convolution Reverb**: Add proper reverb for echo_woods upgrade
3. **Dynamic EQ**: Add frequency-specific processing
4. **Sidechain Compression**: More sophisticated ducking for event_horizon
5. **Stereo Widener**: Proper stereo width control for rail_rider

## Debugging

To debug audio effects:

1. Check browser console for "AudioEffectsSystem initialized" message
2. Monitor `audio.effectsSystem.effectNodes` object in browser DevTools
3. Use Web Audio API debugging tools (chrome://inspect)
4. Check `audio.currentPlaybackRate` for pitch effects
5. Listen for smooth transitions between effect states

## Performance

The audio effects system is designed to be performant:

- Uses pre-created Web Audio nodes
- Smooth parameter transitions (150ms ramp time)
- Minimal allocations during gameplay
- Only updates when music is playing
- Effect chain is disconnectable when not needed
