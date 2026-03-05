"use client";

import { useState, useEffect, useCallback } from "react";
import { useReactor, fetchInsecureJwtToken } from "@reactor-team/js-sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ConnectionPanelProps {
  onJwtTokenChange: (token: string | undefined) => void;
  onLocalModeChange: (isLocal: boolean) => void;
  isLocalMode: boolean;
  port: string;
  onPortChange: (port: string) => void;
  framesPerChunk: number;
  onFramesPerChunkChange: (value: number) => void;
  className?: string;
}

export function ConnectionPanel({
  onJwtTokenChange,
  onLocalModeChange,
  isLocalMode: isLocalModeProp,
  port,
  onPortChange,
  framesPerChunk,
  onFramesPerChunkChange,
  className,
}: ConnectionPanelProps) {
  const { status, connect, disconnect } = useReactor((state) => ({
    status: state.status,
    connect: state.connect,
    disconnect: state.disconnect,
  }));

  const [apiKey, setApiKey] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize callbacks to prevent unnecessary effect triggers
  const handleJwtChange = useCallback(onJwtTokenChange, [onJwtTokenChange]);

  const isConnecting = status === "connecting" || status === "waiting";
  const isConnected = status === "ready";

  // Toggle local mode
  const toggleLocalMode = useCallback(() => {
    const newLocal = !isLocalModeProp;
    onLocalModeChange(newLocal);
    if (newLocal) {
      // Switching to local: clear API key and JWT
      setApiKey("");
      handleJwtChange(undefined);
      setError(null);
    }
  }, [isLocalModeProp, onLocalModeChange, handleJwtChange]);

  // Fetch JWT when API key changes (cloud mode only)
  useEffect(() => {
    if (isLocalModeProp || !apiKey) {
      if (!isLocalModeProp) handleJwtChange(undefined);
      setError(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsFetching(true);
      setError(null);
      try {
        const token = await fetchInsecureJwtToken(apiKey);
        handleJwtChange(token);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch token");
        handleJwtChange(undefined);
      } finally {
        setIsFetching(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [apiKey, isLocalModeProp, handleJwtChange]);

  return (
    <div className={cn("flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-card rounded-lg border border-border", className)}>
      {/* Local Mode Toggle */}
      <button
        type="button"
        onClick={toggleLocalMode}
        disabled={isConnected}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors shrink-0",
          isLocalModeProp
            ? "bg-green-500/20 border-green-500/50 text-green-400"
            : "bg-muted border-border text-muted-foreground hover:text-foreground",
          isConnected && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className={cn(
          "w-2 h-2 rounded-full",
          isLocalModeProp ? "bg-green-500" : "bg-muted-foreground"
        )} />
        Local
      </button>

      {/* API Key Input (cloud mode) or Port Input (local mode) */}
      <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {isLocalModeProp ? (
          <>
            <label className="text-sm font-medium text-foreground whitespace-nowrap">
              Port
            </label>
            <Input
              type="text"
              value={port}
              onChange={(e) => onPortChange(e.target.value)}
              placeholder="8080"
              disabled={isConnected}
              className="h-9 text-sm w-24 border-green-500/50"
            />
            <span className="text-xs text-muted-foreground">
              localhost:{port}
            </span>
          </>
        ) : (
          <>
            <label className="text-sm font-medium text-foreground whitespace-nowrap">
              API Key
            </label>
            <div className="relative flex-1">
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key (rk_...)"
                disabled={isConnected}
                className={cn(
                  "h-9 text-sm pr-8",
                  error && "border-destructive"
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
            </div>
          </>
        )}
      </div>

      {/* Frames per chunk */}
      <div className="flex items-center gap-2 shrink-0">
        <label className="text-sm font-medium text-foreground whitespace-nowrap">
          Frames/chunk
        </label>
        <Input
          type="number"
          min={1}
          value={framesPerChunk}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (v > 0) onFramesPerChunkChange(v);
          }}
          className="h-9 text-sm w-20"
        />
      </div>

      {/* Connection Button */}
      <div className="flex items-center gap-3">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-colors",
              status === "disconnected" && "bg-muted-foreground",
              status === "connecting" && "bg-yellow-500 animate-pulse",
              status === "waiting" && "bg-yellow-500 animate-pulse",
              status === "ready" && "bg-green-500"
            )}
          />
          <span className="text-xs text-muted-foreground capitalize hidden sm:inline">
            {status === "ready" ? "Connected" : status}
          </span>
        </div>

        {/* Connect/Disconnect button */}
        {status === "disconnected" ? (
          <Button
            size="default"
            variant="default"
            onClick={() => connect()}
            disabled={!isLocalModeProp && !apiKey}
            className="min-w-[100px]"
          >
            Connect
          </Button>
        ) : (
          <Button
            size="default"
            variant="secondary"
            onClick={() => disconnect()}
            className="min-w-[100px]"
          >
            {isConnecting ? "Cancel" : "Disconnect"}
          </Button>
        )}
      </div>
    </div>
  );
}
