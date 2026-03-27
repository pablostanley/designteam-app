# /a11y-check — Accessibility Audit

Check for WCAG 2.1 AA compliance.

## Process
1. Check color contrast ratios (text: 4.5:1 minimum, large text: 3:1 minimum)
2. Check semantic HTML (headings in order, landmarks used, lists for lists)
3. Check images (all have alt text, decorative images have alt="")
4. Check interactive elements (keyboard focusable, visible focus, aria labels)
5. Check forms (labels, error messages, required indicators)
6. Check motion (prefers-reduced-motion respected)

## Output
Pass/fail per check + specific fixes.
