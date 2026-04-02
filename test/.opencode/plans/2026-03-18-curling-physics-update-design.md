# Curling Stone Physics Update Design

## Summary
Implement realistic curling physics using the **Pivot-Slide Model** with velocity-dependent friction and randomized rotation on launch.

## Technical Background
Curling stones exhibit unique lateral deflection (curl) in the direction of their rotation, contradicting standard sliding physics. This is modeled through:
- Velocity-dependent friction (`μ = μ₀ × v^(-1/2)`)
- Running band contact (annular ring at r ≈ 0.065m)
- Pivot-slide mechanism: stone pivots around slow-side contact points

## Implementation Plan

### Files to Modify

#### 1. `state.js` - Add rotational state
Add to stone object:
- `angularVelocity: 0` - ω in radians/second
- `rotation: 0` - accumulated rotation angle (for rendering)
- `mass: 19.96` - kg (standard curling stone)
- `momentOfInertia` - calculated as `½mr²`

#### 2. `physics.js` - Core physics overhaul

**New constants:**
```javascript
mu0 = 0.008                    // base friction coefficient
runningBandRadius = 0.065 * scaleFactor
pivotOffsetRatio = 0.3          // virtual pivot position
minAngularVelocity = -15        // rad/s
maxAngularVelocity = 15         //rad/s
```

**Velocity-dependent friction:**
```javascript
getMu(velocity) {
    return this.mu0 * Math.pow(velocity, -0.5);
}
```

**Pivot-Slide lateral force:**
- Virtual pivot offset from center of gravity toward slow side
- Lateral force proportional to `|ω| × |v| / v.magnitude`
- Curl direction matches rotation direction (odd but true for curling)

**Update loop per physics step:**
1. Calculate speed: `v = sqrt(vx² + vy²)`
2. Get velocity-dependent μ
3. Calculate friction force: `F_f = μ × m × g`
4. Decompose into deceleration + lateral curl component
5. Update velocities (vx, vy, ω)
6. Update position and accumulated rotation

**Launch method:**
- Apply random angular velocity: `ω = random(minAngularVelocity, maxAngularVelocity)`
- Reset rotation angle to 0

#### 3. `renderer.js` - Visual rotation
- Apply rotation transform using `state.stone.rotation`
- Stone sprite/drawing rotates visually during slide

## Key Physics Equations

| Component | Equation |
|-----------|----------|
| Friction coefficient | `μ = μ₀ × v^(-1/2)` |
| Moment of inertia | `I = ½mr²` |
| Lateral curl force | `F_curl ≈ k × ω × v_forward / \|v\|` |
| Angular deceleration | `τ = Σ(r × F_friction)` |

## Testing Considerations
1. Stone curls in direction of rotation (not opposite)
2. Higher velocities have lower friction (glides farther)
3. Random rotation creates varied but reasonable curl amounts
4. Stone eventually stops due to friction

## Parameters to Tune
- `mu0` (base friction) - affects slide distance
- Rotation range (-15 to +15 rad/s) - affects curl magnitude
- `pivotOffsetRatio` - affects curl strength
- Internal physics substep count for accuracy