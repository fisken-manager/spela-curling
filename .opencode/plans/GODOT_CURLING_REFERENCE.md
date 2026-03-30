# Spela Curling 2.5D - Mechanics Reference Document

**Source**: Current HTML5/Canvas implementation
**Target**: Godot 4.6.1 with 2.5D visuals
**Goal**: Exact mechanics replication with 3D presentation

---

## 1. CORE GAME LOOP

### Game States
```
RESTING → CHARGING → MOVING → RETURNING → RESTING
```

**RESTING**: Stone at bottom of screen, waiting for player input
- Stone position: `stoneYPx = screenHeight - restOffsetPx` (restOffsetPx = 80)
- Stone centered horizontally (x = 0)
- Player can touch stone to start charging

**CHARGING**: Player holding finger on stone, dragging to aim
- Stone follows finger with soft clamping
- Tracks finger movement history (last 150ms)
- Calculates aim angle from drag vector

**MOVING**: Stone has been launched, physics active
- Camera follows from behind
- Sweep detection active (reduces friction)
- Pickup collision detection
- Wall collision handling

**RETURNING**: Stone stopped moving (lose life or complete level)
- Transition back to RESTING or show game over

---

## 2. INPUT SYSTEM (CRITICAL - Exact replication required)

### Touch/Pointer Handling

**onPointerDown**:
1. Check if touching stone (distance <= radius * 1.5)
2. If yes: Enter CHARGING state
3. Record: dragStartX, dragStartYPx, stoneStartX, stoneStartYPx
4. Initialize flickHistory with current position + timestamp
5. Clear snap state

**onPointerMove** (during CHARGING):
1. Track sweep positions (for later sweep detection)
2. Calculate raw delta: pointerPos - dragStartPos
3. **SOFT CLAMPING** (very important):
   - If distance > softRadius (80px): Apply easing
   - Formula: `excess = distance - softRadius`
   - `mappedExcess = (excess * maxRadius) / (excess + maxRadius)`
   - `newDist = softRadius + mappedExcess`
   - This creates smooth resistance when pulling far
4. Move stone to: stoneStart + clampedDelta
5. Record position in flickHistory (with timestamp)
6. Keep only last 150ms of history

**onPointerUp** (launch detection):
1. Check flickHistory length (need at least 2 points)
2. Get oldest point in history
3. Calculate: dt = now - oldest.time
4. Calculate velocity: vx = (currentX - oldest.x) / dt
5. Calculate velocity: vy = (currentY - oldest.y) / dt
6. Calculate speed: sqrt(vx² + vy²)
7. **LAUNCH CONDITIONS** (ALL must be true):
   - speed > 0.5 (px/ms)
   - vy < 0 (upward motion on screen)
   - distance > 10px
8. If valid: Convert to world velocity, launch stone
9. If invalid: Reset to resting (snap back animation)

### Sweep Detection (while MOVING)

**During MOVING phase**, track all pointer movements:
1. Store last 10 positions with timestamps
2. Calculate total movement distance from recent positions
3. If total > sweepThreshold (5px):
   - Calculate intensity: total / 50
   - Call applySweep(intensity)
   - Clear sweep history

---

## 3. PHYSICS SYSTEM

### Constants
```javascript
baseMaxVelocity = 21.0          // units/second
baseFriction = 0.01             // deceleration per physics tick
baseCurlStrength = 0.2          // lateral force multiplier
angularDecayFactor = 0.15       // spin decay rate
stopThreshold = 0.1             // velocity below = stop
physicsTick = 0.001             // seconds (1000Hz physics)
```

### Launch Velocity Conversion

**Screen to World Conversion**:
```javascript
// Screen: y is up (negative), x is lateral
// World: -z is forward, x is lateral
scaleFactor = 0.01              // pixels to world units
forwardSpeed = -vy * scaleFactor * 60  // Convert to world forward
lateralSpeed = vx * scaleFactor * 60   // Convert to world lateral
spin = atan2(vx, -vy) * 10     // Convert aim angle to spin rate
```

### Physics Update (each tick)

**1. Check Stop Condition**:
   - If speed < stopThreshold: Stop stone, enter RETURNING

