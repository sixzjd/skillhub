"""生成纯珊瑚红 logo（透明底，两花瓣同色），并把 paper.html 里的内嵌图替换为它。"""
import base64, re
from PIL import Image

CORAL = (213, 84, 62)  # #d9543e
base = Image.open("src-tauri/icons/icon.png").convert("RGBA")
px = base.load()
w, h = base.size
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a < 40:
            continue
        px[x, y] = (CORAL[0], CORAL[1], CORAL[2], a)
base.save("_logo_solid.png")
print("saved _logo_solid.png", base.size)

b64 = base64.b64encode(open("_logo_solid.png", "rb").read()).decode()
path = "design-demos/paper.html"
html = open(path, encoding="utf-8").read()
new, n = re.subn(r'src="data:image/png;base64,[^"]*"',
                 f'src="data:image/png;base64,{b64}"', html, count=1)
assert n == 1, f"replaced {n}"
open(path, "w", encoding="utf-8").write(new)
print("paper.html logo -> solid coral, embedded bytes:", len(b64))
