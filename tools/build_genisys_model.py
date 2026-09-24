"""Build the Vectra Genisys glTF from the hand-retopologised, textured Blender model.

The source .blend has a "Model" collection of meshes standing upright with the face
towards -Y (Blender units, modifiers applied, one shared "Vectra" material with a
2K baked colour atlas and a roughness map):

  Body, Face Plate            the housing
  Button, Button.001..009     the side soft keys
  Home / Back / Folder Button the keys under the display (Folder = Clinical Resources Library)
  Stop / Pause / Start Button the therapy keys
  Knob                        the intensity knob

This script scales it to metres, rigs every control for the simulator and adds the
parts the app drives at runtime (LCD quad, power LED).

Scale: the body is 227 mm wide, as on the real unit.

Node contract with src/ui/deviceView3d.ts: every control is an empty named after it
(softkey_0..9, key_home, key_back, key_library, key_stop, key_pause, key_start, knob)
at the control's centre, child of the "face" empty, with Blender +Z out of the face.
The glTF export is Y-up, so in three.js that axis is each node's local +Y: press =
move along local -Y by travel_mm, turn = rotate about local Y.  lcd_screen is a
UV-mapped quad over the LCD glass; in glTF its right is local +X, its top is local -Z
and it faces local +Y.  face.frame_box is the region the fixed camera frames, in
glTF face space (metres).  These are written as node extras.

Writes src/assets/vectra_genisys.glb.

Run from the repository root:
  blender --background --python tools/build_genisys_model.py -- \
      --source model.blend [--blend out.blend] [--renders DIR]
"""

import sys
from math import cos, pi, radians, sin
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[1]
GLB = ROOT / "src" / "assets" / "vectra_genisys.glb"

MM = 0.001
BODY_WIDTH_MM = 227

# Source object -> control node.  Soft keys are named from their position (see rig()).
KEYS = {
    "Home Button": "key_home", "Back Button": "key_back", "Folder Button": "key_library",
    "Stop Button": "key_stop", "Pause Button": "key_pause", "Start Button": "key_start",
    "Knob": "knob",
}

# Per control: sim id, travel (mm).  A soft key's inner tip clears the housing by only ~1.05 mm,
# so its travel stops short of that.
CONTROLS = {f"softkey_{i}": (f"softkey:{i}", 0.8) for i in range(10)}
CONTROLS.update({
    "key_home": ("hw:home", 1.2), "key_back": ("hw:back", 1.2), "key_library": ("hw:library", 1.2),
    "key_stop": ("hw:stop", 2.0), "key_pause": ("hw:pause", 2.0), "key_start": ("hw:start", 2.0),
    "knob": ("knob", 0.0),
})

LED_Z = -0.082           # source units: between Home and Back, above the Library key
LED_SIZE = (3.0, 0.9)    # semi-axes, mm
LCD_DOM_WIDTH_PX = 330   # the DOM LCD's width (.lcd in styles.css); its height follows the glass


# ---------- helpers ----------
def material(name, rgb, rough=0.35, emit=0.0):
    m = bpy.data.materials.new(name)
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*rgb, 1)
    p.inputs["Roughness"].default_value = rough
    if emit:
        p.inputs["Emission Color"].default_value = (*rgb, 1)
        p.inputs["Emission Strength"].default_value = emit
    return m


def attach(obj, parent, world):
    """Parent obj without an inverse matrix, placing it at the given world matrix."""
    obj.parent = parent
    obj.matrix_parent_inverse = Matrix.Identity(4)
    obj.matrix_basis = parent.matrix_world.inverted() @ world


def basis_from_normal(n):
    """Rotation with +Z along n and +X as close to world +X as possible."""
    z = n.normalized()
    x = (Vector((1, 0, 0)) - z * z.x).normalized()
    return Matrix((x, z.cross(x), z)).transposed()


def front_faces(obj):
    """World-space (centroid, normal, area) of the faces pointing out of the face (-Y)."""
    mw = obj.matrix_world
    nm = mw.to_3x3().inverted().transposed()
    out = []
    for p in obj.data.polygons:
        n = (nm @ p.normal).normalized()
        if n.y < -0.5:
            out.append((mw @ p.center, n, p.area))
    return out


def world_verts(obj):
    mw = obj.matrix_world
    return [mw @ v.co for v in obj.data.vertices]


def flat_mesh(name, pts, mat):
    me = bpy.data.meshes.new(name)
    me.from_pydata([(x, y, 0) for x, y in pts], [], [list(range(len(pts)))])
    me.materials.append(mat)
    return bpy.data.objects.new(name, me)


