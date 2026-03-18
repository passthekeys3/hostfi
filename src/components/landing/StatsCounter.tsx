"use client";

import { useState, useEffect, useRef } from "react";

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { 
        setVisible(true); 
        obs.disconnect(); 
      }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  
  return { ref, visible };
}

function AnimatedNumber({ value, prefix = "", suffix = "", visible }: { value: number; prefix?: string; suffix?: string; visible: boolean }) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  
  useEffect(() => {
    if (!visible || started.current) return;
    started.current = true;
    const start = performance.now();
    const duration = 1500;
    
    // Elastic ease-out with overshoot
    const elasticOut = (t: number): number => {
      const c4 = (2 * Math.PI) / 3;
      return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    };
    
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = elasticOut(p);
      // Clamp to prevent negative values during oscillation
      setCount(Math.round(Math.max(0, value * ease)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [visible, value]);
  
  return <>{prefix}{count.toLocaleString()}{suffix}</>;
}

const stats = [
  { type: "animated", value: 15, suffix: "+", label: "IRS Schedule E line items mapped", prefix: "" },
  { type: "static", display: "< 30s", label: "Average bill parse time" },
  { type: "animated", value: 11, suffix: "", label: "Integrations supported", prefix: "" },
  { type: "static", display: "$0", label: "To start tracking" },
] as const;

export function StatsCounter() {
  const { ref, visible } = useInView(0.3);

  return (
    <section ref={ref} className="py-16 px-5 border-y border-gray-100">
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {stats.map((s, i) => (
          <div key={i}>
            <p className="text-3xl sm:text-4xl font-bold text-gray-900">
              {s.type === "static" ? (
                s.display
              ) : (
                <AnimatedNumber value={s.value} prefix={s.prefix} suffix={s.suffix} visible={visible} />
              )}
            </p>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
