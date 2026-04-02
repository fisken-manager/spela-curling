# Spela Curling 2.5D (Godot) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a mobile-first 2.5D Godot curling game where players flick stones down 3D tracks with curves, following a Slay the Spire-style world map progression.

**Architecture:** Godot 4.3+ with 3D physics for stone movement, Path3D for tracks, SpringArm3D for camera follow, Sprite3D for 2D side elements, and a branching world map scene.

**Tech Stack:** Godot 4.3+, GDScript, 3D physics, mobile touch input, custom shaders for cel-shading

---

## Phase 1: Project Setup & Core Stone Physics

### Task 1: Initialize Godot Project

**Files:**
- Create: `project.godot`
- Create: `README.md`

**Step 1: Create project.godot with basic settings**

```ini
; Engine Configuration File
; Godot version: 4.3

[application]
config/name="Spela Curling 2.5D"
config/features=PackedStringArray("4.3", "Mobile")
config/icon="res://icon.svg"

[display]
window/size/viewport_width=1080
window/size/viewport_height=1920
window/stretch/mode="canvas_items"
window/handheld/orientation=1

[input_devices]
pointing/emulate_touch_from_mouse=true

[layer_names]
3d_physics/layer_1="Stone"
3d_physics/layer_2="Track"
3d_physics/layer_3="Pickups"
3d_physics/layer_4="Walls"

[rendering]
renderer/rendering_method="mobile"
textures/vram_compression/import_etc2_astc=true
```

**Step 2: Create directory structure**

```bash
mkdir -p scenes/{gameplay,levels,ui}
mkdir -p scripts/{stone,track,camera,game,map}
mkdir -p assets/{3d,2d,audio,shaders}
mkdir -p tests
```

**Step 3: Initial README**

```markdown
# Spela Curling 2.5D

Mobile curling game in Godot with 2.5D visuals.

## Development

- Godot 4.3+
- Mobile-first touch controls
- 3D physics with 2D sprite aesthetics
```

**Step 4: Commit**

```bash
git add project.godot README.md
git commit -m "chore: initialize Godot project structure"
```

---

### Task 2: Create Stone Scene with Physics

**Files:**
- Create: `scenes/gameplay/stone.tscn`
- Create: `scripts/stone/stone_controller.gd`

**Step 1: Create stone scene with RigidBody3D**

```gdscript
; scenes/gameplay/stone.tscn
[gd_scene load_steps=3 format=3 uid="uid://stone_scene"]

[ext_resource type="Script" path="res://scripts/stone/stone_controller.gd" id="1_stone"]

[sub_resource type="SphereShape3D" id="SphereShape3D_stone"]
radius = 0.3

[sub_resource type="SphereMesh" id="SphereMesh_stone"]
radius = 0.3
height = 0.6

[node name="Stone" type="RigidBody3D"]
collision_layer = 1
collision_mask = 14
mass = 20.0
script = ExtResource("1_stone")

[node name="CollisionShape3D" type="CollisionShape3D" parent="."]
shape = SubResource("SphereShape3D_stone")

[node name="MeshInstance3D" type="MeshInstance3D" parent="."]
mesh = SubResource("SphereMesh_stone")

[node name="CurlAudio" type="AudioStreamPlayer3D" parent="."]
```

**Step 2: Create stone controller script**

