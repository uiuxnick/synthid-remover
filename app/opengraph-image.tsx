import { ImageResponse } from 'next/og';
import { SITE } from '@/lib/site';

export const alt = SITE.name;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          background: '#000',
          color: '#fff',
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.6 }}>{SITE.name}</div>
        <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05, marginTop: 24 }}>
          Clean metadata and visible marks. Keep the quality.
        </div>
        <div style={{ fontSize: 28, opacity: 0.6, marginTop: 32 }}>Byte audit · PSNR reporting · C2PA / EXIF removal</div>
      </div>
    ),
    size
  );
}
