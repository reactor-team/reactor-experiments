"use client";

import { useState, useEffect, useCallback } from "react";
import { useReactor } from "@reactor-team/js-sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ConnectionPanelProps {
  onJwtTokenChange: (token: string | undefined) => void;
  onLocalModeChange: (isLocal: boolean) => void;
  className?: string;
}

export function ConnectionPanel({
  onJwtTokenChange,
  onLocalModeChange,
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
  const [isLocalMode, setIsLocalMode] = useState(false);

  const handleJwtChange = useCallback(onJwtTokenChange, [onJwtTokenChange]);
  const handleLocalChange = useCallback(onLocalModeChange, [onLocalModeChange]);

  const isConnecting = status === "connecting" || status === "waiting";
  const isConnected = status === "ready";

  useEffect(() => {
    if (apiKey.toLowerCase() === "local") {
      setIsLocalMode(true);
      handleLocalChange(true);
      handleJwtChange(undefined);
      setError(null);
      return;
    }

    setIsLocalMode(false);
    handleLocalChange(false);

    if (!apiKey) {
      handleJwtChange(undefined);
      setError(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsFetching(true);
      setError(null);
      try {
        const res = await fetch("/api/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Reactor-API-Key": apiKey,
          },
          body: JSON.stringify({}),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Token fetch failed: ${res.status}`);
        }
        const { jwt: token } = await res.json();
        handleJwtChange(token);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch token");
        handleJwtChange(undefined);
      } finally {
        setIsFetching(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [apiKey, handleJwtChange, handleLocalChange]);

  const statusLabel =
    status === "ready"
      ? "Connected"
      : status === "waiting"
        ? "Waiting for GPU..."
        : status === "connecting"
          ? "Connecting..."
          : "Disconnected";

  return (
    <div className={cn("space-y-2", className)}>
      {/* API Key Input */}
      <div className="relative">
        <Input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Reactor API key (rk_...)"
          disabled={isConnected}
          className={cn(
            "h-8 text-sm pr-8",
            isLocalMode && "border-green-500/50",
            error && "border-destructive",
          )}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {isFetching && (
            <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
          {isLocalMode && !isFetching && (
            <span className="text-[10px] text-green-500 font-medium uppercase">
              Local
            </span>
          )}
          {error && !isFetching && (
            <span
              className="w-2 h-2 bg-destructive rounded-full"
              title={error}
            />
          )}
        </div>
      </div>

      {/* Status + Connect */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              status === "disconnected" && "bg-muted-foreground",
              isConnecting && "bg-yellow-500 animate-pulse",
              status === "ready" && "bg-green-500",
            )}
          />
          <span className="text-[11px] text-muted-foreground">
            {statusLabel}
          </span>
        </div>

        {status === "disconnected" ? (
          <Button
            size="xs"
            variant="default"
            onClick={() => connect()}
            disabled={(!apiKey || isFetching) && !isLocalMode}
            className="h-7 px-3 text-xs"
          >
            Connect
          </Button>
        ) : (
          <Button
            size="xs"
            variant="secondary"
            onClick={() => disconnect()}
            className="h-7 px-3 text-xs"
          >
            {isConnecting ? "Cancel" : "Disconnect"}
          </Button>
        )}
      </div>
    </div>
  );
}
