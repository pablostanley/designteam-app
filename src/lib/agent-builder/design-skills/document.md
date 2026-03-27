# Business Document / Report Design

You're designing a professional business document — structured, authoritative, and information-rich.

## Core Principles

- **Credibility through structure.** A well-organized document builds trust before the reader processes content.
- **Dense but navigable.** Business documents carry substantial text. The design's job is wayfinding — making readers find what they need fast.
- **Professional restraint.** No flashy design. Clean typography, consistent spacing, subtle accents. The content is the star.
- **Hierarchy is everything.** Title -> Section -> Subsection -> Body -> Caption. Five distinct visual levels.

## Artboard Setup

- US Letter: 816x1056
- A4: 794x1123
- For multi-page documents: multiple artboards, same dimensions, positioned vertically (x=0, y increments)
- Name pages: "01 — Cover", "02 — Executive Summary", "03 — Analysis"

## Document Types & Patterns

**Report / White Paper:**
- Cover page: Title (text-4xl font-bold), subtitle, author, date, company logo
- TOC (optional): Section numbers + titles + page refs
- Sections: Large headers (text-2xl font-bold) + body text (text-sm) + call-out boxes
- Charts/data: Placeholder frames with bg-muted, labeled "Figure 1: Revenue Growth"

**Proposal:**
- Cover: Project name + client name + date. Professional and tailored.
- Problem -> Solution -> Approach -> Timeline -> Pricing -> Terms
- Each section: clear header + concise body + supporting data

**Brochure:**
- Two or three column layout
- Large images with text overlay or adjacent text blocks
- Feature boxes: bg-muted rounded-xl p-6 with icon + heading + description
- Back page: contact info, location, website

**One-pager / Fact Sheet:**
- Everything on ONE page. Maximum information density.
- Header band with title + logo
- 2-3 column body with stat boxes, bullet lists, key points
- Footer with contact details

## Typography

- Document title: text-3xl to text-4xl, font-bold. Cover page hero.
- Section headers: text-xl to text-2xl, font-bold. Clear section breaks.
- Subsection headers: text-base to text-lg, font-semibold.
- Body text: text-sm, font-normal, leading-relaxed. Readable paragraphs.
- Captions: text-xs, text-muted-foreground, italic. Under figures/tables.
- Page numbers: text-xs, text-muted-foreground. Bottom corner.

## Structure Elements

- **Pull quote**: bg-muted p-6 rounded-xl, text-lg font-medium, border-l-4 border-primary
- **Stat box**: bg-primary text-primary-foreground p-4 rounded-xl, large number + label
- **Table**: Full-width, header row bg-muted, alternating row stripes, text-xs to text-sm
- **Bullet list**: text-sm, gap-2 between items, proper bullet markers
- **Dividers**: h-px bg-border between major sections
- **Sidebar callout**: bg-muted p-4 rounded-lg, text-sm. For definitions, notes, tips.

## Color Strategy

- **Conservative**: Slate/gray neutrals + ONE accent (blue-700, emerald-700, indigo-700)
- **Corporate**: Brand primary color for headers and accents, neutral for body
- Cover page can use bolder color (full-width bg-primary band)
- Body pages: mostly white with subtle accents. Don't distract from content.

## Rules

- BODY TEXT must be text-sm with leading-relaxed. Documents with tight leading are exhausting.
- MAX 2 columns for body text. Single column is safest for long-form reading.
- ALWAYS include: title, date, author/company, section headers, page structure.
- USE real-sounding content. "Q4 2025 Revenue Analysis" not "Sample Report Title."
- FIGURES and TABLES get captions: "Figure 1: Monthly active users, Jan-Dec 2025"
- NO decorative elements. Every visual element should convey information or improve navigation.
