"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useReactor, useReactorMessage } from "@reactor-team/js-sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PromptSuggestions } from "./PromptSuggestions";
import { cn } from "@/lib/utils";
import type { StoryPrompt } from "@/lib/prompts";

type InputMode = "t2v" | "i2v" | "ref_video";
type RefVideoStatus = "idle" | "uploading" | "ready" | "error";

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

const MAX_W = 640;
const MAX_H = 360;
const JPEG_QUALITY = 0.7;
const REF_VIDEO_FPS = 24;

const MODE_LABELS: Record<InputMode, string> = {
  t2v: "T2V",
  i2v: "I2V",
  ref_video: "Reference Video",
};

/** Resize and compress an image file to JPEG via canvas (cover-fit). */
function processImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = MAX_W;
      canvas.height = MAX_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      const scale = Math.max(MAX_W / img.width, MAX_H / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (MAX_W - w) / 2;
      const y = (MAX_H - h) / 2;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, x, y, w, h);

      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

export function HeliosController({
  className,
  anthropicApiKey,
}: HeliosControllerProps) {
  const [mode, setMode] = useState<InputMode>("t2v");
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

  // I2V state
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const imageFileRef = useRef<HTMLInputElement | null>(null);

  // Reference video state
  const [refStatus, setRefStatus] = useState<RefVideoStatus>("idle");
  const [refFileName, setRefFileName] = useState<string | null>(null);
  const [refErrorMsg, setRefErrorMsg] = useState<string | null>(null);
  const [refPreviewUrl, setRefPreviewUrl] = useState<string | null>(null);
  const [refProgress, setRefProgress] = useState<{
    sent: number;
    total: number;
  } | null>(null);
  const refFileRef = useRef<HTMLInputElement | null>(null);

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
    setImageDataUrl(null);
    setRefStatus("idle");
    setRefFileName(null);
    setRefErrorMsg(null);
    setRefProgress(null);
    if (refPreviewUrl) URL.revokeObjectURL(refPreviewUrl);
    setRefPreviewUrl(null);
    // Clear file inputs so re-selecting the same file triggers onChange
    if (refFileRef.current) refFileRef.current.value = "";
    if (imageFileRef.current) imageFileRef.current.value = "";
  };

  // Reset when disconnected
  useEffect(() => {
    if (status === "disconnected") {
      resetUIState();
    }
  }, [status]);

  // Submit a follow-up prompt (schedule_prompt) — only used after generation is running.
  const handleSubmitPrompt = async (promptText: string) => {
    if (!promptText.trim()) return;

    const chunk = currentChunkRef.current + 2;
    await sendCommand("schedule_prompt", {
      prompt: promptText.trim(),
      chunk,
    });

    setPreviousPrompt(promptText.trim());
  };

  // Start generation: auto-send all conditions once, then start.
  const handleStart = useCallback(async () => {
    if (status !== "ready" || currentFrameRef.current > 0) return;

    // Send conditioning based on mode
    if (mode === "i2v" && imageDataUrl) {
      await sendCommand("set_image", { image_b64: imageDataUrl });
    }
    if (mode === "ref_video" && refPreviewUrl) {
      await handleRefVideoSend();
    }

    // Send prompt
    const finalPrompt = prompt.trim();
    if (finalPrompt) {
      const enhanced = await upsamplePrompt(finalPrompt);
      await sendCommand("set_prompt", { prompt: enhanced });
      setPreviousPrompt(enhanced);
    }

    // Start generation
    await sendCommand("start", {});
  }, [status, mode, imageDataUrl, refPreviewUrl, prompt, sendCommand]);

  // Upsample a prompt using the Anthropic API
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

  // Story preset selection — just sets the prompt text, Start sends it.
  // After generation is running, selecting a follow-up step sends immediately.
  const handlePromptSelect = async (
    storyId: string,
    storyPrompt: StoryPrompt,
    step: number,
  ) => {
    setSelectedStoryId(storyId);
    setCurrentStep(step);
    if (currentFrameRef.current > 0) {
      // Follow-up: schedule immediately
      await handleSubmitPrompt(storyPrompt.prompt);
    } else {
      // Initial: just set the prompt, user clicks Start
      setPrompt(storyPrompt.prompt);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || currentFrameRef.current === 0) return;

    const finalPrompt = await upsamplePrompt(prompt.trim());
    await handleSubmitPrompt(finalPrompt);
    setPrompt("");
  };

  // --- I2V handlers ---
  const handleImageFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await processImage(file);
        setImageDataUrl(dataUrl);
      } catch (err) {
        console.error("[HeliosController] Failed to process image:", err);
      }
    },
    [],
  );

  // --- Reference video handlers ---
  const handleRefVideoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setRefFileName(file.name);
      setRefErrorMsg(null);
      setRefStatus("idle");
      setRefProgress(null);

      if (refPreviewUrl) URL.revokeObjectURL(refPreviewUrl);

      const url = URL.createObjectURL(file);
      setRefPreviewUrl(url);
    },
    [refPreviewUrl],
  );

  const handleRefVideoSend = useCallback(async () => {
    if (!refPreviewUrl || status !== "ready") return;

    setRefStatus("uploading");
    setRefErrorMsg(null);

    try {
      const video = document.createElement("video");
      video.src = refPreviewUrl;
      video.muted = true;
      video.playsInline = true;

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("Failed to load video"));
      });

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d")!;

      const duration = video.duration;
      const frameInterval = 1 / REF_VIDEO_FPS;
      const totalFrames = Math.floor(duration * REF_VIDEO_FPS);

      setRefProgress({ sent: 0, total: totalFrames });

      await sendCommand("clear_video", {});

      for (let i = 0; i < totalFrames; i++) {
        await new Promise<void>((resolve) => {
          video.onseeked = () => resolve();
          video.currentTime = i * frameInterval;
        });

        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        await sendCommand("push_frame", { frame: dataUrl });
        setRefProgress({ sent: i + 1, total: totalFrames });
      }

      await sendCommand("finish_video", {});
      setRefStatus("ready");
    } catch (err) {
      console.error("[HeliosController] ref video frame extraction failed:", err);
      setRefStatus("error");
      setRefErrorMsg(String(err));
    }
  }, [refPreviewUrl, status, sendCommand]);

  const handleReset = useCallback(async () => {
    await sendCommand("reset", {});
    resetUIState();
  }, [sendCommand]);

  const isReady = status === "ready";
  const hasEnhancement = !!anthropicApiKey;

  const tabCls = (m: InputMode) =>
    cn(
      "px-3 py-1 rounded text-xs font-medium uppercase transition-colors border",
      mode === m
        ? "bg-primary/15 text-primary border-primary/40"
        : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground",
    );

  return (
    <div
      className={cn(
        "w-full bg-card rounded-lg border border-border overflow-hidden",
        className,
      )}
    >
      {/* Header with Chunk Counter and Reset */}
      <div className="flex items-center justify-between p-3 border-b border-border">
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
        <div className="px-3 pt-2.5">
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
        </div>
      )}

      {/* Input Mode Tabs */}
      <div className="px-3 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground uppercase mr-1">
            Mode
          </span>
          {(Object.keys(MODE_LABELS) as InputMode[]).map((m) => (
            <button
              key={m}
              className={tabCls(m)}
              onClick={() => {
                if (m !== mode) {
                  handleReset();
                  setMode(m);
                }
              }}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Mode-specific content */}
      <div className="px-3 py-2.5 space-y-2.5">
        {/* T2V — Story Suggestions + Manual Input */}
        {mode === "t2v" && (
          <>
            <PromptSuggestions
              selectedStoryId={selectedStoryId}
              currentStep={currentStep}
              onPromptSelect={handlePromptSelect}
              disabled={!isReady}
            />

            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={currentFrame > 0 ? "Schedule a follow-up prompt..." : "Or write your own prompt..."}
                disabled={!isReady || isUpsampling}
                className="flex-1 h-8 text-sm"
              />
              {currentFrame > 0 && (
                <Button
                  type="submit"
                  size="sm"
                  variant="default"
                  disabled={!prompt.trim() || !isReady || isUpsampling}
                >
                  {isUpsampling ? "Enhancing..." : "Update"}
                </Button>
              )}
            </form>

            {hasEnhancement && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Custom prompts will be automatically enhanced for best results.
              </p>
            )}
          </>
        )}

        {/* I2V — Image upload + Prompt */}
        {mode === "i2v" && (
          <>
            <div className="flex items-center gap-3">
              <input
                ref={imageFileRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => imageFileRef.current?.click()}
              >
                {imageDataUrl ? "Change Image" : "Choose Image"}
              </Button>

              {imageDataUrl && (
                <img
                  src={imageDataUrl}
                  alt="Preview"
                  className="h-10 rounded border border-border"
                />
              )}
            </div>

            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={currentFrame > 0 ? "Schedule a follow-up prompt..." : "Describe the video to generate..."}
                disabled={!isReady || isUpsampling}
                className="flex-1 h-8 text-sm"
              />
              {currentFrame > 0 && (
                <Button
                  type="submit"
                  size="sm"
                  variant="default"
                  disabled={!prompt.trim() || !isReady || isUpsampling}
                >
                  {isUpsampling ? "Enhancing..." : "Update"}
                </Button>
              )}
            </form>
          </>
        )}

        {/* Reference Video — Video upload + Prompt */}
        {mode === "ref_video" && (
          <>
            <p className="text-[11px] text-muted-foreground">
              Upload a short video as conditioning context for generation.
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              <input
                ref={refFileRef}
                type="file"
                accept="video/*"
                onChange={handleRefVideoChange}
                className="hidden"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => refFileRef.current?.click()}
              >
                {refFileName ? "Change Video" : "Choose Video"}
              </Button>

              {refFileName && (
                <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                  {refFileName}
                </span>
              )}

              {refStatus === "uploading" && refProgress && (
                <span className="text-[11px] text-primary font-medium">
                  Sending frames... {refProgress.sent}/{refProgress.total}
                </span>
              )}
              {refStatus === "ready" && (
                <span className="text-[11px] text-green-500 font-medium">
                  &#10003; Ready — {refProgress?.total ?? 0} frames sent
                </span>
              )}
              {refStatus === "error" && (
                <span className="text-[11px] text-destructive truncate max-w-[300px]">
                  {refErrorMsg}
                </span>
              )}
            </div>

            {refPreviewUrl && (
              <video
                src={refPreviewUrl}
                controls
                muted
                className="h-20 rounded border border-border"
              />
            )}

            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={currentFrame > 0 ? "Schedule a follow-up prompt..." : "Describe the video to generate..."}
                disabled={!isReady || isUpsampling}
                className="flex-1 h-8 text-sm"
              />
              {currentFrame > 0 && (
                <Button
                  type="submit"
                  size="sm"
                  variant="default"
                  disabled={!prompt.trim() || !isReady || isUpsampling}
                >
                  {isUpsampling ? "Enhancing..." : "Update"}
                </Button>
              )}
            </form>
          </>
        )}
      </div>

      {/* Controls section */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-border bg-muted/30">
        <span className="text-[11px] text-muted-foreground uppercase mr-1">
          Controls
        </span>
        <Button
          size="xs"
          variant="default"
          disabled={!isReady || refStatus === "uploading" || currentFrame > 0}
          onClick={handleStart}
        >
          Start
        </Button>
        <Button
          size="xs"
          variant="outline"
          disabled={!isReady}
          onClick={() => sendCommand("pause", {})}
        >
          Pause
        </Button>
        <Button
          size="xs"
          variant="outline"
          disabled={!isReady}
          onClick={() => sendCommand("resume", {})}
        >
          Resume
        </Button>
      </div>
    </div>
  );
}