```gdscript
# scripts/stone/stone_controller.gd
class_name StoneController
extends RigidBody3D

const BASE_MAX_VELOCITY: float = 21.0
const BASE_FRICTION: float = 0.01
const BASE_CURL_STRENGTH: float = 0.2
const ANGULAR_DECAY: float = 0.15
const STOP_THRESHOLD: float = 0.1

var angular_velocity_val: float = 0.0
var is_moving: bool = false
var is_held: bool = false
var max_velocity: float = BASE_MAX_VELOCITY
var friction: float = BASE_FRICTION
var curl_strength: float = BASE_CURL_STRENGTH

func _ready():
    freeze = true
    contact_monitor = true
    max_contacts_reported = 4

func launch(velocity_vector: Vector3, spin: float):
    freeze = false
    is_held = false
    is_moving = true
    angular_velocity_val = spin
    linear_velocity = velocity_vector

func apply_sweep(intensity: float):
    var reduction = 0.6 * intensity
    friction = BASE_FRICTION * (1.0 - reduction)

func reset_sweep():
    friction = BASE_FRICTION

func stop():
    linear_velocity = Vector3.ZERO
    angular_velocity = Vector3.ZERO
    angular_velocity_val = 0.0
    is_moving = false
    freeze = true

func _integrate_forces(state: PhysicsDirectBodyState3D):
    if not is_moving:
        return
    
    var dt = state.step
    var velocity = state.linear_velocity
    var speed = velocity.length()
    
    if speed < STOP_THRESHOLD:
        call_deferred("stop")
        return
    
    var decel = velocity.normalized() * friction * 60.0
    state.linear_velocity -= decel * dt
    
    var forward_speed = velocity.z
    var curl_accel = curl_strength * angular_velocity_val * abs(forward_speed) / max(speed, 0.001)
    state.linear_velocity.x += curl_accel * dt
    
    angular_velocity_val -= angular_velocity_val * friction * dt * ANGULAR_DECAY
    if abs(angular_velocity_val) < 0.01:
        angular_velocity_val = 0.0
    
    state.linear_velocity *= 0.9997
    
    var current_speed = state.linear_velocity.length()
    if current_speed > max_velocity:
        state.linear_velocity = state.linear_velocity.normalized() * max_velocity
```

**Step 3: Commit**

```bash
git add scenes/gameplay/stone.tscn scripts/stone/stone_controller.gd
git commit -m "feat: add stone RigidBody3D with physics"
```

---

## Phase 2: Camera System

### Task 3: Create Camera Controller

**Files:**
- Create: `scripts/camera/camera_controller.gd`
- Create: `scenes/gameplay/camera_rig.tscn`

**Step 1: Create camera controller**

```gdscript
# scripts/camera/camera_controller.gd
class_name CameraController
extends Node3D

enum CameraPhase { AIMING, LAUNCHING, FOLLOWING }

@export var stone: Node3D

const AIM_DISTANCE: float = 15.0
const AIM_HEIGHT: float = 12.0
const AIM_ANGLE: float = -60.0
const FOLLOW_DISTANCE: float = 10.0
const FOLLOW_HEIGHT: float = 7.0
const FOLLOW_ANGLE: float = -25.0
const LAUNCH_TRANSITION_DURATION: float = 1.5

var current_phase: CameraPhase = CameraPhase.AIMING
var transition_timer: float = 0.0
var launch_start_transform: Transform3D
var target_transform: Transform3D

@onready var camera: Camera3D = $Camera3D

func _ready():
    _setup_aiming_position()

func _setup_aiming_position():
    if not stone:
        return
    var stone_pos = stone.global_position
    var offset = Vector3(0, AIM_HEIGHT, AIM_DISTANCE)
    global_position = stone_pos + offset
    look_at(stone_pos, Vector3.UP)
    rotate_x(deg_to_rad(AIM_ANGLE))
    current_phase = CameraPhase.AIMING

func start_launch_transition():
    current_phase = CameraPhase.LAUNCHING
    transition_timer = 0.0
    launch_start_transform = global_transform
    target_transform = _calculate_follow_transform()

func _calculate_follow_transform() -> Transform3D:
    if not stone:
        return global_transform
    var stone_pos = stone.global_position
    var target_pos = stone_pos + Vector3(0, FOLLOW_HEIGHT, FOLLOW_DISTANCE)
    var transform = Transform3D()
    transform.origin = target_pos
    transform = transform.looking_at(stone_pos, Vector3.UP)
    transform.basis = transform.basis.rotated(Vector3.RIGHT, deg_to_rad(FOLLOW_ANGLE + 90))
    return transform

func _physics_process(delta):
    if not stone:
        return
    match current_phase:
        CameraPhase.AIMING:
            _update_aiming(delta)
        CameraPhase.LAUNCHING:
            _update_launching(delta)
        CameraPhase.FOLLOWING:
            _update_following(delta)

func _update_aiming(delta: float):
    var stone_pos = stone.global_position
    var target_pos = stone_pos + Vector3(0, AIM_HEIGHT, AIM_DISTANCE)
    global_position = lerp(global_position, target_pos, delta * 5.0)
    look_at(stone_pos, Vector3.UP)
    rotate_x(deg_to_rad(AIM_ANGLE))

func _update_launching(delta: float):
    transition_timer += delta
    var t = transition_timer / LAUNCH_TRANSITION_DURATION
    if t >= 1.0:
        current_phase = CameraPhase.FOLLOWING
        return
    var ease_t = 1.0 - pow(1.0 - t, 3)
    global_transform = launch_start_transform.interpolate_with(target_transform, ease_t)

func _update_following(delta: float):
    var stone_pos = stone.global_position
    var stone_vel = stone.linear_velocity if stone is RigidBody3D else Vector3.ZERO
    var target_pos = stone_pos + Vector3(0, FOLLOW_HEIGHT, FOLLOW_DISTANCE)
    if stone_vel.length() > 0.1:
        var look_ahead = stone_vel.normalized() * 5.0
        target_pos += look_ahead
    global_position = lerp(global_position, target_pos, delta * 3.0)
    var look_target = stone_pos + Vector3.UP * 1.0
    look_at(look_target, Vector3.UP)
    rotate_x(deg_to_rad(FOLLOW_ANGLE))

func reset_to_aiming():
    current_phase = CameraPhase.AIMING
    _setup_aiming_position()
```

