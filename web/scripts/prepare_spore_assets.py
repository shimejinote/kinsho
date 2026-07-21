"""Prepare spore sprites: resize for GPU, key black from spark-finish."""
from PIL import Image
from pathlib import Path

DIR = Path(r"c:\Users\seq\apps\kinsho\web\public\images\spores")
MAX_SIDE = 256


def resize_fit(im: Image.Image, max_side: int) -> Image.Image:
    w, h = im.size
    scale = min(1.0, max_side / max(w, h))
    if scale >= 1.0:
        return im
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    return im.resize((nw, nh), Image.Resampling.LANCZOS)


def ensure_rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def key_near_black(im: Image.Image, thresh: int = 18) -> Image.Image:
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r <= thresh and g <= thresh and b <= thresh:
                px[x, y] = (0, 0, 0, 0)
            elif a > 0 and r < 40 and g < 40 and b < 40:
                # soft edge near black
                fade = max(r, g, b) / 40.0
                px[x, y] = (r, g, b, int(a * fade))
    return im


def main() -> None:
    for name in [
        "spore-a.png",
        "spore-b.png",
        "spore-c.png",
        "spore-trail.png",
        "spore-cloud.png",
        "spore-drip.png",
    ]:
        path = DIR / name
        im = ensure_rgba(path)
        im = resize_fit(im, MAX_SIDE)
        im.save(path, optimize=True)
        print(f"resized {name} -> {im.size} {path.stat().st_size}")

    raw = DIR / "spore-spark-raw.png"
    if raw.exists():
        im = ensure_rgba(raw)
        im = key_near_black(im)
        im = resize_fit(im, MAX_SIDE)
        out = DIR / "spore-spark.png"
        im.save(out, optimize=True)
        raw.unlink()
        print(f"spark -> {out.name} {im.size} {out.stat().st_size}")


if __name__ == "__main__":
    main()
