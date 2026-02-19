"use client";

import { useState, useEffect } from "react";

export function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    let rafId: number;
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(scrollPercent);
    };
    
    const handleScroll = () => {
      rafId = requestAnimationFrame(updateProgress);
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    updateProgress();
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);
  
  return (
    <div className="fixed top-0 left-0 right-0 h-[3px] z-[60] pointer-events-none overflow-hidden">
      <div 
        className="h-full bg-teal-500 rounded-r-full will-change-transform origin-left"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
    </div>
  );
}
