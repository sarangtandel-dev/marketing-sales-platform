/// <reference types="astro/client" />

declare module "virtual:msp/site" {
  export const site: import("../src/definition.ts").SiteDefinition;
  export const settings: import("../src/build.ts").BuildSettings;
}

declare module "msp:theme.css";
