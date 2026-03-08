import React, { useState, useEffect } from "react";
import { X, Megaphone, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Priority = "info" | "warning" | "urgent";

interface Broadcast {
  id: string;
  message: string;
  priority: Priority;
  created_at: string;
}

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
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem("dismissedBroadcasts");
    if (stored) {
      try { setDismissed(new Set(JSON.parse(stored))); } catch {}
    }
  }, []);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("broadcasts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (data) setBroadcasts(data as Broadcast[]);
    };
    fetch();

    const channel = supabase
      .channel("broadcasts-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "broadcasts" }, (payload) => {
        setBroadcasts((prev) => [payload.new as Broadcast, ...prev].slice(0, 5));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "broadcasts" }, (payload) => {
        setBroadcasts((prev) => prev.filter((b) => b.id !== (payload.old as any).id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

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
    <div className="space-y-2">
      {sorted.map((b) => {
        const styles = priorityStyles[b.priority] || priorityStyles.info;
        return (
          <div
            key={b.id}
            className={cn(
              "rounded-lg px-4 py-3 flex items-start gap-3 animate-in slide-in-from-top-2 border",
              styles.bg,
              styles.border
            )}
          >
            <PriorityIcon priority={b.priority} />
            <p className="flex-1 text-sm text-foreground">{b.message}</p>
            <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => dismiss(b.id)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
