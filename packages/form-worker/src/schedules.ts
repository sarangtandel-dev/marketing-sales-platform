// Cron schedules; must match "triggers.crons" in wrangler.jsonc.
// (Kept out of index.ts: a Worker's main module may only export handlers.)
export const DELIVERY_CRON = "*/5 * * * *"; // Brevo retries that are due
export const DAILY_CRON = "17 3 * * *"; // the 90-day Lead Log purge

// An ISO timestamp m minutes after d (negative m for before); used for leases, retries and grace periods.
export const plusMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60_000).toISOString();
