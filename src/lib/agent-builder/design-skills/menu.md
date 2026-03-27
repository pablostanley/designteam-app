# Restaurant / Cafe Menu Design

You're designing a menu — a functional document that must be beautiful, scannable, and make food sound irresistible.

## Core Principles

- **Scannability first.** Customers scan menus in an F-pattern or Z-pattern. Category headers must be instantly visible.
- **Make food the hero.** The item names and descriptions should dominate — not the decoration.
- **Price alignment.** Prices must be easy to find but not dominant. Right-aligned, consistent formatting.
- **Atmosphere through design.** The menu IS the restaurant's brand. Its style should match the dining experience.

## Artboard Setup

- Single page menu: 816x1056 (letter) or 794x1123 (A4)
- Folded menu (each panel): 408x528 or similar half-page
- Compact/table tent: 540x720 or 480x640
- For multi-page: create multiple artboards side-by-side

## Layout Patterns

- **Single column**: Category by category, top to bottom. Clean and easy. Best for short menus (< 20 items).
- **Two column**: Left column + right column. Maximizes items per page. Use for larger menus.
- **Centered elegant**: Everything centered, generous spacing. Perfect for fine dining with fewer items.
- **Grid cards**: Items in card-style blocks with image placeholders. Modern, casual restaurants.
- **Asymmetric**: One wide feature column + one narrow specials/drinks column.

## Section Structure

```
STARTERS          <- Category header: text-lg to text-xl, font-bold, uppercase tracking-widest

Bruschetta ............... $12    <- Item name: text-sm font-semibold, price right-aligned
  Tomato, basil, balsamic         <- Description: text-xs text-muted-foreground

Burrata Salad ............ $16
  Heirloom tomato, arugula, olive oil
```

## Typography

- Restaurant name: text-3xl to text-5xl, distinctive. This sets the tone.
- Category headers: text-lg to text-xl, font-bold, uppercase, tracking-wide. Clear dividers.
- Item names: text-sm to text-base, font-semibold. The star of each line.
- Descriptions: text-xs to text-sm, font-normal, text-muted-foreground. Appetizing but compact.
- Prices: text-sm, font-medium, right-aligned or after dot leaders.

## Style by Restaurant Type

- **Fine dining**: Minimal, serif-feeling (use font-light + tracking-wide). Lots of whitespace. Dark bg or ivory.
- **Casual/bistro**: Warm tones, slightly playful. Rounded corners on sections. bg-amber-50 or bg-stone-50.
- **Modern/trendy**: Clean sans-serif, dark theme (bg-zinc-950), accent color for specials. Minimal ornament.
- **Cafe**: Light, airy. bg-white or bg-stone-50. Small illustrations encouraged (use icon placeholders).
- **Bar/cocktail**: Dark and moody. bg-zinc-950 or bg-slate-900. Gold or amber accents. Atmospheric.

## Rules

- NO prices hidden or hard to find. Price transparency builds trust.
- NO more than 7-9 items per category. Too many choices paralyze diners.
- ALWAYS include: restaurant name, categories, item names, descriptions, prices.
- USE appetizing language: "house-made", "slow-roasted", "seasonal", "fresh" — not "good" or "tasty."
- Dietary markers (V, VG, GF) should be subtle: text-xs, after the item name, muted color.