**2. Apply Friction**:
   ```javascript
   frictionDecel = velocity.normalized * effectiveFriction
   velocity -= frictionDecel * dt
   ```

**3. Apply Curl (Magnus Effect)**:
   ```javascript
   forwardVelocity = velocity.z  // Forward is negative Z
   speedNorm = max(speed, 0.001)
   curlAccel = curlStrength * angularVelocity * abs(forwardVelocity) / speedNorm
   velocity.x += curlAccel * dt
   ```

**4. Apply Angular Decay**:
   ```javascript
   angularVelocity -= angularVelocity * friction * dt * angularDecayFactor
   if abs(angularVelocity) < 0.01: angularVelocity = 0
   ```

**5. Apply Damping**:
   ```javascript
   velocity *= 0.9997  // Micro-damping for stability
   ```

**6. Velocity Cap**:
   ```javascript
   if speed > maxVelocity: velocity = velocity.normalized * maxVelocity
   ```

### Sweep Effect

**When sweep detected**:
- Reduce friction temporarily: `friction *= 0.6`
- Restore when sweep stops

---

## 4. UPGRADES SYSTEM

### All Upgrades (must replicate exactly)

**Basic Upgrades**:
1. **speed** (Hastig Leda): +15% max velocity per level
2. **friction** (Glatt Misär): -5% friction per level
3. **size** (Vattnad Väg): +20% stone size per level

**Corrupted Upgrades**:
4. **spin_win**: +40% angular decay per level
5. **gold_grift**: Loop penalty reduction
6. **glass_cannon**: +50% speed, -25% something else
7. **wall_speed**: Speed boost on wall hit (15%/25%/40%)
8. **friction_forge**: Permanent +3% speed per level, -20% current speed on hit
9. **spin_to_speed**: Convert spin to velocity on wall hit

**Technical Upgrades**:
10. **rail_rider**: Glide along walls (2s + 1s per level)
11. **echo_woods**: Spawn pickups on wall hit
12. **event_horizon**: Magnetism for pickups
13. **snap_curl**: Bonus on curl direction change
14. **wall_ping_coin**: Earn money every N wall hits
15. **dimension_door**: Pac-Man wall wrapping (1 level only)

**High Risk**:
16. **tar_launch**: Temporary speed boost on launch
17. **sweep_life**: Sweep pickups give lives
18. **frozen_broom**: Money bonus if no sweep during boost
19. **cursed_harvest**: Negative pickups have increased effects
20. **herrings_last_dance**: +50% speed at 0 lives, -50% at 1+ lives
21. **needle_eye**: Smaller stone = less friction

### Upgrade Effects Calculation

**Max Velocity** calculation (order matters):
```javascript
maxVel = baseMaxVelocity
maxVel *= (1 + speedLevel * 0.15)           // Speed upgrade
maxVel *= (1 - sizeLevel * 0.1)              // Size penalty
maxVel *= (1 + permanentSpeedBonus)          // Friction forge
maxVel *= (1 + glassCannonLevel * 0.5)       // Glass cannon
if tarBoostActive: maxVel *= (1 + tarLevel)  // Tar launch
if goldGrift: apply loop penalty              // Gold grift
maxVel *= pow(0.90, max(0, loopCount - 1))   // Natural loop decay
if herringsLastDance:
    if lives == 0: maxVel *= 1.5
    else: maxVel *= 0.5
```

---

## 5. CAMERA SYSTEM

### Current 2D Camera (for reference)

**Resting Phase**:
- Stone at: `stoneYPx = screenHeight - 80`
- Camera static (no scroll)

**Moving Phase**:
- Camera follows stone in screen space
- Scroll speed tied to stone velocity
- Stone stays roughly centered vertically

### New 3D Camera (to implement)

**AIMING Phase** (replaces resting):
- Position: Behind and above stone
- Distance: 15 units behind
- Height: 12 units above
- Angle: 60° looking down (high angle)
- **Purpose**: Let player see stone and track ahead for aiming

**LAUNCHING Phase** (transition, 1.5 seconds):
- Smoothly interpolate from AIMING to FOLLOWING
- Easing: easeOutCubic `t = 1 - (1 - progress)³`
- Stone moves from bottom of view to center

