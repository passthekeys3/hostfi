"use client";

import { useState, useEffect, useRef } from "react";

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
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

export function FadeIn({ 
  children, 
  className = "", 
  delay = 0, 
  withScale = false 
}: { 
  children: React.ReactNode; 
  className?: string; 
  delay?: number; 
  withScale?: boolean;
}) {
  const { ref, visible } = useInView();
  
  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700 ease-out ${
        visible 
          ? `opacity-100 translate-y-0 ${withScale ? "scale-100" : ""}` 
          : `opacity-0 translate-y-8 ${withScale ? "scale-95" : ""}`
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function useInViewHook(threshold = 0.1) {
  return useInView(threshold);
}
