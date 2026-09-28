// Fails if a built site links to one of its own pages or files that doesn't exist.
// Usage: node tooling/check-links.ts dist/<client>
// Only root-relative links (href="/…", src="/…") are checked: external links are the
// launch checklist's job, and the builder writes every internal link root-relative.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const [root] = process.argv.slice(2);
if (!root) {
  console.error("usage: node tooling/check-links.ts <built site directory>");
  process.exit(2);
}

const target = (link: string) => {
  const path = decodeURIComponent(link.split(/[?#]/)[0]);
  return path.endsWith("/") ? join(root, path, "index.html") : join(root, path);
};

const broken: string[] = [];
for (const file of readdirSync(root, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".html"))) {
  const html = readFileSync(join(root, file), "utf8");
  for (const [, link] of html.matchAll(/\s(?:href|src)="(\/(?!\/)[^"]*)"/g)) {
    if (!existsSync(target(link))) broken.push(`${file} → ${link}`);
  }
}
if (broken.length) {
  console.error(`Broken internal links in ${root}:\n${broken.map((b) => `  ${b}`).join("\n")}`);
  process.exit(1);
}
