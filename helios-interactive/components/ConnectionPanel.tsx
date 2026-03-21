"use client";

import { useState, useEffect, useCallback } from "react";
import { useReactor, fetchInsecureToken } from "@reactor-team/js-sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DEFAULT_LOCAL_URL = "http://localhost:8080";

interface ConnectionPanelProps {
  onJwtTokenChange: (token: string | undefined) => void;
  onLocalModeChange: (isLocal: boolean) => void;
  onLocalUrlChange: (url: string) => void;
  className?: string;
}

export function ConnectionPanel({
  onJwtTokenChange,
  onLocalModeChange,
  onLocalUrlChange,
  className,
}: ConnectionPanelProps) {
  const { status, connect, disconnect } = useReactor((state) => ({
    status: state.status,
    connect: state.connect,
    disconnect: state.disconnect,
  }));

  const [isLocalMode, setIsLocalMode] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [localUrl, setLocalUrl] = useState(DEFAULT_LOCAL_URL);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJwtChange = useCallback(onJwtTokenChange, [onJwtTokenChange]);
  const handleLocalChange = useCallback(onLocalModeChange, [onLocalModeChange]);
  const handleLocalUrlChange = useCallback(onLocalUrlChange, [onLocalUrlChange]);

  const isConnecting = status === "connecting" || status === "waiting";
  const isConnected = status === "ready";

  // Toggle between local and API key mode
  const toggleMode = useCallback(() => {
    if (isConnected) return;
    const newLocal = !isLocalMode;
    setIsLocalMode(newLocal);
    setError(null);

    if (newLocal) {
      handleLocalChange(true);
      handleLocalUrlChange(localUrl);
      handleJwtChange(undefined);
    } else {
      handleLocalChange(false);
      // Re-trigger API key flow
      setApiKey((prev) => prev);
    }
  }, [isLocalMode, isConnected, localUrl, handleLocalChange, handleLocalUrlChange, handleJwtChange]);

  // API key → JWT token fetch
  useEffect(() => {
    if (isLocalMode) return;

    if (!apiKey) {
      handleJwtChange(undefined);
      setError(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsFetching(true);
      setError(null);
      try {
        const token = await fetchInsecureToken(apiKey);
        handleJwtChange(token);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch token");
        handleJwtChange(undefined);
      } finally {
        setIsFetching(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [apiKey, isLocalMode, handleJwtChange]);

  // Local URL changes
  useEffect(() => {
    if (isLocalMode) {
      handleLocalUrlChange(localUrl);
    }
  }, [localUrl, isLocalMode, handleLocalUrlChange]);

  const canConnect = isLocalMode ? !!localUrl : !!apiKey;

  return (
    <div className={cn("flex flex-col gap-2 px-3 py-2 bg-card rounded-lg border border-border", className)}>
      <div className="flex items-stretch sm:items-center gap-2 flex-col sm:flex-row">
        {/* Mode toggle */}
        <div className="flex shrink-0">
          <button
            onClick={() => { if (!isConnected) toggleMode(); }}
            disabled={isConnected}
            className={cn(
              "px-2.5 py-1 text-xs font-medium uppercase rounded-l border transition-colors",
              !isLocalMode
                ? "bg-primary/15 text-primary border-primary/40"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted",
              isConnected && "opacity-50 cursor-not-allowed",
            )}
          >
            API Key
          </button>
          <button
            onClick={() => { if (!isConnected) toggleMode(); }}
            disabled={isConnected}
            className={cn(
              "px-2.5 py-1 text-xs font-medium uppercase rounded-r border border-l-0 transition-colors",
              isLocalMode
                ? "bg-green-500/15 text-green-500 border-green-500/40"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted",
              isConnected && "opacity-50 cursor-not-allowed",
            )}
          >
            Local
          </button>
        </div>

        {/* Input field — API key or Local URL */}
        <div className="relative flex-1">
          {isLocalMode ? (
            <Input
              type="text"
              value={localUrl}
              onChange={(e) => setLocalUrl(e.target.value)}
              placeholder="http://localhost:8080"
              disabled={isConnected}
              className="h-8 text-sm border-green-500/50"
            />
          ) : (
            <>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key (rk_...)"
                disabled={isConnected}
                className={cn(
                  "h-8 text-sm pr-8",
                  error && "border-destructive",
                )}
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {isFetching && (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
                {error && !isFetching && (
                  <span className="w-2 h-2 bg-destructive rounded-full" title={error} />
                )}
              </div>
            </>
          )}
        </div>

        {/* Status + Connect/Disconnect */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-colors",
                status === "disconnected" && "bg-muted-foreground",
                status === "connecting" && "bg-yellow-500 animate-pulse",
                status === "waiting" && "bg-yellow-500 animate-pulse",
                status === "ready" && "bg-green-500",
              )}
            />
            <span className="text-xs text-muted-foreground capitalize hidden sm:inline">
              {status === "ready" ? "Connected" : status}
            </span>
          </div>

          {status === "disconnected" ? (
            <Button
              size="sm"
              variant="default"
              onClick={() => connect()}
              disabled={!canConnect}
              className="min-w-[90px]"
            >
              Connect
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => disconnect()}
              className="min-w-[90px]"
            >
              {isConnecting ? "Cancel" : "Disconnect"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