**FOLLOWING Phase**:
- Position: 10 units behind stone
- Height: 7 units above
- Angle: 25° looking forward
- Look-ahead: Offset by velocity direction
- Smooth follow with lag (spring-arm behavior)

---

## 6. PICKUPS & COLLECTIBLES

### Types

**Score Orbs**:
- Green: 25 points
- Purple: 100 points (chain reaction with explosive upgrade)
- Yellow: $1 money

**Power-ups**:
1. **Speed Boost** (green): +15 speed, reduced friction for 2.5s
2. **Life** (red): +1 life
3. **Shop** (blue): Enter shop
4. **Sweep** (cyan): 5s of enhanced sweeping
5. **Rotation** (purple): Random spin boost
6. **Super Boost** (orange): +30 speed, reduced friction, +50% max velocity cap for 5s
7. **Growth** (green bigger): 2x stone size for 3s
8. **Curl Chaos** (brown): +10% curl chaos
9. **Size Shrink** (gray): -3 radius

### Magnetism

**event_horizon upgrade**:
- Radius: 50 + level * 75
- Strength: 0.02 + level * 0.02
- Pulls pickups toward stone

**magnetism upgrade**:
- Radius: 50 + level * 50
- Strength: 0.05 + level * 0.05
- Pulls pickups toward stone

**spin_win upgrade**:
- Adds magnetism based on spin rate
- More spin = stronger pull

---

## 7. WALL COLLISION

### Wall Properties
- Track width: 6 units
- Wall height: 0.5 units
- Bounce energy retention: 80% (0.8)

### Bounce Effects (triggered on wall hit)

**bouncyWalls upgrade**:
- Level 1: 100% energy retention
- Level 2: 115% energy retention (speed up!)

**wall_speed upgrade**:
- Level 1: +15% speed
- Level 2: +25% speed  
- Level 3: +40% speed

**friction_forge upgrade**:
- Permanent +3% max velocity per level
- Immediate -20% to -35% current speed

**spin_to_speed upgrade**:
- Converts spin to forward velocity
- Conversion rate: 30% to 80% depending on level
- Clears or reduces spin after conversion

**echo_woods upgrade**:
- Spawns speed pickup at wall hit location
- Level 1: 20% chance
- Level 2: 40% chance
- Level 3: 60% chance

**rail_rider upgrade**:
- Instead of bouncing, glide along wall
- Duration: 2s + (level - 1)s
- Cooldown: 10s
- No X-velocity during glide
- Throws stone away from wall when ends

**dimension_door upgrade**:
- Pac-Man style wrapping
- Left wall → Right wall, vice versa
- Skips all other wall effects

---

## 8. SHOP SYSTEM

### Card Selection

**Appearance**: Shop triggered by:
1. Collecting shop pickup during run
2. Reaching shop node on world map

**Interface**:
- 3 cards displayed horizontally
- Each card shows: upgrade name, cost, current level/max
- Player can select ONE card to purchase
- Reroll button: costs $1 (increases by $1 each use)
- Continue button: exits shop, +1 life

**Owned upgrades**: Displayed in separate area below
- Can be dragged to reorganize
- Shows all purchased upgrades with levels

### Shop Transition Animation

**Fish Zoom** (primary animation):
1. Camera zooms to fish pickup location
2. Fish sprite scales up and rotates
3. Fades to shop scene
4. Duration: ~1 second

---

## 9. WORLD MAP (Slay the Spire Style)

### Node Types
- **Level**: Regular curling track
- **Shop**: Enter shop without pickup
- **Event**: Random bonus/choice/combat
- **Rest**: Recover life, maybe get upgrade

### Map Structure
- Branching paths (2-3 choices at each node)
- 10-15 nodes per act
- 3 acts total
- Boss at end of each act

### Progression
- Start at bottom, work up
- Completed nodes marked green
- Current position marked
- Accessible nodes (connected to completed) are white
- Inaccessible nodes are gray

---

## 10. SCORING & COMBO

### Combo System
- Collect orbs within 500ms of each other
- Combo multiplier increases by 1 per orb
- Max combo: 100x
- Combo timeout: 500ms
- Score = basePoints × comboMultiplier

