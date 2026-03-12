"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

interface PlayheadProps {
  chunk: number;
  maxChunks: number;
  className?: string;
}

function PlayheadComponent({ chunk, maxChunks, className }: PlayheadProps) {
  const position = (chunk / maxChunks) * 100;

  return (
    <div
      className={cn("absolute top-0 bottom-0 pointer-events-none z-20", className)}
      style={{ left: `${position}%` }}
    >
      <div className="absolute top-0 bottom-0 w-0.5 bg-red-500" />
      <div className="absolute -top-1 -translate-x-1/2">
        <div 
          className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-red-500"
        />
      </div>
    </div>
  );
}

export const Playhead = memo(PlayheadComponent);
