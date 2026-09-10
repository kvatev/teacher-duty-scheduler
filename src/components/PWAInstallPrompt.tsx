import React, { useState, useEffect } from "react";
import { Calendar, Download, X, Smartphone, Share, PlusSquare, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "teacher_duty_pwa_dismissed_until";

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOSDialogOpen, setIsIOSDialogOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed as PWA)
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    setIsStandalone(isStandaloneMode);
    if (isStandaloneMode) return;

    // Check if user dismissed the prompt recently
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
      return;
    }

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: boolean }).MSStream;
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      // Show for iOS users after a small delay
      const timer = setTimeout(() => setIsVisible(true), 2500);
      return () => clearTimeout(timer);
    }

    // Listen for beforeinstallprompt (Android / Chrome / Edge)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setIsIOSDialogOpen(true);
      return;
    }

    if (!deferredPrompt) {
      // Fallback
      setIsIOSDialogOpen(true);
      return;
    }

    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === "accepted") {
      setIsInstalled(true);
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Remember dismissal for 5 days
    localStorage.setItem(DISMISS_KEY, (Date.now() + 5 * 24 * 60 * 60 * 1000).toString());
  };

  if (isStandalone || !isVisible) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="bg-card border-2 border-primary/20 rounded-xl shadow-xl p-4 flex items-center gap-3 backdrop-blur-md bg-card/95">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold leading-none truncate">
              Инсталирай графика
            </h4>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              Бърз достъп до графика за дежурства директно от началния екран на телефона!
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" onClick={handleInstallClick} className="gap-1.5 h-8 text-xs font-medium px-3">
              <Calendar className="w-3.5 h-3.5" />
              Инсталирай
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleDismiss}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              aria-label="Затвори"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* iOS Installation Instruction Dialog */}
      <Dialog open={isIOSDialogOpen} onOpenChange={setIsIOSDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Инсталиране на iPhone / iPad
            </DialogTitle>
            <DialogDescription>
              Следвайте тези 3 лесни стъпки в браузъра Safari:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/60">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                1
              </div>
              <div className="text-sm">
                <p className="font-medium flex items-center gap-1.5">
                  Натиснете бутона „Сподели“ <Share className="w-4 h-4 text-primary" />
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Намира се в долната лента с менюта на Safari (квадратчето със стрелка нагоре).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/60">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                2
              </div>
              <div className="text-sm">
                <p className="font-medium flex items-center gap-1.5">
                  Изберете „Към началния екран“ <PlusSquare className="w-4 h-4 text-primary" />
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Превъртете списъка с опции надолу и докоснете „Add to Home Screen“.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/60">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                3
              </div>
              <div className="text-sm">
                <p className="font-medium flex items-center gap-1.5">
                  Потвърдете с „Добавяне“ <Check className="w-4 h-4 text-emerald-600" />
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Натиснете бутона „Add“ горе вдясно. Иконата на графика ще се появи на екрана ви!
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

// Mobile install button for Header
export function MobileInstallButton() {
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOSDialogOpen, setIsIOSDialogOpen] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    if (isIos) {
      setCanInstall(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      setDeferredPrompt(null);
    } else {
      setIsIOSDialogOpen(true);
    }
  };

  if (!canInstall) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className="gap-1.5 bg-accent text-accent-foreground border-accent hover:bg-accent/80 h-8 px-2.5 text-xs sm:text-sm font-medium"
        title="Инсталирай графика на телефона (Календар приложение)"
      >
        <Calendar className="w-3.5 h-3.5" />
        <span className="hidden xs:inline">График</span>
      </Button>

      {/* iOS Dialog */}
      <Dialog open={isIOSDialogOpen} onOpenChange={setIsIOSDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Инсталиране на телефон
            </DialogTitle>
            <DialogDescription>
              За да добавите приложението към началния екран:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <p className="flex items-center gap-2">
              <Share className="w-4 h-4 text-primary shrink-0" />
              1. Натиснете бутона <strong>Сподели</strong> в браузъра
            </p>
            <p className="flex items-center gap-2">
              <PlusSquare className="w-4 h-4 text-primary shrink-0" />
              2. Изберете <strong>„Към началния екран“ (Add to Home Screen)</strong>
            </p>
            <p className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              3. Потвърдете с <strong>„Добавяне“ (Add)</strong>
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setIsIOSDialogOpen(false)}>Разбрах</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
