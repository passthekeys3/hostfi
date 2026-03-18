"use client";

import { useState, useEffect, useRef, useCallback } from "react";

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true); // Start visible (SSR-safe)
  const hydrated = useRef(false);
  
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    // Skip animations for reduced motion or missing IntersectionObserver
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    
    // Check if element is already in viewport (above the fold)
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      // Already visible, keep it visible
      setVisible(true);
      hydrated.current = true;
      return;
    }
    
    // Element is below the fold -- animate it in when scrolled to
    hydrated.current = true;
    setVisible(false);
    
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
      style={!visible ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

export function useInViewHook(threshold = 0.1) {
  return useInView(threshold);
}
