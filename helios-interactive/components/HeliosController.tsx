"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  useHelios,
  useHeliosState,
  useHeliosConditionsReady,
} from "@reactor-models/helios";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PromptSuggestions } from "./PromptSuggestions";
import { cn } from "@/lib/utils";
import type { StoryPrompt } from "@/lib/prompts";

type Mode = "story" | "image";

interface HeliosControllerProps {
  className?: string;
  hasEnhancement?: boolean;
}

// Small base64 thumbnail for the /api/upsample LLM call.
// SDK uploads send the full-quality file separately; this is for prompt context only.
async function downsampleImage(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  try {
    let quality = 0.7,
      maxW = 512,
      maxH = 512,
      result = "";
    for (let i = 0; i < 5; i++) {
      let w = bmp.width,
        h = bmp.height;
      if (w > maxW || h > maxH) {
        const s = Math.min(maxW / w, maxH / h);
        w = Math.round(w * s);
        h = Math.round(h * s);
      }
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(bmp, 0, 0, w, h);
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
    return result;
  } finally {
    bmp.close();
  }
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
              !expanded && "line-clamp-2"
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
  const [mode, setMode] = useState<Mode>("story");
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

  const helios = useHelios();
  const {
    status,
    setPrompt: setHeliosPrompt,
    start,
    schedulePrompt,
    setImage,
    reset,
    uploadFile,
  } = helios;

  useHeliosState((message) => {
    // After reset, ignore stale state messages until frame is back to 0
    if (isResettingRef.current) {
      if (message.current_frame === 0) {
        isResettingRef.current = false;
      } else {
        return;
      }
    }

    setCurrentFrame(message.current_frame);
    setCurrentChunk(message.current_chunk);
    currentChunkRef.current = message.current_chunk;
    currentFrameRef.current = message.current_frame;
    // current_prompt is typed as `unknown` in the SDK; coerce to string | null.
    setCurrentPrompt(
      typeof message.current_prompt === "string" ? message.current_prompt : null
    );
  });

  useHeliosConditionsReady((message) => {
    if (message.has_image) {
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
    []
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

  // Flip the input mode. Only callable when the model isn't generating (the
  // toggle UI enforces that with a tooltip). Clears the outgoing mode's
  // selection so context doesn't silently leak across — e.g. a stale
  // `referenceImage` thumbnail shouldn't keep influencing prompt enhancement
  // after the user switched to story mode.
  const handleModeSwitch = (next: Mode) => {
    if (next === mode) return;
    if (next === "story") {
      setReferenceImage(null);
      setRefPreview(null);
      setSelectedExample(null);
      pendingFileRef.current = null;
    } else {
      setSelectedStoryId(null);
      setCurrentStep(0);
    }
    setMode(next);
  };

  useEffect(() => {
    if (status === "disconnected") {
      resetUIState();
    }
  }, [status]);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 300) + "px";
    }
  }, [prompt]);

  useEffect(() => {
    if (status !== "ready" || !pendingFileRef.current) return;
    const file = pendingFileRef.current;
    pendingFileRef.current = null;
    (async () => {
      try {
        const ref = await uploadFile(file);
        await setImage({ image: ref });
      } catch {
        console.error("Failed to flush pending image upload");
      }
    })();
  }, [status, uploadFile, setImage]);

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
            const file = new File([blob], "example.jpg", {
              type: "image/jpeg",
            });
            setReferenceImage(await downsampleImage(file));
            if (status === "ready") {
              const ref = await uploadFile(file);
              await setImage({ image: ref });
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
    setReferenceImage(await downsampleImage(file));
    if (status === "ready") {
      const ref = await uploadFile(file);
      await setImage({ image: ref });
    } else {
      pendingFileRef.current = file;
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Local UI reset only. Helios has no dedicated "clear image" event —
  // `set_image` with an empty payload returns `CommandError("No image
  // provided")` rather than wiping the reference — so the only way to
  // actually drop the server-side reference is a full `reset()`, which
  // the dedicated Reset button already covers. Clearing the preview
  // thumbnail + pending-upload state is the right behaviour here.
  const clearRefImage = () => {
    setReferenceImage(null);
    setRefPreview(null);
    pendingFileRef.current = null;
  };

  // Submit a prompt — first prompt uses set_prompt + start,
  // follow-up prompts use schedule_prompt at currentChunk + 2
  const handleSubmitPrompt = async (promptText: string) => {
    if (!promptText.trim()) return;

    if (currentFrameRef.current === 0) {
      await setHeliosPrompt({ prompt: promptText.trim() });
      await start();
    } else {
      const chunk = currentChunkRef.current + 2;
      await schedulePrompt({
        prompt: promptText.trim(),
        chunk,
      });
    }

    setPreviousPrompt(promptText.trim());
  };

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
    step: number
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
    const finalPrompt = shouldSkip
      ? prompt.trim()
      : await upsamplePrompt(prompt.trim());
    await handleSubmitPrompt(finalPrompt);
    setPrompt("");
  };

  const handleReset = useCallback(async () => {
    isResettingRef.current = true;
    await reset();
    resetUIState();
  }, [reset]);

  const isReady = status === "ready";
  // Generation is in-flight once either the first frame landed or an
  // example image is mid-upload. Mode switching is locked in that window so
  // the user can't mix a story branch into an image-anchored scene
  // mid-render (or vice-versa) — which was the original UX trap.
  const isGenerating = currentFrame > 0 || isStarting;
  const modeLocked = isGenerating;

  const modeToggle = (
    <div
      className={cn(
        "inline-flex rounded-md border border-border bg-muted/40 p-0.5",
        modeLocked && "opacity-60"
      )}
      role="tablist"
      aria-label="Input mode"
    >
      {[
        { id: "story" as const, label: "Story" },
        { id: "image" as const, label: "Image" },
      ].map(({ id, label }) => {
        const isActive = mode === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => !modeLocked && handleModeSwitch(id)}
            disabled={modeLocked}
            className={cn(
              "px-2.5 py-1 text-[11px] rounded transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
              modeLocked && "cursor-not-allowed"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className={cn("w-full space-y-3", className)}>
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

      {currentPrompt && <ExpandablePrompt prompt={currentPrompt} />}

      {/*
        Mode toggle. The Radix tooltip doesn't reliably fire on a disabled
        <button>, so when locked we wrap the whole pill group in a
        TooltipTrigger — a plain <span> captures hover events that the
        inner disabled buttons would otherwise swallow.
      */}
      {modeLocked ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="inline-block">
              {modeToggle}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Reset the generation first to switch modes.
          </TooltipContent>
        </Tooltip>
      ) : (
        modeToggle
      )}

      {mode === "story" && (
        <PromptSuggestions
          selectedStoryId={selectedStoryId}
          currentStep={currentStep}
          onPromptSelect={handlePromptSelect}
          disabled={!isReady || isStarting}
        />
      )}

      {mode === "image" && (
        <>
          <div className="space-y-1.5">
            <span className="text-[11px] text-muted-foreground uppercase">
              {selectedExample ? "Starting image" : "Start from an image"}
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
                        "opacity-40 cursor-not-allowed"
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
                            : "bg-black/40 group-hover:bg-black/20"
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
        </>
      )}

      <form onSubmit={handleManualSubmit} className="space-y-2">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleManualSubmit(e);
            }
          }}
          placeholder={
            isGenerating
              ? "Add to the scene..."
              : mode === "story"
                ? "Or write your own story..."
                : "Describe the scene to generate..."
          }
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

      {!hasEnhancement && (
        <p className="text-[10px] text-muted-foreground">
          Add ANTHROPIC_API_KEY or OPENAI_API_KEY to .env.local for automatic
          prompt enhancement.
        </p>
      )}
    </div>
  );
}
