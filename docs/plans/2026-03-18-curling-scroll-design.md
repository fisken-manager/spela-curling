# Curling Scroll - Design Document

## Overview

A web page that can only be scrolled by shooting a curling stone. The stone's movement syncs with music playback - scrolling forward plays music forward, scrolling backward rewinds it.

## Core Mechanics

### Shooting
- Hold pointer (mouse/touch) to charge power bar
- Aim with pointer direction relative to stone
- Release to launch stone
- Power bar fills over time (0-100%)

### Sweeping
- Large sweep zone appears ahead of moving stone
- Move pointer rapidly within zone to reduce friction
- Extends stone's glide distance

### Physics
- Stone bounces off side walls with ~80% energy retention
- Velocity decays via ice-like friction curve
- Stone stays centered (30% from bottom) in viewport while moving
- Content translates behind stone (camera-follow pattern)

### Scrolling
- Only mechanism to scroll is stone movement
- Page starts at bottom (0% progress)
- Goal: reach top (100% progress)
- Infinite loop: reaching end wraps to start

## Audio System

- Music position = scroll progress (0-100%)
- Playback rate = stone velocity magnitude
- Forward scroll→ forward playback
- Backward scroll → backward playback (rewinds)
- Sweeping active → tempo boost multiplier
- Song loops when reaching page end

## Visual Style

- Minimalist abstract design
- Simple geometric stone shape
- Clean power bar UI
- Canvas overlay with particle effects:
  - Ice trail behind stone
  - Sweep strokes effect in sweep zone
  - Wall bounce sparks
- Large sweep zone highlighted when active

## Technical Architecture

```
┌─────────────────────────────────────┐
│  Canvas Overlay (position: fixed)   │
│  - Stone rendering                  │
│  - Power bar UI                     │
│  - Particle effects                 │
│  - Sweep zone highlight              │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  HTML Content (scrollable page)     │
│  - Text sections                    │
│  - Images                           │
│  - Content translates via CSS       │
└─────────────────────────────────────┘
```

### Components

1. **GameState** - tracks stone position, velocity, friction, state (charging/moving/resting)
2. **Physics** - velocity decay, friction curve, sweep boost, wall bounce
3. **AudioController** - Web Audio API for tempo manipulation tied to velocity
4. **InputHandler** - pointer events, power charging, angle detection, sweep detection
5. **Renderer** - 60fps canvas drawing loop with requestAnimationFrame
6. **ScrollController** - maps world position to scroll progress, handles wrapping

### Technical Stack

- Vanilla JavaScript (no framework)
- HTML5 Canvas for game layer
- Web Audio API for tempo control/reverse playback
- CSS transforms for content scrolling
- Pointer Events API (cross-platform mouse/touch)

## Content

- Placeholder text and images for development
- Audio file: `song.wav` (provided)
- Infinite loop behavior on completion