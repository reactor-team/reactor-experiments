"use client";

import { useState, useEffect } from "react";
import { ReactorProvider, ReactorView } from "@reactor-team/js-sdk";
import { HeaderControls } from "@/components/HeaderControls";
import { ConnectionPanel } from "@/components/ConnectionPanel";
import { HeliosController } from "@/components/HeliosController";
import { Button } from "@/components/ui/button";
import { useReactor } from "@reactor-team/js-sdk";

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

export default function Home() {
  const [jwtToken, setJwtToken] = useState<string | undefined>(undefined);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [localUrl, setLocalUrl] = useState("http://localhost:8080");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");

  // Ensure dark mode is applied to html element
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <ReactorProvider
        key={isLocalMode ? "local" : "remote"}
        modelName="helios"
        apiUrl={isLocalMode ? localUrl : undefined}
        jwtToken={jwtToken}
        local={isLocalMode}
        connectOptions={{ autoConnect: false }}
      >
        {/* Header */}
        <HeaderControls />

        {/* Main content - fills remaining viewport */}
        <main className="flex-1 min-h-0 p-3 md:p-4">
          <div className="h-full max-w-5xl mx-auto flex flex-col gap-3">
            {/* Connection panel - above the video */}
            <ConnectionPanel
              onJwtTokenChange={setJwtToken}
              onLocalModeChange={setIsLocalMode}
              onLocalUrlChange={setLocalUrl}
              className="shrink-0"
            />

            {/* Video view - flexes to fill available space */}
            <div className="relative bg-black rounded-lg overflow-hidden border border-border flex-1 min-h-0">
              {/* Video view */}
              <div className="absolute inset-0">
                <ReactorView className="w-full h-full object-contain" videoObjectFit="cover" />
              </div>

              {/* Top-left: Reset button */}
              <div className="absolute top-3 left-3 pointer-events-auto">
                <ResetButton />
              </div>
            </div>

            {/* Prompt enhancement (optional) */}
            <div className="flex items-center gap-2 shrink-0">
              <label className="text-xs font-medium text-foreground whitespace-nowrap uppercase">
                Anthropic Key
              </label>
              <input
                type="password"
                value={anthropicApiKey}
                onChange={(e) => setAnthropicApiKey(e.target.value)}
                placeholder="Optional: enables prompt enhancement for better results"
                className="flex-1 h-8 rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Controls panel - stays at bottom */}
            <HeliosController
              className="shrink-0"
              anthropicApiKey={anthropicApiKey || undefined}
            />
          </div>
        </main>
      </ReactorProvider>
    </div>
  );
}
