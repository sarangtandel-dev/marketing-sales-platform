import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseFacts, validateFacts } from "./facts.ts";

const fact = (overrides: Record<string, unknown> = {}) => ({
  id: "business-description",
  kind: "description",
  value: { en: "We build websites for small businesses." },
  source: { type: "person", who: "Founder", date: "2026-09-27" },
  status: "client-stated",
  ...overrides,
});

const file = (...facts: unknown[]) => ({ facts });

describe("validateFacts", () => {
  it("accepts well-formed Facts", () => {
    expect(validateFacts(file(fact()))).toEqual([]);
  });

  it("requires a Source on every Fact", () => {
    const f = fact();
    delete (f as Record<string, unknown>).source;
    expect(validateFacts(file(f))).toContainEqual({
      path: "/facts/0",
      message: expect.stringContaining("source"),
    });
  });

  it("requires a Verification Status from the five in CONTEXT.md", () => {
    expect(validateFacts(file(fact({ status: "approved" })))).toContainEqual({
      path: "/facts/0/status",
      message: expect.stringContaining("publicly-verified"),
    });
  });

  it("requires the URL for a public Source and the reference for a document", () => {
    const issues = validateFacts(
      file(
        fact({ id: "a", source: { type: "url", date: "2026-09-27" } }),
        fact({ id: "b", source: { type: "document", date: "2026-09-27" } }),
      ),
    );
    expect(issues).toContainEqual({ path: "/facts/0/source", message: expect.stringContaining("url") });
    expect(issues).toContainEqual({ path: "/facts/1/source", message: expect.stringContaining("document") });
  });

  it("rejects a Source date that isn't a date", () => {
    expect(validateFacts(file(fact({ source: { type: "person", who: "Founder", date: "last week" } })))).toContainEqual({
      path: "/facts/0/source/date",
      message: expect.any(String),
    });
  });

  it("accepts a Refresh-by Date and rejects a malformed one", () => {
    expect(validateFacts(file(fact({ refresh_by: "2026-12-26" })))).toEqual([]);
    expect(validateFacts(file(fact({ refresh_by: "soon" })))).toContainEqual({
      path: "/facts/0/refresh_by",
      message: expect.any(String),
    });
  });

  it("rejects duplicate Fact IDs", () => {
    expect(validateFacts(file(fact(), fact()))).toContainEqual({
      path: "/facts/1/id",
      message: expect.stringContaining("business-description"),
    });
  });

  it("accepts plain values as well as language-keyed text", () => {
    expect(validateFacts(file(fact({ id: "founded", kind: "founding-year", value: 2019 })))).toEqual([]);
  });
});

describe("parseFacts", () => {
  it("reads YAML", () => {
    expect(parseFacts("facts:\n  - id: a\n")).toEqual({ facts: [{ id: "a" }] });
  });
});

// Every Client's real facts file must stay valid, so CI catches a bad edit.
describe("Client facts files", () => {
  const clientsDir = resolve(import.meta.dirname, "../../../clients");
  const clients = readdirSync(clientsDir).filter((c) => existsSync(join(clientsDir, c, "facts.yaml")));

  it("finds at least one", () => {
    expect(clients.length).toBeGreaterThan(0);
  });

  it.each(clients)("%s/facts.yaml is valid", (client) => {
    const data = parseFacts(readFileSync(join(clientsDir, client, "facts.yaml"), "utf8"));
    expect(validateFacts(data)).toEqual([]);
  });
});
