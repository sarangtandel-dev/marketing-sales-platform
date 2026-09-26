/// <reference types="astro/client" />

declare module "virtual:msp/site" {
  export const site: import("../src/definition.ts").SiteDefinition;
}

declare module "msp:theme.css";
