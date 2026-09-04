#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

PAGES = [
    ("Bippy UI", "Catalog", (0.12, 0.14, 0.18), (1, 1, 1)),
    ("PdfFlipper", "Turn the page", (0.93, 0.90, 0.84), (0.12, 0.12, 0.1)),
    ("Spread", "Left leaf", (0.86, 0.78, 0.64), (0.12, 0.12, 0.1)),
    ("Back cover", "Thanks for reading", (0.12, 0.14, 0.18), (1, 1, 1)),
]


def escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def page_contents(title: str, subtitle: str, rgb: tuple[float, float, float], ink: tuple[float, float, float]) -> bytes:
    r, g, b = rgb
    ir, ig, ib = ink
    stream = (
        f"{r:.3f} {g:.3f} {b:.3f} rg\n"
        "0 0 612 792 re f\n"
        "BT\n"
        "/F1 48 Tf\n"
        f"{ir:.3f} {ig:.3f} {ib:.3f} rg\n"
        "72 640 Td\n"
        f"({escape(title)}) Tj\n"
        "/F1 22 Tf\n"
        "0 -40 Td\n"
        f"({escape(subtitle)}) Tj\n"
        "ET\n"
    )
    return stream.encode("latin-1")


def build_pdf() -> bytes:
    objects: list[bytes] = []

    def add(payload: bytes) -> int:
        objects.append(payload)
        return len(objects)

    font_id = add(
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Name /F1 >>"
    )
    content_ids: list[int] = []
    for title, subtitle, rgb, ink in PAGES:
        data = page_contents(title, subtitle, rgb, ink)
        content_ids.append(
            add(
                f"<< /Length {len(data)} >>\nstream\n".encode("ascii")
                + data
                + b"endstream"
            )
        )

    page_ids: list[int] = []
    pages_id = len(objects) + 1 + len(PAGES) + 1
    # We'll add pages after we know kids; placeholder then rewrite is messy.
    # Add page objects now with a known pages object number.
    # objects currently: font + 4 contents = 5. pages catalog comes after pages.
    # Sequence:
    # 1 font
    # 2-5 contents
    # 6-9 pages
    # 10 pages tree
    # 11 catalog

    pages_tree_id = 10
    for content_id in content_ids:
        page_ids.append(
            add(
                (
                    f"<< /Type /Page /Parent {pages_tree_id} 0 R "
                    f"/MediaBox [0 0 612 792] /Contents {content_id} 0 R "
                    f"/Resources << /Font << /F1 {font_id} 0 R >> >> >>"
                ).encode("ascii")
            )
        )

    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    added_pages = add(
        (
            f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>"
        ).encode("ascii")
    )
    if added_pages != pages_tree_id:
        raise RuntimeError(f"pages tree id {added_pages} != {pages_tree_id}")

    catalog_id = add(f"<< /Type /Catalog /Pages {pages_tree_id} 0 R >>".encode("ascii"))

    header = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    chunks = [header]
    offsets = [0]
    position = len(header)
    for index, payload in enumerate(objects, start=1):
        block = f"{index} 0 obj\n".encode("ascii") + payload + b"\nendobj\n"
        offsets.append(position)
        chunks.append(block)
        position += len(block)

    xref_pos = position
    xref = [f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode("ascii")]
    for offset in offsets[1:]:
        xref.append(f"{offset:010d} 00000 n \n".encode("ascii"))
    trailer = (
        f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\n"
        f"startxref\n{xref_pos}\n%%EOF\n"
    ).encode("ascii")
    return b"".join(chunks) + b"".join(xref) + trailer


def main() -> None:
    out = Path(__file__).resolve().parent.parent / "public" / "catalog.pdf"
    out.write_bytes(build_pdf())
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
