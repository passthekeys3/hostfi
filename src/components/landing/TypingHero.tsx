"use client";

import { useState, useEffect, useRef } from "react";

export function TypingHero({ text }: { text: string }) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // Wait for idle before starting animation to avoid blocking main thread
    const startTyping = () => {
      let index = 0;
      const interval = setInterval(() => {
        if (index < text.length) {
          setDisplayedText(text.slice(0, index + 1));
          index++;
        } else {
          clearInterval(interval);
          setIsComplete(true);
        }
      }, 60);
      return interval;
    };

    let interval: ReturnType<typeof setInterval>;
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(() => {
        interval = startTyping();
      });
      return () => {
        cancelIdleCallback(id);
        if (interval) clearInterval(interval);
      };
    } else {
      const timeout = setTimeout(() => {
        interval = startTyping();
      }, 500);
      return () => {
        clearTimeout(timeout);
        if (interval) clearInterval(interval);
      };
    }
  }, [text]);

  return (
    <span className="text-teal-500" aria-label={text}>
      <span aria-hidden="true">
        {displayedText || "\u00A0"}
        {!isComplete && (
          <span
            className="inline-block w-[3px] h-[0.9em] bg-teal-500 ml-1 align-middle animate-blink"
          />
        )}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
