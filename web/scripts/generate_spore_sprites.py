"""Generate clean transparent spore VFX sprites (no baked checkerboard)."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image

DIR = Path(r"c:\Users\seq\apps\kinsho\web\public\images\spores")
SIZE = 256


def smooth(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def put(px, x: int, y: int, rgb: tuple[float, float, float], a: float) -> None:
    if a <= 0.002:
        return
    a = max(0.0, min(1.0, a))
    r, g, b = [int(max(0, min(255, round(c * 255)))) for c in rgb]
    # additive-friendly: store straight alpha
    ox, oy = px[x, y]
    # over existing
    oa = ox[3] / 255.0 if isinstance(ox, tuple) else 0
    if isinstance(ox, int):
        oa = 0
        or_, og, ob = 0, 0, 0
    else:
        or_, og, ob, oa_i = ox
        oa = oa_i / 255.0
    out_a = a + oa * (1 - a)
    if out_a < 1e-4:
        px[x, y] = (0, 0, 0, 0)
        return
    def mix(c_new, c_old):
        return (c_new * a + (c_old / 255.0) * oa * (1 - a)) / out_a
    px[x, y] = (
        int(mix(rgb[0], or_) * 255),
        int(mix(rgb[1], og) * 255),
        int(mix(rgb[2], ob) * 255),
        int(out_a * 255),
    )


def stamp_glow(
    im: Image.Image,
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    color: tuple[float, float, float],
    core: tuple[float, float, float],
    strength: float = 1.0,
    rot: float = 0.0,
) -> None:
    px = im.load()
    w, h = im.size
    ca, sa = math.cos(rot), math.sin(rot)
    margin = int(max(rx, ry) * 2.2) + 2
    x0, x1 = max(0, int(cx - margin)), min(w, int(cx + margin))
    y0, y1 = max(0, int(cy - margin)), min(h, int(cy + margin))
    for y in range(y0, y1):
        for x in range(x0, x1):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            lx = dx * ca + dy * sa
            ly = -dx * sa + dy * ca
            u = (lx / rx) ** 2 + (ly / ry) ** 2
            if u > 4.5:
                continue
            # soft body
            body = math.exp(-u * 1.15)
            rim = math.exp(-((math.sqrt(u) - 0.75) ** 2) * 8.0) * 0.35
            core_w = math.exp(-u * 4.5)
            a = (body * 0.85 + rim * 0.4) * strength
            a = min(1.0, a)
            t = smooth(core_w)
            rgb = (
                core[0] * t + color[0] * (1 - t),
                core[1] * t + color[1] * (1 - t),
                core[2] * t + color[2] * (1 - t),
            )
            # composite
            or_ = px[x, y]
            oa = or_[3] / 255.0
            na = a + oa * (1 - a)
            if na < 1e-4:
                continue
            def blend(nc, oc):
                return (nc * a + (oc / 255.0) * oa * (1 - a)) / na
            px[x, y] = (
                int(blend(rgb[0], or_[0]) * 255),
                int(blend(rgb[1], or_[1]) * 255),
                int(blend(rgb[2], or_[2]) * 255),
                int(na * 255),
            )


def make_a() -> Image.Image:
    im = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    stamp_glow(
        im, 128, 128, 38, 26,
        color=(1.0, 0.45, 0.12),
        core=(1.0, 0.95, 0.75),
        strength=1.0,
        rot=math.radians(40),
    )
    return im


def make_b() -> Image.Image:
    im = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    stamp_glow(
        im, 128, 132, 34, 40,
        color=(1.0, 0.62, 0.42),
        core=(1.0, 0.92, 0.82),
        strength=0.95,
        rot=math.radians(-8),
    )
    return im


def make_c() -> Image.Image:
    im = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    stamp_glow(
        im, 128, 128, 30, 30,
        color=(0.55, 0.85, 1.0),
        core=(0.92, 0.98, 1.0),
        strength=0.9,
    )
    # faint halo tint
    stamp_glow(
        im, 128, 128, 48, 48,
        color=(0.75, 0.55, 1.0),
        core=(0.85, 0.75, 1.0),
        strength=0.25,
    )
    return im


def make_trail() -> Image.Image:
    im = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    # head on the right
    stamp_glow(
        im, 190, 128, 22, 20,
        color=(1.0, 0.5, 0.15),
        core=(1.0, 0.95, 0.7),
        strength=1.0,
    )
    px = im.load()
    for i in range(90):
        t = i / 90.0
        x = 190 - t * 140
        y = 128 + math.sin(t * 6.0) * 6 * (1 - t)
        rr = 18 * (1 - t * 0.75)
        a = (1 - t) ** 1.4 * 0.55
        stamp_glow(
            im, x, y, rr * 1.6, rr * 0.7,
            color=(1.0, 0.75, 0.45),
            core=(1.0, 0.9, 0.7),
            strength=a,
        )
        # sparkles
        if i % 7 == 0:
            stamp_glow(
                im, x, y + ((i % 3) - 1) * 8, 3.5, 3.5,
                color=(1.0, 0.9, 0.6),
                core=(1.0, 1.0, 0.95),
                strength=0.7 * (1 - t),
            )
    return im


def make_cloud() -> Image.Image:
    im = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    import random
    rng = random.Random(42)
    for _ in range(120):
        ang = rng.random() * math.tau
        rad = (rng.random() ** 0.6) * 78
        x = 128 + math.cos(ang) * rad * 1.35
        y = 128 + math.sin(ang) * rad * 0.75
        warm = rng.random() > 0.45
        if warm:
            col = (1.0, 0.75 + rng.random() * 0.2, 0.35 + rng.random() * 0.2)
        else:
            col = (0.45 + rng.random() * 0.2, 0.95, 0.85 + rng.random() * 0.1)
        s = 2.5 + rng.random() * 5.5
        stamp_glow(
            im, x, y, s, s,
            color=col,
            core=(1.0, 1.0, 0.95),
            strength=0.35 + rng.random() * 0.55,
        )
    return im


def make_drip() -> Image.Image:
    im = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    # hanging droplet (bulb bottom)
    stamp_glow(
        im, 128, 158, 28, 34,
        color=(1.0, 0.55, 0.28),
        core=(1.0, 0.92, 0.75),
        strength=1.0,
    )
    # neck
    stamp_glow(
        im, 128, 110, 8, 28,
        color=(0.95, 0.5, 0.25),
        core=(1.0, 0.85, 0.6),
        strength=0.85,
    )
    # tiny spore motes
    import random
    rng = random.Random(7)
    for _ in range(35):
        x = 128 + (rng.random() - 0.5) * 70
        y = 150 + (rng.random() - 0.5) * 55
        stamp_glow(
            im, x, y, 2.2, 2.2,
            color=(1.0, 0.8, 0.4),
            core=(1.0, 0.95, 0.8),
            strength=0.45 + rng.random() * 0.4,
        )
    return im


def make_spark() -> Image.Image:
    im = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    # vertical fall trail
    for i in range(40):
        t = i / 40.0
        y = 40 + t * 100
        stamp_glow(
            im, 128, y, 2.2 * (1 - t * 0.5), 6,
            color=(1.0, 0.7, 0.35),
            core=(1.0, 0.92, 0.7),
            strength=0.55 * (1 - t * 0.3),
        )
    stamp_glow(
        im, 128, 150, 14, 12,
        color=(1.0, 0.65, 0.25),
        core=(1.0, 0.95, 0.75),
        strength=1.0,
    )
    for dx, dy in ((-10, 12), (12, 16), (4, 22), (-6, 20), (18, 10)):
        stamp_glow(
            im, 128 + dx, 150 + dy, 3.5, 3.5,
            color=(1.0, 0.85, 0.5),
            core=(1.0, 1.0, 0.9),
            strength=0.8,
        )
    return im


def main() -> None:
    DIR.mkdir(parents=True, exist_ok=True)
    makers = {
        "spore-a.png": make_a,
        "spore-b.png": make_b,
        "spore-c.png": make_c,
        "spore-trail.png": make_trail,
        "spore-cloud.png": make_cloud,
        "spore-drip.png": make_drip,
        "spore-spark.png": make_spark,
    }
    for name, fn in makers.items():
        im = fn()
        path = DIR / name
        im.save(path, optimize=True)
        # verify corners transparent + some opaque
        px = im.load()
        corners = [px[0, 0][3], px[255, 0][3], px[0, 255][3], px[255, 255][3]]
        opaque = sum(1 for y in range(0, 256, 4) for x in range(0, 256, 4) if px[x, y][3] > 20)
        print(name, "corner_a", corners, "opaque_samples", opaque)


if __name__ == "__main__":
    main()
