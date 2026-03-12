"use client";

import { useState, useEffect } from "react";
import { presetPrompts } from "@/lib/prompts";
import { cn } from "@/lib/utils";

interface PromptSuggestionsProps {
  onPromptSelect: (prompt: string) => void;
  disabled?: boolean;
  resetKey?: number;
}

export function HeliosPromptSuggestions({
  onPromptSelect,
  disabled = false,
  resetKey = 0,
}: PromptSuggestionsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Clear selection when disabled (disconnected) or on reset
  useEffect(() => {
    if (disabled) setSelectedId(null);
  }, [disabled]);

  useEffect(() => {
    setSelectedId(null);
  }, [resetKey]);

  const handleSelect = (id: string, prompt: string) => {
    setSelectedId(id);
    onPromptSelect(prompt);
  };

  return (
    <div className="space-y-1.5">
      <span className="text-[11px] text-muted-foreground uppercase">
        Select a scene to generate
      </span>

      <div className="grid gap-1.5 grid-cols-2 sm:grid-cols-3">
        {presetPrompts.map((preset) => {
          const isSelected = selectedId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handleSelect(preset.id, preset.prompt)}
              disabled={disabled}
              className={cn(
                "group rounded border px-2.5 py-2 text-left transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
                isSelected
                  ? "border-green-500/50 bg-green-500/10"
                  : "border-border bg-muted/50 hover:bg-muted hover:border-foreground/20",
              )}
            >
              <h3
                className={cn(
                  "text-[11px] font-medium uppercase mb-0.5 transition-colors duration-200",
                  isSelected ? "text-green-500" : "text-foreground",
                )}
              >
                {isSelected && "\u2713 "}
                {preset.title}
              </h3>
              <p
                className={cn(
                  "text-[11px] line-clamp-1 transition-colors duration-200",
                  isSelected
                    ? "text-green-500/60"
                    : "text-muted-foreground",
                )}
              >
                {preset.prompt}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
