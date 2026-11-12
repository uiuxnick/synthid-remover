export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ: FaqItem[] = [
  {
    q: 'What does the tool actually change?',
    a: 'It removes EXIF, XMP and C2PA (Content Credentials) metadata, can erase visible AI badges such as corner sparkle marks, and re-encodes pixels in the mode you pick. A byte-level audit shows exactly which metadata blocks were present before and after.',
  },
  {
    q: 'How is image quality measured?',
    a: 'Every job reports PSNR and MSE against the original. Metadata-only mode is bit-for-bit lossless. Balanced mode targets 38 dB or higher, which is visually indistinguishable at normal viewing sizes.',
  },
  {
    q: 'Are my images uploaded?',
    a: 'The free trial on this page runs in your browser and nothing leaves your device. Signed-in workspace processing may use our servers; images are processed in memory and download links expire. See the Privacy Policy for details.',
  },
  {
    q: 'What are credits?',
    a: 'One credit cleans one image. New accounts get free credits, Pro includes a monthly allowance, and you can top up at any time. Failed jobs are refunded automatically.',
  },
  {
    q: 'Is it OK to use this on any image?',
    a: 'Use it only on images you created or have permission to modify. Removing provenance information to deceive others about how an image was made is prohibited by our Terms of Service.',
  },
  {
    q: 'Which formats are supported?',
    a: 'JPG, PNG, WEBP, AVIF and HEIC. Upload limits depend on your plan.',
  },
];
