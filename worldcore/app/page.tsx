"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ReactorProvider, ReactorView } from "@reactor-team/js-sdk";
import { HeaderControls } from "@/components/HeaderControls";
import { ConnectionPanel } from "@/components/ConnectionPanel";
import { OverlayControls } from "@/components/OverlayControls";
import { ImageUploader } from "@/components/ImageUploader";
import { PromptInput } from "@/components/PromptInput";
import { Button } from "@/components/ui/button";
import { useReactor, useReactorMessage } from "@reactor-team/js-sdk";
import { Maximize2, Minimize2, Pause, Play } from "lucide-react";
import { ENDPOINTS, type Endpoint } from "@/lib/endpoints";

// Reset button component (needs to be inside ReactorProvider)
function ResetButton() {
  const { sendCommand, status } = useReactor((state) => ({
    sendCommand: state.sendCommand,
    status: state.status,
  }));

  const handleReset = async () => {
    try {
      await sendCommand("reset", {});
      console.log("Reset command sent");
    } catch (error) {
      console.error("Failed to send reset:", error);
    }
  };

  if (status !== "ready") return null;

  return (
    <Button
      size="xs"
      variant="destructive"
      onClick={handleReset}
      className="backdrop-blur-sm"
    >
      Reset
    </Button>
  );
}

// Pause/Resume toggle button (needs to be inside ReactorProvider)
function PauseButton() {
  const [paused, setPaused] = useState(false);
  const { sendCommand, status } = useReactor((state) => ({
    sendCommand: state.sendCommand,
    status: state.status,
  }));

  // Reset paused state when the model restarts (e.g. after a reset command)
  useReactorMessage((message: { type?: string; data?: { chunk_index?: number } }) => {
    if (message?.type === "state" && message.data?.chunk_index === 0) {
      setPaused(false);
    }
  });

  const handleToggle = async () => {
    const command = paused ? "resume" : "pause";
    try {
      await sendCommand(command, {});
      setPaused(!paused);
      console.log(`${command} command sent`);
    } catch (error) {
      console.error(`Failed to send ${command}:`, error);
    }
  };

  if (status !== "ready") return null;

  return (
    <Button
      size="xs"
      variant="secondary"
      onClick={handleToggle}
      className="backdrop-blur-sm bg-black/40 border-white/10 hover:bg-black/60"
    >
      {paused ? (
        <Play className="w-3.5 h-3.5" />
      ) : (
        <Pause className="w-3.5 h-3.5" />
      )}
      {paused ? "Resume" : "Pause"}
    </Button>
  );
}


function FpsDisplay({ framesPerChunk }: { framesPerChunk: number }) {
  const { status } = useReactor((state) => ({ status: state.status }));
  const [fps, setFps] = useState<number | null>(null);
  const lastRef = useRef<{ chunkIndex: number; time: number } | null>(null);

  useReactorMessage((message: { type?: string; data?: { chunk_index?: number } }) => {
    if (message?.type !== "state" || message.data?.chunk_index == null) return;
    const now = performance.now();
    const chunkIndex = message.data.chunk_index;
    const prev = lastRef.current;
    if (prev !== null && chunkIndex > prev.chunkIndex) {
      const dt = (now - prev.time) / 1000;
      if (dt > 0) {
        const chunksPerSec = (chunkIndex - prev.chunkIndex) / dt;
        setFps(chunksPerSec * framesPerChunk);
      }
    }
    lastRef.current = { chunkIndex, time: now };
  });

  // Reset when disconnected
  useEffect(() => {
    if (status !== "ready") {
      setFps(null);
      lastRef.current = null;
    }
  }, [status]);

  if (status !== "ready" || fps === null) return null;

  return (
    <div className="text-xs font-mono text-white/70 bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm">
      {Math.round(fps)} FPS
    </div>
  );
}

export default function Page() {
  const [jwtToken, setJwtToken] = useState<string | undefined>(undefined);
  const [endpoint, setEndpoint] = useState<Endpoint>(ENDPOINTS[0]);
  const [modelName, setModelName] = useState("hy-world");
  const [port, setPort] = useState("8080");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [framesPerChunk, setFramesPerChunk] = useState(32);
  const coordinatorUrl = endpoint.local ? `http://localhost:${port}` : endpoint.url;

  // Ensure dark mode is applied to html element
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  // Handle fullscreen changes (e.g., user pressing Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <ReactorProvider
        modelName={modelName}
        jwtToken={jwtToken}
        local={endpoint.local}
        coordinatorUrl={coordinatorUrl}
        autoConnect={false}
      >
        {/* Header */}
        <HeaderControls />

        {/* Main content - fills remaining viewport */}
        <main className={`flex-1 min-h-0 ${isFullscreen ? "flex flex-col" : "p-3 md:p-4"}`}>
          <div className={`${isFullscreen ? "flex-1 flex flex-col" : "h-full max-w-5xl mx-auto flex flex-col gap-3"}`}>
            {/* Connection panel - above the video */}
            {!isFullscreen && (
              <ConnectionPanel
                onJwtTokenChange={setJwtToken}
                endpoint={endpoint}
                onEndpointChange={setEndpoint}
                modelName={modelName}
                onModelNameChange={setModelName}
                port={port}
                onPortChange={setPort}
                framesPerChunk={framesPerChunk}
                onFramesPerChunkChange={setFramesPerChunk}
                className="shrink-0"
              />
            )}

            {/* Game view with overlay controls - flexes to fill available space */}
            <div className="relative bg-black rounded-lg overflow-hidden border border-border flex-1 min-h-0">
              {/* Video view */}
              <div className="absolute inset-0">
                <ReactorView className="w-full h-full object-contain" />
              </div>

              {/* Overlay controls - float on top */}
              <OverlayControls className="absolute inset-0" />

              {/* Top-left: Reset + Pause buttons + FPS */}
              <div className="absolute top-3 left-3 pointer-events-auto flex items-center gap-2">
                <ResetButton />
                <PauseButton />
                <FpsDisplay framesPerChunk={framesPerChunk} />
              </div>

              {/* Top-right: Fullscreen toggle */}
              <div className="absolute top-3 right-3 pointer-events-auto">
                <Button
                  size="xs"
                  variant="secondary"
                  onClick={toggleFullscreen}
                  className="backdrop-blur-sm bg-black/40 border-white/10 hover:bg-black/60"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            </div>

            {/* Controls panel - stays at bottom */}
            <div className={`shrink-0 ${
              isFullscreen 
                ? "p-3 flex gap-3 bg-card border-t border-border" 
                : "p-3 flex gap-3 bg-card rounded-lg border border-border"
            }`}>
              <PromptInput className="border-0 p-0 bg-transparent flex-1" />
              <ImageUploader className="border-0 p-0 bg-transparent" />
            </div>
          </div>
        </main>
      </ReactorProvider>
    </div>
  );
}
