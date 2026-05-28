// Sends a daily engagement summary email for yesterday's PST calendar day.
//
// Designed to run once per day from a scheduled Fly.io machine. Reports:
//   - # of players who completed (or started) yesterday's timed daily
//   - # of players who played yesterday's zen daily
//   - Estimated active time spent on the zen daily (gap-capped, see
//     DailyZenService.ACTIVE_TIME_GAP_CAP_SECONDS)
//   - # of free-play games started
//
// Required env vars:
//   DATABASE_URL                — Supabase Postgres connection string
//   SUPABASE_URL                — Supabase project URL (for display-name lookup)
//   SUPABASE_SECRET_KEY         — Supabase service role key (for display-name lookup)
//   RESEND_API_KEY              — Resend API key
//   DAILY_SUMMARY_FROM_EMAIL    — verified sender address
//   DAILY_SUMMARY_RECIPIENT_EMAIL — where to deliver the summary
//
// Usage:
//   DATABASE_URL=... SUPABASE_URL=... SUPABASE_SECRET_KEY=... RESEND_API_KEY=... \
//     DAILY_SUMMARY_FROM_EMAIL=... DAILY_SUMMARY_RECIPIENT_EMAIL=... \
//     npx tsx scripts/sendDailySummary.ts

import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { Database } from '../server/db/types.js';
import {
  formatActiveDuration,
  getDailySummary,
  getYesterdayPST,
  type DailySummary,
  type FeedbackEntry,
} from '../server/services/DailySummaryService.js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is not set`);
  return value;
}

function formatFeedbackTime(createdAt: Date): string {
  return createdAt.toLocaleTimeString('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function describeAuthor(entry: FeedbackEntry): string {
  if (!entry.userId) return 'anonymous';
  return entry.displayName ?? 'Anonymous';
}

function renderFeedbackText(feedback: FeedbackEntry[]): string {
  if (feedback.length === 0) return 'Feedback: (none)';
  const lines = ['Feedback:'];
  for (const entry of feedback) {
    lines.push(`  [${formatFeedbackTime(entry.createdAt)} PST · ${describeAuthor(entry)}]`);
    for (const line of entry.message.split('\n')) {
      lines.push(`    ${line}`);
    }
  }
  return lines.join('\n');
}

function renderFeedbackHtml(feedback: FeedbackEntry[]): string {
  if (feedback.length === 0) {
    return `<p style="margin:0;color:#555">No feedback submitted yesterday.</p>`;
  }
  const items = feedback
    .map((entry) => {
      const who = escapeHtml(describeAuthor(entry));
      const message = escapeHtml(entry.message).replace(/\n/g, '<br>');
      return `<li style="margin:0 0 12px">
        <div style="font-size:12px;color:#777">${formatFeedbackTime(entry.createdAt)} PST · ${who}</div>
        <div style="white-space:pre-wrap">${message}</div>
      </li>`;
    })
    .join('');
  return `<ul style="margin:0;padding:0;list-style:none">${items}</ul>`;
}

function renderText(summary: DailySummary): string {
  return [
    `Froggle daily summary for ${summary.date}`,
    '',
    `Timed daily players:    ${summary.timedDailyPlayers}`,
    `Zen daily players:      ${summary.zenDailyPlayers}`,
    `Zen daily active time:  ${formatActiveDuration(summary.zenDailyActiveSeconds)}`,
    `Free play games:        ${summary.freePlayGames}`,
    '',
    renderFeedbackText(summary.feedback),
  ].join('\n');
}

function renderHtml(summary: DailySummary): string {
  const row = (label: string, value: string | number) =>
    `<tr><td style="padding:4px 12px 4px 0">${label}</td><td style="padding:4px 0;font-weight:600">${value}</td></tr>`;
  return `<div style="font-family:system-ui,-apple-system,sans-serif">
  <h2 style="margin:0 0 12px">Froggle daily summary</h2>
  <p style="margin:0 0 16px;color:#555">For ${summary.date} (PST)</p>
  <table style="border-collapse:collapse;margin-bottom:24px">
    ${row('Timed daily players', summary.timedDailyPlayers)}
    ${row('Zen daily players', summary.zenDailyPlayers)}
    ${row('Zen daily active time', formatActiveDuration(summary.zenDailyActiveSeconds))}
    ${row('Free play games', summary.freePlayGames)}
  </table>
  <h3 style="margin:0 0 8px">Feedback</h3>
  ${renderFeedbackHtml(summary.feedback)}
</div>`;
}

async function sendEmail(opts: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: opts.from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API error (${response.status}): ${body}`);
  }
}

async function main() {
  const connectionString = requireEnv('DATABASE_URL');
  const apiKey = requireEnv('RESEND_API_KEY');
  const from = requireEnv('DAILY_SUMMARY_FROM_EMAIL');
  const to = requireEnv('DAILY_SUMMARY_RECIPIENT_EMAIL');

  const db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString,
        ssl:
          connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
            ? false
            : { rejectUnauthorized: false },
      }),
    }),
  });

  try {
    const date = getYesterdayPST();
    const summary = await getDailySummary(db, date);

    await sendEmail({
      apiKey,
      from,
      to,
      subject: `Froggle daily summary — ${date}`,
      text: renderText(summary),
      html: renderHtml(summary),
    });

    console.log(`Sent daily summary for ${date} to ${to}.`);
    console.log(renderText(summary));
  } finally {
    await db.destroy();
  }
}

main().catch((err) => {
  console.error('Daily summary failed:', err);
  process.exit(1);
});
