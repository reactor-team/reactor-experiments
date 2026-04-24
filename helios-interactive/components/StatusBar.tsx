"use client";

import { useHelios } from "@reactor-models/helios";
import { useReactor } from "@reactor-team/js-sdk";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StatusBarProps {
  tokenError?: string | null;
}

export function StatusBar({ tokenError }: StatusBarProps) {
  const { status } = useHelios();
  const connect = useReactor((s) => s.connect);
  const disconnect = useReactor((s) => s.disconnect);

  const isConnecting = status === "connecting" || status === "waiting";

  const statusLabel =
    status === "ready"
      ? "Connected"
      : status === "waiting"
        ? "Waiting for GPU..."
        : status === "connecting"
          ? "Connecting..."
          : "Disconnected";

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2 min-w-0">
        <div
          className={cn(
            "w-2 h-2 rounded-full transition-colors shrink-0 mt-1",
            tokenError && "bg-red-500",
            !tokenError && status === "disconnected" && "bg-muted-foreground",
            !tokenError && isConnecting && "bg-yellow-500 animate-pulse",
            !tokenError && status === "ready" && "bg-green-500",
          )}
        />
        <span className="text-xs text-muted-foreground">
          {tokenError || statusLabel}
        </span>
      </div>

      {status === "disconnected" ? (
        <Button
          size="xs"
          variant="default"
          onClick={() => connect()}
          disabled={!!tokenError}
          className="h-7 px-3 text-xs shrink-0"
        >
          Connect
        </Button>
      ) : (
        <Button
          size="xs"
          variant="secondary"
          onClick={() => disconnect()}
          className="h-7 px-3 text-xs shrink-0"
        >
          {isConnecting ? "Cancel" : "Disconnect"}
        </Button>
      )}
    </div>
  );
}
