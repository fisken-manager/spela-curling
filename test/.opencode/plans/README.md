# Spela Curling 2.5D - User Quick Start Guide

## What We Created

This is your AI agent development system for building the 2.5D Godot curling game.

### Documents Created:

1. **GODOT_CURLING_REFERENCE.md** - Complete mechanics reference extracted from current game
2. **AGENT_WORKFLOW.md** - Agent teams, responsibilities, and workflow process
3. **2026-03-30-godot-curling-design.md** - Detailed implementation plan with code examples
4. **This README** - How to use the system

---

## How This Works

### Overview
Instead of building the game yourself, specialized AI agents will build it component by component. You'll review and approve each piece.

### The Process:

```
You → Dispatch Agent → Agent Builds → Review → Approve → Next Agent
```

### Agent Teams:

**Team Alpha** (Start First - Parallel):
- 🥌 Stone Physics Agent
- 👆 Input Handler Agent  
- 📷 Camera System Agent

**Team Beta** (After Alpha - Sequential):
- 🛤️ Track System Agent
- 🎮 Game Controller Agent

**Team Gamma** (After Beta - Parallel):
- 💎 Pickup System Agent
- ⬆️ Upgrade System Agent

**Team Delta** (UI - Parallel):
- 📺 HUD Agent
- 🗺️ World Map Agent
- 🛒 Shop System Agent

**Integration Agent** (Last):
- 🔧 Combine everything, test, fix bugs

---

## Your Role

### As Project Manager:
1. **Approve agent task assignments**
2. **Review completed work** at checkpoints
3. **Make decisions** when agents need clarification
4. **Test the game** at each checkpoint

### Review Checkpoints:

**Checkpoint 1**: Stone throws, camera follows (Week 1)
- Try throwing the stone
- Does it feel like the original?
- Is the camera smooth?

**Checkpoint 2**: Track traversal (Week 1-2)
- Stone follows track path
- Wall collisions work
- Can complete a level

**Checkpoint 3**: Full features (Week 2)
- Pickups spawn and collect
- Upgrades apply correctly
- Shop works with 3-card selection
- World map functional

**Checkpoint 4**: Complete game (Week 3)
- Full game loop works
- Mobile performance good
- No major bugs

---

## Starting the Process

### Option 1: Start with Team Alpha (Recommended)

All three can work simultaneously:

```
Dispatch these agents in parallel:
1. Agent A1 - Stone Physics
2. Agent A2 - Input Handler
3. Agent A3 - Camera System
```

Each will:
- Read the reference document
- Create their component
- Self-test
- Report back for your review

### Option 2: Sequential (More Control)

```
Start with Agent A2 (Input) first
Then Agent A1 (Stone) 
Then Agent A3 (Camera)
```

This gives you more hands-on review but takes longer.

---

## Communication with Agents

### When Dispatching an Agent:

**Provide:**
1. Which agent (A1, A2, A3, etc.)
2. Reference document sections to read
3. Specific files to look at in current game
4. Output location in new repo

**Example:**
```
Dispatch Agent A1 (Stone Physics)
- Read: GODOT_CURLING_REFERENCE.md sections 2-3
- Check current game: scripts/physics.js
- Create: /home/ivo/projects/spela-curling-3d/scenes/gameplay/stone.tscn
- Create: /home/ivo/projects/spela-curling-3d/scripts/stone/stone_controller.gd
```

### When Reviewing:

**Check:**
- [ ] Code compiles
- [ ] Matches reference document
- [ ] Has comments
- [ ] Self-tested by agent

**Then:**
- ✅ Approve: "Approved, proceed to next task"
- 🔄 Request changes: "Please fix X before continuing"

---

## New Repo Location

**Suggested path**: `/home/ivo/projects/spela-curling-3d/`

**Structure that will be created**:
```
spela-curling-3d/
├── project.godot              # Godot 4.6.1 project file
├── README.md                  # Project readme
├── .git/                      # Git repository
├── scenes/
│   ├── gameplay/
│   │   ├── stone.tscn
│   │   ├── camera_rig.tscn
│   │   └── pickup_base.tscn
│   ├── levels/
│   │   ├── level_test.tscn
│   │   └── level_01.tscn
│   ├── ui/
│   │   ├── hud.tscn
│   │   ├── shop.tscn
│   │   └── main_menu.tscn
│   └── map/
│       └── world_map.tscn
├── scripts/
│   ├── stone/
│   │   └── stone_controller.gd
│   ├── input/
│   │   └── touch_input.gd
│   ├── camera/
│   │   └── camera_controller.gd
│   ├── track/
│   │   └── track_manager.gd
│   ├── game/
│   │   ├── game_controller.gd
│   │   ├── pickup_manager.gd
│   │   └── upgrade_data.gd
│   ├── ui/
│   │   ├── hud.gd
│   │   └── shop.gd
│   └── map/
│       ├── world_map.gd
│       └── map_node.gd
├── assets/
│   ├── 3d/                    # 3D models
│   ├── 2d/                    # Sprites, UI
│   ├── audio/                 # Music, SFX
│   └── shaders/               # Custom shaders
└── tests/                     # Test scenes
```

---

## Tips for Success

### 1. Be Clear About Deviations
If you want something different from the reference doc, say so explicitly:
> "Reference says X, but I want Y instead because..."

### 2. Test Early and Often
Don't wait for full game - test each component as it's done.

### 3. Use Parallel Agents When Possible
Team Alpha (3 agents) can work simultaneously to save time.

### 4. Keep Reference Doc Updated
If mechanics change during development, update the reference doc so all agents stay synced.

### 5. Performance Matters
Ask agents to profile their code - mobile performance is critical.

---

## Questions to Decide Now

Before dispatching first agents, decide:

1. **Sequential or parallel start?**
   - Parallel: All 3 Team Alpha agents at once (faster)
   - Sequential: One at a time (more control)

2. **Strict adherence to reference or flexible?**
   - Strict: Agents must follow reference exactly
   - Flexible: Agents can suggest improvements

3. **Review frequency?**
   - After each agent task
   - Only at checkpoints
   - Real-time collaboration

4. **Mobile testing device?**
   - Which device will you test on?
   - Target specs (3-year-old phone?)

---

## Next Steps

### Immediate:
1. ✅ Review the 3 documents created
2. ✅ Decide parallel vs sequential approach
3. ✅ Choose new repo location

### Then:
4. 🚀 Dispatch Team Alpha agents
5. 📋 Review their work at Checkpoint 1
6. 🔄 Continue with Team Beta, Gamma, Delta

---

## Document Locations

All planning documents are in current repo:
- `/home/ivo/projects/spela-curling/.opencode/plans/GODOT_CURLING_REFERENCE.md`
- `/home/ivo/projects/spela-curling/.opencode/plans/AGENT_WORKFLOW.md`
- `/home/ivo/projects/spela-curling/.opencode/plans/2026-03-30-godot-curling-design.md`

**Current game reference**: `/home/ivo/projects/spela-curling/`

---

## Ready to Start?

When you're ready, say:
> "Start with Team Alpha, parallel approach, repo at /home/ivo/projects/spela-curling-3d/"

I'll dispatch the first agents immediately!
