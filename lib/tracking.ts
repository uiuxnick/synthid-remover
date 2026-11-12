import { getAppConfig } from '@/lib/credits';

/** Strict ID shapes: values are interpolated into vendor snippets, so anything else is rejected. */
export const ID_PATTERNS = {
  ga4MeasurementId: /^G-[A-Z0-9]{4,14}$/,
  gtmContainerId: /^GTM-[A-Z0-9]{4,10}$/,
  metaPixelId: /^\d{5,20}$/,
  clarityId: /^[a-z0-9]{6,14}$/,
  gscVerification: /^[A-Za-z0-9_-]{20,100}$/,
  plausibleDomain: /^(?=.{3,253}$)([a-z0-9-]+\.)+[a-z]{2,}$/i,
} as const;

export interface ParsedScript {
  src?: string;
  inline?: string;
  async?: boolean;
  defer?: boolean;
}

const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
const SAFE_ATTRS = new Set(['src', 'async', 'defer', 'id', 'type']);
export const MAX_SCRIPT_BYTES = 20_000;

function isPublicHttps(raw: string, strict: boolean): boolean {
  try {
    const u = new URL(raw);
    if (u.username || u.password) return false;
    if (!strict) return u.protocol === 'https:' || u.protocol === 'http:';
    if (u.protocol !== 'https:') return false;
    const h = u.hostname;
    return !(h === 'localhost' || /^[\d.]+$/.test(h) || h.includes(':') || !h.includes('.'));
  } catch {
    return false;
  }
}

/**
 * Parses an admin-supplied snippet into script descriptors. Only <script> tags are ever rendered.
 * With strict (sanitizeScripts on) anything else is a validation error rather than silently
 * rewritten: https-only src, no IP/localhost hosts, only src/async/defer/id/type attributes, and
 * no non-script markup (iframes, event-handler attributes, etc).
 * NOTE: inline JavaScript itself cannot be sanitised; only admins you trust should have access.
 */
export function parseScripts(html: string, strict: boolean): { scripts: ParsedScript[]; error?: string } {
  if (Buffer.byteLength(html) > MAX_SCRIPT_BYTES) return { scripts: [], error: 'Snippet is larger than 20 KB' };
  const scripts: ParsedScript[] = [];
  for (const m of Array.from(html.matchAll(SCRIPT_RE))) {
    const out: ParsedScript = {};
    for (const a of Array.from(m[1].matchAll(ATTR_RE))) {
      const name = a[1].toLowerCase();
      const value = a[2] ?? a[3] ?? a[4] ?? '';
      if (strict && !SAFE_ATTRS.has(name)) return { scripts: [], error: `Attribute "${name}" is not allowed` };
      if (name === 'src') {
        if (!isPublicHttps(value, strict)) {
          return { scripts: [], error: strict ? 'Script src must be a public https URL' : 'Invalid script src' };
        }
        out.src = value;
      } else if (name === 'async') out.async = true;
      else if (name === 'defer') out.defer = true;
      else if (name === 'type' && value && !/^(text|application)\/javascript$/i.test(value)) {
        return { scripts: [], error: 'Only JavaScript scripts are supported' };
      }
    }
    const body = m[2].trim();
    if (!out.src && !body) continue;
    if (!out.src) out.inline = body;
    scripts.push(out);
  }
  const leftover = html.replace(SCRIPT_RE, '').replace(/<!--[\s\S]*?-->/g, '').trim();
  if (strict && leftover) return { scripts: [], error: 'Only <script> tags are allowed (found other markup)' };
  return { scripts };
}

export interface PublicTracking {
  gsc?: string;
  ga4?: string;
  gtm?: string;
  pixel?: string;
  clarity?: string;
  plausible?: string;
  head: ParsedScript[];
  body: ParsedScript[];
}

const ok = <K extends keyof typeof ID_PATTERNS>(k: K, v?: string | null) =>
  v && ID_PATTERNS[k].test(v) ? v : undefined;

/** Re-validates on read as defence in depth. Returns null on any failure (e.g. no DB at build time). */
export async function getPublicTracking(): Promise<PublicTracking | null> {
  try {
    const c = await getAppConfig();
    return {
      gsc: ok('gscVerification', c.gscVerification),
      ga4: ok('ga4MeasurementId', c.ga4MeasurementId),
      gtm: ok('gtmContainerId', c.gtmContainerId),
      pixel: ok('metaPixelId', c.metaPixelId),
      clarity: ok('clarityId', c.clarityId),
      plausible: ok('plausibleDomain', c.plausibleDomain),
      head: c.customHeadScripts ? parseScripts(c.customHeadScripts, c.sanitizeScripts).scripts : [],
      body: c.customBodyScripts ? parseScripts(c.customBodyScripts, c.sanitizeScripts).scripts : [],
    };
  } catch {
    return null;
  }
}
