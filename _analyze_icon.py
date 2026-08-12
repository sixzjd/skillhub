"""分析 icon.png：找出非透明像素包围盒、主色聚类与空间排布。"""
from PIL import Image
from collections import defaultdict

img = Image.open("src-tauri/icons/icon.png")
img = img.convert("RGBA")
w, h = img.size
px = img.load()
print(f"size={w}x{h}")

total = w * h
n_opaque = 0
min_x, min_y, max_x, max_y = w, h, -1, -1
buckets = defaultdict(int)  # quantized color -> count

for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a < 40:  # treat near-transparent as background
            continue
        n_opaque += 1
        min_x, min_y = min(min_x, x), min(min_y, y)
        max_x, max_y = max(max_x, x), max(max_y, y)
        # quantize to 8-step per channel
        buckets[(r // 24 * 24, g // 24 * 24, b // 24 * 24, a // 51 * 51)] += 1

print(f"opaque pixels={n_opaque} ({n_opaque/total*100:.1f}% of canvas)")
print(f"content bbox (left,top,right,bottom)=({min_x},{min_y},{max_x},{max_y})")
print(f"bbox size={max_x-min_x+1}x{max_y-min_y+1}")
print(f"left pad={min_x}, top pad={min_y}, right pad={w-1-max_x}, bottom pad={h-1-max_y}")

print("\ntop color buckets (rgb heaps stepped / alpha stepped):")
for (r, g, b, a), c in sorted(buckets.items(), key=lambda kv: -kv[1])[:8]:
    print(f"  #{r//24:02x}{g//24:02x}{b//24:02x} (a={a//51}) pixels={c} ({c/n_opaque*100:.1f}%)")

# spatial layout of the two dominant hues: where does each cluster live?
# classify pixels into 'cyan-ish' vs 'amber-ish' vs 'other'
def classify(r, g, b):
    if b > r and b > g:          # blue dominant
        return "cyan"
    if r > b and g > (b * 2) // 3:  # red+g, low blue -> amber/yellow
        return "amber"
    return "other"

regions = {"cyan": {"n": 0, "min_x": w, "min_y": h, "max_x": -1, "max_y": -1,
                    "rows": set()},
           "amber": {"n": 0, "min_x": w, "min_y": h, "max_x": -1, "max_y": -1,
                     "rows": set()},
           "other": {"n": 0, "min_x": w, "min_y": h, "max_x": -1, "max_y": -1,
                     "rows": set()}}
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a < 40:
            continue
        k = classify(r, g, b)
        R = regions[k]
        R["n"] += 1
        R["min_x"], R["min_y"] = min(R["min_x"], x), min(R["min_y"], y)
        R["max_x"], R["max_y"] = max(R["max_x"], x), max(R["max_y"], y)
        R["rows"].add(y)

for k, R in regions.items():
    rows = R["rows"]
    row_ranges = 0
    prev = None
    for rr in sorted(rows):
        if prev is None or rr > prev + 1:
            row_ranges += 1
        prev = rr
    print(f"\n{k}: pixels={R['n']} ({R['n']/max(n_opaque,1)*100:.1f}% of content), "
          f"bbox=({R['min_x']},{R['min_y']})-({R['max_x']},{R['max_y']}), "
          f"row_spans={row_ranges}, rows_from={min(rows) if rows else '-'} to={max(rows) if rows else '-'}")