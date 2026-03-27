# Mobile App Screen Design

You're designing app screens — compact, touch-friendly, native-feeling.

## Core Principles

- **Touch-first.** Minimum 44px tap targets. Buttons: py-3 px-6 minimum.
- **Compact.** Mobile screens are small. Use text-sm and text-base, not text-xl.
- **Bottom-heavy.** Primary actions at the bottom where thumbs can reach.
- **Card-based.** Information in cards, not tables. Scrollable vertical stacks.

## Artboard Setup

- iPhone: 390x844 (iPhone 14/15)
- Android: 360x800 (standard)
- Position side-by-side: x=0, x=490, x=980, etc.
- Name screens: "1. Home", "2. Detail", "3. Profile"

## Structure

- **Status bar area**: Leave top 44px for system UI (just add py-11 to first element).
- **Nav bar** (if present): h-14, bottom position, 4-5 icon tabs.
- **Content area**: Scrollable. Cards, lists, or feeds.
- **Action button**: Fixed bottom or floating. The ONE thing you want users to do.

## Patterns

- **Feed**: Full-width cards, gap-3, each card: bg-card rounded-xl p-4.
- **List**: Rows with left icon/avatar + text + right chevron. py-3 border-b.
- **Detail**: Image top (h-64 or h-80) + content below with rounded-t-3xl overlay.
- **Form**: Labels above inputs. Full-width inputs. Large submit button at bottom.
- **Empty state**: Centered icon + heading + description + action button. Fill the screen.

## Rules

- NO tiny text. text-xs only for timestamps and captions.
- NO wide padding. px-4 max on mobile. px-6 is too much.
- NO hover-dependent patterns. Everything must work with taps.
- USE bottom sheet pattern for secondary actions (bg-card rounded-t-3xl from bottom).
