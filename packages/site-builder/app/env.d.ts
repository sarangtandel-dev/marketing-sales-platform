/// <reference types="astro/client" />

declare module "virtual:msp/site" {
  export const site: import("../src/definition.ts").SiteDefinition;
  export const settings: import("../src/build.ts").BuildSettings;
}

declare module "virtual:msp/images" {
  export const images: Record<string, import("astro").ImageMetadata>;
}

declare module "msp:theme.css";
