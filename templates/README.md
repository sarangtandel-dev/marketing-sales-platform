# Agency template kit

Everything the playbook in [`docs/03-setup-playbook.md`](../docs/03-setup-playbook.md) lists as an
agency prerequisite. Build the vendor-side masters once from these files; per client, copy and
fill the `{{...}}` placeholders.

| Folder | Contents | Used in playbook step |
|---|---|---|
| `webflow/persistence-snippet.js` | Footer script: first/last-touch UTMs, GA client id, hidden-field fill, contact capture, click events. Tested under jsdom (see `docs/appendix-b-tracking-spec.md` section 5). | 2 |
| `webflow/form-hidden-fields.html` | The exact hidden inputs and honeypot for every lead form | 2, 5 |
| `webflow/jsonld/*.html` | Organization, LocalBusiness, Service, FAQ, Article structured data | 3 |
| `gtm/container-spec.md` + `container-export.json` | Master GTM container: variables, triggers, tags, consent settings. Import the JSON, then open and save each tag once so GTM validates it. | 4, 6 |
| `make/router-scenario.md`, `make/stage-sync-scenario.md` | Module-by-module build specs for the two Make scenarios. Export blueprints from Make after building; do not hand-write blueprint JSON. | 6 |
| `brevo/automations.md`, `brevo/emails/*.md`, `brevo/whatsapp-templates.md` | Four automations, eleven email templates, four WhatsApp utility templates | 7 |
| `sheets/*.csv` | Header rows for the leads log, failed tab and UTM builder | 6 |
| `looker/report-spec.md` | The six-page master report and the monthly review agenda | 8 |
| `legal/privacy-policy-template.md` | GDPR + DPDP privacy policy, lawyer review required | 0 |
| `client-intake-form.md` | What to collect from the client before kickoff | 0 |

## Versioning

Each vendor master carries a date version (`v2026-09-17`) in its name. When a template here
changes, bump the version in the vendor master, and record in the agency clients sheet which
version each client runs.
