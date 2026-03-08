import React, { useState, useEffect } from "react";
import { X, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Broadcast {
  id: string;
  message: string;
  created_at: string;
}

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
      if (data) setBroadcasts(data);
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

  return (
    <div className="space-y-2">
      {visible.map((b) => (
        <div
          key={b.id}
          className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 flex items-start gap-3 animate-in slide-in-from-top-2"
        >
          <Megaphone className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <p className="flex-1 text-sm text-foreground">{b.message}</p>
          <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => dismiss(b.id)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