**Step 2: Create camera scene**

```gdscript
; scenes/gameplay/camera_rig.tscn
[gd_scene load_steps=2 format=3 uid="uid://camera_rig"]

[ext_resource type="Script" path="res://scripts/camera/camera_controller.gd" id="1_camera"]

[node name="CameraRig" type="Node3D"]
script = ExtResource("1_camera")

[node name="SpringArm3D" type="SpringArm3D" parent="."]
spring_length = 10.0
margin = 0.5

[node name="Camera3D" type="Camera3D" parent="SpringArm3D"]
projection = 1
size = 10.0
near = 0.1
far = 1000.0
```

**Step 3: Commit**

```bash
git add scripts/camera/camera_controller.gd scenes/gameplay/camera_rig.tscn
git commit -m "feat: add camera controller with phase transitions"
```

---

## Phase 3: Track System

### Task 4: Create Track System

**Files:**
- Create: `scripts/track/track_manager.gd`
- Create: `scenes/levels/base_track.tscn`

**Step 1: Create track manager**

```gdscript
# scripts/track/track_manager.gd
class_name TrackManager
extends Node3D

@export var path: Path3D
@export var stone: RigidBody3D

const TRACK_WIDTH: float = 6.0
const WALL_HEIGHT: float = 0.5

var walls: Array[StaticBody3D] = []
var is_initialized: bool = false

func _ready():
    if path and stone:
        _build_track()

func _build_track():
    if not path:
        return
    var curve = path.curve
    if curve.point_count < 2:
        return
    var left_wall = _create_wall(curve, TRACK_WIDTH / 2, "left")
    var right_wall = _create_wall(curve, -TRACK_WIDTH / 2, "right")
    add_child(left_wall)
    add_child(right_wall)
    walls = [left_wall, right_wall]
    is_initialized = true

func _create_wall(curve: Curve3D, offset: float, name: String) -> StaticBody3D:
    var wall = StaticBody3D.new()
    wall.name = name + "_wall"
    wall.collision_layer = 8
    wall.collision_mask = 1
    var collision_shape = CollisionPolygon3D.new()
    var polygon = PackedVector2Array()
    var baked_points = curve.get_baked_points()
    for i in range(baked_points.size()):
        var point = baked_points[i]
        var tangent: Vector3
        if i < baked_points.size() - 1:
            tangent = (baked_points[i + 1] - point).normalized()
        else:
            tangent = (point - baked_points[i - 1]).normalized()
        var perpendicular = Vector3(-tangent.z, 0, tangent.x)
        var wall_pos = point + perpendicular * offset
        polygon.append(Vector2(wall_pos.x, wall_pos.z))
    collision_shape.polygon = polygon
    collision_shape.depth = WALL_HEIGHT
    wall.add_child(collision_shape)
    return wall

func get_start_position() -> Vector3:
    if not path or path.curve.point_count == 0:
        return Vector3.ZERO
    return path.curve.get_point_position(0)

func get_progress_percentage(pos: Vector3) -> float:
    if not path:
        return 0.0
    var current_offset = path.curve.get_closest_offset(pos)
    var total_length = path.curve.get_baked_length()
    if total_length > 0:
        return current_offset / total_length
    return 0.0
```

