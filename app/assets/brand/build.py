"""
Macrolens brand mark: a fried egg whose yolk is a lens.
Renders every icon asset as SVG on a 1024 grid; rasterize each at 1024
(e.g. headless Chrome) and copy into app/assets. `python3 build.py`
"""
import json, math

ORANGE = "#FF5C1A"
CENTER = (512, 520)
RADII = [330, 368, 318, 352, 326, 372, 322, 348]  # the egg white's wobble
TURN = -0.3
YOLK = (548, 488, 140)


def p(x, y):
    return f"{x:.1f} {y:.1f}"


def egg_white():
    """Closed Catmull-Rom curve through the radii."""
    n = len(RADII)
    pts = [(CENTER[0] + r * math.cos(2 * math.pi * i / n + TURN),
            CENTER[1] + r * math.sin(2 * math.pi * i / n + TURN)) for i, r in enumerate(RADII)]
    d = f"M {p(*pts[0])} "
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f"C {p(*c1)} {p(*c2)} {p(*p2)} "
    return d + "Z"


def glint():
    cx, cy, _ = YOLK
    r, a, b = 92, math.radians(195), math.radians(250)
    return f"M {p(cx + r * math.cos(a), cy + r * math.sin(a))} A {r} {r} 0 0 1 {p(cx + r * math.cos(b), cy + r * math.sin(b))}"


WHITE, GLINT = egg_white(), glint()


def egg(white="#FFFFFF", yolk=ORANGE, shine="#FFFFFF", scale=1.0):
    x, y, r = YOLK
    body = (f'<path d="{WHITE}" fill="{white}"/><circle cx="{x}" cy="{y}" r="{r}" fill="{yolk}"/>'
            f'<path d="{GLINT}" fill="none" stroke="{shine}" stroke-width="30" stroke-linecap="round"/>')
    return body if scale == 1 else f'<g transform="translate(512 512) scale({scale}) translate(-512 -512)">{body}</g>'


def svg(body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">{body}</svg>'


def monochrome(scale):
    x, y, r = YOLK
    mask = (f'<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">'
            f'<g transform="translate(512 512) scale({scale}) translate(-512 -512)">'
            f'<path d="{WHITE}" fill="white"/><circle cx="{x}" cy="{y}" r="{r + 24}" fill="black"/>'
            f'<circle cx="{x}" cy="{y}" r="{r}" fill="white"/>'
            f'<path d="{GLINT}" fill="none" stroke="black" stroke-width="30" stroke-linecap="round"/></g></mask>')
    return f'<defs>{mask}</defs><rect width="1024" height="1024" fill="#FFFFFF" mask="url(#m)"/>'


ASSETS = {
    "icon": f'<rect width="1024" height="1024" fill="{ORANGE}"/>' + egg(),  # flat fallback (web, Expo Go)
    "splash-icon": egg(scale=1.3),  # expo-splash-screen paints the orange
    "android-icon-foreground": egg(scale=0.8),  # inside the 66% safe circle
    "android-icon-background": f'<rect width="1024" height="1024" fill="{ORANGE}"/>',
    "android-icon-monochrome": monochrome(0.8),
    "favicon": f'<rect width="1024" height="1024" rx="229" fill="{ORANGE}"/>' + egg(scale=1.05),
    "mark": egg(),
}


def write_icon_bundle(path="../AppIcon.icon"):
    """Liquid Glass icon for Icon Composer / Xcode: orange fill, the egg white
    as one glass layer, the yolk and its glint as a group floating in front."""
    import os
    x, y, r = YOLK
    os.makedirs(f"{path}/Assets", exist_ok=True)
    layers = {
        "white.svg": f'<path d="{WHITE}" fill="#FFFFFF"/>',
        "yolk.svg": f'<circle cx="{x}" cy="{y}" r="{r}" fill="{ORANGE}"/>',
        "glint.svg": f'<path d="{GLINT}" fill="none" stroke="#FFFFFF" stroke-width="30" stroke-linecap="round"/>',
    }
    for name, body in layers.items():
        with open(f"{path}/Assets/{name}", "w") as f:
            f.write(svg(body))
    at = {"scale": 1, "translation-in-points": [0, 0]}
    icon = {
        "fill-specializations": [
            {"value": {"solid": "srgb:1.00000,0.36078,0.10196,1.00000"}},
            {"appearance": "dark", "value": "system-dark"},
        ],
        "groups": [
            {
                "name": "Yolk",
                "layers": [
                    {"name": "glint", "image-name": "glint.svg", "glass": False, "position": at},
                    {"name": "yolk", "image-name": "yolk.svg", "glass": True, "position": at},
                ],
                "shadow": {"kind": "layer-color", "opacity": 0.5},
                "specular": True,
                "translucency": {"enabled": False, "value": 0.5},
            },
            {
                "name": "White",
                "layers": [{"name": "white", "image-name": "white.svg", "glass": True, "position": at}],
                "shadow": {"kind": "neutral", "opacity": 0.5},
                "specular": True,
                "translucency": {"enabled": True, "value": 0.2},
            },
        ],
        "supported-platforms": {"squares": ["iOS"]},
    }
    with open(f"{path}/icon.json", "w") as f:
        json.dump(icon, f, indent=2)


if __name__ == "__main__":
    for name, body in ASSETS.items():
        with open(f"{name}.svg", "w") as f:
            f.write(svg(body))
    write_icon_bundle()
    print(json.dumps({"white": WHITE, "glint": GLINT, "yolk": YOLK}))
