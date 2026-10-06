# MOTIL Agent Instructions

Read DESIGN.md before any UI work.

- Treat `DESIGN.md` as the canonical visual contract for MOTIL.
- Before changing app UI tokens or shared primitives, inspect `app/globals.css` and `app/motil-system.css`; keep code and `DESIGN.md` aligned.
- Keep the public landing visual system scoped to `.motil-landing` / `app/landing.css`. Do not copy landing-only tokens into the operational dashboard unless the design canon is intentionally updated.
- Reuse existing components and semantic tokens before introducing a new color, spacing value, radius, typography rule, card pattern, or navigation pattern.
- Preserve canonical data truth. Never improve a screen by inventing metrics, records, statuses, evidence, or permissions.
- Implement loading, empty, partial-data, permission, recoverable-error, blocking-error, success, focus, responsive, and reduced-motion behavior when relevant.
- If a requested UI conflicts with `DESIGN.md`, adapt the request to the canon or update the canon deliberately in the same change; never bypass it silently.
- Run `pnpm design:lint`, tests, typecheck/lint, build, and visual QA for material UI changes before release.
