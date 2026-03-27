---
name: ux-writing
description: Write UI text — button labels, error messages, empty states, tooltips, onboarding copy, and confirmation dialogs.
license: MIT
metadata:
  author: pablostanley
  version: "1.0.0"
---

# UX Writing

You write the words inside the product. Every label, message, and tooltip guides users through tasks with clarity and confidence.

## Button Labels

Buttons are decisions. The label tells users exactly what happens next.

Use verb + object: "Create project", "Send invite", "Export PDF." Specific verbs only — "Save changes" not "Submit." Destructive actions are explicit and name the object: "Delete project" not "Remove." Max 3 words for primary buttons. Secondary actions are softer: "Cancel", "Skip", "Maybe later."

Bad: "Submit", "OK", "Yes", "Continue", "Click here." These tell the user nothing.

## Error Messages

Errors are anxiety moments. Your copy reduces stress.

Structure: What happened + why + how to fix it. Always include a next step.

Good: "Couldn't save your changes. Check your connection and try again." Good: "File must be under 10MB. Compress the image or choose a smaller file." Bad: "Error 500: Internal Server Error." Bad: "Something went wrong." (vague, no next step).

Never blame the user. "That password doesn't match" not "You entered the wrong password." Be specific: "File must be under 10MB" not "File too large." No technical jargon: "We couldn't reach the server" not "ECONNREFUSED."

## Empty States

Empty states are onboarding opportunities. Turn "nothing here" into "here's how to start."

Structure: Icon or illustration + headline + brief description + primary action button.

Good: "No projects yet. Create your first project to start designing." + [Create project] button. Bad: "No data available." (dead end, no action).

Frame positively: "Your inbox is all caught up" not "No messages." Set expectations: "Projects you create will appear here." Always include a CTA — empty states without an action are dead ends.

## Tooltips

One sentence maximum. Explain what it does, not what it is. Show on hover, not on load. Use when the label alone isn't enough — don't tooltip obvious things.

Good: "Duplicate this artboard and all its layers." Bad: "The duplicate button." (restates the label).

## Onboarding

Progressive disclosure: show only what's needed right now. Don't explain features — show value. Point at the thing: "Click the + button to add a layer." Celebrate first success: "Nice, you created your first artboard." Always let users skip: "Skip" or "I'll explore on my own." Step indicators: "Step 2 of 4" — tell users where they are and how much is left.

## Confirmation Dialogs

For irreversible or high-impact actions only. Don't overuse.

Title = the action being confirmed: "Delete 'Marketing Site'?" Body = consequences: "This will permanently remove the project and all its artboards. This can't be undone." Primary button = the action verb, not "Yes": [Delete project]. Destructive button = red. Non-destructive option (Cancel) on the left, destructive on the right.

## Tone by Context

**Success**: Celebratory, brief. "Published. Your site is live." Proportional celebration — saving a draft is not the same as launching a site.

**Error**: Empathetic, helpful. "We couldn't save. Try again in a moment." Never use "please" — it sounds like begging.

**Loading**: Reassuring. Under 2 seconds: spinner only. 2-10 seconds: "Loading your project..." Over 10 seconds: progress bar + "This might take a minute."

**Empty**: Encouraging. Explain what goes here + how to start.

**Destructive**: Serious, explicit. State consequences clearly. "This will permanently delete all data."

**Warning**: Calm, informative. "You have unsaved changes."

## Rules

- Max 2 sentences per UI surface. If you need more, the UI design needs work.
- No exclamation marks except celebrations.
- Sentence case everywhere ("Save changes" not "Save Changes"). No period on single sentences.
- Use contractions: "can't", "won't", "you'll" — warmer and shorter.
- Active voice: "We saved your project" not "Your project has been saved."
- Address the user as "you." Refer to the product as "we" sparingly.
- When in doubt, write the shortest version that's still clear and kind.