**Step 2: Commit**

```bash
git add scripts/track/track_manager.gd
git commit -m "feat: add Path3D-based track system"
```

---

## Phase 4: Game Loop

### Task 5: Create Game Controller

**Files:**
- Create: `scripts/game/game_controller.gd`
- Create: `scenes/gameplay/main_game.tscn`

**Step 1: Create game controller**

```gdscript
# scripts/game/game_controller.gd
class_name GameController
extends Node3D

enum GameState { AIMING, MOVING, STOPPED, TRANSITIONING }

@export var stone: StoneController
@export var camera_rig: CameraController
@export var track: TrackManager
@export var input_handler: TouchInputHandler

var current_state: GameState = GameState.AIMING
var score: int = 0
var lives: int = 3

func _ready():
    _initialize_game()

func _initialize_game():
    if not stone or not track:
        push_error("Missing required nodes!")
        return
    var start_pos = track.get_start_position()
    stone.global_position = start_pos
    input_handler.stone_launched.connect(_on_stone_launched)
    input_handler.stone_released.connect(_on_stone_released)
    input_handler.sweep_detected.connect(_on_sweep_detected)
    stone.body_entered.connect(_on_stone_collision)
    current_state = GameState.AIMING
    _reset_stone_for_aiming()

func _physics_process(delta):
    match current_state:
        GameState.MOVING:
            _update_moving(delta)
        GameState.AIMING:
            _update_aiming(delta)

func _update_moving(delta: float):
    var sweep_intensity = input_handler.check_sweep()
    if sweep_intensity > 0:
        stone.apply_sweep(sweep_intensity)
    else:
        stone.reset_sweep()
    if not stone.is_moving:
        _on_stone_stopped()
    if track:
        var progress = track.get_progress_percentage(stone.global_position)
        if progress >= 1.0:
            _on_level_complete()

func _on_stone_launched(velocity: Vector3, spin: float):
    if current_state != GameState.AIMING:
        return
    stone.launch(velocity, spin)
    current_state = GameState.MOVING
    camera_rig.start_launch_transition()

func _on_stone_stopped():
    current_state = GameState.STOPPED
    lives -= 1
    if lives <= 0:
        _game_over()
    else:
        _start_continue_sequence()

func _reset_stone_for_aiming():
    stone.stop()
    stone.freeze = true
    var start_pos = track.get_start_position() if track else Vector3.ZERO
    stone.global_position = start_pos
    camera_rig.reset_to_aiming()
    current_state = GameState.AIMING

func _game_over():
    print("Game Over! Final score: ", score)

func _start_continue_sequence():
    camera_rig.reset_to_aiming()
    await get_tree().create_timer(1.0).timeout
    _reset_stone_for_aiming()

func _on_level_complete():
    current_state = GameState.TRANSITIONING
    get_tree().change_scene_to_file("res://scenes/map/world_map.tscn")
```

**Step 2: Commit**

```bash
git add scripts/game/game_controller.gd
git commit -m "feat: add main game controller"
```

---

## Phase 5: World Map

### Task 6: Create World Map

**Files:**
- Create: `scripts/map/world_map.gd`
- Create: `scenes/map/world_map.tscn`

**Step 1: Create map controller**

