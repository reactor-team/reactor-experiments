"use client";

import { ReactorView } from "@reactor-team/js-sdk";
import { cn } from "@/lib/utils";
import { FPS } from "@/lib/constants";

interface VideoPreviewProps {
  currentFrame: number;
  currentChunk: number;
  isRunning: boolean;
  isPaused: boolean;
  className?: string;
}

export function VideoPreview({ 
  currentFrame,
  currentChunk,
  isRunning,
  isPaused,
  className 
}: VideoPreviewProps) {
  const totalSeconds = Math.floor(currentFrame / FPS);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const timecode = `${minutes}:${secs.toString().padStart(2, "0")}`;

  return (
    <div className={cn("relative bg-black rounded-lg overflow-hidden", className)}>
      <ReactorView className="w-full h-full object-contain" />
      
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-white text-lg tabular-nums">
              {timecode}
            </span>
            <span className="text-white/60 text-sm">
              Chunk {currentChunk}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {!isRunning ? (
              <span className="text-white/40 text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 bg-white/40 rounded-full" />
                Ready
              </span>
            ) : isPaused ? (
              <span className="text-yellow-400 text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 bg-yellow-400 rounded-full" />
                Paused
              </span>
            ) : (
              <span className="text-green-400 text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Playing
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
