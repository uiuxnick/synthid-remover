# SynthID Remover: image and video metadata cleaner (Next.js SaaS)

Open-source SaaS for cleaning **EXIF, XMP, ICC, IPTC and C2PA Content Credentials** from images and videos, removing **visible watermark badges**, and proving what changed with a **byte-level audit report** and **PSNR quality score**.

Built with Next.js 14, Prisma, PostgreSQL, Auth.js and Razorpay. Includes user accounts, a credit system, subscriptions, an admin panel and a developer API.

> **Use it on media you own or have the right to modify.** This project is for privacy and file hygiene: removing camera, software, author and location data before you share a file. Do not use it to misrepresent how an image or video was made. See [Responsible use](#responsible-use).

---

## Contents

- [What it does](#what-it-does)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)
- [Developer API](#developer-api)
- [Video cleanup](#video-cleanup)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security notes](#security-notes)
- [Roadmap](#roadmap)
- [Responsible use](#responsible-use)
- [Credits and licence](#credits-and-licence)

---

## What it does

| Input | What is removed | What you get back |
|---|---|---|
| **Images** (JPG, PNG, WEBP, AVIF) | EXIF, XMP, ICC, IPTC, C2PA metadata blocks; known visible corner badges | Clean file, list of blocks found and removed, PSNR / MSE against the original |
| **Videos** (MP4, MOV, WebM, MKV) | Titles, comments, artist and software tags, chapters, extra data tracks; a visible mark in a region you choose | Clean file and a report of tags found and tags left |

Every run produces a report, so the result can be checked instead of trusted.

Measured on the project's own test files:

- Image, Balanced mode: EXIF and ICC found and removed, **38.27 dB PSNR**, 846 ms (1200 x 655 JPEG)
- Image, Metadata-only mode: PNG output is pixel-identical in the test suite
- Video, Metadata-only: 4 tags removed by stream copy in about 0.3 s, picture and sound untouched

## Features

**Cleaning**

- Image metadata removal with a before and after scan of every block type
- Visible badge detection and removal, with a manual brush for marks the detector misses
- Three image modes (Metadata only, Balanced, Aggressive) with measured quality for each
- Video metadata stripping without re-encoding, and visible mark removal over a chosen region
- Free trial that runs entirely in the browser, so trial files are never uploaded

**SaaS**

- Sign in with email and password, Google, or a one-time email link (Auth.js v5)
- Credit system with an append-only ledger; credits are deducted atomically and refunded on failure
- Razorpay checkout for credit packs and subscriptions, with signature verification and idempotent webhooks
- Customer dashboard: image workspace, video workspace, history, billing, API keys
- Admin panel: revenue overview, user management, tracking scripts, SMTP and email templates, pricing and engine limits
- Developer API with hashed API keys and per-key rate limits

**Engineering**

- Rate limiting with Upstash Redis (in-memory fallback for local development)
- Server-enforced anonymous trial limit
- Streaming video uploads with a hard size cap (never buffered in memory)
- 40 unit tests plus a pipeline verification suite, run in CI

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router), React 18, TypeScript (strict) |
| Styling | Tailwind CSS, design tokens via CSS variables, light and dark themes |
| Database | PostgreSQL with Prisma 5 |
| Auth | Auth.js v5 (credentials, Google OAuth, magic link), JWT sessions |
| Payments | Razorpay (orders, subscriptions, webhooks) |
| Image engine | Sharp on the server, Canvas in the browser |
| Video engine | ffmpeg and ffprobe |
| Rate limiting | `@upstash/ratelimit` |
| Email | Nodemailer (SMTP), editable templates |
| Tests | Vitest |

## Quick start

Requirements: Node.js 20+, PostgreSQL 14+, and ffmpeg (only for video cleanup).

```bash
git clone https://github.com/uiuxnick/synthid-remover.git
cd synthid-remover
npm install --legacy-peer-deps
cp env.example .env
```

Fill in `.env` (see below), then create the database and an admin user:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000. Sign in with the `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` you set, and open `/admin`.

## Environment variables

Copy `env.example` to `.env`. Never commit `.env`.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Yes | PostgreSQL connection (pooled and direct) |
| `AUTH_SECRET` | Yes | Session signing key. Generate with `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL of the site |
| `APP_ENCRYPTION_KEY` | Yes | 32-byte base64 key used to encrypt the stored SMTP password |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Optional | Google sign-in |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional | Email (can also be set in the admin panel) |
| `RAZORPAY_KEY_ID`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | For payments | Razorpay checkout and webhooks |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Production | Shared rate limits |
| `FFMPEG_PATH`, `FFPROBE_PATH` | Optional | Custom ffmpeg locations |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | For seeding | First admin account |

## Project structure

```
app/
  page.tsx                 Landing page
  pricing/ features/ api-docs/ terms/ privacy/
  login/ register/
  dashboard/               Overview, images, video, history, billing, API keys
  admin/                   Overview, users, tracking, email, pricing and engine
  api/
    process/ inpaint/      Image cleaning (credits, trial limit, rate limit)
    video/                 Video cleaning (streaming upload, ffmpeg)
    billing/               Razorpay order, verify, webhook, cancel
    v1/                    Public developer API
    auth/                  Auth.js handlers and registration
lib/
  imageProcessor.ts        Server image pipeline (Sharp)
  clientImageProcessor.ts  In-browser trial pipeline
  videoProcessor.ts        ffmpeg wrapper (probe, strip, mark removal)
  credits.ts billing.ts    Ledger, atomic spend, refunds, payment fulfilment
  ratelimit.ts apikeys.ts  Limits and API key hashing
prisma/                    Schema, migrations, seed
tests/unit/                Vitest suites
```

## Developer API

API keys are created in the dashboard (Enterprise plan). Keys are shown once and stored only as a SHA-256 hash.

```bash
curl -X POST https://YOUR_DOMAIN/api/v1/clean \
  -H "Authorization: Bearer $API_KEY" \
  -F "file=@input.jpg" \
  -F "mode=balanced"
```

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/clean` | Clean one image. Costs 1 credit, refunded on failure |
| `GET /api/v1/credits` | Remaining credits |
| `GET /api/v1/jobs/:id` | Status of one of your jobs |

Errors use `{ "error": { "code", "message" } }` with `401`, `402`, `413` and `429` (with `Retry-After`).

## Video cleanup

| Mode | What happens | Cost |
|---|---|---|
| Metadata only | Stream copy: tags, chapters and data tracks are dropped, picture and sound are untouched | 1 credit |
| Remove a mark | The chosen region is blended out for the whole clip; the video is re-encoded to MP4 | 1 credit per 10 seconds |

Limits: 200 MB, 3 minutes, up to 4K. Uploads are streamed to a private temp directory and deleted after the response.

## Testing

```bash
npm run typecheck      # TypeScript
npm test               # image pipeline verification
npm run test:unit      # 40 unit tests (signatures, credits, limits, sanitiser, video rules)
npm run test:all       # everything
```

## Deployment

This is a server application. It needs a Node.js host with PostgreSQL; it cannot be deployed as a static site.

- **Images only:** any Node host, including serverless platforms.
- **With video:** a host where ffmpeg can run (a VM or container, for example Fly.io, Railway, Render or your own server). Serverless platforms without ffmpeg will return "Video processing is not available".
- Set `UPSTASH_REDIS_REST_*` in production so rate limits are shared between instances.
- Point the Razorpay webhook at `/api/billing/webhook` and subscribe to `payment.captured`, `payment.failed`, `subscription.charged`, `subscription.cancelled`, `subscription.completed` and `subscription.halted`.
- Run `npm run db:deploy` on release to apply migrations.

## Security notes

- Passwords are hashed with bcrypt (cost 12). API keys are stored as SHA-256 hashes.
- Credit balance can never go negative: enforced by an atomic conditional update and a database `CHECK` constraint.
- Razorpay signatures are verified with constant-time comparison; webhook events are de-duplicated.
- Admin routes re-check the role in the database on every request.
- Admin-supplied tracking scripts are validated on save. Inline JavaScript cannot be sanitised, so only give admin access to people you trust.
- ffmpeg is run with an argument array and a file-only protocol whitelist; only real video containers are accepted.

Found a vulnerability? Please open a private security advisory on GitHub instead of a public issue.

## Roadmap

- Password reset and email verification
- Batch upload with ZIP download
- Object storage with expiring download links
- Background job queue for long videos
- Usage charts and invoices
- Cookie consent for tracking scripts

## Responsible use

Provenance metadata and content credentials exist to help people understand where media came from. This tool is meant for legitimate uses such as protecting your privacy, removing personal or device data before publishing, and cleaning files you created.

Do not use it to pass off media as something it is not, to deceive people about its origin, or to get around disclosure rules that apply to you. The Terms of Service shipped in this repository prohibit that use. The project makes no promise that output will pass or fail any third-party detection system.

## Credits and licence

Released under the [MIT Licence](LICENSE).

The image processing engine and original interface come from the open-source project [satiricalguru/Synthid-remover](https://github.com/satiricalguru/Synthid-remover). This repository extends it into a full SaaS: accounts, credits, payments, admin panel, developer API, video cleanup and a redesigned interface.
