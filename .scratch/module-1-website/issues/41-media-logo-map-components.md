# Media, logo and map section components

Status: ready-for-agent
Source: audit C20, 2026-09-28

## Problem

The component library is text only. Dental and home-services Clients (ADR-0031, ADR-0032) need images, a logo, and a map to their premises.

## Task

Add catalogued components with Section Variants: an image-with-text section and a gallery (with alt text required and media rights from ADR-0018), a logo in the header, and a map that loads only after consent or as a static image with a link. Use `astro:assets` for image sizes and formats. Covered by the showcase and the axe test.

**M1**, before quoting the first dental or home-services Client.
