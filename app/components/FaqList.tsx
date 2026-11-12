import { FAQ } from '@/lib/faq';

/** Native <details>: no client JS, accessible by default. */
export function FaqList() {
  return (
    <div className="divide-y divide-h-line rounded-xl border border-h-line  ">
      {FAQ.map((item) => (
        <details key={item.q} className="group p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
            {item.q}
            <span className="text-h-muted transition-transform group-open:rotate-45">+</span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-h-muted ">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
