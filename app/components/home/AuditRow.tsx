import Image from 'next/image';
import { SAMPLE } from './sample';

export type RowState = 'arrived' | 'hover' | 'done';

const chip = 'rounded-[6px] bg-h-surface2 px-2 py-0.5 text-[13px]';

/**
 * A cropped piece of the product: one file in the results list. `data-ui` marks it as a product
 * fragment, where the app's own borders and small radii apply (the page rules apply outside it).
 */
export function AuditRow({ state, onClean, className = '' }: { state: RowState; onClean?: () => void; className?: string }) {
  const done = state === 'done';
  return (
    <div data-ui className={`group w-full max-w-[640px] rounded-md border border-h-line bg-h-frag p-4 text-h-ink ${className}`}>
      <div className="flex items-center gap-4">
        <Image src="/hero-watermarked.jpg" alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-[6px] object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium">{SAMPLE.name}</p>
          <p className="text-[13px] text-h-muted">
            {SAMPLE.dims} · {done ? SAMPLE.outBytes : SAMPLE.inBytes}
          </p>
        </div>
        {done ? (
          <span className="rounded-[6px] bg-h-accent px-2.5 py-1 text-[13px] font-medium text-h-accent-ink">Clean</span>
        ) : (
          <div className={`flex shrink-0 gap-2 ${state === 'hover' ? '' : 'opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'}`}>
            <button type="button" className="rounded-[6px] border border-h-line px-3 py-1.5 text-[13px]" tabIndex={onClean ? 0 : -1}>
              Metadata only
            </button>
            <button
              type="button"
              onClick={onClean}
              tabIndex={onClean ? 0 : -1}
              className="rounded-[6px] bg-h-accent px-3 py-1.5 text-[13px] font-medium text-h-accent-ink"
            >
              Clean
            </button>
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {done ? (
          <>
            <span className={chip}>No metadata blocks left</span>
            <span className={chip}>{SAMPLE.psnr} PSNR</span>
            <span className={chip}>{SAMPLE.ms}</span>
            <span className={chip}>{SAMPLE.badge}</span>
          </>
        ) : (
          <>
            <span className={chip}>EXIF found</span>
            <span className={chip}>ICC profile found</span>
            <span className={`${chip} text-h-muted`}>C2PA, XMP, IPTC: none</span>
          </>
        )}
      </div>
    </div>
  );
}
