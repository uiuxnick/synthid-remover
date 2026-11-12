'use client';

import React, { useState, useEffect, useRef } from 'react';

export const HeroImageScanner: React.FC = () => {
  const [sliderPos, setSliderPos] = useState<number>(0);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Auto-animate slider position when user is not hovering
  useEffect(() => {
    if (isHovering) return;

    let startTime = Date.now();
    const duration = 7000; // 7 seconds per full cycle

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) % duration;
      const progress = elapsed / duration;
      // Smooth full sweep from 0% (full left) to 100% (full right)
      const newPos = 50 - 50 * Math.cos(progress * Math.PI * 2);
      setSliderPos(newPos);
    }, 16);

    return () => clearInterval(interval);
  }, [isHovering]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percentage);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current || e.touches.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percentage);
  };

  const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return (
    <div data-ui className="relative">
      <div
        ref={containerRef}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onMouseMove={handleMouseMove}
        onTouchStart={() => setIsHovering(true)}
        onTouchEnd={() => setIsHovering(false)}
        onTouchMove={handleTouchMove}
        className="group relative aspect-[1200/655] w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-[10px] bg-black"
        role="img"
        aria-label="Before and after comparison: the original image on the right, the cleaned image on the left"
      >
        {/* Base layer: the original */}
        <img src={`${base}/hero-watermarked.jpg`} alt="" width={1200} height={655} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute right-3 top-3 rounded-[6px] bg-white px-2.5 py-1 text-[13px] font-medium text-black">Original</div>

        {/* Left of the divider: the cleaned image */}
        <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
          <div className="relative h-full" style={{ width: containerWidth > 0 ? `${containerWidth}px` : '100%' }}>
            <img src={`${base}/hero-cleaned.jpg`} alt="" width={1200} height={655} className="h-full w-full object-cover" />
            <div className="absolute left-3 top-3 rounded-[6px] bg-h-accent px-2.5 py-1 text-[13px] font-medium text-h-accent-ink">Cleaned</div>
          </div>
        </div>

        {/* Divider and grip */}
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white" style={{ left: `${sliderPos}%` }}>
          <div className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-white text-[14px] text-black">↔</div>
        </div>
      </div>
      <p className="mt-3 text-[14px] text-h-muted">Move across the image to compare. The cleaned side has no embedded metadata.</p>
    </div>
  );
};
