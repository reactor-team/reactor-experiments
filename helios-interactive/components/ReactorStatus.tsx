"use client";

import { useReactor } from "@reactor-team/js-sdk";

interface ReactorStatusProps {
  className?: string;
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    disconnected: { bg: "bg-white/10", text: "text-[#bdbdbd]", dot: "bg-red-500", label: "Disconnected" },
    ready: { bg: "bg-green-500/20", text: "text-green-400", dot: "bg-green-500", label: "Connected" },
    connecting: { bg: "bg-yellow-500/20", text: "text-yellow-400", dot: "bg-yellow-500 animate-pulse", label: "Connecting..." },
    waiting: { bg: "bg-yellow-500/20", text: "text-yellow-400", dot: "bg-yellow-500 animate-pulse", label: "Waiting..." },
  }[status] ?? { bg: "bg-white/10", text: "text-[#bdbdbd]", dot: "bg-gray-500", label: status };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded transition-all duration-300 ${config.bg} ${config.text}`}>
      <div className={`w-2 h-2 rounded-full ${config.dot}`} />
      <span className="text-xs font-mono uppercase">{config.label}</span>
    </div>
  );
}

export function ReactorStatus({ className }: ReactorStatusProps) {
  const { status, connect, disconnect } = useReactor((state) => ({
    status: state.status,
    connect: state.connect,
    disconnect: state.disconnect,
  }));

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <StatusBadge status={status} />
      {status === "disconnected" ? (
        <button
          onClick={() => connect()}
          className="px-4 py-2 rounded bg-white text-black font-mono text-sm uppercase transition-all duration-200 hover:bg-gray-200"
        >
          Connect
        </button>
      ) : (
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 rounded bg-white/10 text-white font-mono text-sm uppercase transition-all duration-200 hover:bg-white/20"
        >
          Disconnect
        </button>
      )}
    </div>
  );
}
