---
status: accepted
---

# Industry advertising rules live in per-Region pack overlays; regulated packs can't launch without a reviewed overlay

**What an overlay is:**

- Rules that differ by Region for one industry live in `packs/<pack>/regions/<code>`.
- An overlay can add prohibited claims, turn off trust signals (e.g. AHPRA's ban on clinical testimonials in Australia) or require disclaimers.
- Like a Privacy Law Profile, each overlay records who reviewed it and when.

**Regulated packs:**

- A pack or schema.org subtype can be marked **regulated**: dental, and legal or financial professional services.
- A regulated Client can't launch in a Served Region that has no reviewed overlay for its pack.

We rejected putting industry rules in region config, because it would mix every industry into one file. We also rejected ignoring them, because the liability falls on the site publisher.

## Milestone

M2 (Client #0 is not regulated). See ADR-0039.
