"""HTML→PDF/PNG rendering with WeasyPrint (production-safe; no headless browser).

Replaces Playwright/Chromium for PDF generation so exports work in the
production deployment (which does not ship the Chromium browser binary).
"""
import io

_FULL_BLEED_CSS = "@page { size: A4; margin: 0; }"


def html_to_pdf(html: str, full_bleed: bool = False) -> bytes:
    from weasyprint import HTML, CSS
    stylesheets = [CSS(string=_FULL_BLEED_CSS)] if full_bleed else None
    return HTML(string=html).write_pdf(stylesheets=stylesheets)


def html_to_png(html: str, full_bleed: bool = False, dpi: int = 120) -> bytes:
    """Render HTML to a single tall PNG (all pages stacked) for in-app preview."""
    pdf = html_to_pdf(html, full_bleed=full_bleed)
    from pdf2image import convert_from_bytes
    pages = convert_from_bytes(pdf, dpi=dpi)
    if not pages:
        return pdf
    if len(pages) == 1:
        out = pages[0]
    else:
        from PIL import Image
        w = max(p.width for p in pages)
        h = sum(p.height for p in pages)
        out = Image.new("RGB", (w, h), "white")
        y = 0
        for p in pages:
            out.paste(p, (0, y))
            y += p.height
    buf = io.BytesIO()
    out.save(buf, format="PNG")
    return buf.getvalue()