# ---------- build ----------
def build(source):
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene = bpy.context.scene
    model = [o for o in bpy.data.collections["Model"].objects if o.type == "MESH"]
    for obj in [o for o in bpy.data.objects if o not in model]:
        bpy.data.objects.remove(obj)
    root = bpy.data.collections.new("Vectra Genisys")
    scene.collection.children.link(root)
    for obj in model:
        for col in obj.users_collection:
            col.objects.unlink(obj)
        root.objects.link(obj)

    # ----- metres -----
    body = bpy.data.objects["Body"]
    xs = [v.x for v in world_verts(body)]
    k = BODY_WIDTH_MM * MM / (max(xs) - min(xs))
    for obj in model:
        obj.matrix_world = Matrix.Scale(k, 4) @ obj.matrix_world
    bpy.ops.object.select_all(action="DESELECT")
    for obj in model:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.context.view_layer.update()

    # ----- LCD window: the flat glass at the back of the faceplate recess -----
    plate = bpy.data.objects["Face Plate"]
    pv = world_verts(plate)
    flat = [(c, p) for (c, n, _), p in zip(front_faces(plate), [p for p in plate.data.polygons
                                                              if (plate.matrix_world.to_3x3() @ p.normal).y < -0.5])
            if n.y < -0.99]
    glass_y = max(c.y for c, _ in flat)
    gv = [pv[i] for c, p in flat if c.y > glass_y - 0.3 * MM for i in p.vertices]
    x0, x1 = min(v.x for v in gv), max(v.x for v in gv)
    z0, z1 = min(v.z for v in gv), max(v.z for v in gv)

    # Face frame: origin on the LCD glass at its centre.
    face = bpy.data.objects.new("face", None)
    root.objects.link(face)
    face.location = ((x0 + x1) / 2, glass_y, (z0 + z1) / 2)
    face.rotation_euler = (radians(90), 0, 0)
    face["note"] = "Face frame. In glTF: x right, -z up the face, y out of the face (metres)."
    bpy.context.view_layer.update()

    # ----- controls -----
    soft = [o for o in model if o.name.startswith("Button")]
    names = dict(KEYS)
    for side, keys in ((0, [o for o in soft if o.matrix_world.translation.x < 0]),
                       (1, [o for o in soft if o.matrix_world.translation.x > 0])):
        for row, obj in enumerate(sorted(keys, key=lambda o: -o.matrix_world.translation.z)):
            names[obj.name] = f"softkey_{2 * row + side}"
    assert len(names) == 17, sorted(names.values())

    frame = []
    for src, name in names.items():
        cap = bpy.data.objects[src]
        ff = front_faces(cap)
        area = sum(a for _, _, a in ff)
        centre = sum((c * a for c, _, a in ff), Vector()) / area
        normal = sum((n * a for _, n, a in ff), Vector()).normalized()
        if name == "knob":
            # Turn about the cap's own axis, through its origin.
            axis = cap.matrix_world.to_3x3() @ Vector((0, 0, 1))
            normal = axis.normalized() * (1 if axis.y < 0 else -1)
            centre = cap.matrix_world.translation
        world = Matrix.Translation(centre) @ basis_from_normal(normal).to_4x4()

        pivot = bpy.data.objects.new(name, None)
        root.objects.link(pivot)
        pivot.empty_display_type = "ARROWS"
        pivot.empty_display_size = 0.012
        attach(pivot, face, world)
        sim_id, travel = CONTROLS[name]
        pivot["sim_id"] = sim_id
        if name == "knob":
            pivot["action"] = "rotate"
            pivot["axis"] = "Y"
        else:
            pivot["action"] = "press"
            pivot["axis"] = "-Y"
            pivot["travel_mm"] = travel
        bpy.context.view_layer.update()

        cap_world = cap.matrix_world.copy()
        cap.name = f"{name}_cap"
        attach(cap, pivot, cap_world)
        frame += world_verts(cap)
    bpy.context.view_layer.update()

    # ----- power LED, on the faceplate between Home and Back -----
    tree = BVHTree.FromPolygons(world_verts(plate), [p.vertices for p in plate.data.polygons])
    hit, n, *_ = tree.ray_cast(Vector((face.location.x, -1, LED_Z * k)), Vector((0, 1, 0)))
    n = -n if n.y > 0 else n
    led_mat = material("led_power", (0.10, 0.40, 1.0), 0.2, emit=4.0)
    a, b = LED_SIZE
    led = flat_mesh("led_power", [(a * MM * cos(t), b * MM * sin(t)) for t in np.linspace(0, 2 * pi, 24, endpoint=False)],
                    led_mat)
    root.objects.link(led)
    attach(led, face, Matrix.Translation(hit + n * 0.15 * MM) @ basis_from_normal(n).to_4x4())
    led["sim_id"] = "led:power"
    frame += world_verts(led)

    # ----- LCD glass: a black quad over the window, UVs 0..1 with v = 1 at the top.  It sits
    # just forward of the glass and overlaps the window slightly, hiding the recess edge;
    # width_mm/height_mm describe the panel the DOM LCD fills, which is the whole quad (the
    # DOM panel keeps its 330 px width and takes the glass's aspect ratio). -----
    screen_mat = material("lcd_screen", (0.006, 0.008, 0.010), 0.06)
    w, h = (x1 - x0) / 2 + 0.3 * MM, (z1 - z0) / 2 + 0.3 * MM
    sm = bpy.data.meshes.new("lcd_screen")
    sm.from_pydata([(-w, -h, 0), (w, -h, 0), (w, h, 0), (-w, h, 0)], [], [(0, 1, 2, 3)])
    layer = sm.uv_layers.new(name="UVMap")
    for loop, c in zip(layer.data, ((0, 0), (1, 0), (1, 1), (0, 1))):
        loop.uv = c
    sm.materials.append(screen_mat)
    screen = bpy.data.objects.new("lcd_screen", sm)
    root.objects.link(screen)
    screen.parent = face
    screen.location = (0, 0, 1.0 * MM)
    dom_w = LCD_DOM_WIDTH_PX
    screen["width_mm"] = round(2 * w / MM, 2)
    screen["height_mm"] = round(2 * h / MM, 2)
    screen["dom_width_px"] = dom_w
    screen["dom_height_px"] = round(dom_w * h / w)
    screen["right_axis"] = "+X"
    screen["up_axis"] = "-Z"
    screen["normal_axis"] = "+Y"

    # ----- camera framing: the controls and the whole faceplate, in glTF face space -----
    bpy.context.view_layer.update()
    to_face = face.matrix_world.inverted()
    F = np.array([to_face @ p for p in frame + world_verts(plate)])
    lo, hi = F.min(0), F.max(0)
    # Blender face (u, v, h) -> glTF face (x, y, z) = (u, h, -v).
    face["frame_box"] = [float(c) for c in (lo[0], lo[2], -hi[1], hi[0], hi[2], -lo[1])]
    print(f"Scale {k * 1000:.1f} mm/unit, LCD window {(x1 - x0) / MM:.1f} x {(z1 - z0) / MM:.1f} mm")
    return root


