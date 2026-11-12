/**
 * Landing-page playground allowance. Soft, client-side gate (localStorage): it limits casual
 * use and drives signups, but is NOT a security control. Server-enforced limits for anonymous
 * traffic arrive with rate limiting on /api/process in Phase 5.
 */
const KEY = 'sr_trial_runs_v1';
export const TRIAL_LIMIT = 2;

export function getTrialRuns(): number {
  try {
    const n = Number(window.localStorage.getItem(KEY));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function recordTrialRun(): number {
  const next = getTrialRuns() + 1;
  try {
    window.localStorage.setItem(KEY, String(next));
  } catch {
    /* storage unavailable (private mode): allow the run, nothing to persist */
  }
  return next;
}
