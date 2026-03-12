"use client";

import { Play, Pause, RefreshCw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TransportControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  isFinished: boolean;
  canStart: boolean;
  isConnected: boolean;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onReset: () => void;
  className?: string;
}

export function TransportControls({
  isPlaying,
  isPaused,
  isFinished,
  canStart,
  isConnected,
  onPlay,
  onPause,
  onResume,
  onRestart,
  onReset,
  className,
}: TransportControlsProps) {
  const handlePlayPause = () => {
    if (!isPlaying) {
      onPlay();
    } else if (isPaused) {
      onResume();
    } else {
      onPause();
    }
  };

  const showPlay = !isPlaying || isPaused;
  const isPlayDisabled = !isConnected || isFinished || (!canStart && !isPlaying);

  const getPlayTooltip = () => {
    if (!isConnected) {
      return "Connect first";
    }
    if (isFinished) {
      return "Finished — use Restart or Reset";
    }
    if (!canStart && !isPlaying) {
      return "Add a prompt at chunk 0 to start";
    }
    if (showPlay) {
      return isPlaying && isPaused ? "Resume" : "Play";
    }
    return "Pause";
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Play/Pause button */}
      <div className="relative group">
        <Button
          size="icon"
          variant="outline"
          onClick={handlePlayPause}
          disabled={isPlayDisabled}
          className="h-10 w-10 text-foreground"
        >
          {showPlay ? (
            <Play className="h-5 w-5 fill-current text-foreground" />
          ) : (
            <Pause className="h-5 w-5 fill-current text-foreground" />
          )}
        </Button>
        <div className="absolute top-full left-0 mt-2 px-2 py-1 bg-popover border border-border rounded text-xs text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          {getPlayTooltip()}
        </div>
      </div>

      {/* Restart button */}
      <div className="relative group">
        <Button
          size="icon"
          variant="outline"
          onClick={onRestart}
          disabled={!isConnected}
          className="h-10 w-10 text-foreground"
        >
          <RefreshCw className="h-4 w-4 text-foreground" />
        </Button>
        <div className="absolute top-full left-0 mt-2 px-2 py-1 bg-popover border border-border rounded text-xs text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          {!isConnected ? "Connect first" : "Restart — replay from the beginning"}
        </div>
      </div>

      {/* Reset button */}
      <div className="relative group">
        <Button
          size="icon"
          variant="outline"
          onClick={onReset}
          disabled={!isConnected}
          className="h-10 w-10 text-foreground"
        >
          <Square className="h-4 w-4 fill-current text-foreground" />
        </Button>
        <div className="absolute top-full left-0 mt-2 px-2 py-1 bg-popover border border-border rounded text-xs text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          {!isConnected ? "Connect first" : "Reset — clear all prompts and stop"}
        </div>
      </div>
    </div>
  );
}
