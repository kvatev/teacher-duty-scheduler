import React, { useState, useEffect } from "react";
import { Megaphone, Send, Trash2, Info, AlertTriangle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { localDB, DBBroadcast } from "@/lib/localDB";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Priority = "info" | "warning" | "urgent";

const priorityConfig: Record<Priority, { label: string; description: string; color: string }> = {
  info: { label: "Информация", description: "Обикновено съобщение", color: "text-primary" },
  warning: { label: "Предупреждение", description: "Изисква внимание", color: "text-yellow-600" },
  urgent: { label: "Спешно", description: "Критично важно", color: "text-destructive" },
};

const PriorityIcon = ({ priority, className }: { priority: Priority; className?: string }) => {
  switch (priority) {
    case "urgent":
      return <AlertCircle className={cn("w-4 h-4", className)} />;
    case "warning":
      return <AlertTriangle className={cn("w-4 h-4", className)} />;
    default:
      return <Info className={cn("w-4 h-4", className)} />;
  }
};

export function AdminBroadcastPanel() {
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<Priority>("info");
  const [isSending, setIsSending] = useState(false);
  const [history, setHistory] = useState<DBBroadcast[]>([]);

  const loadBroadcasts = () => {
    setHistory(localDB.getBroadcasts().slice(0, 10));
  };

  useEffect(() => {
    loadBroadcasts();
    const handleDbChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ key?: string }>;
      if (!customEvent.detail?.key || customEvent.detail.key === "broadcasts") {
        loadBroadcasts();
      }
    };
    window.addEventListener("local-db-change", handleDbChange);
    return () => window.removeEventListener("local-db-change", handleDbChange);
  }, []);

  const handleSend = async () => {
    if (!message.trim()) return;
    setIsSending(true);
    try {
      const created = localDB.addBroadcast(message.trim(), priority);
      toast.success("Съобщението е изпратено до всички потребители");
      setMessage("");
      setPriority("info");
      setHistory((prev) => [created, ...prev.filter((b) => b.id !== created.id)].slice(0, 10));
    } catch {
      toast.error("Грешка при запис на съобщението");
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = (id: string) => {
    try {
      localDB.deleteBroadcast(id);
      setHistory((prev) => prev.filter((b) => b.id !== id));
      toast.success("Съобщението е изтрито");
    } catch {
      toast.error("Грешка при изтриване");
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Изпратете съобщение, което ще се покаже на всички потребители в приложението.
      </p>

      <div className="space-y-2">
        <Label>Ниво на важност</Label>
        <RadioGroup value={priority} onValueChange={(v) => setPriority(v as Priority)} className="flex gap-4">
          {(Object.keys(priorityConfig) as Priority[]).map((p) => (
            <div key={p} className="flex items-center space-x-2">
              <RadioGroupItem value={p} id={`priority-${p}`} />
              <Label htmlFor={`priority-${p}`} className={cn("flex items-center gap-1.5 cursor-pointer", priorityConfig[p].color)}>
                <PriorityIcon priority={p} />
                {priorityConfig[p].label}
              </Label>
            </div>
          ))}
        </RadioGroup>
        <p className="text-xs text-muted-foreground">{priorityConfig[priority].description}</p>
      </div>

      <Textarea
        placeholder="Напишете съобщение..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
      />
      <Button onClick={handleSend} disabled={isSending || !message.trim()} className="gap-2">
        <Send className="w-4 h-4" />
        {isSending ? "Изпращане..." : "Изпрати до всички"}
      </Button>

      {history.length > 0 && (
        <div className="mt-6 space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Последни съобщения</h4>
          {history.map((b) => (
            <div key={b.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-sm">
              <PriorityIcon priority={b.priority} className={cn("mt-0.5 flex-shrink-0", priorityConfig[b.priority]?.color || "text-muted-foreground")} />
              <div className="flex-1 min-w-0">
                <p className="break-words">{b.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {priorityConfig[b.priority]?.label || "Информация"} • {new Date(b.created_at).toLocaleString("bg-BG")}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-destructive hover:text-destructive" onClick={() => handleDelete(b.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
