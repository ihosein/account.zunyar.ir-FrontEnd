#!/usr/bin/env python3
"""Letterbox loader marks into square PNGs without stretching. Preserve colors."""

from __future__ import annotations

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "public" / "images"
SIZE = 512


def best_frame(path: Path) -> Image.Image:
    im = Image.open(path)
    if getattr(im, "n_frames", 1) <= 1:
        return im.convert("RGBA")
    frames: list[Image.Image] = []
    for i in range(im.n_frames):
        im.seek(i)
        frames.append(im.convert("RGBA"))
    # Prefer largest area frame (often highest-res in ICO)
    return max(frames, key=lambda f: f.size[0] * f.size[1])


def trim_transparent_or_near_black(im: Image.Image, bg_threshold: int = 12) -> Image.Image:
    """Crop empty margins. Treat near-black fully opaque pixels as background if most canvas is black."""
    rgba = im.convert("RGBA")
    # First try alpha bbox
    alpha = rgba.split()[-1]
    bbox = alpha.getbbox()
    if bbox:
        cropped = rgba.crop(bbox)
        # If almost no transparency, maybe baked black bg — trim near-black
        if alpha.getextrema()[0] > 250:
            return trim_near_bg(rgba, (0, 0, 0), bg_threshold)
        return cropped
    return trim_near_bg(rgba, (0, 0, 0), bg_threshold)


def trim_near_bg(im: Image.Image, bg: tuple[int, int, int], threshold: int) -> Image.Image:
    px = im.load()
    w, h = im.size
    min_x, min_y, max_x, max_y = w, h, 0, 0
    found = False
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            if abs(r - bg[0]) <= threshold and abs(g - bg[1]) <= threshold and abs(b - bg[2]) <= threshold:
                continue
            found = True
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)
    if not found:
        return im
    return im.crop((min_x, min_y, max_x + 1, max_y + 1))


def letterbox(src: Image.Image, size: int = SIZE, pad_ratio: float = 0.1) -> Image.Image:
    """Fit src into square transparent canvas, centered, no stretch."""
    content = trim_transparent_or_near_black(src)
    cw, ch = content.size
    # Leave modest padding so mark isn't edge-to-edge
    inner = int(size * (1 - 2 * pad_ratio))
    scale = min(inner / cw, inner / ch)
    nw = max(1, int(round(cw * scale)))
    nh = max(1, int(round(ch * scale)))
    resized = content.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ox = (size - nw) // 2
    oy = (size - nh) // 2
    canvas.paste(resized, (ox, oy), resized)
    return canvas


def main() -> None:
    jobs = [
        ("ZunyarLoaderBlack.ico", "ZunyarLoaderBlack.png"),
        ("ZunyarLoaderWhite.ico", "ZunyarLoaderWhite.png"),
    ]
    # Fallback to brand wordmarks if loader ico missing
    fallbacks = {
        "ZunyarLoaderBlack.ico": "ZunyarBlack.png",
        "ZunyarLoaderWhite.ico": "ZunyarWhite.png",
    }

    for src_name, out_name in jobs:
        src_path = ROOT / src_name
        if not src_path.exists():
            fb = fallbacks.get(src_name)
            src_path = ROOT / fb if fb else src_path
        print(f"source {src_path.name}: ", end="")
        src = best_frame(src_path)
        print(f"{src.size[0]}x{src.size[1]}")
        # If source is already square but likely stretched (ratio ~1),
        # and a wide sibling exists, prefer wide sibling for black/white pair.
        if abs(src.size[0] - src.size[1]) < 8:
            # White ICO was stretched; try black ICO proportions by using wide brand PNG
            # only when aspect is square AND name is white loader.
            wide = ROOT / ("ZunyarWhite.png" if "White" in src_name else "ZunyarBlack.png")
            if wide.exists():
                wide_im = best_frame(wide)
                if wide_im.size[0] > wide_im.size[1] * 1.2:
                    print(f"  square source looks stretched; using {wide.name} {wide_im.size}")
                    src = wide_im

        out = letterbox(src)
        out_path = ROOT / out_name
        out.save(out_path, "PNG", optimize=True)
        print(f"wrote {out_name}: {out.size[0]}x{out.size[1]} mode={out.mode}")


if __name__ == "__main__":
    main()
