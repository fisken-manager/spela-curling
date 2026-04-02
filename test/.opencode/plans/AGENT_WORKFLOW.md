# Agent Workflow - Spela Curling 2.5D Godot

## Agent Teams & Responsibilities

### Team Alpha (Can work in parallel)

**Agent A1: Core Physics & Stone**
- **Scope**: Stone RigidBody3D, physics calculations, throw mechanics
- **Inputs**: Reference doc section 2 (Input), section 3 (Physics)
- **Outputs**: `scenes/gameplay/stone.tscn`, `scripts/stone/stone_controller.gd`
- **Priority**: HIGHEST (blocks other systems)

**Agent A2: Input Handler**
- **Scope**: Touch input, flick detection, sweep detection
- **Inputs**: Reference doc section 2, current `scripts/input.js`
- **Outputs**: `scripts/input/touch_input.gd`
- **Priority**: HIGHEST (blocks other systems)

**Agent A3: Camera System**
- **Scope**: Camera rig, phase transitions, follow behavior
- **Inputs**: Reference doc section 6 (Camera)
- **Outputs**: `scenes/gameplay/camera_rig.tscn`, `scripts/camera/camera_controller.gd`
- **Priority**: HIGH

### Team Beta (Depends on Team Alpha)

**Agent B1: Track System**
- **Scope**: Path3D tracks, wall collision, track generation
- **Inputs**: Reference doc section 7 (Walls)
- **Outputs**: `scripts/track/track_manager.gd`, track scenes
- **Dependencies**: Agent A1 (physics understanding)
- **Priority**: MEDIUM

**Agent B2: Game Controller**
- **Scope**: State machine, game loop, transitions
- **Inputs**: Reference doc section 1 (Game Loop)
- **Outputs**: `scripts/game/game_controller.gd`
- **Dependencies**: Agents A1, A2, A3 (core systems)
- **Priority**: MEDIUM

### Team Gamma (Can work after Beta)

**Agent C1: Pickup System**
- **Scope**: Pickups, magnetism, collection effects
- **Inputs**: Reference doc section 5 (Pickups)
- **Outputs**: `scripts/game/pickup_manager.gd`, pickup scenes
- **Dependencies**: Agent B2 (game loop)
- **Priority**: MEDIUM

**Agent C2: Upgrade System**
- **Scope**: Upgrade definitions, effects calculation
- **Inputs**: Reference doc section 4 (Upgrades)
- **Outputs**: `scripts/game/upgrade_data.gd`
- **Dependencies**: Agent B2
- **Priority**: MEDIUM

### Team Delta (UI/UX - Can work parallel after Alpha)

**Agent D1: HUD & UI**
- **Scope**: HUD, menus, score display
- **Inputs**: Reference doc section 10 (Scoring)
- **Outputs**: `scenes/ui/hud.tscn`, `scripts/ui/hud.gd`
- **Priority**: LOW (visual only)

**Agent D2: World Map**
- **Scope**: Slay the Spire style map, nodes, navigation
- **Inputs**: Reference doc section 9 (World Map)
- **Outputs**: `scenes/map/world_map.tscn`, `scripts/map/world_map.gd`
- **Priority**: LOW

**Agent D3: Shop System**
- **Scope**: Shop UI, 3-card selection, reroll
- **Inputs**: Reference doc section 8 (Shop)
- **Outputs**: `scenes/ui/shop.tscn`, `scripts/ui/shop.gd`
- **Priority**: LOW

### Agent E1: Integration & Testing (Final)
- **Scope**: Integration, test level, bug fixes
- **Dependencies**: ALL other agents
- **Priority**: LAST

---

## Workflow Process

### Phase 1: Foundation (Week 1)
**Parallel execution:**

1. **Kickoff Meeting** (All agents)
   - Review reference document
   - Assign tasks
   - Define interfaces between systems

2. **Team Alpha Sprints** (Simultaneous)
   - Agent A1: Create stone physics (2 days)
   - Agent A2: Create input handler (2 days)
   - Agent A3: Create camera system (2 days)

3. **Review Checkpoint 1** (All agents)
   - Code review of Team Alpha work
   - Integration test: Stone + Input + Camera
   - User review and approval

### Phase 2: Core Gameplay (Week 1-2)
**Sequential then parallel:**

4. **Team Beta** (After Checkpoint 1 approval)
   - Agent B1: Track system (2 days)
   - Agent B2: Game controller (2 days)
   - Integration between them

5. **Review Checkpoint 2**
   - Test: Can throw stone on track
   - Test: Stone follows track, collides with walls
   - User review

