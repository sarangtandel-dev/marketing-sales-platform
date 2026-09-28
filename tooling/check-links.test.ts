import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const tmp = mkdtempSync(join(tmpdir(), "check-links-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

function site(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmp, "site-"));
  for (const [file, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    writeFileSync(join(dir, file), body);
  }
  return spawnSync(process.execPath, [join(import.meta.dirname, "check-links.ts"), dir], { encoding: "utf8" });
}

describe("internal link check", () => {
  it("passes when every internal link and asset exists", () => {
    const result = site({
      "index.html": `<a href="/about/">About</a> <a href="/about/#team">Team</a> <a href="https://elsewhere.test/x">x</a>
        <a href="mailto:a@b.test">m</a> <a href="#top">top</a> <img src="/logo.svg" alt=""> <link rel="icon" href="/favicon.svg">`,
      "about/index.html": `<a href="/">Home</a>`,
      "logo.svg": "<svg/>",
      "favicon.svg": "<svg/>",
    });
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  it("fails and names each broken link with its page", () => {
    const result = site({ "index.html": `<a href="/missing/">x</a> <script src="/_astro/gone.js"></script>` });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("index.html → /missing/");
    expect(result.stderr).toContain("index.html → /_astro/gone.js");
  });
});
