"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useReactor, useReactorMessage, FileRef } from "@reactor-team/js-sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PromptSuggestions } from "./PromptSuggestions";
import { cn } from "@/lib/utils";
import type { StoryPrompt } from "@/lib/prompts";

interface HeliosControllerProps {
  className?: string;
  hasEnhancement?: boolean;
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

interface ConditionsReadyMessage {
  type: "conditions_ready";
  data: { has_image?: boolean };
}

type HeliosMessage = StateMessage | EventMessage | ConditionsReadyMessage;

// Small base64 thumbnail for the /api/upsample LLM call.
// SDK uploads send the full-quality file separately; this is for prompt context only.
function downsampleImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let quality = 0.7,
        maxW = 512,
        maxH = 512,
        result = "";
      for (let i = 0; i < 5; i++) {
        let w = img.width,
          h = img.height;
        if (w > maxW || h > maxH) {
          const s = Math.min(maxW / w, maxH / h);
          w = Math.round(w * s);
          h = Math.round(h * s);
        }
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        result = c.toDataURL("image/jpeg", quality);
        if (
          Math.ceil((result.length - result.indexOf(",") - 1) * 0.75) <
          64 * 1024
        )
          break;
        maxW = Math.round(maxW * 0.75);
        maxH = Math.round(maxH * 0.75);
        quality = Math.max(0.3, quality - 0.1);
      }
      resolve(result);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function ExpandablePrompt({ prompt }: { prompt: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setExpanded((e) => !e)}
      className="w-full text-left bg-muted/50 rounded px-2.5 py-2 border border-border hover:border-border/80 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide block mb-0.5">
            Now playing
          </span>
          <p
            className={cn(
              "text-[11px] text-foreground/80 break-words",
              !expanded && "line-clamp-2",
            )}
          >
            {prompt}
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0 mt-3">
          {expanded ? "\u25B2" : "\u25BC"}
        </span>
      </div>
    </button>
  );
}

