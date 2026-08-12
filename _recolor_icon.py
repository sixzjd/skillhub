"""重着色 icon.png：下部青 #24C8DB -> 珊瑚红 #d9543e，上部黄 #FFC131 -> 暖白 #FFF8EF。
设计/透明度/尺寸完全不变，只换色相。输出到临时源文件供 tauri icon 重新生成整套。"""
from PIL import Image

SRC = "src-tauri/icons/icon.png"
OUT = "src-tauri/icons/_new_icon_source.png"

CYAN = (36, 200, 219)
AMBER = (255, 193, 49)
CORAL = (213, 84, 62)   # #d9543e
CREAM = (255, 248, 239) # #fff8ef

def dist(a, b):
    return (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2

img = Image.open(SRC).convert("RGBA")
w, h = img.size
px = img.load()
stats = {"coral": 0, "cream": 0, "trans": 0, "other": 0}
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a < 40:
            stats["trans"] += 1
            continue
        d_cyan = dist((r, g, b), CYAN)
        d_amber = dist((r, g, b), AMBER)
        if d_cyan <= d_amber:
            px[x, y] = (CORAL[0], CORAL[1], CORAL[2], a)
            stats["coral"] += 1
        else:
            px[x, y] = (CREAM[0], CREAM[1], CREAM[2], a)
            stats["cream"] += 1
img.save(OUT)
print("saved", OUT)
print("stats:", stats)