### Scoring
- Green orb: 25 × combo
- Purple orb: 100 × combo  
- Yellow orb: $1 (no score)
- Speed bonus at level end: based on remaining velocity

---

## 11. AUDIO

### Music
- 5 different game tracks (rotate through)
- 1 shop track
- Fade between tracks (0.5s fade out, new track starts)

### SFX
- Throw: Whoosh based on power
- Pickup: Sparkle chime
- Wall bounce: Thud (pitch based on speed)
- Sweep: Brushing sound (intensity based)
- Game over: Sad trombone
- Shop enter: Transition sound

---

## 12. MOBILE CONSIDERATIONS

### Input
- Touch only (no mouse/keyboard required)
- Emulate touch from mouse for desktop testing
- Multi-touch not needed (single finger play)

### Performance
- Target: 60fps on mid-tier mobile (3+ years old)
- Render: Mobile renderer (Vulkan)
- Textures: ETC2/ASTC compression
- Physics: Optimize to 60Hz (not 1000Hz like current)

### UI
- All UI must be finger-friendly (min 44x44pt touch targets)
- Scale UI based on screen density
- Safe areas for notches/home indicators

---

## 13. FILE REFERENCES FOR AGENTS

**Critical files to reference**:
- `scripts/input.js` - Touch handling, flick detection
- `scripts/physics.js` - All physics calculations, upgrade effects
- `scripts/state.js` - Game state, upgrade definitions, pickup configs
- `scripts/game.js` - Main loop, state transitions

**Reference repo location**: `/home/ivo/projects/spela-curling`

---

## 14. GODOT IMPLEMENTATION NOTES

### Node Structure
```
MainGame (Node3D)
├── GameController (Node - script)
├── Track (Path3D + TrackManager)
├── Stone (RigidBody3D + StoneController)
├── CameraRig (Node3D + CameraController)
│   └── SpringArm3D
│       └── Camera3D
├── PickupManager (Node3D)
│   └── [Spawned Pickups]
├── Environment (Node3D)
│   ├── Ground
│   └── SideDecorations (Sprite3D)
└── HUD (CanvasLayer)
```

### Physics Settings
- Physics FPS: 60 (not 1000 like current)
- Use `_integrate_forces()` for custom stone physics
- Collision layers:
  - Layer 1: Stone
  - Layer 2: Track
  - Layer 3: Pickups
  - Layer 4: Walls

### Critical Differences from Current
1. **Coordinate system**: Godot uses Y-up (current uses Y-down for screen)
2. **Physics timing**: Godot runs at 60Hz (current runs at 1000Hz)
3. **Camera**: Godot 3D camera (current is 2D canvas with scroll)
4. **Track**: Path3D curves (current is 2D with scroll simulation)

---

## 15. TESTING CHECKLIST

### Core Mechanics
- [ ] Touch stone, drag, release → stone launches
- [ ] Soft clamping feels right (resistance when pulling far)
- [ ] Flick speed detection works (need min 0.5 px/ms)
- [ ] Stone stops when velocity < 0.1
- [ ] Lose life when stone stops
- [ ] Can buy life with money if die

### Physics
- [ ] Friction slows stone over time
- [ ] Curl curves stone based on spin
- [ ] Sweep reduces friction temporarily
- [ ] Wall bounce works
- [ ] Velocity cap prevents infinite speed

### Upgrades
- [ ] Speed upgrade increases max velocity
- [ ] Friction upgrade reduces deceleration
- [ ] All wall-related upgrades work
- [ ] Magnetism pulls pickups

### Camera
- [ ] High angle during aiming
- [ ] Smooth transition to follow mode
- [ ] Follows stone with slight lag
- [ ] Look-ahead on curves

### Progression
- [ ] World map displays correctly
- [ ] Can select accessible nodes
- [ ] Shop shows 3 cards
- [ ] Can purchase upgrades
- [ ] Continue from shop returns to map

---

**END OF REFERENCE DOCUMENT**

*All agents should reference this document when implementing features. Exact replication of mechanics is critical - any deviations must be documented and approved.*