# ---------- preview ----------
def preview(root, renders):
    scene = bpy.context.scene
    stage = bpy.data.collections.new("Preview stage")
    scene.collection.children.link(stage)
    world = bpy.data.worlds.new("World")
    scene.world = world
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.75, 0.76, 0.78, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.6

    target = bpy.data.objects["face"].matrix_world.translation
    for loc, energy in (((0.5, -0.9, 0.9), 60), ((-0.8, -0.5, 0.6), 25)):
        light = bpy.data.objects.new("light", bpy.data.lights.new("light", "AREA"))
        stage.objects.link(light)
        light.location = loc
        light.data.energy = energy
        light.data.size = 1.2
        light.rotation_euler = (target - light.location).to_track_quat("-Z", "Y").to_euler()

    scene.render.engine = "BLENDER_EEVEE"
    scene.view_settings.view_transform = "AgX"
    for name, loc, lens, res in (("front", (0, -1.0, target.z), 45, (834, 1080)),
                                 ("three_quarter", (0.55, -0.7, target.z + 0.35), 45, (1200, 1000)),
                                 ("controls", (0, -0.45, target.z - 0.07), 50, (1200, 1000))):
        cam = bpy.data.objects.new(name, bpy.data.cameras.new(name))
        stage.objects.link(cam)
        cam.data.lens = lens
        cam.location = loc
        aim = target.copy()
        if name == "controls":
            aim.z -= 0.07
        cam.rotation_euler = (aim - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.camera = cam
        scene.render.resolution_x, scene.render.resolution_y = res
        scene.render.filepath = str(renders / f"{name}.png")
        bpy.ops.render.render(write_still=True)


def export_glb(root):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in root.all_objects:
        obj.select_set(True)
    GLB.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(GLB), export_format="GLB", use_selection=True, export_apply=True,
        export_extras=True, export_yup=True, export_cameras=False, export_lights=False,
        export_animations=False, export_image_format="WEBP", export_image_quality=88)
    tris = 0
    for obj in root.all_objects:
        if obj.type == "MESH":
            obj.data.calc_loop_triangles()
            tris += len(obj.data.loop_triangles)
    print(f"Exported {GLB} ({GLB.stat().st_size / 1024:.0f} KB, {tris} triangles)")


def main():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    opt = lambda flag: Path(args[args.index(flag) + 1]) if flag in args else None
    source = opt("--source")
    if not source:
        sys.exit("--source model.blend is required")
    root = build(source)
    export_glb(root)
    if renders := opt("--renders"):
        renders.mkdir(parents=True, exist_ok=True)
        preview(root, renders)
    if blend := opt("--blend"):
        bpy.ops.wm.save_as_mainfile(filepath=str(blend))


if __name__ == "__main__":
    main()
