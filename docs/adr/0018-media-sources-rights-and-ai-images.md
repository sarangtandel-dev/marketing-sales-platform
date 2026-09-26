---
status: accepted
---

# Every Media Item records its source and rights; AI images are decorative only

**Allowed sources:**

- provided by the Client, who declares ownership or a licence
- commissioned photography
- licensed stock, with the licence recorded
- AI-generated

**Each Media Item records:**

- its source
- rights and licence
- whether identifiable people appear, and a model release if so
- alt text for each language

**Rules:**

- **AI-generated images** are allowed only for decorative or abstract use, and are labelled as AI-generated in the record. They never show anything a Visitor would take as real: staff, premises, completed work or treatment results.
- **Stock photos** are never presented as the Client's own team or premises.
- **Images of patients or treatment results** count as health data. They need explicit written consent, stored in R2 with the Media Item.
- **Storage:** originals live in R2. The build produces optimised versions.
- **Build check:** the build fails if any image lacks alt text or rights information.

## Milestone

M1: the automated alt-text and rights build check. In M0, alt text and rights are checked by hand (issue 19). See ADR-0039.
