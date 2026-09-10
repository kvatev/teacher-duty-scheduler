import React, { useState, useEffect, useCallback } from "react";
import { X, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { localDB, DBBroadcast } from "@/lib/localDB";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Priority = "info" | "warning" | "urgent";

const priorityStyles: Record<Priority, { bg: string; border: string; icon: string }> = {
  info: {
    bg: "bg-primary/10",
    border: "border-primary/20",
    icon: "text-primary",
  },
  warning: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    icon: "text-yellow-600",
  },
  urgent: {
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    icon: "text-destructive",
  },
};

const PriorityIcon = ({ priority }: { priority: Priority }) => {
  const iconClass = cn("w-5 h-5 mt-0.5 flex-shrink-0", priorityStyles[priority].icon);
  switch (priority) {
    case "urgent":
      return <AlertCircle className={iconClass} />;
    case "warning":
      return <AlertTriangle className={iconClass} />;
    default:
      return <Info className={iconClass} />;
  }
};

export function BroadcastBanner() {
  const [broadcasts, setBroadcasts] = useState<DBBroadcast[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem("dismissedBroadcasts");
    if (stored) {
      try {
        setDismissed(new Set(JSON.parse(stored)));
      } catch {
        // Ignore invalid local storage JSON
      }
    }
  }, []);

  const fetchBroadcasts = useCallback(() => {
    const list = localDB.getBroadcasts();
    setBroadcasts(list.slice(0, 5));
  }, []);

  useEffect(() => {
    fetchBroadcasts();
    const handleDbChange = () => fetchBroadcasts();
    const handleNewBroadcast = () => fetchBroadcasts();
    window.addEventListener("local-db-change", handleDbChange);
    window.addEventListener("new-broadcast-received", handleNewBroadcast);
    return () => {
      window.removeEventListener("local-db-change", handleDbChange);
      window.removeEventListener("new-broadcast-received", handleNewBroadcast);
    };
  }, [fetchBroadcasts]);

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    localStorage.setItem("dismissedBroadcasts", JSON.stringify([...next]));
  };

  const visible = broadcasts.filter((b) => !dismissed.has(b.id));
  if (visible.length === 0) return null;

  // Sort by priority: urgent first, then warning, then info
  const sorted = [...visible].sort((a, b) => {
    const order: Record<Priority, number> = { urgent: 0, warning: 1, info: 2 };
    return order[a.priority] - order[b.priority];
  });

  return (
    <div className="space-y-2.5">
      {sorted.map((b) => {
        const styles = priorityStyles[b.priority] || priorityStyles.info;
        const priorityTitle =
          b.priority === "urgent"
            ? "🚨 СПЕШНО СЪОБЩЕНИЕ"
            : b.priority === "warning"
            ? "⚠️ ВАЖНО СЪОБЩЕНИЕ"
            : "📢 СЪОБЩЕНИЕ";

        return (
          <div
            key={b.id}
            className={cn(
              "rounded-xl px-4 py-3.5 flex items-start gap-3.5 animate-in slide-in-from-top-2 border shadow-sm transition-all",
              styles.bg,
              styles.border
            )}
          >
            <PriorityIcon priority={b.priority} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={cn("text-xs font-bold uppercase tracking-wider", styles.icon)}>
                  {priorityTitle}
                </span>
                {b.created_at && (
                  <span className="text-[11px] text-muted-foreground">
                    • {new Date(b.created_at).toLocaleTimeString("bg-BG", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
              <p className="text-sm sm:text-base text-foreground font-medium leading-relaxed whitespace-pre-wrap">
                {b.message}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground -mr-1 -mt-1 rounded-full"
              onClick={() => dismiss(b.id)}
              title="Скрий съобщението"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
