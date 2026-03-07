"use client";

import { useCallback, useRef, useState, memo, useMemo } from "react";
import { MAX_CHUNKS, FRAMES_PER_CHUNK, FPS } from "@/lib/constants";
import { TimelineRuler } from "./TimelineRuler";
import { PromptMarker } from "./PromptMarker";
import { Playhead } from "./Playhead";
import { PromptEditor } from "./PromptEditor";
import { cn } from "@/lib/utils";

interface TimelineProps {
  currentChunk: number;
  currentPrompt: string | null;
  scheduledPrompts: Record<number, string>;
  maxChunks?: number;
  onAddPrompt: (chunk: number, prompt: string) => void;
  onEditPrompt: (chunk: number, prompt: string) => void;
  onDeletePrompt: (chunk: number) => void;
  disabled?: boolean;
  className?: string;
}

function TimelineComponent({
  currentChunk,
  currentPrompt: _currentPrompt,
  scheduledPrompts,
  maxChunks = MAX_CHUNKS,
  onAddPrompt,
  onEditPrompt,
  onDeletePrompt,
  disabled = false,
  className,
}: TimelineProps) {
  void _currentPrompt;
  const trackRef = useRef<HTMLDivElement>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingChunk, setEditingChunk] = useState(0);
  const [editingPrompt, setEditingPrompt] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  const [hoverChunk, setHoverChunk] = useState<number | null>(null);
  const [hoverY, setHoverY] = useState(0);
  const [tooltipX, setTooltipX] = useState(0);

  const activePromptChunk = useMemo(() => {
    const chunks = Object.keys(scheduledPrompts)
      .map(Number)
      .filter((c) => c <= currentChunk)
      .sort((a, b) => b - a);
    return chunks[0] ?? null;
  }, [scheduledPrompts, currentChunk]);

  const getChunkFromMouseEvent = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!trackRef.current) return null;

      const rect = trackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const chunk = Math.round(percentage * maxChunks);

      return Math.max(0, Math.min(maxChunks - 1, chunk));
    },
    [maxChunks]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const chunk = getChunkFromMouseEvent(e);
      if (chunk !== null && trackRef.current) {
        setHoverChunk(chunk);
        setHoverY(e.clientY);
        const rect = trackRef.current.getBoundingClientRect();
        setTooltipX(rect.left + (chunk / maxChunks) * rect.width);
      }
    },
    [getChunkFromMouseEvent, maxChunks]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverChunk(null);
  }, []);

  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;

      const clampedChunk = getChunkFromMouseEvent(e);
      if (clampedChunk === null) return;

      const existingChunk = Object.keys(scheduledPrompts)
        .map(Number)
        .find((c) => Math.abs(c - clampedChunk) < 2);

      if (existingChunk !== undefined) {
        setEditingChunk(existingChunk);
        setEditingPrompt(scheduledPrompts[existingChunk]);
        setIsEditMode(true);
      } else {
        setEditingChunk(clampedChunk);
        setEditingPrompt("");
        setIsEditMode(false);
      }

      setEditorOpen(true);
    },
    [disabled, getChunkFromMouseEvent, scheduledPrompts]
  );

  const handleMarkerClick = useCallback(
    (chunk: number) => {
      if (disabled) return;

      setEditingChunk(chunk);
      setEditingPrompt(scheduledPrompts[chunk] || "");
      setIsEditMode(true);
      setEditorOpen(true);
    },
    [disabled, scheduledPrompts]
  );

  const handleSave = useCallback(
    (chunk: number, prompt: string) => {
      if (isEditMode) {
        onEditPrompt(chunk, prompt);
      } else {
        onAddPrompt(chunk, prompt);
      }
    },
    [isEditMode, onAddPrompt, onEditPrompt]
  );

  const sortedPromptChunks = useMemo(() => {
    return Object.keys(scheduledPrompts)
      .map(Number)
      .sort((a, b) => a - b);
  }, [scheduledPrompts]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <TimelineRuler maxChunks={maxChunks} />

      <div
        className={cn(
          "px-6 flex-1 min-h-[64px] bg-card/50 border-b border-border",
          disabled && "opacity-50"
        )}
      >
        <div
          ref={trackRef}
          className={cn("relative h-full", disabled ? "cursor-not-allowed" : "cursor-crosshair")}
          onClick={handleTrackClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Prompt segments */}
          {sortedPromptChunks.map((chunk, index) => {
            const nextChunk = sortedPromptChunks[index + 1] ?? maxChunks;
            const startPercent = (chunk / maxChunks) * 100;
            const widthPercent = ((nextChunk - chunk) / maxChunks) * 100;
            const isActive = chunk === activePromptChunk;

            return (
              <div
                key={chunk}
                className={cn(
                  "absolute top-2 bottom-2 rounded-sm transition-colors overflow-hidden",
                  isActive
                    ? "bg-primary/30 border border-primary/50"
                    : "bg-blue-500/20 border border-blue-500/30"
                )}
                style={{
                  left: `${startPercent}%`,
                  width: `${widthPercent}%`,
                }}
              >
                <span
                  className="absolute inset-1 text-[10px] text-foreground/70 leading-tight overflow-hidden"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {scheduledPrompts[chunk]}
                </span>
              </div>
            );
          })}

          {/* Prompt markers */}
          {sortedPromptChunks.map((chunk) => (
            <PromptMarker
              key={chunk}
              chunk={chunk}
              prompt={scheduledPrompts[chunk]}
              maxChunks={maxChunks}
              isActive={chunk === activePromptChunk}
              onClick={() => handleMarkerClick(chunk)}
            />
          ))}

          <Playhead chunk={currentChunk} maxChunks={maxChunks} />

          {/* Hover indicator line */}
          {hoverChunk !== null && (
            <div
              className="absolute top-0 bottom-0 w-px bg-foreground/30 pointer-events-none z-10"
              style={{ left: `${(hoverChunk / maxChunks) * 100}%` }}
            />
          )}
        </div>
      </div>

      {/* Hover tooltip */}
      {hoverChunk !== null && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltipX,
            top: hoverY - 40,
            transform: "translateX(-50%)",
          }}
        >
          <div className="bg-popover border border-border rounded-md px-2 py-1 shadow-lg">
            <div className="text-xs font-mono text-foreground">
              <span className="font-medium">Chunk {hoverChunk}</span>
              <span className="text-muted-foreground ml-2">
                (~{((hoverChunk * FRAMES_PER_CHUNK) / FPS).toFixed(1)}s)
              </span>
            </div>
          </div>
        </div>
      )}

      <PromptEditor
        open={editorOpen}
        chunk={editingChunk}
        initialPrompt={editingPrompt}
        isEditing={isEditMode}
        previousPrompts={sortedPromptChunks.map((c) => ({ chunk: c, prompt: scheduledPrompts[c] }))}
        onSave={handleSave}
        onDelete={onDeletePrompt}
        onClose={() => setEditorOpen(false)}
      />
    </div>
  );
}

export const Timeline = memo(TimelineComponent);