export function HeliosController({
  className,
  hasEnhancement,
}: HeliosControllerProps) {
  const [prompt, setPrompt] = useState("");
  const [currentFrame, setCurrentFrame] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isUpsampling, setIsUpsampling] = useState(false);
  const [previousPrompt, setPreviousPrompt] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [refPreview, setRefPreview] = useState<string | null>(null);
  const [selectedExample, setSelectedExample] = useState<string | null>(null);
  const skipUpsampleRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** File chosen before connect — uploaded once the session is ready */
  const pendingFileRef = useRef<File | null>(null);
  const imageReadyResolversRef = useRef<Array<() => void>>([]);
  const currentChunkRef = useRef(0);
  const currentFrameRef = useRef(0);
  const isResettingRef = useRef(false);

  const { sendCommand, status, uploadFile } = useReactor((state) => ({
    sendCommand: state.sendCommand,
    status: state.status,
    uploadFile: state.uploadFile,
  }));

  // Listen for messages from the Helios model
  useReactorMessage((message: HeliosMessage) => {
    if (message?.type === "state") {
      const state = message.data;

      // After reset, ignore stale state messages until frame is back to 0
      if (isResettingRef.current) {
        if (state.current_frame === 0) {
          isResettingRef.current = false;
        } else {
          return;
        }
      }

      setCurrentFrame(state.current_frame);
      setCurrentChunk(state.current_chunk);
      currentChunkRef.current = state.current_chunk;
      currentFrameRef.current = state.current_frame;
      setCurrentPrompt(state.current_prompt);
    }
    if (message?.type === "conditions_ready" && message.data?.has_image) {
      const resolvers = imageReadyResolversRef.current;
      imageReadyResolversRef.current = [];
      resolvers.forEach((r) => r());
    }
  });

  const waitForImageReady = useCallback(
    (timeoutMs = 5000) =>
      new Promise<void>((resolve) => {
        imageReadyResolversRef.current.push(resolve);
        setTimeout(resolve, timeoutMs);
      }),
    [],
  );

  const resetUIState = () => {
    imageReadyResolversRef.current.forEach((r) => r());
    imageReadyResolversRef.current = [];
    setPrompt("");
    setCurrentFrame(0);
    setCurrentChunk(0);
    currentChunkRef.current = 0;
    currentFrameRef.current = 0;
    setCurrentPrompt(null);
    setSelectedStoryId(null);
    setCurrentStep(0);
    setPreviousPrompt(null);
    setReferenceImage(null);
    setRefPreview(null);
    setSelectedExample(null);
    setIsStarting(false);
    pendingFileRef.current = null;
  };

  // Reset when disconnected
  useEffect(() => {
    if (status === "disconnected") {
      resetUIState();
    }
  }, [status]);

  // Auto-resize textarea when prompt changes programmatically
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 300) + "px";
    }
  }, [prompt]);

  // Flush a pending image upload once the session becomes ready
  useEffect(() => {
    if (status !== "ready" || !pendingFileRef.current) return;
    const file = pendingFileRef.current;
    pendingFileRef.current = null;
    (async () => {
      try {
        const ref = await uploadFile(file);
        await sendCommand("set_image", { image: ref });
      } catch {
        console.error("Failed to flush pending image upload");
      }
    })();
  }, [status, uploadFile, sendCommand]);

  const handleExampleImage = async (imageSrc: string, imagePrompt: string) => {
    setIsStarting(true);
    setSelectedExample(imageSrc);
    setRefPreview(imageSrc);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = async () => {
          try {
            const c = document.createElement("canvas");
            c.width = img.width;
            c.height = img.height;
            const ctx = c.getContext("2d")!;
            ctx.drawImage(img, 0, 0);
            const dataUrl = c.toDataURL("image/jpeg", 0.95);
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const file = new File([blob], "example.jpg", { type: "image/jpeg" });
            // Small thumbnail for LLM upsample context
            setReferenceImage(await downsampleImage(file));
            if (status === "ready") {
              const ref = await uploadFile(file);
              await sendCommand("set_image", { image: ref });
              await waitForImageReady();
            } else {
              pendingFileRef.current = file;
            }
            await handleSubmitPrompt(imagePrompt);
            resolve();
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = reject;
        img.src = imageSrc;
      });
    } catch (err) {
      console.error("Failed to start from example image:", err);
    } finally {
      setIsStarting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRefPreview(URL.createObjectURL(file));
    // Small base64 thumbnail kept for the /api/upsample LLM call
    setReferenceImage(await downsampleImage(file));
    if (status === "ready") {
      const ref = await uploadFile(file);
      await sendCommand("set_image", { image: ref });
    } else {
      pendingFileRef.current = file;
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearRefImage = async () => {
    setReferenceImage(null);
    setRefPreview(null);
    pendingFileRef.current = null;
    try {
      await sendCommand("clear_image", {});
    } catch {}
  };

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

  // Upsample a prompt using the server-side Anthropic API
  const upsamplePrompt = async (text: string): Promise<string> => {
    if (!hasEnhancement) return text;

    try {
      setIsUpsampling(true);
      const body: {
        prompt: string;
        previousPrompt?: string;
        imageBase64?: string;
      } = {
        prompt: text,
      };
      if (previousPrompt) {
        body.previousPrompt = previousPrompt;
      }
      if (referenceImage) {
        body.imageBase64 = referenceImage;
      }
      const res = await fetch("/api/upsample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Upsample API error:", res.status, err);
        return text;
      }
      const data = await res.json();
      if (data.upsampledPrompt) return data.upsampledPrompt;
    } catch (err) {
      console.error("Upsample failed, using original prompt:", err);
    } finally {
      setIsUpsampling(false);
    }
    return text;
  };

  const handlePromptSelect = async (
    storyId: string,
    storyPrompt: StoryPrompt,
    step: number,
  ) => {
    setIsStarting(true);
    setSelectedStoryId(storyId);
    setCurrentStep(step);
    try {
      await handleSubmitPrompt(storyPrompt.prompt);
    } finally {
      setIsStarting(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const shouldSkip = skipUpsampleRef.current;
    skipUpsampleRef.current = false;
    const finalPrompt = shouldSkip ? prompt.trim() : await upsamplePrompt(prompt.trim());
    await handleSubmitPrompt(finalPrompt);
    setPrompt("");
  };

  const handleReset = useCallback(async () => {
    isResettingRef.current = true;
    await sendCommand("reset", {});
    resetUIState();
  }, [sendCommand]);

  const isReady = status === "ready";

  return (
    <div
      className={cn(
        "w-full space-y-3",
        className,
      )}
    >
      {/* Reset + chunk counter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted">
          <span className="text-[10px] text-muted-foreground">Chunk</span>
          <span className="text-[10px] font-mono tabular-nums text-green-500">
            {currentChunk}
          </span>
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
        <ExpandablePrompt prompt={currentPrompt} />
      )}

      {/* Story Suggestions */}
      <PromptSuggestions
        selectedStoryId={selectedStoryId}
        currentStep={currentStep}
        onPromptSelect={handlePromptSelect}
        disabled={!isReady || isStarting}
      />

      {/* Example Images — always visible, highlight selected */}
      <div className="space-y-1.5">
        <span className="text-[11px] text-muted-foreground uppercase">
          {selectedExample ? "Starting image" : "Or start from an image"}
        </span>
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              src: "/images/example_1.png",
              title: "Village Puppy",
              prompt:
                "A fluffy golden retriever puppy wearing a small red bandana sits on a stone doorstep of a charming European village, number 12 on the blue wooden door behind it. The puppy has big round dark eyes and tilts its head slightly with curiosity. Warm afternoon sunlight fills the cobblestone street lined with colorful flower pots of red geraniums, purple hydrangeas, and pink blooms. Stone and pastel-painted buildings stretch into the background. Pixar-style 3D render with vibrant saturated colors. Medium close-up shot focusing on the puppy.",
            },
            {
              src: "/images/example_2.png",
              title: "Mars Explorer",
              prompt:
                "An astronaut in a weathered orange spacesuit crouches on the rust-red surface of Mars, reaching forward to brush dust off a strange dark rock formation with one gloved hand. The golden visor catches the pale Martian sun as the astronaut shifts weight and leans closer to inspect the find. A massive dust storm rolls in from the distance beyond deep canyon cliffs, sending plumes of brown haze across the amber sky. Wind tugs at loose straps on the suit. Photorealistic, desaturated warm tones, cinematic wide shot capturing the explorer mid-discovery on the vast desolate landscape.",
            },
          ].map((example) => {
            const isSelected = selectedExample === example.src;
            const isOther = selectedExample && !isSelected;

            return (
              <button
                key={example.src}
                onClick={() =>
                  !isSelected &&
                  handleExampleImage(example.src, example.prompt)
                }
                disabled={!isReady || isSelected || isStarting}
                className={cn(
                  "group rounded-lg overflow-hidden border transition-all duration-300",
                  isSelected
                    ? "border-green-500/40 ring-1 ring-green-500/20"
                    : isOther
                      ? "border-border/50 opacity-40"
                      : "border-border hover:border-foreground/20",
                  (!isReady || isStarting) &&
                    !isSelected &&
                    "opacity-40 cursor-not-allowed",
                )}
              >
                <div className="aspect-video relative">
                  <img
                    src={example.src}
                    alt={example.title}
                    className="w-full h-full object-cover"
                  />
                  <div
                    className={cn(
                      "absolute inset-0 transition-colors duration-300",
                      isSelected
                        ? "bg-black/20"
                        : "bg-black/40 group-hover:bg-black/20",
                    )}
                  />
                  <span className="absolute bottom-1.5 left-2 text-[11px] font-medium text-white">
                    {isSelected && "\u2713 "}
                    {example.title}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reference Image */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          disabled={!isReady}
          className="hidden"
        />
        {refPreview ? (
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-border shrink-0">
              <img
                src={refPreview}
                alt="Ref"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!isReady}
                className="text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors text-left"
              >
                Change image
              </button>
              <button
                type="button"
                onClick={clearRefImage}
                className="text-[11px] text-muted-foreground hover:text-destructive transition-colors text-left"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!isReady}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-border hover:border-foreground/20 hover:bg-muted/50 disabled:opacity-40 transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="text-[11px] text-muted-foreground">
              Upload reference image
            </span>
          </button>
        )}
      </div>

      {/* Manual Input */}
      <form onSubmit={handleManualSubmit} className="space-y-2">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            // Auto-grow
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleManualSubmit(e);
            }
          }}
          placeholder={currentFrame > 0 ? "Add to the scene..." : "Or write your own story..."}
          disabled={!isReady || isUpsampling}
          rows={2}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ maxHeight: 200, overflow: "auto" }}
        />
        <Button
          type="submit"
          size="sm"
          variant="default"
          disabled={!prompt.trim() || !isReady || isUpsampling}
          className="w-full"
        >
          {isUpsampling ? "Enhancing..." : "Send"}
        </Button>
      </form>

      {/* Enhancement hint */}
      {!hasEnhancement && (
        <p className="text-[10px] text-muted-foreground">
          Add ANTHROPIC_API_KEY or OPENAI_API_KEY to .env.local for automatic prompt enhancement.
        </p>
      )}
    </div>
  );
}
