import React, { useState, useEffect } from "react";
import { Bell, X, Share, PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  NotificationPermissionState,
} from "@/lib/notifications";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function NotificationPrompt() {
  const [permission, setPermission] = useState<NotificationPermissionState>("unsupported");
  const [isDismissed, setIsDismissed] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOSDialogOpen, setIsIOSDialogOpen] = useState(false);

  useEffect(() => {
    // Detect iOS & Standalone mode
    const ua = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
    const iosDevice = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: boolean }).MSStream;
    const standaloneMode =
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true);

    setIsIOS(iosDevice);
    setIsStandalone(standaloneMode);

    const current = getNotificationPermission();
    setPermission(current);

    // Check if dismissed and if expiry has passed
    const dismissedUntil = localStorage.getItem("teacher_duty_notification_prompt_dismissed");
    const isDismissExpired = !dismissedUntil || Number(dismissedUntil) < Date.now();

    // Show prompt if:
    // 1) iOS in regular Safari browser tab (needs guidance to add to home screen for notifications)
    // 2) Standard platform or iOS standalone where permission is 'default' (not yet asked)
    if (isDismissExpired) {
      if (iosDevice && !standaloneMode) {
        const timer = setTimeout(() => setIsDismissed(false), 2000);
        return () => clearTimeout(timer);
      } else if (current === "default") {
        const timer = setTimeout(() => setIsDismissed(false), 1500);
        return () => clearTimeout(timer);
      }
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
    if (isIOS && !isStandalone) {
      setIsIOSDialogOpen(true);
      return;
    }

    setIsRequesting(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        toast.success("Известията са активирани успешно на вашето устройство!");
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
    // Don't show again for 3 days
    localStorage.setItem(
      "teacher_duty_notification_prompt_dismissed",
      (Date.now() + 3 * 24 * 60 * 60 * 1000).toString()
    );
  };

  if (isDismissed) {
    return null;
  }

  // If already granted, don't show prompt
  if (permission === "granted") {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-in slide-in-from-bottom-5 duration-300">
        <div className="bg-card text-card-foreground border-2 border-primary/30 rounded-2xl p-4 shadow-2xl backdrop-blur-md bg-card/95 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <h4 className="font-bold text-sm leading-tight text-foreground flex items-center gap-1.5">
                <span>Известия на телефона</span>
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">Ново</span>
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {isIOS && !isStandalone
                  ? "За известия на iPhone, първо добавете графика към началния екран от Safari."
                  : "Получавайте съобщенията за дежурства като известия директно на телефона и компютъра."}
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
              {isIOS && !isStandalone
                ? "Инструкции за iPhone"
                : isRequesting
                ? "Активиране..."
                : "Разреши известията"}
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

      {/* iOS Safari instructions dialog */}
      <Dialog open={isIOSDialogOpen} onOpenChange={setIsIOSDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Активиране на известия на iPhone
            </DialogTitle>
            <DialogDescription>
              Apple (iOS) изисква следните 2 стъпки за известия:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/60">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                1
              </div>
              <div>
                <p className="font-medium flex items-center gap-1.5">
                  Натиснете „Сподели“ <Share className="w-4 h-4 text-primary" /> в Safari
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Изберете <strong>„Към началния екран“ (Add to Home Screen)</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/60">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                2
              </div>
              <div>
                <p className="font-medium">
                  Отворете приложението от началния екран
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  При първото отваряне натиснете <strong>„Разреши известията“</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setIsIOSDialogOpen(false)}>Разбрах</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
