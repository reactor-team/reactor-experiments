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
  const [anthropicApiKey, setAnthropicApiKey] = useState("");

  // Ensure dark mode is applied to html element
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <ReactorProvider
        modelName="helios"
        jwtToken={jwtToken}
        local={isLocalMode}
        connectOptions={{ autoConnect: false }}
      >
        {/* Header */}
        <HeaderControls />

        {/* Main content — side-by-side on desktop, stacked on mobile */}
        <main className="flex-1 min-h-0 flex flex-col md:flex-row">
          {/* Left: Control panel */}
          <aside className="md:w-80 lg:w-96 md:h-full overflow-y-auto border-b md:border-b-0 md:border-r border-border p-3 md:p-4 space-y-4 shrink-0">
            {/* Section: Connection */}
            <section className="space-y-2">
              <h2 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Connection
              </h2>
              <ConnectionPanel
                onJwtTokenChange={setJwtToken}
                onLocalModeChange={setIsLocalMode}
              />
            </section>

            <div className="border-t border-border" />

            {/* Section: API Keys */}
            <section className="space-y-2">
              <h2 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Prompt Enhancement
              </h2>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Add an Anthropic API key to automatically enhance your custom prompts with richer scene details.
              </p>
              <input
                type="password"
                value={anthropicApiKey}
                onChange={(e) => setAnthropicApiKey(e.target.value)}
                placeholder="sk-ant-... (optional)"
                className="w-full h-8 rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground"
              />
            </section>

            <div className="border-t border-border" />

            {/* Section: Generation controls */}
            <HeliosController
              anthropicApiKey={anthropicApiKey || undefined}
            />
          </aside>

          {/* Right: Video */}
          <div className="flex-1 min-h-0 min-w-0 p-3 md:p-4 flex items-center justify-center">
            <div className="relative bg-black rounded-lg overflow-hidden border border-border w-full h-full max-h-full">
              <ReactorView className="absolute inset-0 w-full h-full" videoObjectFit="cover" />

              <div className="absolute top-3 left-3 pointer-events-auto">
                <ResetButton />
              </div>
            </div>
          </div>
        </main>
      </ReactorProvider>
    </div>
  );
}
