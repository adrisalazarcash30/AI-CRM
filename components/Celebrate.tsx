"use client";

import { useEffect, useState } from "react";

/**
 * A small one-shot celebration burst. Call <Celebrate trigger={n} /> and
 * increment trigger to play the animation. Tasteful, ~1.2s, emerald.
 */
export default function Celebrate({ trigger }: { trigger: number }) {
  const [playing, setPlaying] = useState(false);
  const [seed, setSeed] = useState(0);

  useEffect(() => {
    if (trigger === 0) return;
    setSeed((s) => s + 1);
    setPlaying(true);
    const id = setTimeout(() => setPlaying(false), 1300);
    return () => clearTimeout(id);
  }, [trigger]);

  if (!playing) return null;

  const dots = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2 + (seed * 0.7);
    const radius = 140 + (i % 3) * 30;
    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius;
    const delay = (i % 4) * 30;
    const isAccent = i % 3 === 0;
    return { dx, dy, delay, color: isAccent ? "#047857" : "#0A0A0A" };
  });

  return (
    <div className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center">
      <div className="relative">
        {dots.map((d, i) => (
          <span
            key={`${seed}-${i}`}
            className="absolute top-0 left-0 w-1.5 h-1.5 rounded-full"
            style={{
              background: d.color,
              transform: "translate(0,0) scale(1)",
              animation: `celebrate-pop 1.1s ${d.delay}ms cubic-bezier(.18,.71,.4,1) forwards`,
              ["--dx" as never]: `${d.dx}px`,
              ["--dy" as never]: `${d.dy}px`,
            } as React.CSSProperties}
          />
        ))}
        <span
          className="font-display italic text-inkDeep absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap"
          style={{
            fontSize: "28px",
            fontWeight: 500,
            animation: "celebrate-label 1.2s ease-out forwards",
            opacity: 0,
          }}
        >
          Closed won.
        </span>
      </div>
    </div>
  );
}
