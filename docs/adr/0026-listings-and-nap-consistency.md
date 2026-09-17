---
status: accepted
---

# Listings are Client-owned; our knowledge base holds the canonical name, address and phone

**Where the details live:**

- The canonical name, address and phone are in `facts/business` and `facts/locations`.
- `listings.yaml` records each platform with its URL, the Client-owned account, our access level, whether the listing is claimed, the details last checked, and any mismatches.

**Which platforms:**

- The platform list comes from region config.
- **Local packs** manage Google Business Profile, Apple Business Connect, Bing Places and the region's main directories.
- **Non-local packs** only record their profiles (LinkedIn, Clutch, G2…) as Facts, which feed the schema.org `sameAs` links.

**Version 1 process:**

- A manual audit at onboarding and every quarter. No listing APIs.
- We never create a listing for a location that doesn't physically exist.
- Service-area businesses hide their address, following Google's rules.
- Ratings shown on listings become Time-sensitive Facts.

## Milestone

M1: profile Facts for `sameAs`. M2: local listings audit. Listing APIs: DESIGNED. See ADR-0039.
