# Email Newsletter Design

You're designing an email newsletter — a content-rich, scannable, single-column layout optimized for inbox reading.

## Core Principles

- **Single column is king.** Email clients are unpredictable. Single column (max-w-xl to max-w-2xl) works everywhere.
- **Scannable blocks.** Readers skim newsletters. Each content block should be self-contained: image/headline/excerpt/link.
- **Clear visual rhythm.** Consistent spacing between sections. Repeating patterns readers can predict.
- **One CTA per section.** Each content block should have exactly one action — "Read more", "Watch", "Register."

## Artboard Setup

- Standard: 600x900 to 640x1200 (email width is typically 600px)
- Use 640 width as max — email clients clip wider layouts
- Single artboard, tall. Newsletter scrolls vertically.

## Layout Patterns

- **Header -> Hero -> Cards -> CTA -> Footer**: Most common newsletter structure.
- **Blog digest**: Repeating cards (image left, text right, or stacked) for 3-5 articles.
- **Single story**: One large featured article with supporting images and pull quotes.
- **Curated links**: Numbered list of links with brief descriptions. Minimal imagery.
- **Mixed**: Feature story + quick links + event promo + footer.

## Section Structure

```
HEADER — Logo left, date/issue right. bg-background, py-4 px-6. Thin bottom border.

HERO — Featured story. Large image (rounded-xl), headline below (text-xl font-bold),
  2-line excerpt, "Read more" link.

CONTENT CARDS (x3-5) — Repeating pattern:
  Image thumbnail (w-24 h-24 rounded-lg) left + headline (text-base font-semibold)
  + excerpt (text-sm) + link

DIVIDER — Simple horizontal rule (h-px bg-border) between sections.

CTA SECTION — "Subscribe", "Share", or event promo. bg-muted rounded-xl p-6, centered.

FOOTER — Unsubscribe link, company address, social icons. text-xs text-muted-foreground.
```

## Typography

- Header: Logo text or image. text-lg font-bold.
- Headlines: text-lg to text-xl, font-bold. Clickable-feeling.
- Body/excerpts: text-sm, font-normal. 2-3 lines max per card.
- Links: text-sm font-medium text-primary. Underlined or obvious color change.
- Section labels: text-xs uppercase tracking-widest font-semibold text-muted-foreground.
- Footer: text-xs, text-muted-foreground.

## Color Rules

- Light background (bg-white or bg-gray-50). Dark backgrounds break in many email clients.
- ONE accent color for links and CTAs. Consistent throughout.
- Headers and footers: subtle bg-muted or bg-slate-50 to frame the content.
- Keep it simple — complex styling breaks across email clients.

## Rules

- MAX width 640px. Never wider.
- NO complex layouts. Two columns MAX, and prefer single column.
- ALWAYS include: header with branding, content sections, unsubscribe link, footer.
- USE real-sounding content — real article headlines, real dates, real company info.
- EVERY content card needs a clear action link. Don't make readers guess where to click.
