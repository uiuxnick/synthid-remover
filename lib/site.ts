export const SITE = {
  name: 'SynthID Remover',
  tagline: 'Clean provenance metadata and visible marks from images you own',
  description:
    'Strip EXIF, XMP and C2PA metadata, remove visible AI badges, and get a byte-level audit of every change, with quality reported as PSNR. Runs in your browser for the free trial.',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  contactEmail: 'support@example.com', // TODO: replace before launch
  company: 'Your Company Name', // TODO: replace before launch (used in Terms / Privacy)
} as const;
