import React, { useState, useEffect } from "react";
import { Megaphone, Send, Trash2, Info, AlertTriangle, AlertCircle, Bell, BellRing, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { localDB, DBBroadcast } from "@/lib/localDB";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  notifyBroadcast,
  getNotificationPermission,
  requestNotificationPermission,
  sendSystemNotification,
  NotificationPermissionState,
} from "@/lib/notifications";

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
  const [permission, setPermission] = useState<NotificationPermissionState>(getNotificationPermission);

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

    const handlePerm = () => setPermission(getNotificationPermission());
    window.addEventListener("notification-permission-change", handlePerm);

    return () => {
      window.removeEventListener("local-db-change", handleDbChange);
      window.removeEventListener("notification-permission-change", handlePerm);
    };
  }, []);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error("Моля, въведете текст на съобщението");
      return;
    }
    setIsSending(true);
    try {
      const created = localDB.addBroadcast(trimmed, priority);
      
      // Trigger system notifications on phones & desktop and in current window
      await notifyBroadcast(created);

      // Show immediate prominent toast popup with the actual message content
      const popupTitle =
        created.priority === "urgent"
          ? "🚨 СПЕШНО СЪОБЩЕНИЕ"
          : created.priority === "warning"
          ? "⚠️ ВАЖНО СЪОБЩЕНИЕ"
          : "📢 Ново съобщение";

      toast(popupTitle, {
        description: created.message,
        duration: 9000,
      });

      toast.success("Съобщението е публикувано успешно в графика!");
      setMessage("");
      setPriority("info");
      loadBroadcasts();
    } catch (err) {
      console.error("Error sending broadcast:", err);
      toast.error("Грешка при запис на съобщението");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendTestNotification = async () => {
    if (permission !== "granted") {
      const granted = await requestNotificationPermission();
      if (!granted) {
        toast.error("Моля, разрешете известията в браузъра");
        return;
      }
      setPermission("granted");
    }

    const testBroadcast: DBBroadcast = {
      id: "test-" + Date.now(),
      message: "Това е примерно известие за дежурства на вашето устройство!",
      priority: "urgent",
      created_at: new Date().toISOString(),
    };
    await notifyBroadcast(testBroadcast);
    toast("🚨 СПЕШНО: Училищно съобщение (Тест)", {
      description: testBroadcast.message,
      duration: 6000,
    });
    toast.success("Тестовото известие е изпратено на това устройство!");
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
      {/* Device notifications status banner */}
      <div className="bg-muted/40 border rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            permission === "granted" ? "bg-emerald-500/15 text-emerald-600" : "bg-primary/15 text-primary"
          )}>
            {permission === "granted" ? <CheckCircle2 className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </div>
          <div>
            <p className="font-semibold text-foreground">
              Известия на устройството:{" "}
              {permission === "granted" ? (
                <span className="text-emerald-600 font-bold">Активирани</span>
              ) : permission === "denied" ? (
                <span className="text-destructive font-bold">Блокирани в браузъра</span>
              ) : (
                <span className="text-yellow-600 font-bold">Чакат разрешение</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {permission === "granted"
                ? "При всяко ново съобщение ще се показва нотификация на телефона и компютъра."
                : "Активирайте известията, за да получавате системни нотификации на телефон и десктоп."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {permission !== "granted" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const granted = await requestNotificationPermission();
                if (granted) setPermission("granted");
              }}
              className="gap-1.5 h-8 text-xs w-full sm:w-auto"
            >
              <Bell className="w-3.5 h-3.5" />
              Разреши известия
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSendTestNotification}
              className="gap-1.5 h-8 text-xs w-full sm:w-auto text-primary hover:text-primary"
            >
              <BellRing className="w-3.5 h-3.5" />
              Тестово известие
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs sm:text-sm font-semibold">Ниво на важност</Label>
        <RadioGroup value={priority} onValueChange={(v) => setPriority(v as Priority)} className="flex flex-wrap gap-3">
          {(Object.keys(priorityConfig) as Priority[]).map((p) => (
            <div key={p} className="flex items-center space-x-2">
              <RadioGroupItem value={p} id={`priority-${p}`} />
              <Label htmlFor={`priority-${p}`} className={cn("flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm font-medium", priorityConfig[p].color)}>
                <PriorityIcon priority={p} />
                {priorityConfig[p].label}
              </Label>
            </div>
          ))}
        </RadioGroup>
        <p className="text-xs text-muted-foreground">{priorityConfig[priority].description}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="broadcast-message" className="text-xs sm:text-sm font-semibold">Съобщение</Label>
        <Textarea
          id="broadcast-message"
          placeholder="Напишете съобщение до всички учители и потребители..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="text-xs sm:text-sm"
        />
      </div>

      <Button onClick={handleSend} disabled={isSending || !message.trim()} className="gap-2 w-full sm:w-auto h-9 text-xs sm:text-sm">
        <Send className="w-4 h-4" />
        {isSending ? "Изпращане..." : "Изпрати с известие до всички"}
      </Button>

      {history.length > 0 && (
        <div className="mt-6 space-y-2 border-t pt-4">
          <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground">История на съобщенията</h4>
          {history.map((b) => (
            <div key={b.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 border text-xs sm:text-sm">
              <PriorityIcon priority={b.priority} className={cn("mt-0.5 flex-shrink-0", priorityConfig[b.priority]?.color || "text-muted-foreground")} />
              <div className="flex-1 min-w-0">
                <p className="break-words font-medium text-foreground">{b.message}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {priorityConfig[b.priority]?.label || "Информация"} • {new Date(b.created_at).toLocaleString("bg-BG")}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-destructive hover:text-destructive" onClick={() => handleDelete(b.id)} title="Изтрий съобщението">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
