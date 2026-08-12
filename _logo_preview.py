"""生成侧边栏 logo 三种方案的对比预览：当前两色 / 纯珊瑚剪影 / 珊瑚徽章。"""
from PIL import Image, ImageDraw, ImageFont

BEIGE = (247, 243, 235)   # paper --bg
PANEL = (255, 253, 247)   # paper --panel
CORAL = (217, 84, 62)     # #d9543e
CREAM = (255, 248, 239)   # #fff8ef

base = Image.open("src-tauri/icons/icon.png").convert("RGBA")
base = base.resize((360, 360), Image.LANCZOS)
px = base.load()
w = h = 360

def toning(img, f_top, f_bot):
    """f_top/f_bot: (coral|cream|original)"""
    pick = {"coral": CORAL, "cream": CREAM}
    px = img.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 40:
                continue
            if b < 128:            # 原 cyan 下部
                col = pick.get(f_bot, (r, g, b))
                px[x, y] = (col[0], col[1], col[2], a)
            else:                  # 原 amber 上部
                col = pick.get(f_top, (r, g, b))
                px[x, y] = (col[0], col[1], col[2], a)
    return img

def make_solid():
    return toning(base.copy(), "coral", "coral")

def make_two_tone():
    return toning(base.copy(), "cream", "coral")

def make_badge():
    """珊瑚圆角方块 + 白色花瓣（上下都白）"""
    img = Image.new("RGBA", (360, 360), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, 359, 359], radius=77, fill=CORAL + (255,))
    mark = toning(base.copy(), "cream", "cream")
    img = Image.alpha_composite(img, mark)
    return img

def compose(cell, bg):
    out = Image.new("RGBA", cell.size, bg + (255,))
    out = Image.alpha_composite(out, cell)
    return out

variants = {
    "当前两色": make_two_tone(),
    "A_纯珊瑚剪影": make_solid(),
    "B_珊瑚徽章": make_badge(),
}

canvas = Image.new("RGBA", (180 * 3 + 40, 180 + 60), BEIGE + (255,))
d = ImageDraw.Draw(canvas)
for i, (name, cell) in enumerate(variants.items()):
    x = 10 + i * 200
    cell_small = cell.resize((160, 160), Image.LANCZOS)
    comp = compose(cell_small, PANEL)
    canvas.alpha_composite(comp, (x + 10, 30))
    d.text((x + 35, 8), name, fill=(43, 38, 32, 255))
canvas.convert("RGB").save("_logo_preview.png")
print("saved _logo_preview.png 尺寸", canvas.size)
