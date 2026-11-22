import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "file_00000000ec2c720e95998fae1a1060a0.png"
DST = ROOT / "src" / "assets" / "logo.png"
ICON = ROOT / "src-tauri" / "app-icon.png"
MARK = ROOT / "src" / "assets" / "logo-mark.png"

def main() -> int:
    img = Image.open(SRC).convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            m = min(r, g, b)
            if m >= 245:
                px[x, y] = (r, g, b, 0)
            elif m >= 225:

                px[x, y] = (r, g, b, int(a * (245 - m) / 20))
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    DST.parent.mkdir(parents=True, exist_ok=True)
    img.save(DST)
    print(f"ok {DST} {img.size}")

    gear = img.crop((0, 0, img.width, int(img.height * 0.62)))
    gear = gear.crop(gear.getbbox())
    side = int(max(gear.size) * 1.08)
    icon = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    icon.paste(gear, ((side - gear.width) // 2, (side - gear.height) // 2), gear)
    icon.resize((1024, 1024), Image.LANCZOS).save(ICON)
    icon.resize((256, 256), Image.LANCZOS).save(MARK)
    print(f"ok {ICON}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
