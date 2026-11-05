import React, { useState, useEffect } from "react";
import { Lock, LogOut, Shield, Bell, BellRing, CloudUpload } from "lucide-react";
import { localDB } from "@/lib/localDB";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AdminSettingsPanel } from "@/components/AdminSettingsPanel";
import { AppSettings } from "@/hooks/useAppSettings";
import { MobileInstallButton } from "@/components/PWAInstallPrompt";
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendSystemNotification,
  isNotificationSupported,
  NotificationPermissionState,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";

import defaultLogo from "@/assets/su-konstantin-petkanов-logo.png";

interface HeaderProps {
  settings: AppSettings;
  onSaveSettings: (updates: Partial<AppSettings>) => Promise<boolean>;
}

function NotificationHeaderButton() {
  const [permission, setPermission] = useState<NotificationPermissionState>(getNotificationPermission);

  useEffect(() => {
    const handlePerm = () => setPermission(getNotificationPermission());
    window.addEventListener("notification-permission-change", handlePerm);
    return () => window.removeEventListener("notification-permission-change", handlePerm);
  }, []);

  if (!isNotificationSupported()) return null;

  const handleClick = async () => {
    if (permission === "granted") {
      await sendSystemNotification("🔔 Тестово известие", {
        body: "Известията за дежурства работят отлично на това устройство!",
        tag: "header-test-notification",
      });
      toast.success("Изпратено е тестово известие!");
    } else {
      const granted = await requestNotificationPermission();
      if (granted) {
        setPermission("granted");
        toast.success("Известията са активирани!");
      } else {
        toast.error("Известията не са разрешени в настройките на браузъра");
      }
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className={cn(
        "gap-1.5 bg-transparent border-white/30 hover:bg-white/10 text-xs sm:text-sm h-8 sm:h-9",
        permission === "granted" && "text-emerald-300 border-emerald-400/40"
      )}
      title={
        permission === "granted"
          ? "Известията са включени. Натиснете за тестване."
          : "Включете известията за съобщения"
      }
    >
      {permission === "granted" ? (
        <BellRing className="w-3.5 h-3.5 text-emerald-300" />
      ) : (
        <Bell className="w-3.5 h-3.5" />
      )}
      <span className="hidden md:inline">
        {permission === "granted" ? "Известия (Вкл.)" : "Известия"}
      </span>
    </Button>
  );
}

export function Header({ settings, onSaveSettings }: HeaderProps) {
  const { isAdmin, login, logout, user, isSuperAdmin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isPublishingCloud, setIsPublishingCloud] = useState(false);

  const handleQuickPublish = async () => {
    setIsPublishingCloud(true);
    try {
      const res = await localDB.publishToCloud();
      if (res.success) {
        toast.success(res.message || "Графикът е публикуван успешно в базата данни за всички!");
      } else {
        toast.error(res.message || "Грешка при публикуване в базата данни.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Грешка при комуникация със сървъра.";
      toast.error(msg);
    } finally {
      setIsPublishingCloud(false);
    }
  };

  const logoSrc = settings.logo_url || defaultLogo;

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      toast.error("Моля, въведете потребителско име и парола");
      return;
    }
    setIsLoggingIn(true);
    const result = await login(email.trim(), password);
    setIsLoggingIn(false);
    if (!result.error) {
      setEmail("");
      setPassword("");
      setIsDialogOpen(false);
      toast.success("Успешно влязохте като администратор");
    } else {
      toast.error(result.error);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.info("Излязохте от администраторския профил");
  };

  return (
    <header className="bg-table-header text-table-header-foreground shadow-lg">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <img
              src={logoSrc}
              alt="Лого на училището"
              className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 object-contain shrink-0"
              loading="eager"
            />
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl md:text-2xl font-bold truncate leading-tight">
                {settings.header_title}
              </h1>
              <p className="text-xs sm:text-sm opacity-90 truncate">
                {settings.header_subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <MobileInstallButton />
            {isAdmin && (
              <>
                <Button
                  size="sm"
                  onClick={handleQuickPublish}
                  disabled={isPublishingCloud}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold h-8 text-xs sm:text-sm"
                  title="Публикувай текущия график в облачната база данни към всички потребители"
                >
                  <CloudUpload className={`w-3.5 h-3.5 ${isPublishingCloud ? "animate-bounce" : ""}`} />
                  <span className="hidden md:inline">{isPublishingCloud ? "Публикуване..." : "Публикувай за всички"}</span>
                </Button>
                <NotificationHeaderButton />
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-accent/20 rounded-full">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {isSuperAdmin ? "Главен админ" : "Администратор"}
                  </span>
                </div>
                <AdminSettingsPanel settings={settings} onSave={onSaveSettings} />
              </>
            )}

            {isAdmin ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-2 bg-transparent border-white/30 hover:bg-white/10"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Изход</span>
              </Button>
            ) : (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-transparent border-white/30 hover:bg-white/10"
                  >
                    <Lock className="w-4 h-4" />
                    <span className="hidden sm:inline">Вход за админ</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="mx-4 sm:mx-auto w-[calc(100%-2rem)] sm:w-full max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Вход за администратор</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Потребителско име</Label>
                      <Input
                        id="login-email"
                        type="text"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="admin"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleLogin();
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Парола</Label>
                      <PasswordInput
                        id="login-password"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleLogin();
                        }}
                      />
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        className="w-full sm:w-auto"
                      >
                        Отказ
                      </Button>
                      <Button id="btn-login-submit" onClick={handleLogin} disabled={isLoggingIn} className="w-full sm:w-auto">
                        {isLoggingIn ? "Влизане..." : "Вход"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