```gdscript
# scripts/map/world_map.gd
class_name WorldMap
extends Control

@export var player_progress: Dictionary = {
    "current_act": 1,
    "completed_nodes": [],
    "current_position": "start"
}

var map_nodes: Dictionary = {}

@onready var node_container: Control = $NodeContainer

func _ready():
    _initialize_map()
    _update_accessible_nodes()

func _initialize_map():
    for child in node_container.get_children():
        if child is MapNode:
            map_nodes[child.node_id] = child
            child.node_selected.connect(_on_node_selected)
    _update_player_position()

func _update_accessible_nodes():
    var current_node = map_nodes.get(player_progress.current_position)
    if not current_node:
        return
    current_node.is_completed = true
    current_node.is_accessible = true
    for node in current_node.connected_nodes:
        if node and not node.is_completed:
            node.is_accessible = true
        node._update_visual_state()
    current_node._update_visual_state()

func _on_node_selected(node: MapNode):
    if not node.is_accessible:
        return
    match node.node_type:
        MapNode.NodeType.LEVEL:
            _enter_level(node.node_id)
        MapNode.NodeType.SHOP:
            _enter_shop()

func _enter_level(level_id: String):
    var level_scene_path = "res://scenes/levels/level_%s.tscn" % level_id
    get_tree().change_scene_to_file(level_scene_path)

func _enter_shop():
    get_tree().change_scene_to_file("res://scenes/ui/shop.tscn")
```

**Step 2: Commit**

```bash
git add scripts/map/world_map.gd
git commit -m "feat: add world map system"
```

---

## Phase 6: Shop System

### Task 7: Create Shop System

**Files:**
- Create: `scripts/game/upgrade_data.gd`
- Create: `scripts/ui/shop.gd`

**Step 1: Create upgrade data**

```gdscript
# scripts/game/upgrade_data.gd
extends Node

var upgrades: Dictionary = {
    "speed": {"level": 0, "max_level": 3, "cost": 5, "name": "Hastig Leda"},
    "friction": {"level": 0, "max_level": 3, "cost": 5, "name": "Glatt Misär"},
    "magnetism": {"level": 0, "max_level": 3, "cost": 5, "name": "Magnetism"},
}

var money: int = 0
var reroll_cost: int = 1
var lives: int = 3

func purchase_upgrade(id: String) -> bool:
    var upgrade = upgrades.get(id)
    if not upgrade or upgrade.level >= upgrade.max_level or money < upgrade.cost:
        return false
    money -= upgrade.cost
    upgrade.level += 1
    upgrade.cost = int(upgrade.cost * 1.5)
    return true
```

**Step 2: Create shop UI**

```gdscript
# scripts/ui/shop.gd
class_name Shop
extends Control

const CARDS_TO_SHOW: int = 3
var current_cards: Array[Dictionary] = []

@onready var card_container: HBoxContainer = $CardContainer
@onready var money_label: Label = $MoneyLabel

func _ready():
    _generate_cards()
    _update_ui()

func _generate_cards():
    current_cards.clear()
    var available = []
    for id in UpgradeData.upgrades.keys():
        var upgrade = UpgradeData.upgrades[id]
        if upgrade.level < upgrade.max_level:
            available.append({"id": id, "upgrade": upgrade})
    available.shuffle()
    for i in range(min(CARDS_TO_SHOW, available.size())):
        current_cards.append(available[i])
    _display_cards()

func _display_cards():
    for child in card_container.get_children():
        child.queue_free()
    for card_data in current_cards:
        var card = Button.new()
        card.text = "%s\n$%d" % [card_data.upgrade.name, card_data.upgrade.cost]
        card.pressed.connect(func(): _purchase(card_data))
        card.disabled = UpgradeData.money < card_data.upgrade.cost
        card_container.add_child(card)

func _purchase(card_data: Dictionary):
    if UpgradeData.purchase_upgrade(card_data.id):
        _update_ui()
        _generate_cards()

func _update_ui():
    money_label.text = "$%d" % UpgradeData.money
```

**Step 3: Commit**

```bash
git add scripts/game/upgrade_data.gd scripts/ui/shop.gd
git commit -m "feat: add shop system"
```

---

## Summary

This plan creates a 2.5D Godot curling game with:

1. Exact flick-to-throw mechanics from current game
2. 3D track with Path3D curves and walls
3. Camera that transitions from high angle (aiming) to follow mode
4. World map (Slay the Spire style)
5. Shop with 3-card upgrade selection
6. All core game mechanics preserved

**Next step:** Execute Task 1 to create Godot project.
