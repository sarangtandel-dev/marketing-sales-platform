// Sends one signed test Lead to a form Worker, e.g. the preview before launch (ADR-0037).
// Usage: MONITOR_SECRET=... MONITOR_TEST_EMAIL=... node scripts/send-test-lead.ts <endpoint>
import { signTestBody, TEST_SIGNATURE_HEADER } from "../src/monitor.ts";

const [endpoint] = process.argv.slice(2);
const { MONITOR_SECRET: secret, MONITOR_TEST_EMAIL: email } = process.env;
if (!endpoint || !secret || !email) {
  console.error("usage: MONITOR_SECRET=... MONITOR_TEST_EMAIL=... node scripts/send-test-lead.ts <endpoint>");
  process.exit(2);
}

const body = JSON.stringify({
  form_id: "monitor",
  form_type: "monitoring",
  submission_token: crypto.randomUUID(),
  fields: { email, name: "Manual test Lead" },
  honeypot: "",
  turnstile_token: "",
  page_url: "monitor://manual",
  language: "en",
});
const res = await fetch(endpoint, {
  method: "POST",
  headers: { "content-type": "application/json", [TEST_SIGNATURE_HEADER]: await signTestBody(secret, body, new Date()) },
  body,
});
const result = await res.json();
console.log(res.status, result);
if (res.ok) {
  const id = (result as { lead_id: string }).lead_id;
  console.log(`Check the Lead Log and Brevo, then remove the test Lead:
  pnpm exec wrangler d1 execute LEAD_LOG --remote --command "DELETE FROM leads WHERE id = '${id}' AND is_test = 1"
  and delete ${email} in Brevo.`);
}
process.exit(res.ok ? 0 : 1);
