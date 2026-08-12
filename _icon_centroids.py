"""精确聚类 icon.png 的两主色质心 + 检查阴影/边缘暗像素。"""
from PIL import Image
from collections import defaultdict

img = Image.open("src-tauri/icons/icon.png").convert("RGBA")
w, h = img.size
px = img.load()

amber_c = {"r": [], "g": [], "b": []}
cyan_c = {"r": [], "g": [], "b": []}
dark = {"r": [], "g": [], "b": [], "n": 0, "bbox": [w, h, -1, -1]}
half = 128  # 亮度阈值

def classify(r, g, b):
    return "amber" if b < half else "cyan"

for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a < 40:
            continue
        lum = (r + g + b) / 3
        if lum < 90:
            dark["n"] += 1
            dark["r"].append(r); dark["g"].append(g); dark["b"].append(b)
            dark["bbox"][0] = min(dark["bbox"][0], x)
            dark["bbox"][1] = min(dark["bbox"][1], y)
            dark["bbox"][2] = max(dark["bbox"][2], x)
            dark["bbox"][3] = max(dark["bbox"][3], y)
            continue
        k = classify(r, g, b)
        c = amber_c if k == "amber" else cyan_c
        c["r"].append(r); c["g"].append(g); c["b"].append(b)

def centroid(c):
    import statistics
    n = len(c["r"])
    return (round(statistics.mean(c["r"])), round(statistics.mean(c["g"])),
            round(statistics.mean(c["b"])), n)

print("amber centroid:", centroid(amber_c))
print("cyan centroid:", centroid(cyan_c))
print("dark pixels n =", dark["n"], "bbox =", dark["bbox"])
if dark["n"]:
    import statistics
    print("dark centroid:", (round(statistics.mean(dark["r"])),
                             round(statistics.mean(dark["g"])),
                             round(statistics.mean(dark["b"])), dark["n"]))