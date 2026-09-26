import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Drives the real pre-commit hook in a throwaway repo: stage a file, try to commit.
const repoRoot = resolve(import.meta.dirname, "..");

const hex = (n: number) => randomBytes(n).toString("hex").slice(0, n);
const alnum = (n: number) =>
  Array.from(randomBytes(n), (b) => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");

// Built at runtime so no credential-shaped literal ever sits in this file.
const fakeBrevoKey = () => ["xkeysib", hex(64), alnum(16)].join("-");
const fakeGithubToken = () => "ghp" + "_" + alnum(36);

let dir: string;

function git(...args: string[]) {
  return execFileSync("git", args, { cwd: dir, encoding: "utf8" });
}

function commit(file: string, content: string) {
  writeFileSync(join(dir, file), content);
  git("add", file);
  return spawnSync("git", ["commit", "-m", `add ${file}`], { cwd: dir, encoding: "utf8" });
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "secrets-scan-"));
  git("init", "-q");
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "test");
  mkdirSync(join(dir, ".githooks"));
  copyFileSync(join(repoRoot, ".githooks/pre-commit"), join(dir, ".githooks/pre-commit"));
  copyFileSync(join(repoRoot, ".gitleaks.toml"), join(dir, ".gitleaks.toml"));
  git("config", "core.hooksPath", ".githooks");
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("pre-commit secrets scan", () => {
  it("blocks a commit containing a Brevo API key", () => {
    const result = commit("worker.env", `BREVO_API_KEY=${fakeBrevoKey()}\n`);
    expect(result.status).not.toBe(0);
    expect(git("log", "--oneline", "--all")).toBe("");
  });

  it("blocks a commit containing a GitHub token", () => {
    const result = commit("config.ts", `export const token = "${fakeGithubToken()}";\n`);
    expect(result.status).not.toBe(0);
  });

  it("allows Turnstile's published test keys", () => {
    const content = [
      'TURNSTILE_SITE_KEY="1x00000000000000000000AA"',
      'TURNSTILE_SECRET_KEY="1x0000000000000000000000000000000AA"',
      'TURNSTILE_SECRET_KEY_FAIL="2x0000000000000000000000000000000AA"',
      'TURNSTILE_SECRET_KEY_SPENT="3x0000000000000000000000000000000AA"',
      "",
    ].join("\n");
    const result = commit("preview.env", content);
    expect(result.stderr + result.stdout).not.toMatch(/leaks found: [1-9]/);
    expect(result.status).toBe(0);
  });

  it("allows an ordinary commit", () => {
    const result = commit("README.md", "# hello\n");
    expect(result.status).toBe(0);
  });
});
