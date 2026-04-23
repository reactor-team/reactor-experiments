"use client";

import { useState, useEffect } from "react";
import { HeliosProvider, HeliosVideoView } from "@/lib/helios-react";
import { HeaderControls } from "@/components/HeaderControls";
import { StatusBar } from "@/components/StatusBar";
import { HeliosController } from "@/components/HeliosController";
export default function Home() {
  const [jwtToken, setJwtToken] = useState<string | undefined>(undefined);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [hasEnhancement, setHasEnhancement] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  // Fetch token and config from server
  useEffect(() => {
    fetch("/api/token", { method: "POST" })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(({ jwt }) => setJwtToken(jwt))
      .catch(() => {
        setTokenError(
          "Set REACTOR_API_KEY in .env.local, then restart the dev server",
        );
      });

    fetch("/api/config")
      .then((res) => res.json())
      .then(({ hasEnhancement }) => setHasEnhancement(hasEnhancement))
      .catch(() => {});
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <HeliosProvider jwtToken={jwtToken}>
        {/* Header */}
        <HeaderControls />

        {/* Main content — side-by-side on desktop, stacked on mobile */}
        <main className="flex-1 min-h-0 flex flex-col md:flex-row">
          {/* Left: Control panel */}
          <aside className="md:w-80 lg:w-96 md:h-full overflow-y-auto border-b md:border-b-0 md:border-r border-border shrink-0 flex flex-col">
            {/* Status header */}
            <div className="px-3 md:px-4 py-3 border-b border-border space-y-3">
              <StatusBar tokenError={tokenError} />
              {tokenError ? (
                <a
                  href="https://www.reactor.inc/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary hover:underline"
                >
                  Get your API key
                </a>
              ) : (
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${hasEnhancement ? "bg-green-500" : "bg-muted-foreground"}`}
                  />
                  <span className="text-xs text-muted-foreground">
                    Prompt enhancement {hasEnhancement ? "enabled" : "off"}
                  </span>
                </div>
              )}
            </div>

            {/* Generation controls */}
            <div className="flex-1 overflow-y-auto p-3 md:p-4">
              <HeliosController hasEnhancement={hasEnhancement} />
            </div>
          </aside>

          {/* Right: Video */}
          <div className="flex-1 min-h-0 min-w-0 p-3 md:p-4 flex items-center justify-center">
            <div className="relative bg-black rounded-lg overflow-hidden border border-border w-full h-full max-h-full">
              <HeliosVideoView className="absolute inset-0 w-full h-full" videoObjectFit="cover" />
            </div>
          </div>
        </main>
      </HeliosProvider>
    </div>
  );
}
