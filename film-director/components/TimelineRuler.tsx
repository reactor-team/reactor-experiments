"use client";

import { memo, useMemo } from "react";
import { MAX_CHUNKS, TIMELINE_TICK_INTERVAL, TIMELINE_LABEL_EVERY_N_TICKS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface TimelineRulerProps {
  maxChunks?: number;
  className?: string;
}

function TimelineRulerComponent({ 
  maxChunks = MAX_CHUNKS,
  className 
}: TimelineRulerProps) {
  const ticks = useMemo(() => {
    const result: { chunk: number; isMajor: boolean }[] = [];
    
    for (let chunk = 0; chunk <= maxChunks; chunk += TIMELINE_TICK_INTERVAL) {
      const tickIndex = chunk / TIMELINE_TICK_INTERVAL;
      const isMajor = tickIndex % TIMELINE_LABEL_EVERY_N_TICKS === 0;
      result.push({
        chunk,
        isMajor,
      });
    }
    
    return result;
  }, [maxChunks]);

  return (
    <div className={cn("px-6 bg-card border-b border-border", className)}>
      <div className="relative h-6">
        {ticks.map(({ chunk, isMajor }) => (
          <div
            key={chunk}
            className="absolute top-0 flex flex-col items-center"
            style={{ left: `${(chunk / maxChunks) * 100}%` }}
          >
            <div
              className={cn(
                "w-px bg-foreground/20",
                isMajor ? "h-3" : "h-2"
              )}
            />
            {isMajor && (
              <span className="text-[10px] text-foreground/60 mt-0.5 -translate-x-1/2">
                {chunk}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export const TimelineRuler = memo(TimelineRulerComponent);
