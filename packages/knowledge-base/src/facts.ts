import { readFileSync } from "node:fs";
import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";
import { parse } from "yaml";

// Validation for a Client's facts file. In M0 it's checked by JSON Schema only, and a
// person checks the site's claims against it by hand (ADR-0007, ADR-0039).

export type Issue = { path: string; message: string };

const schema = JSON.parse(readFileSync(new URL("../schema/facts.schema.json", import.meta.url), "utf8"));
const check = new Ajv2020({ allErrors: true, allowUnionTypes: true }).compile(schema);

const describe = (e: ErrorObject) =>
  e.keyword === "enum"
    ? `${e.message}: ${(e.params.allowedValues as string[]).join(", ")}`
    : (e.message ?? "is invalid");

export function parseFacts(yaml: string): unknown {
  return parse(yaml);
}

export function validateFacts(data: unknown): Issue[] {
  if (!check(data)) {
    // `if`/`then` failures add a generic "must match then schema" line; the specific one is enough.
    return (check.errors ?? [])
      .filter((e) => e.keyword !== "if")
      .map((e) => ({ path: e.instancePath, message: describe(e) }));
  }
  const ids = (data as { facts: { id: string }[] }).facts.map((f) => f.id);
  return ids.flatMap((id, i) =>
    ids.indexOf(id) === i ? [] : [{ path: `/facts/${i}/id`, message: `duplicate Fact id "${id}"` }],
  );
}
