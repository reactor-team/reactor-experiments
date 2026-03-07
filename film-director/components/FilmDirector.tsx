"use client";

import { useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useReactor, useReactorMessage } from "@reactor-team/js-sdk";
import { MAX_CHUNKS, FRAMES_PER_CHUNK, FPS } from "@/lib/constants";
import type { HeliosMessage } from "@/lib/types";
import { VideoPreview } from "./VideoPreview";
import { Timeline } from "./Timeline";
import { TransportControls } from "./TransportControls";
import { FrameDisplay } from "./FrameDisplay";
import { ResizableDivider } from "./ResizableDivider";
import { cn } from "@/lib/utils";

interface FilmDirectorProps {
  maxChunks?: number;
  className?: string;
}

export function FilmDirector({ 
  maxChunks = MAX_CHUNKS,
  className 
}: FilmDirectorProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [scheduledPrompts, setScheduledPrompts] = useState<Record<number, string>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);
  const toastIdRef = useRef(0);

  const addToast = useCallback((message: string) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const { sendCommand, status } = useReactor((state) => ({
    sendCommand: state.sendCommand,
    status: state.status,
  }));

  const isConnected = status === "ready";

  useReactorMessage((message: HeliosMessage) => {
    if (message?.type === "state") {
      const state = message.data;
      setCurrentFrame(state.current_frame);
      setCurrentChunk(state.current_chunk);
      setCurrentPrompt(state.current_prompt);
      setIsPaused(state.paused);
      setIsRunning(state.running);
      setScheduledPrompts(prev => ({ ...prev, ...state.scheduled_prompts }));
    } else if (message?.type === "event") {
      const event = message.data;
      console.log("[FilmDirector] Event:", event.event, event);
      
      if (event.event === "generation_started") {
        setIsRunning(true);
      } else if (event.event === "generation_reset") {
        setIsRunning(false);
        setIsFinished(false);
        setCurrentFrame(0);
        setCurrentChunk(0);
        setCurrentPrompt(null);
      } else if (event.event === "error") {
        console.error("[FilmDirector] Error:", event.message);
        addToast(event.message || "An unknown error occurred");
      }
    }
  });

  // Auto-pause when the timeline ends
  useEffect(() => {
    if (isRunning && !isPaused && currentChunk >= maxChunks) {
      setIsFinished(true);
      sendCommand("pause", {}).catch((err) =>
        console.error("[FilmDirector] Failed to auto-pause:", err)
      );
    }
  }, [currentChunk, maxChunks, isRunning, isPaused, sendCommand]);

  const prevStatusRef = useRef(status);
  useEffect(() => {
    const wasConnected = prevStatusRef.current !== "disconnected";
    const isNowDisconnected = status === "disconnected";
    prevStatusRef.current = status;
    
    if (wasConnected && isNowDisconnected) {
      queueMicrotask(() => {
        setCurrentFrame(0);
        setCurrentChunk(0);
        setCurrentPrompt(null);
        setIsPaused(true);
        setIsRunning(false);
        setIsFinished(false);
        setScheduledPrompts({});
      });
    }
  }, [status]);

  const handlePlay = useCallback(async () => {
    if (!(0 in scheduledPrompts)) {
      console.warn("[FilmDirector] Cannot start: No prompt at chunk 0");
      return;
    }
    
    try {
      for (const [chunk, prompt] of Object.entries(scheduledPrompts)) {
        await sendCommand("schedule_prompt", {
          prompt,
          chunk: Number(chunk),
        });
      }
      await sendCommand("start", {});
    } catch (error) {
      console.error("[FilmDirector] Failed to start:", error);
    }
  }, [sendCommand, scheduledPrompts]);

  const handlePause = useCallback(async () => {
    try {
      await sendCommand("pause", {});
    } catch (error) {
      console.error("[FilmDirector] Failed to pause:", error);
    }
  }, [sendCommand]);

  const handleResume = useCallback(async () => {
    try {
      await sendCommand("resume", {});
    } catch (error) {
      console.error("[FilmDirector] Failed to resume:", error);
    }
  }, [sendCommand]);

  const handleRestart = useCallback(async () => {
    try {
      await sendCommand("reset", {});
    } catch (error) {
      console.error("[FilmDirector] Failed to restart:", error);
    }
  }, [sendCommand]);

  const handleReset = useCallback(async () => {
    try {
      await sendCommand("reset", {});
      setScheduledPrompts({});
    } catch (error) {
      console.error("[FilmDirector] Failed to reset:", error);
    }
  }, [sendCommand]);

  const handleAddPrompt = useCallback(async (chunk: number, prompt: string) => {
    try {
      await sendCommand("schedule_prompt", {
        prompt,
        chunk,
      });
      
      setScheduledPrompts(prev => ({
        ...prev,
        [chunk]: prompt,
      }));
    } catch (error) {
      console.error("[FilmDirector] Failed to add prompt:", error);
    }
  }, [sendCommand]);

  const handleEditPrompt = useCallback(async (chunk: number, prompt: string) => {
    try {
      await sendCommand("schedule_prompt", {
        prompt,
        chunk,
      });
      
      setScheduledPrompts(prev => ({
        ...prev,
        [chunk]: prompt,
      }));
    } catch (error) {
      console.error("[FilmDirector] Failed to edit prompt:", error);
    }
  }, [sendCommand]);

  const handleDeletePrompt = useCallback((chunk: number) => {
    setScheduledPrompts(prev => {
      const next = { ...prev };
      delete next[chunk];
      return next;
    });
    console.warn("[FilmDirector] Prompt deleted locally. Reset to sync with model.");
  }, []);

  const canStart = 0 in scheduledPrompts;

  const containerRef = useRef<HTMLDivElement>(null);
  const [timelineHeight, setTimelineHeight] = useState(200);
  const minTimelineHeight = 120;
  const maxTimelineHeight = 500;

  const handleResize = useCallback((deltaY: number) => {
    setTimelineHeight(prev => {
      const newHeight = prev - deltaY;
      return Math.max(minTimelineHeight, Math.min(maxTimelineHeight, newHeight));
    });
  }, []);

  const totalSeconds = (currentChunk * FRAMES_PER_CHUNK) / FPS;

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <div ref={containerRef} className={cn("relative flex flex-col h-full bg-background", className)}>
      {/* Video preview area */}
      <div className="flex-1 min-h-0 p-2 pb-1">
        <VideoPreview
          currentFrame={currentFrame}
          currentChunk={currentChunk}
          isRunning={isRunning}
          isPaused={isPaused}
          className="w-full h-full"
        />
      </div>

      {/* Current prompt display */}
      <div className="px-4 pb-1">
        <div className="bg-card border border-border rounded px-3 py-1.5 flex items-center gap-2 min-w-0">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide shrink-0">
            Prompt
          </span>
          <p className="text-xs text-foreground truncate min-w-0 flex-1">
            {currentPrompt || (
              <span className="text-muted-foreground italic">
                No prompt — click the timeline to add one at chunk 0
              </span>
            )}
          </p>
        </div>
      </div>

      <ResizableDivider onResize={handleResize} />

      {/* Bottom panel with controls and timeline */}
      <div 
        className="flex flex-col border-t border-border"
        style={{ height: timelineHeight }}
      >
        {/* Control bar */}
        <div className="flex items-center gap-4 px-4 py-2 bg-card border-b border-border shrink-0">
          <TransportControls
            isPlaying={isRunning}
            isPaused={isPaused}
            isFinished={isFinished}
            canStart={canStart}
            isConnected={isConnected}
            onPlay={handlePlay}
            onPause={handlePause}
            onResume={handleResume}
            onRestart={handleRestart}
            onReset={handleReset}
          />
          
          <div className="h-6 w-px bg-border" />
          
          <FrameDisplay
            currentChunk={currentChunk}
            currentFrame={currentFrame}
            maxChunks={maxChunks}
          />
          
          <div className="flex-1" />
        </div>

        {/* Timeline */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <Timeline
            currentChunk={currentChunk}
            currentPrompt={currentPrompt}
            scheduledPrompts={scheduledPrompts}
            maxChunks={maxChunks}
            onAddPrompt={handleAddPrompt}
            onEditPrompt={handleEditPrompt}
            onDeletePrompt={handleDeletePrompt}
            disabled={!isConnected}
            className="h-full"
          />
        </div>
      </div>

      {/* Error toasts */}
      {toasts.length > 0 && (
        <div className="absolute bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className="bg-destructive/90 text-destructive-foreground rounded-lg px-4 py-3 shadow-lg backdrop-blur-sm flex items-start gap-3 animate-in slide-in-from-right fade-in duration-200"
              role="alert"
            >
              <p className="text-sm flex-1">{toast.message}</p>
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-destructive-foreground/70 hover:text-destructive-foreground shrink-0 text-lg leading-none"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
