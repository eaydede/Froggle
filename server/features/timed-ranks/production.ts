/** The production Supabase project from fly.toml. Calibration never falls back to local history. */
export const PRODUCTION_PROJECT_REF = 'uqmxvyfkarvpftksydmy';

export function assertProductionSource(connectionString: string | undefined): string {
  if (!connectionString) throw new Error('Set RANKS_SOURCE_DATABASE_URL to the production database, or provide --history=PATH to a production export. DATABASE_URL is only the publication destination.');
  let url: URL;
  try { url = new URL(connectionString); } catch { throw new Error('RANKS_SOURCE_DATABASE_URL must be a valid PostgreSQL URL'); }
  const direct = url.hostname === `db.${PRODUCTION_PROJECT_REF}.supabase.co`;
  const pooled = url.hostname.endsWith('.pooler.supabase.com') && decodeURIComponent(url.username).endsWith(`.${PRODUCTION_PROJECT_REF}`);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || (!direct && !pooled)) {
    throw new Error('Calibration history must come from froggle-prod; local and staging database sources are rejected.');
  }
  return connectionString;
}
