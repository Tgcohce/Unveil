import { useWebSocket, WsStatus } from "../hooks/useWebSocket";

function formatLastUpdated(timestamp: number | null): string {
  if (!timestamp) return "";
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

const statusConfig: Record<WsStatus, { color: string; label: string }> = {
  connected: { color: "bg-green-500/70", label: "Live" },
  connecting: { color: "bg-yellow-500/70", label: "Connecting" },
  disconnected: { color: "bg-zinc-400/50", label: "Offline" },
};

export function ConnectionStatus() {
  const { status, lastUpdated } = useWebSocket();
  const config = statusConfig[status];
  const timeStr = formatLastUpdated(lastUpdated);

  return (
    <div className="flex items-center gap-2">
      <div className={`w-1.5 h-1.5 rounded-full ${config.color}`}></div>
      <span className="text-[11px] text-zen-text-sub/70">
        {config.label}
        {status === "disconnected" && timeStr && ` \u2014 ${timeStr}`}
        {status === "connected" && timeStr && ` \u2014 ${timeStr}`}
      </span>
    </div>
  );
}
