"use client";

import { memo } from "react";
import { MAX_CHUNKS, FRAMES_PER_CHUNK, FPS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface FrameDisplayProps {
  currentChunk: number;
  currentFrame: number;
  maxChunks?: number;
  className?: string;
}

function FrameDisplayComponent({ 
  currentChunk,
  currentFrame,
  maxChunks = MAX_CHUNKS,
  className 
}: FrameDisplayProps) {
  const elapsedTotal = Math.floor(currentFrame / FPS);
  const elapsedMin = Math.floor(elapsedTotal / 60);
  const elapsedSec = elapsedTotal % 60;
  const maxTotal = Math.floor((maxChunks * FRAMES_PER_CHUNK) / FPS);
  const maxMin = Math.floor(maxTotal / 60);
  const maxSec = maxTotal % 60;

  return (
    <div className={cn("flex items-center gap-4 font-mono text-sm text-foreground", className)}>
      {/* Timecode */}
      <div className="flex items-baseline gap-1">
        <span className="tabular-nums font-medium">
          {elapsedMin}:{elapsedSec.toString().padStart(2, "0")}
        </span>
        <span className="text-muted-foreground text-xs">
          / {maxMin}:{maxSec.toString().padStart(2, "0")}
        </span>
      </div>
      
      {/* Chunk counter */}
      <div className="flex items-baseline gap-1">
        <span className="text-muted-foreground text-xs">Chunk</span>
        <span className="tabular-nums font-medium">{currentChunk}</span>
        <span className="text-muted-foreground text-xs">/ {maxChunks}</span>
      </div>
    </div>
  );
}

export const FrameDisplay = memo(FrameDisplayComponent);
