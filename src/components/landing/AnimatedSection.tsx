"use client";

import { useState, useEffect, useRef } from "react";

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  // Track if IntersectionObserver is supported and has initialized
  const [ready, setReady] = useState(false);
  
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    // Check for reduced motion preference
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      setReady(true);
      return;
    }
    
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      setReady(true);
      return;
    }
    
    setReady(true);
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { 
        setVisible(true); 
        obs.disconnect(); 
      }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  
  return { ref, visible, ready };
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
  const { ref, visible, ready } = useInView();
  
  // Before JS hydration, render fully visible (no opacity-0 flash)
  // After hydration, animate only if IntersectionObserver is ready
  return (
    <div
      ref={ref}
      className={`${className} ${ready ? 'transition-all duration-700 ease-out' : ''} ${
        !ready || visible 
          ? `opacity-100 translate-y-0 ${withScale ? "scale-100" : ""}` 
          : `opacity-0 translate-y-8 ${withScale ? "scale-95" : ""}`
      }`}
      style={ready && !visible ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

export function useInViewHook(threshold = 0.1) {
  return useInView(threshold);
}
