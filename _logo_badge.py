"""生成侧边栏徽章 logo：珊瑚圆角方块 + 白色花瓣，红底外必须全透明。"""
import base64, re
from PIL import Image, ImageDraw

S = 512
CORAL = (213, 84, 62)     # #d9543e
CORAL_RGBA = CORAL + (255,)
RECT_RX = 110             # 与 smail-icon.svg rx=110 一致（约 21.5%）
PAD = 0                   # 描边：无

base = Image.open("src-tauri/icons/icon.png").convert("RGBA")

# 白色花瓣版：把两花瓣都染成白/暖白
px = base.load()
CREAM = (255, 251, 244)
for y in range(S):
    for x in range(S):
        r, g, b, a = px[x, y]
        if a < 40:
            continue
        px[x, y] = (CREAM[0], CREAM[1], CREAM[2], a)
WHITE_MARK = base

# 透明画布 + 珊瑚圆角方块 + 白色花瓣
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle([0, 0, S - 1, S - 1], radius=RECT_RX, fill=CORAL_RGBA)
img = Image.alpha_composite(img, WHITE_MARK)
img.save("_logo_badge.png")
print("saved _logo_badge.png", img.size)

# 校验：红底外不得有任何 alpha>0 的像素（尤其是白色）
def inside_rounded(x, y, r=110, L=S):
    edge = 255
    cx = min(max(y, r), L - 1 - r)
    cy = min(max(x, r), L - 1 - r)
    return (x - cy) ** 2 + (y - cx) ** 2 <= r * r

px = img.load()
off = 0
for y in range(S):
    for x in range(S):
        a = px[x, y][3]
        if a > 0 and not inside_rounded(x, y):
            off += 1
print("红底外非透明像素:", off)
from collections import Counter
c = Counter()
for y in range(S):
    for x in range(S):
        r, g, b, a = px[x, y]
        if a > 0:
            c[(r // 8 * 8, g // 8 * 8, b // 8 * 8)] += 1
print("top colors:", [((hex(k[0]), hex(k[1]), hex(k[2])), v) for k, v in c.most_common(4)])

# 嵌入 paper.html
b64 = base64.b64encode(open("_logo_badge.png", "rb").read()).decode()
path = "design-demos/paper.html"
html = open(path, encoding="utf-8").read()
new, n = re.subn(r'src="data:image/png;base64,[^"]*"',
                 f'src="data:image/png;base64,{b64}"', html, count=1)
assert n == 1
open(path, "w", encoding="utf-8").write(new)
print("paper.html logo -> coral badge, embedded bytes:", len(b64))