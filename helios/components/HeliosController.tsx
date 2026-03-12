"use client";

import { useState, useEffect, useCallback } from "react";
import { useReactor, useReactorMessage } from "@reactor-team/js-sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HeliosPromptSuggestions } from "./PromptSuggestions";
import { cn } from "@/lib/utils";

interface HeliosControllerProps {
  className?: string;
}

// Types for the Helios model message protocol
interface ModelState {
  current_frame: number;
  current_chunk: number;
  current_prompt: string | null;
  paused: boolean;
  scheduled_prompts: Record<number, string>;
}

interface StateMessage {
  type: "state";
  data: ModelState;
}

interface EventMessage {
  type: "event";
  data: {
    event: string;
    frame?: number;
    message?: string;
    new_prompt?: string;
    previous_prompt?: string;
  };
}

type HeliosMessage = StateMessage | EventMessage;

export function HeliosController({ className }: HeliosControllerProps) {
  const [prompt, setPrompt] = useState("");
  const [currentFrame, setCurrentFrame] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const { sendCommand, status } = useReactor((state) => ({
    sendCommand: state.sendCommand,
    status: state.status,
  }));

  // Listen for messages from the Helios model
  useReactorMessage((message: HeliosMessage) => {
    if (message?.type === "state") {
      const state = message.data;
      setCurrentFrame(state.current_frame);
      setCurrentChunk(state.current_chunk);
      setCurrentPrompt(state.current_prompt);
    } else if (message?.type === "event") {
      const event = message.data;
      console.log("Helios event:", event.event, event);

      if (event.event === "error") {
        console.error("Helios error:", event.message);
      }
    }
  });

  const resetUIState = () => {
    setPrompt("");
    setCurrentFrame(0);
    setCurrentChunk(0);
    setCurrentPrompt(null);
  };

  // Reset when disconnected
  useEffect(() => {
    if (status === "disconnected") {
      resetUIState();
    }
  }, [status]);

  const handleSubmitPrompt = async (promptText: string) => {
    if (!promptText.trim()) return;

    // If already generating, reset first and wait for the model to be ready
    if (currentFrame > 0) {
      await sendCommand("reset", {});
      resetUIState();
      await new Promise((r) => setTimeout(r, 2400));
    }

    await sendCommand("set_prompt", { prompt: promptText.trim() });
    await sendCommand("start", {});
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    await handleSubmitPrompt(prompt.trim());
    setPrompt("");
  };

  const handleReset = useCallback(async () => {
    await sendCommand("reset", {});
    resetUIState();
    setResetKey((k) => k + 1);
  }, [sendCommand]);

  const isReady = status === "ready";

  return (
    <div
      className={cn(
        "w-full p-3 bg-card rounded-lg border border-border space-y-2.5",
        className,
      )}
    >
      {/* Header with Chunk Counter and Reset */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-medium text-foreground uppercase">
            Prompts
          </span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted">
            <span className="text-xs text-muted-foreground">Chunk:</span>
            <span className="text-xs font-mono tabular-nums text-green-500">
              {currentChunk}
            </span>
          </div>
        </div>
        <Button
          size="xs"
          variant="destructive"
          onClick={handleReset}
          disabled={!isReady}
        >
          Reset
        </Button>
      </div>

      {/* Current Prompt Display */}
      {currentPrompt && (
        <div className="bg-muted rounded px-2 py-1.5 border border-border">
          <div className="flex gap-2">
            <span className="text-[11px] text-muted-foreground flex-shrink-0">
              Current:
            </span>
            <span className="text-[11px] text-foreground/70 line-clamp-1">
              {currentPrompt}
            </span>
          </div>
        </div>
      )}

      {/* Prompt Suggestions */}
      <HeliosPromptSuggestions
        onPromptSelect={handleSubmitPrompt}
        disabled={!isReady}
        resetKey={resetKey}
      />

      {/* Manual Input */}
      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <Input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Or write your own prompt..."
          disabled={!isReady}
          className="flex-1 h-8 text-sm"
        />
        <Button
          type="submit"
          size="sm"
          variant="default"
          disabled={!prompt.trim() || !isReady}
        >
          Send
        </Button>
      </form>
    </div>
  );
}
