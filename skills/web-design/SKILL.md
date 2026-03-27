---
name: web-design
description: Design web pages — landing pages, marketing sites, dashboards, ecommerce, portfolios, mobile apps.
---

# Web Design

You design web pages that convert, inform, and delight. Every layout decision serves the user's goal.

## Page Archetypes

**Landing (conversion)**: Every element moves toward one CTA. Hero headline = benefit, not feature. Social proof early. Objection handling before final CTA. Strip navigation to essentials.

**Marketing (storytelling)**: Build a case through scroll. Each section = one argument. Alternate layouts between sections — never two identical layouts adjacent. Build from problem to solution to proof to action.

**Dashboard (data density)**: Sidebar nav (w-60 to w-64) + top bar (h-14 to h-16) + content area. Metric cards: number (text-3xl font-bold) + label (text-xs text-muted-foreground) + trend. Text-sm and text-xs for data density. Green = growth, red = decline, amber = warning, blue = info.

**Ecommerce (browse + buy)**: Product is hero. Trust signals everywhere. Product grid: image + name + price + rating. Detail page: large image + details + prominent "Add to Cart". Cart: line items with clear subtotal. Checkout: minimal distractions, no nav.

**Portfolio (showcase)**: Work is the hero, not chrome. Generous whitespace. Restrained palette — projects provide the color. Navigation minimal: name left, 2-3 links right. Asymmetric grid preferred.

## Hero Patterns

- **Split**: Text left (max-w-xl), image/visual right. Most versatile, works for SaaS, agencies, products.
- **Centered**: Headline + subheadline + CTA centered, background image or gradient. High impact, works for launches.
- **Video**: Looping background video with overlay. Attention-grabbing but heavy.
- **Minimal**: Headline only, massive typography, minimal decoration. Confident, premium feel.

All heroes: py-32 minimum, headline max-w-3xl or max-w-4xl, CTA visible without scrolling.

## Section Anatomy

Every section needs four elements: heading (what this section is about), supporting content (why the reader should care), visual (image, icon, illustration, or data), CTA or transition to next section. Sections without a clear purpose get cut.

## Layout System

Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8. Responsive columns: 1 column on mobile, 2 on tablet (md:), 3-4 on desktop (lg:). Gap scale: gap-4 (tight), gap-6 (default), gap-8 (spacious), gap-12 (section spacing). Vertical rhythm: py-16 (tight sections), py-24 (standard), py-32 (hero/spacious).

## Component Patterns

**Nav**: Logo left, links center (hidden on mobile behind hamburger), CTA right. Sticky on scroll. h-14 to h-16.

**Feature grid**: 3 columns on desktop, 1 on mobile. Each: icon (w-10 h-10) + title (text-lg font-semibold) + description (text-sm text-muted-foreground, 2-3 lines). Gap-8 between cards.

**Pricing table**: 3 tiers, highlight middle tier with ring-2 ring-primary and "Most popular" badge. Each: name + price (text-4xl font-bold) + billing period + feature list with check icons + CTA button. Middle tier CTA = primary, others = outline.

**Testimonials**: Quote (text-lg italic) + avatar (w-12 h-12 rounded-full) + name (font-semibold) + role (text-sm text-muted-foreground). Grid of 3 or single featured.

**FAQ**: Accordion pattern. Question = font-medium, answer = text-muted-foreground. Grouped by topic if more than 8.

**Footer**: 4-column grid (lg:grid-cols-4). Column 1: logo + brief description. Columns 2-4: link groups with headers. Bottom row: copyright + legal links + social icons.

## Conversion Rules

Above-fold hierarchy: headline (what you get) -> subheadline (how it works) -> CTA (what to do) -> social proof (why trust us). ONE primary CTA color used throughout — never compete with multiple colored buttons. Place social proof near every CTA. Reduce friction: "No credit card required", "Free forever", "2-minute setup".

## Responsive

Mobile-first: design for 375px, then expand. Stack all columns on mobile. Bigger touch targets: minimum 44px height for buttons and links. Nav becomes hamburger below 768px. Images scale down, text stays readable. Test: if you can't tap it with your thumb, it's too small.

## Technical

Semantic HTML: header, nav, main, section, article, footer. Tailwind CSS for all styling. Images: WebP format, lazy loading, explicit width/height to prevent layout shift. Use real-sounding content everywhere — "Join 12,000 teams" not "Lorem ipsum dolor."
