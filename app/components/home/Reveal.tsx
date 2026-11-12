'use client';

import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';

// useLayoutEffect on the client avoids a flash of visible-then-hidden content; on the server it is a no-op.
const useIso = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Staggered entrance: rises 24px and fades in once as it enters the viewport. Visible if JS never runs. */
export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useIso(() => {
    const el = ref.current;
    if (!el) return;
    document.documentElement.classList.add('reveal-ready');
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
      el.dataset.in = '1'; // already on screen: no hidden state at all
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.dataset.in = '1';
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-reveal style={{ transitionDelay: `${delay}ms` }} className={className}>
      {children}
    </div>
  );
}
