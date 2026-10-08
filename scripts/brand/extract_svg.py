"""
Extrai, sem redesenhar, os vetores de uma marca contida em um PDF e gera um SVG.

A geometria é copiada literalmente do PDF. A única transformação aplicada é a
cor de preenchimento: todo preenchimento não branco recebe a cor informada
(ex.: o HEX oficial do manual), já que a marca usada é monocromática.

Requer PyMuPDF (pip install pymupdf). Uso:
  python scripts/brand/extract_svg.py <pdf> <página-base-0> <x0> <y0> <x1> <y1> <saida.svg> <#cor>

Exemplo usado no AQR (marca PREFCG azul, kit SEMADES 2026, página "Para redes sociais"):
  python scripts/brand/extract_svg.py "SEMADES - MARCA e SLOGAN 2026.pdf" 1 495 280 800 360 \
    src/assets/brand/prefcg-azul.svg "#283587"
"""
import sys

import pymupdf


def fmt(value: float) -> str:
    return f"{value:.2f}".rstrip("0").rstrip(".")


def main() -> None:
    src, page_index = sys.argv[1], int(sys.argv[2])
    x0, y0, x1, y1 = map(float, sys.argv[3:7])
    out, color = sys.argv[7], sys.argv[8]

    page = pymupdf.open(src)[page_index]
    box = pymupdf.Rect(x0, y0, x1, y1)
    paths: list[str] = []
    bounds = pymupdf.Rect()
    source_fills: dict[str, int] = {}

    for drawing in page.get_drawings():
        if not box.contains(drawing["rect"]):
            continue
        if drawing.get("fill") is None or drawing["type"] not in ("f", "fs"):
            print("ignorado (não é preenchimento):", drawing["type"], file=sys.stderr)
            continue

        parts: list[str] = []
        current = None
        for item in drawing["items"]:
            op = item[0]
            if op == "l":
                a, b = item[1], item[2]
                if current is None or abs(current.x - a.x) > 1e-3 or abs(current.y - a.y) > 1e-3:
                    parts.append(f"M{fmt(a.x)} {fmt(a.y)}")
                parts.append(f"L{fmt(b.x)} {fmt(b.y)}")
                current = b
            elif op == "c":
                a, c1, c2, b = item[1:5]
                if current is None or abs(current.x - a.x) > 1e-3 or abs(current.y - a.y) > 1e-3:
                    parts.append(f"M{fmt(a.x)} {fmt(a.y)}")
                parts.append(f"C{fmt(c1.x)} {fmt(c1.y)} {fmt(c2.x)} {fmt(c2.y)} {fmt(b.x)} {fmt(b.y)}")
                current = b
            elif op == "re":
                r = item[1]
                parts.append(f"M{fmt(r.x0)} {fmt(r.y0)}H{fmt(r.x1)}V{fmt(r.y1)}H{fmt(r.x0)}Z")
                current = None
            elif op == "qu":
                q = item[1]
                parts.append(
                    f"M{fmt(q.ul.x)} {fmt(q.ul.y)}L{fmt(q.ur.x)} {fmt(q.ur.y)}"
                    f"L{fmt(q.lr.x)} {fmt(q.lr.y)}L{fmt(q.ll.x)} {fmt(q.ll.y)}Z"
                )
                current = None
        if drawing.get("closePath"):
            parts.append("Z")

        fill = drawing["fill"]
        source_hex = "#%02x%02x%02x" % tuple(round(v * 255) for v in fill[:3])
        source_fills[source_hex] = source_fills.get(source_hex, 0) + 1
        mapped = "#ffffff" if min(fill[:3]) > 0.98 else color
        rule = ' fill-rule="evenodd"' if drawing.get("even_odd") else ""
        paths.append(f'<path d="{"".join(parts)}" fill="{mapped}"{rule}/>')
        bounds |= drawing["rect"]

    view_box = f"{fmt(bounds.x0)} {fmt(bounds.y0)} {fmt(bounds.width)} {fmt(bounds.height)}"
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}">' + "".join(paths) + "</svg>"
    with open(out, "w", encoding="utf-8") as handle:
        handle.write(svg)
    print(out, "| caminhos:", len(paths), "| proporção:", round(bounds.width / bounds.height, 4), "| cores na origem:", source_fills)


if __name__ == "__main__":
    main()
