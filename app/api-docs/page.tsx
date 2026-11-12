import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API',
  description: 'Developer API for programmatic image cleanup: authentication, request format and response fields.',
  alternates: { canonical: '/api-docs' },
};

const CURL = `curl -X POST https://YOUR_DOMAIN/api/v1/clean \\
  -H "Authorization: Bearer $API_KEY" \\
  -F "file=@input.jpg" \\
  -F "mode=balanced"`;

const PY = `import requests

r = requests.post(
    "https://YOUR_DOMAIN/api/v1/clean",
    headers={"Authorization": f"Bearer {API_KEY}"},
    files={"file": open("input.jpg", "rb")},
    data={"mode": "balanced"},
    timeout=60,
)
r.raise_for_status()
print(r.json()["result"]["processedBytes"])`;

const Code = ({ children }: { children: string }) => (
  <pre className="overflow-x-auto rounded-[14px] bg-h-surface p-5 font-mono text-[14px] leading-relaxed">
    <code>{children}</code>
  </pre>
);

export default function ApiDocsPage() {
  return (
    <section className="pb-24 pt-14 sm:pt-24">
      <div className="mx-auto max-w-[820px] space-y-10 px-4 text-[17px] leading-relaxed sm:px-6 [&>div]:max-w-[76ch]">
        <div>
          <h1 className="text-[40px] font-bold leading-[1.06] tracking-[-0.03em] sm:text-[56px]">API</h1>
          <p className="mt-3 ">
            Available on the Enterprise plan. Create keys in your dashboard under API keys.
          </p>
        </div>
        <div>
          <h2 className="mb-3 text-[26px] font-semibold leading-tight tracking-[-0.02em]">Authentication</h2>
          <p className="">
            Send your key as a bearer token. Keys are shown once at creation and stored only as a hash.
          </p>
        </div>
        <div>
          <h2 className="mb-3 text-[26px] font-semibold leading-tight tracking-[-0.02em]">POST /api/v1/clean</h2>
          <p className="mb-3 ">
            Multipart form with <code>file</code> and <code>mode</code> (<code>metadata-only</code>, <code>balanced</code> or <code>aggressive</code>). Costs one credit; refunded on failure.
          </p>
          <Code>{CURL}</Code>
          <div className="h-3" />
          <Code>{PY}</Code>
        </div>
        <div>
          <h2 className="mb-3 text-[26px] font-semibold leading-tight tracking-[-0.02em]">Response</h2>
          <Code>{`{
  "jobId": "clx...",
  "status": "completed",
  "format": "png",
  "image": "data:image/png;base64,...",
  "result": {
    "originalBytes": 2048000,
    "processedBytes": 1950000,
    "dimensions": { "width": 1024, "height": 1024 },
    "executionTimeMs": 812,
    "badgeRemoved": true,
    "provenanceAudit": { "clean": true }
  }
}`}</Code>
          <p className="mt-3 ">
            Also: <code>GET /api/v1/credits</code> returns <code>{'{ "credits": 41 }'}</code>; <code>GET /api/v1/jobs/:id</code> returns the status of one of your jobs.
          </p>
        </div>
        <div>
          <h2 className="mb-3 text-[26px] font-semibold leading-tight tracking-[-0.02em]">Errors</h2>
          <p className="">
            Errors are <code>{'{ "error": { "code", "message" } }'}</code>: <code>401</code> invalid key · <code>402</code> insufficient credits · <code>413</code> file too large · <code>429</code> rate limited (see the <code>Retry-After</code> header).
          </p>
        </div>
      </div>
    </section>
  );
}
