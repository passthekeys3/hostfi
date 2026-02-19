"use client";

import { useState, useEffect } from "react";

function useTypingEffect(text: string, startDelay = 500, speed = 50) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let interval: NodeJS.Timeout;
    let index = 0;
    
    timeout = setTimeout(() => {
      interval = setInterval(() => {
        if (index < text.length) {
          setDisplayedText(text.slice(0, index + 1));
          index++;
        } else {
          clearInterval(interval);
          setIsComplete(true);
        }
      }, speed);
    }, startDelay);
    
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [text, startDelay, speed]);
  
  return { displayedText, isComplete };
}

export function TypingHero({ text }: { text: string }) {
  const { displayedText, isComplete } = useTypingEffect(text, 500, 60);

  return (
    <span className="text-teal-500" aria-label={text}>
      <span aria-hidden="true">
        {displayedText}
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
