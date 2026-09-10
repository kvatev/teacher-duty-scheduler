import React, { useState, useEffect } from "react";
import { Bell, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  NotificationPermissionState,
} from "@/lib/notifications";
import { toast } from "sonner";

export function NotificationPrompt() {
  const [permission, setPermission] = useState<NotificationPermissionState>("unsupported");
  const [isDismissed, setIsDismissed] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (!isNotificationSupported()) return;

    const current = getNotificationPermission();
    setPermission(current);

    // Only show prompt if permission is 'default' (not yet asked)
    // and not previously dismissed in this browser session
    const dismissed = localStorage.getItem("teacher_duty_notification_prompt_dismissed");
    if (current === "default" && !dismissed) {
      // Small delay so user sees the page content first
      const timer = setTimeout(() => {
        setIsDismissed(false);
      }, 1500);
      return () => clearTimeout(timer);
    }

    const handlePermissionChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ permission: NotificationPermissionState }>;
      if (customEvent.detail?.permission) {
        setPermission(customEvent.detail.permission);
        if (customEvent.detail.permission !== "default") {
          setIsDismissed(true);
        }
      }
    };

    window.addEventListener("notification-permission-change", handlePermissionChange);
    return () => window.removeEventListener("notification-permission-change", handlePermissionChange);
  }, []);

  const handleEnable = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        toast.success("Известията са активирани успешно!");
        setIsDismissed(true);
      } else {
        toast.info("Разрешението за известия не беше дадено");
        setIsDismissed(true);
      }
    } catch {
      toast.error("Възникна грешка при активиране на известията");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    // Don't show again for 7 days
    localStorage.setItem(
      "teacher_duty_notification_prompt_dismissed",
      (Date.now() + 7 * 24 * 60 * 60 * 1000).toString()
    );
  };

  if (isDismissed || permission !== "default") {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-card text-card-foreground border-2 border-primary/30 rounded-2xl p-4 shadow-2xl backdrop-blur-md bg-card/95 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <h4 className="font-bold text-sm leading-tight text-foreground flex items-center gap-1.5">
              <span>Известия за съобщения</span>
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">Ново</span>
            </h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Получавайте важните съобщения за дежурства като известия на телефона и компютъра, дори когато не сте в сайта.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0 -mr-1 -mt-1 rounded-full"
            title="Затвори"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            onClick={handleEnable}
            disabled={isRequesting}
            className="flex-1 gap-2 h-9 text-xs sm:text-sm font-semibold rounded-xl bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
          >
            <Bell className="w-4 h-4" />
            {isRequesting ? "Активиране..." : "Разреши известията"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDismiss}
            className="h-9 px-3 text-xs rounded-xl"
          >
            По-късно
          </Button>
        </div>
      </div>
    </div>
  );
}
