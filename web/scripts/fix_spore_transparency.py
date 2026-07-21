"""Aggressively strip baked checkerboard / plate from spore sprites."""
from __future__ import annotations

from collections import Counter, deque
from pathlib import Path

from PIL import Image, ImageFilter

DIR = Path(r"c:\Users\seq\apps\kinsho\web\public\images\spores")


def dist2(a: tuple[int, ...], b: tuple[int, ...]) -> float:
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2


def dist(a: tuple[int, ...], b: tuple[int, ...]) -> float:
    return dist2(a, b) ** 0.5


def sat(rgb: tuple[int, int, int]) -> int:
    return max(rgb) - min(rgb)


def is_neutral(rgb: tuple[int, int, int], lim: int = 16) -> bool:
    return sat(rgb) <= lim


def estimate_cell_and_tones(
    im: Image.Image,
) -> tuple[int, tuple[int, int, int], tuple[int, int, int]]:
    w, h = im.size
    px = im.load()
    edge: list[tuple[int, int, int]] = []
    for x in range(0, w, 1):
        edge.append(px[x, 0][:3])
        edge.append(px[x, h - 1][:3])
    for y in range(0, h, 1):
        edge.append(px[0, y][:3])
        edge.append(px[w - 1, y][:3])

    q = [((r // 3) * 3, (g // 3) * 3, (b // 3) * 3) for r, g, b in edge]
    neutrals = [c for c in q if is_neutral(c, 20) or max(c) < 40]
    if not neutrals:
        neutrals = q
    top = [c for c, n in Counter(neutrals).most_common(12) if n >= 3]
    if len(top) < 2:
        top = list(Counter(neutrals).most_common(2))
        top = [c for c, _ in top]
    # farthest pair
    c0, c1 = top[0], top[min(1, len(top) - 1)]
    best_d = -1.0
    for i, a in enumerate(top):
        for b in top[i + 1 :]:
            d = dist(a, b)
            if d > best_d:
                best_d = d
                c0, c1 = a, b

    # cell size from top-row runs
    row = [px[x, 1][:3] for x in range(w)]
    runs: list[int] = []
    run = 1
    for i in range(1, w):
        if dist(row[i], row[i - 1]) < 20:
            run += 1
        else:
            if 3 <= run <= 48:
                runs.append(run)
            run = 1
    cell = Counter(runs).most_common(1)[0][0] if runs else 8
    cell = min(24, max(4, cell))
    if best_d < 10:
        # flat plate (black / solid gray)
        return max(w, h), c0, c0
    return cell, c0, c1


def nearest_tone(
    rgb: tuple[int, int, int],
    c0: tuple[int, int, int],
    c1: tuple[int, int, int],
) -> tuple[int, int, int]:
    return c0 if dist2(rgb, c0) <= dist2(rgb, c1) else c1


def process(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    cell, c0, c1 = estimate_cell_and_tones(im)

    # Pass 1: matte vs nearest checker / plate tone
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            rgb = (r, g, b)
            # expected phase-based bg + nearest actual tone
            phase = c0 if ((x // cell) + (y // cell)) % 2 == 0 else c1
            bg = nearest_tone(rgb, phase, c1 if phase == c0 else c0)
            # prefer phase if close enough
            if dist(rgb, phase) <= dist(rgb, bg) + 4:
                bg = phase

            d = dist(rgb, bg)
            # hard kill near bg
            if d < 12:
                continue
            # residual gray checker inside soft glow
            if is_neutral(rgb, 14) and d < 48 and max(rgb) < 210:
                continue
            if max(rgb) < 18:
                continue

            # soft alpha from distance + chroma
            chroma = sat(rgb)
            a = (d - 10) / 42.0
            a = max(0.0, min(1.0, a))
            # colorful glow keeps more alpha; gray residue less
            if chroma < 10:
                a *= 0.15
            elif chroma < 22:
                a *= 0.45
            if a < 0.04:
                continue

            src = []
            for i in range(3):
                v = (rgb[i] - bg[i] * (1.0 - a)) / max(a, 1e-3)
                src.append(int(max(0, min(255, round(v)))))
            # second kill if recovered still checker-gray
            if is_neutral((src[0], src[1], src[2]), 12) and max(src) < 190:
                continue
            op[x, y] = (src[0], src[1], src[2], int(round(min(1.0, a) * 255)))

    # Pass 2: flood-fill kill any edge-connected near-transparent gray islands
    # (keeps interior spores)
    visited = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or visited[y][x]:
            continue
        visited[y][x] = True
        r, g, b, a = op[x, y]
        if a == 0:
            q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
            continue
        # low-alpha gray fringe connected to edge → clear
        if a < 90 and is_neutral((r, g, b), 18):
            op[x, y] = (0, 0, 0, 0)
            q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    # Pass 3: erode speckles of leftover checker (tiny neutral blobs)
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            r, g, b, a = op[x, y]
            if a == 0:
                continue
            if is_neutral((r, g, b), 14) and max(r, g, b) < 200 and a < 200:
                # if neighbors mostly empty or also gray, kill
                empty = 0
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        rr, gg, bb, aa = op[x + dx, y + dy]
                        if aa < 20 or (is_neutral((rr, gg, bb), 14) and max(rr, gg, bb) < 200):
                            empty += 1
                if empty >= 6:
                    op[x, y] = (0, 0, 0, 0)

    # mild alpha cleanup
    out = out.filter(ImageFilter.MedianFilter(size=3))

    bbox = out.getbbox()
    if not bbox:
        return out
    l, t, r, b = bbox
    pad = 8
    l, t = max(0, l - pad), max(0, t - pad)
    r, b = min(w, r + pad), min(h, b + pad)
    cropped = out.crop((l, t, r, b))
    side = max(max(cropped.size), 64)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(
        cropped,
        ((side - cropped.size[0]) // 2, (side - cropped.size[1]) // 2),
        cropped,
    )
    if side > 256:
        canvas = canvas.resize((256, 256), Image.Resampling.LANCZOS)
    elif side < 256:
        big = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
        big.paste(canvas, ((256 - side) // 2, (256 - side) // 2), canvas)
        canvas = big
    return canvas


def main() -> None:
    for name in [
        "spore-a.png",
        "spore-b.png",
        "spore-c.png",
        "spore-trail.png",
        "spore-cloud.png",
        "spore-drip.png",
        "spore-spark.png",
    ]:
        path = DIR / name
        if not path.exists():
            continue
        # Re-open current (possibly half-fixed) — still has residue
        cleaned = process(Image.open(path))
        cleaned.save(path, optimize=True)
        px = cleaned.load()
        w, h = cleaned.size
        gray = 0
        op = 0
        for y in range(0, h, 2):
            for x in range(0, w, 2):
                r, g, b, a = px[x, y]
                if a > 20:
                    op += 1
                    if is_neutral((r, g, b), 14) and 50 <= max(r, g, b) <= 200:
                        gray += 1
        print(name, cleaned.size, "opaque~", op, "grayish~", gray)


if __name__ == "__main__":
    main()
