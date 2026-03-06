"use client";

import { useState, useEffect, useCallback } from "react";
import { useReactor, fetchInsecureJwtToken } from "@reactor-team/js-sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ENDPOINTS, type Endpoint } from "@/lib/endpoints";

interface ConnectionPanelProps {
  onJwtTokenChange: (token: string | undefined) => void;
  endpoint: Endpoint;
  onEndpointChange: (endpoint: Endpoint) => void;
  modelName: string;
  onModelNameChange: (name: string) => void;
  port: string;
  onPortChange: (port: string) => void;
  framesPerChunk: number;
  onFramesPerChunkChange: (value: number) => void;
  className?: string;
}

export function ConnectionPanel({
  onJwtTokenChange,
  endpoint,
  onEndpointChange,
  modelName,
  onModelNameChange,
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
  const [localModelName, setLocalModelName] = useState(modelName);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJwtChange = useCallback(onJwtTokenChange, [onJwtTokenChange]);

  const isConnecting = status === "connecting" || status === "waiting";
  const isConnected = status === "ready";

  const isProd = endpoint.url.includes("reactor.inc");
  const envApiKey = isProd
    ? process.env.NEXT_PUBLIC_API_KEY_PROD
    : process.env.NEXT_PUBLIC_API_KEY_DEV;
  const hasEnvKey = !!envApiKey;

  // Auto-fill from env when endpoint changes
  useEffect(() => {
    if (envApiKey) {
      setApiKey(envApiKey);
    } else {
      setApiKey("");
    }
  }, [envApiKey]);

  const handleEndpointChange = (index: number) => {
    const ep = ENDPOINTS[index];
    onEndpointChange(ep);
    if (ep.local) {
      setApiKey("");
      handleJwtChange(undefined);
      setError(null);
    }
  };

  // Fetch JWT when API key changes (cloud mode only)
  useEffect(() => {
    if (endpoint.local || !apiKey) {
      if (!endpoint.local) handleJwtChange(undefined);
      setError(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsFetching(true);
      setError(null);
      try {
        const token = await fetchInsecureJwtToken(apiKey, endpoint.url);
        handleJwtChange(token);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch token");
        handleJwtChange(undefined);
      } finally {
        setIsFetching(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [apiKey, endpoint, handleJwtChange]);

  return (
    <div className={cn("flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-card rounded-lg border border-border", className)}>
      {/* Endpoint Selector */}
      <div className="flex items-center gap-2 shrink-0">
        <label className="text-sm font-medium text-foreground whitespace-nowrap">
          Endpoint
        </label>
        <select
          value={ENDPOINTS.indexOf(endpoint)}
          onChange={(e) => handleEndpointChange(Number(e.target.value))}
          disabled={isConnected}
          className={cn(
            "h-9 px-3 rounded-md border text-sm font-medium transition-colors bg-background text-foreground",
            isConnected && "opacity-50 cursor-not-allowed"
          )}
        >
          {ENDPOINTS.map((ep, i) => (
            <option key={i} value={i}>
              {ep.label}
            </option>
          ))}
        </select>
      </div>

      {/* Model Name (non-local only) */}
      {!endpoint.local && (
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-sm font-medium text-foreground whitespace-nowrap">
            Model
          </label>
          <Input
            type="text"
            value={localModelName}
            onChange={(e) => setLocalModelName(e.target.value)}
            placeholder="e.g. hy-world"
            disabled={isConnected}
            className="h-9 text-sm w-32"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onModelNameChange(localModelName)}
            disabled={localModelName === modelName || isConnected}
            className="h-9"
          >
            Set
          </Button>
        </div>
      )}

      {/* Port Input (local mode) or API Key Input (cloud mode) */}
      <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {endpoint.local ? (
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
            {hasEnvKey ? (
              <span className="text-xs text-green-400 font-medium">
                From .env ({isProd ? "prod" : "dev"})
              </span>
            ) : (
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
            )}
          </>
        )}
      </div>

      {/* VFI Toggle */}
      <button
        type="button"
        onClick={() => onFramesPerChunkChange(framesPerChunk === 32 ? 16 : 32)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors shrink-0",
          framesPerChunk === 32
            ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
            : "bg-muted border-border text-muted-foreground hover:text-foreground"
        )}
      >
        <div className={cn(
          "w-2 h-2 rounded-full",
          framesPerChunk === 32 ? "bg-blue-500" : "bg-muted-foreground"
        )} />
        VFI
      </button>

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
            disabled={!endpoint.local && !apiKey}
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
