"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useReactor, useReactorMessage } from "@reactor-team/js-sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PromptSuggestions } from "./PromptSuggestions";
import { cn } from "@/lib/utils";
import type { StoryPrompt } from "@/lib/prompts";

interface HeliosControllerProps {
  className?: string;
  anthropicApiKey?: string;
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

export function HeliosController({
  className,
  anthropicApiKey,
}: HeliosControllerProps) {
  const [prompt, setPrompt] = useState("");
  const [currentFrame, setCurrentFrame] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isUpsampling, setIsUpsampling] = useState(false);
  const [previousPrompt, setPreviousPrompt] = useState<string | null>(null);
  const currentChunkRef = useRef(0);
  const currentFrameRef = useRef(0);

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
      currentChunkRef.current = state.current_chunk;
      currentFrameRef.current = state.current_frame;
      setCurrentPrompt(state.current_prompt);
    }
  });

  const resetUIState = () => {
    setPrompt("");
    setCurrentFrame(0);
    setCurrentChunk(0);
    setCurrentPrompt(null);
    setSelectedStoryId(null);
    setCurrentStep(0);
    setPreviousPrompt(null);
  };

  // Reset when disconnected
  useEffect(() => {
    if (status === "disconnected") {
      resetUIState();
    }
  }, [status]);

  // Submit a prompt — first prompt uses set_prompt + start,
  // follow-up prompts use schedule_prompt at currentChunk + 2
  const handleSubmitPrompt = async (promptText: string) => {
    if (!promptText.trim()) return;

    if (currentFrameRef.current === 0) {
      // First prompt: set_prompt then start
      await sendCommand("set_prompt", { prompt: promptText.trim() });
      await sendCommand("start", {});
    } else {
      // Follow-up prompt: schedule at current chunk + 2
      const chunk = currentChunkRef.current + 2;
      await sendCommand("schedule_prompt", {
        prompt: promptText.trim(),
        chunk,
      });
    }

    setPreviousPrompt(promptText.trim());
  };

  // Upsample a prompt using the Anthropic API (only if key is provided)
  const upsamplePrompt = async (text: string): Promise<string> => {
    if (!anthropicApiKey) return text;

    try {
      setIsUpsampling(true);
      const body: {
        prompt: string;
        previousPrompt?: string;
        anthropicApiKey: string;
      } = {
        prompt: text,
        anthropicApiKey,
      };
      if (previousPrompt) {
        body.previousPrompt = previousPrompt;
      }
      const res = await fetch("/api/upsample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return text;
      const data = await res.json();
      if (data.upsampledPrompt) return data.upsampledPrompt;
    } catch (err) {
      console.error("Upsample failed, using original prompt:", err);
    } finally {
      setIsUpsampling(false);
    }
    return text;
  };

  // Story preset selection — no upsampling needed
  const handlePromptSelect = async (
    storyId: string,
    storyPrompt: StoryPrompt,
    step: number,
  ) => {
    setSelectedStoryId(storyId);
    setCurrentStep(step);
    await handleSubmitPrompt(storyPrompt.prompt);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const finalPrompt = await upsamplePrompt(prompt.trim());
    await handleSubmitPrompt(finalPrompt);
    setPrompt("");
  };

  const handleReset = useCallback(async () => {
    await sendCommand("reset", {});
    resetUIState();
  }, [sendCommand]);

  const isReady = status === "ready";
  const hasEnhancement = !!anthropicApiKey;

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

      {/* Story Suggestions */}
      <PromptSuggestions
        selectedStoryId={selectedStoryId}
        currentStep={currentStep}
        onPromptSelect={handlePromptSelect}
        disabled={!isReady}
      />

      {/* Manual Input */}
      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <Input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Or write your own prompt..."
          disabled={!isReady || isUpsampling}
          className="flex-1 h-8 text-sm"
        />
        <Button
          type="submit"
          size="sm"
          variant="default"
          disabled={!prompt.trim() || !isReady || isUpsampling}
        >
          {isUpsampling ? "Enhancing..." : "Send"}
        </Button>
      </form>

      {/* Enhancement notice */}
      {hasEnhancement && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Custom prompts will be automatically enhanced for best results.
        </p>
      )}
    </div>
  );
}
