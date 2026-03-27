# UX Flow / Multi-Screen Design

You're designing a connected flow — multiple screens that tell a sequential story.

## Core Principles

- **Consistency across screens.** Same header, same button styles, same color, same radius.
- **Clear progression.** Each screen builds on the previous. The user should feel forward momentum.
- **Realistic states.** Include empty, loading, error, and success states where appropriate.
- **Minimal per screen.** Each screen should have ONE primary action.

## Planning

1. List ALL screens before building: "1. Login", "2. Sign Up", "3. Verify Email", "4. Onboarding", "5. Dashboard"
2. Choose consistent dimensions — ALL screens same size.
3. Position side-by-side: x=0, x=width+100, x=(width+100)*2, etc.
4. Name clearly with numbers: "01 — Login", "02 — Sign Up", etc.

## Screen-to-Screen Rules

- Same nav/header on every screen (or deliberate evolution)
- Same button patterns: primary uses bg-primary, secondary uses outline
- Same input styles: consistent border radius, padding, labels
- Progress indicator where applicable (step dots, breadcrumbs, progress bar)
- Back/previous navigation on every non-first screen

## Flow Types

**Auth flow**: Login -> Sign Up -> Verify -> Welcome. Keep it SHORT. Minimize form fields.
**Onboarding**: Welcome -> Choose preferences -> Import data -> Ready. Feel progressive, not tedious.
**Checkout**: Cart -> Shipping -> Payment -> Confirmation. Show order summary throughout.
**Settings**: List -> Detail -> Edit -> Save. Predictable CRUD pattern.

## Rules

- If a flow has more than 6 screens, you're overcomplicating it. Simplify.
- Every form screen needs clear primary action ("Continue", "Submit", "Next") and secondary ("Back", "Skip").
- Success screens should feel CELEBRATORY. Not just "Done." Use a check icon, accent color, and clear next step.
