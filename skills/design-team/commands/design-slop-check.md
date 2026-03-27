# /design-slop-check -- Detect Generic AI Output

Scan the current design for AI slop patterns.

## Process

1. Read the relevant design files (components, pages, specs)
2. Check against every pattern in `.claude/rules/ai-slop-detection.md`
3. Flag every violation with severity and specific fix

## Visual Slop Check
- Hero section: is it a generic card grid? Flag it.
- Gradients: purple/violet decorative blobs? Flag it.
- Icons: 3-column grid with circle icons? Flag it.
- Layout: centered-everything with no hierarchy? Flag it.
- Sections: all same height/rhythm? Flag it.
- Backgrounds: abstract geometric patterns? Flag it.

## Copy Slop Check
- Scan all user-facing text for banned phrases
- Check: does every feature have a specific benefit?
- Check: are there real numbers or evidence?
- Check: do bullet points vary in structure?

## Layout Slop Check
- Count CTAs above the fold (should be 1 primary)
- Check section purpose (can you name what each section does?)
- Check navigation item count (7 or fewer)

## Output

```
## Slop Check: [what was checked]

### Visual Slop
- [FOUND/CLEAN] [pattern] -- [evidence] -- **Fix:** [specific fix]

### Copy Slop
- [FOUND/CLEAN] [pattern] -- [evidence] -- **Fix:** [specific fix]

### Layout Slop
- [FOUND/CLEAN] [pattern] -- [evidence] -- **Fix:** [specific fix]

**Slop Score: X/10** (0 = pristine, 10 = pure slop)
```