### Phase 3: Content (Week 2)
**Parallel:**

6. **Team Gamma & Delta** (After Checkpoint 2)
   - Agents C1, C2, D1, D2, D3 work simultaneously
   - Each takes 2-3 days
   - Daily standups to coordinate

7. **Review Checkpoint 3**
   - Feature completeness check
   - Balance testing
   - User review

### Phase 4: Integration (Week 3)
**Sequential:**

8. **Agent E1: Integration** (3-4 days)
   - Combine all systems
   - Create test level
   - Fix integration bugs

9. **Final Review**
   - Full playtest
   - Compare mechanics to original game
   - Performance testing on mobile

10. **Polish & Release** (Remaining time)
    - Visual polish
    - Audio integration
    - Documentation

---

## Review Process

### After Each Agent Completes Task:

**Step 1: Self-Test** (Agent)
```
- Run their component in isolation
- Verify against reference doc requirements
- Document any deviations
```

**Step 2: Code Review** (Assigned reviewer)
```
- Another agent reviews the code
- Checks for:
  * Correctness against reference doc
  * Code quality
  * Integration points
  * Comments/documentation
```

**Step 3: Integration Test** (Integration Agent)
```
- Add to main scene
- Test with other components
- Verify interfaces work
```

**Step 4: User Review** (You)
```
- Try the feature
- Approve or request changes
- Sign off on completion
```

### Review Checkpoints:

**Checkpoint 1**: Stone throws, camera follows
**Checkpoint 2**: Full track traversal
**Checkpoint 3**: Pickups, upgrades, shops working
**Checkpoint 4**: Complete game loop

---

## Communication Protocol

### Daily Standups (15 min)
Each agent answers:
1. What did you complete yesterday?
2. What are you working on today?
3. Any blockers or dependencies?

### Interface Contracts
When two agents need to connect, they document:
```gdscript
# Interface: StoneController → GameController
# Signal: stone_stopped()
# Called when: Stone velocity < threshold
# Data provided: final_position, reason (wall/stop/natural)
```

### Conflict Resolution
If agents disagree on implementation:
1. Refer to reference document
2. Check original game behavior
3. User makes final decision

---

## File Naming Convention

```
scenes/
  gameplay/
    stone.tscn                 # Agent A1
    camera_rig.tscn           # Agent A3
    pickup_base.tscn          # Agent C1
  levels/
    level_test.tscn           # Agent E1
    level_01.tscn             # Agent E1
  ui/
    hud.tscn                  # Agent D1
    shop.tscn                 # Agent D3
  map/
    world_map.tscn            # Agent D2

scripts/
  stone/
    stone_controller.gd       # Agent A1
  input/
    touch_input.gd            # Agent A2
  camera/
    camera_controller.gd      # Agent A3
  track/
    track_manager.gd          # Agent B1
  game/
    game_controller.gd        # Agent B2
    pickup_manager.gd          # Agent C1
    upgrade_data.gd            # Agent C2
  ui/
    hud.gd                     # Agent D1
    shop.gd                    # Agent D3
  map/
    world_map.gd               # Agent D2
    map_node.gd                # Agent D2
```

---

## Success Criteria

### For Each Agent Task:
✅ Code compiles without errors
✅ Matches reference document specifications
✅ Self-tested and working
✅ Code reviewed and approved
✅ Documented with comments
✅ User approved

### For Each Checkpoint:
✅ Previous features still work (regression test)
✅ New features functional
✅ No critical bugs
✅ Performance acceptable
✅ User sign-off

---

## Risk Mitigation

### Risk: Physics don't feel right
**Mitigation**: 
- Agent A1 must test throw feel daily
- Compare side-by-side with original game
- User reviews at Checkpoint 1

### Risk: Camera makes players dizzy
**Mitigation**:
- Agent A3 provides adjustable settings
- Test with multiple users
- Can disable transitions if needed

### Risk: Mobile performance issues
**Mitigation**:
- Performance budget: 60fps on 3-year-old phone
- Profile at each checkpoint
- Optimize early, not at end

### Risk: Scope creep
**Mitigation**:
- Strict adherence to plan
- New features require user approval
- Post-MVP list for future additions

---

## Agent Assignment Ready

**Next Step**: User review of this workflow
**Then**: Approve and dispatch Team Alpha agents

**Team Alpha can start immediately after approval**:
- Agent A1 (Stone Physics)
- Agent A2 (Input Handler)  
- Agent A3 (Camera System)

All three are independent and can work in parallel.
