# /ship -- Pre-Ship Design Checklist

Before shipping any design/frontend work, run this checklist.

## Process

1. **Visual hierarchy** -- is there ONE clear primary action per screen?
2. **Responsive** -- does it work at 375px, 768px, 1024px?
3. **Accessibility** -- contrast >= 4.5:1, keyboard navigable, semantic HTML?
4. **Copy** -- scannable? benefit-driven? no slop words?
5. **States** -- loading, empty, error, success all handled?
6. **Performance** -- images optimized? fonts loaded? no layout shift?
7. **Brand** -- colors, typography, voice consistent?

## Output

For each check, output: PASS or FAIL with specific details.

```
## Pre-Ship Checklist: [what's being shipped]

1. Visual hierarchy: PASS/FAIL -- [details]
2. Responsive: PASS/FAIL -- [details]
3. Accessibility: PASS/FAIL -- [details]
4. Copy: PASS/FAIL -- [details]
5. States: PASS/FAIL -- [details]
6. Performance: PASS/FAIL -- [details]
7. Brand: PASS/FAIL -- [details]

**Verdict: SHIP / FIX FIRST**
Fixes needed: [list or "none"]
```

For any FAIL, provide the specific fix. Do not just flag the problem.
