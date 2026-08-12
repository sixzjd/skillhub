"""改 design-demos/paper.html：橙色系 -> smail 珊瑚红系；.mark 'S' -> 真实 ico 透明 logo。"""
import base64

path = "design-demos/paper.html"
html = open(path, encoding="utf-8").read()

def rep(old, new, n=1):
    global html
    assert html.count(old) == n, f"expected {n}x '{old}', got {html.count(old)}"
    html = html.replace(old, new)

# 品牌色 -> smail 珊瑚红
rep("--brand:#ea5a0d; --brand-ink:#c2410c; --brand-wash:#fdeee3",
    "--brand:#d9543e; --brand-ink:#c44835; --brand-wash:#f9ded6")
# 状态色 -> smail
rep("--ok:#059669; --warn:#d97706", "--ok:#4a9d6e; --warn:#d4914e")

# .mark：去掉渐变背景/阴影/文字，改为透明容器（真实 ico 图片）
rep(".mark{width:30px; height:30px; border-radius:10px; background:linear-gradient(135deg,#f97316,#ea580c); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:15px; box-shadow:0 4px 12px -4px rgba(234,88,12,.5)}",
    ".mark{width:40px; height:40px; flex-shrink:0; object-fit:contain; background:none; display:block}")

# 真实 ico 透明图（用最终重着色后的 icon.png）
b64 = base64.b64encode(open("src-tauri/icons/icon.png", "rb").read()).decode()
rep('<div class="mark">S</div>',
    f'<img class="mark" src="data:image/png;base64,{b64}" alt="SkillHub" draggable="false">')

open(path, "w", encoding="utf-8").write(html)
print("paper.html updated")
print("img data-uri bytes:", len(b64))
