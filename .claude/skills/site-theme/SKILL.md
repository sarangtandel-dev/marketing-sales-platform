---
name: site-theme
description: Use when turning a Claude Design handoff (design tokens, a style guide, a DESIGN.md or a screenshot spec) into a Client's Theme, or when a Client's colours, fonts or visual style change (ADR-0006, ADR-0019, ticket 30).
argument-hint: "<client-slug> <path to the Claude Design handoff>"
---

# Site Theme from a Claude Design handoff

Writes `clients/<slug>/design/theme.json`. It's the only place a Client's look lives: components are shared and never forked (ADR-0019).

## Theme format (validated by `packages/site-builder/schema/theme.schema.json`)

| Group | Tokens components use | Notes |
|---|---|---|
| `colors` | `primary`, `on-primary`, `surface`, `on-surface`, `muted` (required) | Any CSS colour. The build fails if on-surface, muted or primary on surface, or on-primary on primary, is below 4.5:1 |
| `type` | `body`, `heading` | A CSS font stack. With a web font, this stack becomes its fallback |
| `fonts` | keyed by type token | `{ "family", "provider": "fontsource", "weights": ["400","700"] }` for open fonts; `{ "family", "provider": "local", "files": [{ "src", "weight", "style" }] }` for the Client's own licensed files (paths relative to theme.json) |
| `spacing` | `section` | Vertical rhythm between sections |
| `radius` | `card` | |
| `shadows` | `card` | |

## Steps

1. **Read the handoff:** tokens, guidelines and any screenshots. Map its roles onto our token names; don't invent new token names (components only read the ones above).
2. **Fonts:** a font on Fontsource uses `"fontsource"`. A commercial font needs the Client's licence and `"local"` files; if either is missing, ask before using it. Never link Google Fonts: fonts are self-hosted (ADR-0020).
3. **Write** `theme.json`, then build the Client's preview with it:
   ```bash
   pnpm build:site clients/<slug>/site dist/<slug> --preview --form-endpoint https://forms.invalid/lead
   ```
   The build prints any contrast failure with the token and the ratio. Fix it by adjusting the token, and tell the designer which colour changed and why.
4. **Review:** run `impeccable critique` on the built pages (`pnpm dev clients/<slug>`, then open http://localhost:8788) and check the result against the handoff. Record differences you chose to keep.
5. **Commit** the Theme with the handoff's name and date in the message. Ticket 30's contrast item is now automatic.

## Common mistakes

- **Copying hex values that fail contrast** "because the designer chose them." The build blocks it; propose the nearest passing shade.
- **Per-page or per-component colours.** There's no such thing: propose a new token or a component variant for the shared library.
