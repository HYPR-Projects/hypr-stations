import { useEffect, useRef, useState } from 'react';

interface Stat {
  label: string;
  value: string;
  numericValue?: number;
  barPercent: number;
  barColor: string;
}

const STATS: Stat[] = [
  { label: 'Estações indexadas', value: '113.890', numericValue: 113890, barPercent: 92, barColor: 'var(--accent)' },
  { label: 'Rádios FM / AM', value: '3.890', numericValue: 3890, barPercent: 34, barColor: 'var(--accent-dim)' },
  { label: 'ERBs celular', value: '110K+', numericValue: 110000, barPercent: 88, barColor: '#5ba3e6' },
  { label: 'Cobertura nacional', value: '27 / 27 UFs', barPercent: 100, barColor: '#5cb87a' },
];

function AnimatedValue({ target, suffix }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    if (animated.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          const duration = 900;
          const start = performance.now();
          const step = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            setVal(Math.round(ease * target));
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{val.toLocaleString('pt-BR')}{suffix}</span>;
}

export default function HubStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
      {STATS.map((stat, i) => (
        <div
          key={stat.label}
          className="bg-[var(--bg-surface)] border-[0.5px] border-[var(--border)] rounded-xl
                     px-6 py-[22px] transition-all duration-250 cursor-default
                     hover:bg-[var(--bg-surface2)] hover:border-[var(--border-hover)]"
          style={{ animation: `fadeUp 0.45s ease ${0.06 + i * 0.04}s both` }}
        >
          <div className="text-[11px] font-medium tracking-[0.03em] text-[var(--text-muted)] mb-3.5">
            {stat.label}
          </div>
          <div className="text-[24px] font-semibold text-[var(--text-primary)] tracking-[-0.02em] leading-none mb-3.5">
            {stat.numericValue ? (
              <AnimatedValue target={stat.numericValue} />
            ) : (
              stat.value
            )}
          </div>
          <div className="h-[2px] rounded-full bg-[var(--border)] overflow-hidden">
            <div
              className="h-full rounded-full origin-left"
              style={{
                width: `${stat.barPercent}%`,
                background: stat.barColor,
                animation: `barIn 0.9s cubic-bezier(0.16,1,0.3,1) ${0.35 + i * 0.07}s both`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
