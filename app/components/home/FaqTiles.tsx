import { FAQ } from '@/lib/faq';

/** Native <details name="faq">: one open at a time, no client JS. */
export function FaqTiles() {
  return (
    <section aria-labelledby="faq" className="px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-[820px]">
        <p className="text-center text-[13px] font-semibold uppercase tracking-[0.08em] text-h-accent">FAQ</p>
        <h2 id="faq" className="mt-3 text-center text-[34px] font-bold leading-[1.1] tracking-[-0.025em] sm:text-[44px]">Questions, answered</h2>
        <div className="mt-10 space-y-3">
          {FAQ.slice(0, 8).map((item) => (
            <details
              key={item.q}
              name="faq"
              className="h-card group !shadow-none transition-colors open:border-h-accent"
            >
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 px-6 py-4 text-[18px] font-medium sm:text-[20px]">
                {item.q}
                <span aria-hidden className="relative h-4 w-4 shrink-0">
                  <span className="absolute left-0 top-1/2 h-[3px] w-4 -translate-y-1/2 bg-current" />
                  <span className="absolute left-1/2 top-0 h-4 w-[3px] -translate-x-1/2 bg-current transition-transform group-open:rotate-90" />
                </span>
              </summary>
              <p className="px-6 pb-6 text-[16px] leading-relaxed text-h-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
