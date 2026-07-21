from PIL import Image, ImageFilter
from collections import deque
from pathlib import Path

src = Path(
    r"C:\Users\seq\.cursor\projects\c-Users-seq-apps-kinsho\assets"
    r"\c__Users_seq_AppData_Roaming_Cursor_User_workspaceStorage_"
    r"c7ce991f48fa44f3eeed1d019dc60204_images_______-ce80cd30-8cf3-4f8d-a009-5480fbcc562c.png"
)
out_dir = Path(r"c:\Users\seq\apps\kinsho\web\public\images")

img = Image.open(src).convert("RGBA")
w, h = img.size
px = img.load()

corners = [px[2, 2], px[w - 3, 2], px[2, h - 3], px[w - 3, h - 3]]
br = sum(c[0] for c in corners) / 4
bg = sum(c[1] for c in corners) / 4
bb = sum(c[2] for c in corners) / 4
print("bg", br, bg, bb, "size", w, h)


def dist_bg(r, g, b):
    dr, dg, db = r - br, g - bg, b - bb
    return (dr * dr + dg * dg + db * db) ** 0.5


# Only clear edge-connected background (keeps light highlights on the subject).
is_bg = [[False] * w for _ in range(h)]
q = deque()
for x in range(w):
    q.append((x, 0))
    q.append((x, h - 1))
for y in range(h):
    q.append((0, y))
    q.append((w - 1, y))

while q:
    x, y = q.popleft()
    if x < 0 or y < 0 or x >= w or y >= h or is_bg[y][x]:
        continue
    r, g, b, a = px[x, y]
    if a < 8 or dist_bg(r, g, b) < 48:
        is_bg[y][x] = True
        q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])

alpha = Image.new("L", (w, h), 0)
ap = alpha.load()
for y in range(h):
    for x in range(w):
        ap[x, y] = 0 if is_bg[y][x] else 255

# Close tiny holes / jagged gaps inside the silhouette
alpha = alpha.filter(ImageFilter.MaxFilter(3))
alpha = alpha.filter(ImageFilter.MinFilter(3))
ap = alpha.load()

# Re-clear any edge-connected bg that dilation may have refilled
is_bg2 = [[False] * w for _ in range(h)]
q = deque()
for x in range(w):
    q.append((x, 0))
    q.append((x, h - 1))
for y in range(h):
    q.append((0, y))
    q.append((w - 1, y))
while q:
    x, y = q.popleft()
    if x < 0 or y < 0 or x >= w or y >= h or is_bg2[y][x]:
        continue
    if ap[x, y] == 0 or (dist_bg(*px[x, y][:3]) < 40 and px[x, y][3] > 0):
        # only walk through currently transparent / near-bg
        if ap[x, y] > 0 and dist_bg(*px[x, y][:3]) >= 40:
            continue
        is_bg2[y][x] = True
        ap[x, y] = 0
        q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])

bbox = alpha.getbbox()
print("bbox", bbox)
pad = 6
l, t, r, b = bbox
l, t = max(0, l - pad), max(0, t - pad)
r, b = min(w, r + pad), min(h, b + pad)
alpha = alpha.crop((l, t, r, b))
color = img.crop((l, t, r, b))

cut = color.copy()
cut.putalpha(alpha)

# Solid silhouette for CSS mask (white = visible)
sil = Image.new("RGBA", alpha.size, (0, 0, 0, 0))
sp = sil.load()
ap2 = alpha.load()
cw, ch = alpha.size
for y in range(ch):
    for x in range(cw):
        a = ap2[x, y]
        if a > 0:
            sp[x, y] = (255, 255, 255, 255)

cut_path = out_dir / "shimeji-cutout.png"
sil_path = out_dir / "shimeji-silhouette.png"
cut.save(cut_path, optimize=True)
sil.save(sil_path, optimize=True)
print("wrote", cut_path.name, sil_path.name, "size", sil.size)
